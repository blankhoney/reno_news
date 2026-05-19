import os
import unittest
from types import SimpleNamespace

import psycopg
from psycopg.rows import dict_row

from reno_worker.ai_evaluation import (
    AdapterResult,
    EvaluationInput,
    OpenAIResponsesAdapter,
    build_responses_request,
    evaluate_raw_entry,
)


EVALUATION_OUTPUT = {
    "scores": {
        "relevance": 0.8,
        "credibility": 0.7,
        "novelty": 0.6,
    },
    "rationale": {
        "summary": "Relevant technical item with clear evidence.",
    },
    "evidence": [
        {
            "quote": "deterministic extracted text",
            "reason": "Shows the item is extractable and relevant.",
        }
    ],
    "summary": {
        "zh": "Structured summary fixture.",
    },
}


class AiEvaluationTest(unittest.TestCase):
    def test_responses_request_uses_structured_output_schema(self) -> None:
        request = build_responses_request(
            EvaluationInput(
                raw_entry_id=101,
                extraction_id=202,
                extracted_text="deterministic extracted text",
            ),
            model="gpt-5-mini",
        )

        self.assertEqual(request["model"], "gpt-5-mini")
        self.assertEqual(request["text"]["format"]["type"], "json_schema")
        self.assertEqual(request["text"]["format"]["name"], "ai_evaluation")
        self.assertTrue(request["text"]["format"]["strict"])

    def test_openai_adapter_boundary_parses_injected_client_response(self) -> None:
        class FakeResponses:
            def create(self, **_request: object) -> object:
                return SimpleNamespace(output_text='{"scores":{"relevance":0.8,"credibility":0.7,"novelty":0.6},"rationale":{"summary":"ok"},"evidence":[],"summary":{"zh":"ok"}}')

        client = SimpleNamespace(responses=FakeResponses())
        adapter = OpenAIResponsesAdapter(client=client, model="gpt-5-mini")

        result = adapter(
            EvaluationInput(
                raw_entry_id=101,
                extraction_id=202,
                extracted_text="deterministic extracted text",
            )
        )

        self.assertEqual(result.provider, "openai")
        self.assertEqual(result.model, "gpt-5-mini")
        self.assertEqual(result.output["scores"]["relevance"], 0.8)

    @unittest.skipUnless(os.environ.get("DATABASE_URL"), "DATABASE_URL integration target not set")
    def test_evaluate_raw_entry_persists_model_call_and_evaluation(self) -> None:
        database_url = os.environ["DATABASE_URL"]
        raw_entry_id = self.create_extracted_raw_entry(database_url)

        def fake_adapter(input: EvaluationInput) -> AdapterResult:
            self.assertIn("deterministic extracted text", input.extracted_text)
            return AdapterResult(
                provider="fake",
                model="fake-evaluator",
                output=EVALUATION_OUTPUT,
                request_redacted={"rawEntryId": input.raw_entry_id},
                response_redacted={"fixture": True},
                latency_ms=12,
            )

        result = evaluate_raw_entry(database_url, raw_entry_id, adapter=fake_adapter)
        model_call = self.latest_model_call(database_url)
        evaluation = self.latest_evaluation(database_url, raw_entry_id)

        self.assertEqual(result.status, "success")
        self.assertEqual(model_call["status"], "success")
        self.assertEqual(model_call["provider"], "fake")
        self.assertEqual(evaluation["scores_json"]["relevance"], 0.8)
        self.assertEqual(evaluation["model_call_id"], model_call["id"])

    @unittest.skipUnless(os.environ.get("DATABASE_URL"), "DATABASE_URL integration target not set")
    def test_missing_extraction_is_skipped_without_adapter_call(self) -> None:
        database_url = os.environ["DATABASE_URL"]
        raw_entry_id = self.create_raw_entry(database_url)

        def fail_if_called(_input: EvaluationInput) -> AdapterResult:
            raise AssertionError("prefilter skip should not call adapter")

        result = evaluate_raw_entry(database_url, raw_entry_id, adapter=fail_if_called)
        model_call = self.latest_model_call(database_url)

        self.assertEqual(result.status, "skipped")
        self.assertEqual(model_call["status"], "skipped")
        self.assertEqual(model_call["provider"], "internal")

    @unittest.skipUnless(os.environ.get("DATABASE_URL"), "DATABASE_URL integration target not set")
    def test_blocked_rights_status_is_skipped_without_adapter_call(self) -> None:
        database_url = os.environ["DATABASE_URL"]
        raw_entry_id = self.create_extracted_raw_entry(database_url)
        self.set_rights_status(database_url, raw_entry_id, "blocked")

        def fail_if_called(_input: EvaluationInput) -> AdapterResult:
            raise AssertionError("blocked rights should not call adapter")

        result = evaluate_raw_entry(database_url, raw_entry_id, adapter=fail_if_called)
        model_call = self.latest_model_call(database_url)

        self.assertEqual(result.status, "skipped")
        self.assertEqual(model_call["status"], "skipped")
        self.assertEqual(model_call["provider"], "internal")

    @unittest.skipUnless(os.environ.get("DATABASE_URL"), "DATABASE_URL integration target not set")
    def test_adapter_failure_is_logged(self) -> None:
        database_url = os.environ["DATABASE_URL"]
        raw_entry_id = self.create_extracted_raw_entry(database_url)

        def fail_adapter(_input: EvaluationInput) -> AdapterResult:
            raise RuntimeError("adapter down")

        result = evaluate_raw_entry(database_url, raw_entry_id, adapter=fail_adapter)
        model_call = self.latest_model_call(database_url)

        self.assertEqual(result.status, "failure")
        self.assertEqual(result.error_code, "adapter_error")
        self.assertEqual(model_call["status"], "failure")
        self.assertEqual(model_call["error_code"], "adapter_error")

    def create_raw_entry(self, database_url: str) -> int:
        source_url = "https://example.invalid/issue-007-source.xml"
        entry_url = "https://example.invalid/issue-007-entry"
        with psycopg.connect(database_url) as connection:
            with connection.cursor() as cursor:
                cursor.execute("select id from sources where url = %s", (source_url,))
                existing = cursor.fetchone()
                if existing:
                    cursor.execute(
                        "delete from raw_entries where source_id = %s",
                        (existing[0],),
                    )
                    cursor.execute("delete from sources where id = %s", (existing[0],))

                cursor.execute(
                    """
                    insert into sources (board_id, source_type, title, url, enabled)
                    select id, 'rss', 'Issue 007 Test Source', %s, true
                    from boards
                    where slug = 'ai'
                    returning id
                    """,
                    (source_url,),
                )
                source_id = cursor.fetchone()[0]
                cursor.execute(
                    """
                    insert into source_policies (
                      source_id,
                      crawl_enabled,
                      fetch_interval_minutes,
                      max_requests_per_hour,
                      save_level,
                      rights_policy,
                      translation_policy,
                      risk_level
                    )
                    values (%s, true, 60, 12, 'full_text', 'private_allowed', 'none', 'low')
                    """,
                    (source_id,),
                )
                cursor.execute(
                    """
                    insert into raw_entries (
                      source_id,
                      external_id,
                      url,
                      title,
                      raw_payload_json,
                      canonical_hash,
                      lifecycle_status,
                      processing_stage,
                      rights_status
                    )
                    values (
                      %s,
                      'issue-007-entry',
                      %s,
                      'Issue 007 Entry',
                      '{"test": "issue-007"}'::jsonb,
                      'issue-007-entry',
                      'new',
                      'extracted',
                      'private_allowed'
                    )
                    returning id
                    """,
                    (source_id, entry_url),
                )
                raw_entry_id = cursor.fetchone()[0]
            connection.commit()
        return int(raw_entry_id)

    def create_extracted_raw_entry(self, database_url: str) -> int:
        raw_entry_id = self.create_raw_entry(database_url)
        with psycopg.connect(database_url) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    insert into raw_entry_extraction_attempts (raw_entry_id, status, completed_at)
                    values (%s, 'success', now())
                    returning id
                    """,
                    (raw_entry_id,),
                )
                attempt_id = cursor.fetchone()[0]
                cursor.execute(
                    """
                    insert into raw_entry_extractions (
                      raw_entry_id,
                      attempt_id,
                      extractor_name,
                      extractor_version,
                      final_url,
                      extracted_text,
                      text_length,
                      extraction_confidence
                    )
                    values (
                      %s,
                      %s,
                      'fixture',
                      '1',
                      'https://example.invalid/issue-007-entry',
                      'deterministic extracted text for AI evaluation',
                      46,
                      0.75
                    )
                    """,
                    (raw_entry_id, attempt_id),
                )
            connection.commit()
        return raw_entry_id

    def latest_model_call(self, database_url: str) -> dict[str, object]:
        with psycopg.connect(database_url, row_factory=dict_row) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    select id::int, provider, status, error_code
                    from model_calls
                    order by id desc
                    limit 1
                    """
                )
                return cursor.fetchone()

    def set_rights_status(self, database_url: str, raw_entry_id: int, rights_status: str) -> None:
        with psycopg.connect(database_url) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    "update raw_entries set rights_status = %s where id = %s",
                    (rights_status, raw_entry_id),
                )
            connection.commit()

    def latest_evaluation(self, database_url: str, raw_entry_id: int) -> dict[str, object]:
        with psycopg.connect(database_url, row_factory=dict_row) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    select model_call_id::int, scores_json
                    from ai_evaluations
                    where raw_entry_id = %s
                    order by id desc
                    limit 1
                    """,
                    (raw_entry_id,),
                )
                return cursor.fetchone()


if __name__ == "__main__":
    unittest.main()
