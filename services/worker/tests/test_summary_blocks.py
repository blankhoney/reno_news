import os
import unittest
from types import SimpleNamespace

import psycopg
from psycopg.rows import dict_row

from reno_worker.summary_blocks import (
    OpenAISummaryAdapter,
    SummaryAdapterResult,
    SummaryInput,
    build_summary_responses_request,
    generate_summary_blocks,
)


SUMMARY_OUTPUT = {
    "oneSentence": "One sentence fixture summary.",
    "detailedSummary": "Detailed fixture summary for an evaluated item.",
    "whyItMatters": "It matters because the item is useful to track.",
    "sourceNote": "Source note fixture.",
    "chinaRelevance": "China relevance fixture.",
    "relatedTopics": ["ai", "software"],
}


class SummaryBlocksTest(unittest.TestCase):
    def test_summary_request_uses_structured_output_schema(self) -> None:
        request = build_summary_responses_request(
            SummaryInput(
                raw_entry_id=101,
                extraction_id=202,
                ai_evaluation_id=303,
                translation_id=None,
                title="Fixture",
                extracted_text="deterministic extracted text",
                evaluation={"scores": {"relevance": 0.8}},
                translated_text=None,
            ),
            model="gpt-5-mini",
        )

        self.assertEqual(request["model"], "gpt-5-mini")
        self.assertEqual(request["text"]["format"]["type"], "json_schema")
        self.assertEqual(request["text"]["format"]["name"], "summary_blocks")
        self.assertTrue(request["text"]["format"]["strict"])

    def test_openai_summary_adapter_parses_injected_client_response(self) -> None:
        class FakeResponses:
            def create(self, **_request: object) -> object:
                return SimpleNamespace(
                    output_text=(
                        '{"oneSentence":"One","detailedSummary":"Details",'
                        '"whyItMatters":"Why","sourceNote":"Source",'
                        '"chinaRelevance":"China","relatedTopics":[]}'
                    )
                )

        client = SimpleNamespace(responses=FakeResponses())
        adapter = OpenAISummaryAdapter(client=client, model="gpt-5-mini")

        result = adapter(
            SummaryInput(
                raw_entry_id=101,
                extraction_id=202,
                ai_evaluation_id=303,
                translation_id=None,
                title="Fixture",
                extracted_text="deterministic extracted text",
                evaluation={"scores": {"relevance": 0.8}},
                translated_text=None,
            )
        )

        self.assertEqual(result.provider, "openai")
        self.assertEqual(result.model, "gpt-5-mini")
        self.assertEqual(result.output["oneSentence"], "One")

    @unittest.skipUnless(os.environ.get("DATABASE_URL"), "DATABASE_URL integration target not set")
    def test_generate_summary_blocks_persists_model_call_and_summary(self) -> None:
        database_url = os.environ["DATABASE_URL"]
        raw_entry_id = self.create_evaluated_raw_entry(database_url, include_translation=True)

        def fake_adapter(input: SummaryInput) -> SummaryAdapterResult:
            self.assertIn("deterministic extracted text", input.extracted_text)
            self.assertIsNotNone(input.translated_text)
            return SummaryAdapterResult(
                provider="fake",
                model="fake-summarizer",
                output=SUMMARY_OUTPUT,
                request_redacted={"rawEntryId": input.raw_entry_id},
                response_redacted={"fixture": True},
                latency_ms=13,
            )

        result = generate_summary_blocks(database_url, raw_entry_id, adapter=fake_adapter)
        model_call = self.latest_model_call(database_url)
        summary = self.latest_summary_block(database_url, raw_entry_id)

        self.assertEqual(result.status, "success")
        self.assertEqual(model_call["status"], "success")
        self.assertEqual(model_call["purpose"], "summary_blocks")
        self.assertEqual(summary["one_sentence"], "One sentence fixture summary.")
        self.assertEqual(summary["model_call_id"], model_call["id"])

    @unittest.skipUnless(os.environ.get("DATABASE_URL"), "DATABASE_URL integration target not set")
    def test_missing_extraction_is_skipped_without_adapter_call(self) -> None:
        database_url = os.environ["DATABASE_URL"]
        raw_entry_id = self.create_evaluated_raw_entry(database_url, include_extraction=False)

        def fail_if_called(_input: SummaryInput) -> SummaryAdapterResult:
            raise AssertionError("missing extraction should not call adapter")

        result = generate_summary_blocks(database_url, raw_entry_id, adapter=fail_if_called)
        model_call = self.latest_model_call(database_url)

        self.assertEqual(result.status, "skipped")
        self.assertEqual(model_call["status"], "skipped")
        self.assertEqual(model_call["provider"], "internal")

    @unittest.skipUnless(os.environ.get("DATABASE_URL"), "DATABASE_URL integration target not set")
    def test_missing_evaluation_is_skipped_without_adapter_call(self) -> None:
        database_url = os.environ["DATABASE_URL"]
        raw_entry_id = self.create_raw_entry(database_url)
        self.add_extraction(database_url, raw_entry_id)

        def fail_if_called(_input: SummaryInput) -> SummaryAdapterResult:
            raise AssertionError("missing evaluation should not call adapter")

        result = generate_summary_blocks(database_url, raw_entry_id, adapter=fail_if_called)
        model_call = self.latest_model_call(database_url)

        self.assertEqual(result.status, "skipped")
        self.assertEqual(model_call["status"], "skipped")
        self.assertEqual(model_call["provider"], "internal")

    @unittest.skipUnless(os.environ.get("DATABASE_URL"), "DATABASE_URL integration target not set")
    def test_adapter_failure_is_logged(self) -> None:
        database_url = os.environ["DATABASE_URL"]
        raw_entry_id = self.create_evaluated_raw_entry(database_url)

        def fail_adapter(_input: SummaryInput) -> SummaryAdapterResult:
            raise RuntimeError("adapter down")

        result = generate_summary_blocks(database_url, raw_entry_id, adapter=fail_adapter)
        model_call = self.latest_model_call(database_url)

        self.assertEqual(result.status, "failure")
        self.assertEqual(result.error_code, "adapter_error")
        self.assertEqual(model_call["status"], "failure")
        self.assertEqual(model_call["error_code"], "adapter_error")

    def create_evaluated_raw_entry(
        self,
        database_url: str,
        *,
        include_extraction: bool = True,
        include_translation: bool = False,
    ) -> int:
        raw_entry_id = self.create_raw_entry(database_url)
        if include_extraction:
            extraction_id = self.add_extraction(database_url, raw_entry_id)
        else:
            extraction_id = None
        self.add_evaluation(database_url, raw_entry_id, extraction_id)
        if include_translation and extraction_id is not None:
            self.add_translation(database_url, raw_entry_id, extraction_id)
        return raw_entry_id

    def create_raw_entry(self, database_url: str) -> int:
        source_url = "https://example.invalid/issue-009-source.xml"
        entry_url = "https://example.invalid/issue-009-entry"
        with psycopg.connect(database_url) as connection:
            with connection.cursor() as cursor:
                cursor.execute("select id from sources where url = %s", (source_url,))
                existing = cursor.fetchone()
                if existing:
                    cursor.execute("delete from raw_entries where source_id = %s", (existing[0],))
                    cursor.execute("delete from sources where id = %s", (existing[0],))

                cursor.execute(
                    """
                    insert into sources (board_id, source_type, title, url, enabled)
                    select id, 'rss', 'Issue 009 Test Source', %s, true
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
                    values (%s, true, 60, 12, 'full_text', 'private_allowed', 'private_only', 'low')
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
                      'issue-009-entry',
                      %s,
                      'Issue 009 Entry',
                      '{"test": "issue-009"}'::jsonb,
                      'issue-009-entry',
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

    def add_extraction(self, database_url: str, raw_entry_id: int) -> int:
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
                      title,
                      extracted_text,
                      text_length,
                      extraction_confidence
                    )
                    values (
                      %s,
                      %s,
                      'fixture',
                      '1',
                      'https://example.invalid/issue-009-entry',
                      'Fixture title',
                      'deterministic extracted text for summary blocks',
                      47,
                      0.75
                    )
                    returning id
                    """,
                    (raw_entry_id, attempt_id),
                )
                extraction_id = cursor.fetchone()[0]
            connection.commit()
        return int(extraction_id)

    def add_evaluation(self, database_url: str, raw_entry_id: int, extraction_id: int | None) -> int:
        with psycopg.connect(database_url) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    insert into model_calls (provider, model, purpose, schema_version, status)
                    values ('fixture', 'fixture-evaluator', 'ai_evaluation', 'ai_evaluation.v1', 'success')
                    returning id
                    """
                )
                model_call_id = cursor.fetchone()[0]
                cursor.execute(
                    """
                    insert into ai_evaluations (
                      raw_entry_id,
                      extraction_id,
                      model_call_id,
                      schema_version,
                      scores_json,
                      rationale_json,
                      evidence_json,
                      summary_json
                    )
                    values (
                      %s,
                      %s,
                      %s,
                      'ai_evaluation.v1',
                      '{"relevance": 0.8}'::jsonb,
                      '{"summary": "fixture"}'::jsonb,
                      '[]'::jsonb,
                      '{"zh": "fixture"}'::jsonb
                    )
                    returning id
                    """,
                    (raw_entry_id, extraction_id, model_call_id),
                )
                evaluation_id = cursor.fetchone()[0]
            connection.commit()
        return int(evaluation_id)

    def add_translation(self, database_url: str, raw_entry_id: int, extraction_id: int) -> int:
        with psycopg.connect(database_url) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    insert into model_calls (provider, model, purpose, schema_version, status)
                    values ('fixture', 'fixture-translator', 'translation', 'translation.v1', 'success')
                    returning id
                    """
                )
                model_call_id = cursor.fetchone()[0]
                cursor.execute(
                    """
                    insert into translations (
                      raw_entry_id,
                      extraction_id,
                      model_call_id,
                      target_language,
                      schema_version,
                      status,
                      translated_text,
                      segments_json,
                      quality_flags_json
                    )
                    values (
                      %s,
                      %s,
                      %s,
                      'zh-Hans',
                      'translation.v1',
                      'draft',
                      'Translated text fixture.',
                      '[]'::jsonb,
                      '[]'::jsonb
                    )
                    returning id
                    """,
                    (raw_entry_id, extraction_id, model_call_id),
                )
                translation_id = cursor.fetchone()[0]
            connection.commit()
        return int(translation_id)

    def latest_model_call(self, database_url: str) -> dict[str, object]:
        with psycopg.connect(database_url, row_factory=dict_row) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    select id::int, provider, purpose, status, error_code
                    from model_calls
                    order by id desc
                    limit 1
                    """
                )
                return cursor.fetchone()

    def latest_summary_block(self, database_url: str, raw_entry_id: int) -> dict[str, object]:
        with psycopg.connect(database_url, row_factory=dict_row) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    select model_call_id::int, one_sentence
                    from summary_blocks
                    where raw_entry_id = %s
                    order by id desc
                    limit 1
                    """,
                    (raw_entry_id,),
                )
                return cursor.fetchone()


if __name__ == "__main__":
    unittest.main()
