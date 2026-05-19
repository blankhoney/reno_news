import os
import unittest
from types import SimpleNamespace

import psycopg
from psycopg.rows import dict_row

from reno_worker.translation import (
    TranslationAdapterResult,
    TranslationInput,
    OpenAITranslationAdapter,
    build_translation_responses_request,
    translate_raw_entry,
)


TRANSLATION_OUTPUT = {
    "targetLanguage": "zh-Hans",
    "translatedTitle": "Translated fixture title",
    "translatedText": "Translated deterministic extracted text.",
    "segments": [
        {
            "sourceText": "deterministic extracted text",
            "translatedText": "Translated deterministic extracted text.",
        }
    ],
    "qualityFlags": [],
}


class TranslationTest(unittest.TestCase):
    def test_translation_request_uses_structured_output_schema(self) -> None:
        request = build_translation_responses_request(
            TranslationInput(
                raw_entry_id=101,
                extraction_id=202,
                title="Fixture",
                extracted_text="deterministic extracted text",
            ),
            model="gpt-5-mini",
        )

        self.assertEqual(request["model"], "gpt-5-mini")
        self.assertEqual(request["text"]["format"]["type"], "json_schema")
        self.assertEqual(request["text"]["format"]["name"], "translation_draft")
        self.assertTrue(request["text"]["format"]["strict"])

    def test_openai_translation_adapter_parses_injected_client_response(self) -> None:
        class FakeResponses:
            def create(self, **_request: object) -> object:
                return SimpleNamespace(
                    output_text=(
                        '{"targetLanguage":"zh-Hans","translatedTitle":"Title",'
                        '"translatedText":"Translated text","segments":[],'
                        '"qualityFlags":[]}'
                    )
                )

        client = SimpleNamespace(responses=FakeResponses())
        adapter = OpenAITranslationAdapter(client=client, model="gpt-5-mini")

        result = adapter(
            TranslationInput(
                raw_entry_id=101,
                extraction_id=202,
                title="Fixture",
                extracted_text="deterministic extracted text",
            )
        )

        self.assertEqual(result.provider, "openai")
        self.assertEqual(result.model, "gpt-5-mini")
        self.assertEqual(result.output["targetLanguage"], "zh-Hans")

    @unittest.skipUnless(os.environ.get("DATABASE_URL"), "DATABASE_URL integration target not set")
    def test_translate_raw_entry_persists_model_call_and_translation(self) -> None:
        database_url = os.environ["DATABASE_URL"]
        raw_entry_id = self.create_extracted_raw_entry(database_url, translation_policy="private_only")

        def fake_adapter(input: TranslationInput) -> TranslationAdapterResult:
            self.assertIn("deterministic extracted text", input.extracted_text)
            return TranslationAdapterResult(
                provider="fake",
                model="fake-translator",
                output=TRANSLATION_OUTPUT,
                request_redacted={"rawEntryId": input.raw_entry_id},
                response_redacted={"fixture": True},
                latency_ms=11,
            )

        result = translate_raw_entry(database_url, raw_entry_id, adapter=fake_adapter)
        model_call = self.latest_model_call(database_url)
        translation = self.latest_translation(database_url, raw_entry_id)

        self.assertEqual(result.status, "success")
        self.assertEqual(model_call["status"], "success")
        self.assertEqual(model_call["purpose"], "translation")
        self.assertEqual(translation["translated_text"], "Translated deterministic extracted text.")
        self.assertEqual(translation["model_call_id"], model_call["id"])

    @unittest.skipUnless(os.environ.get("DATABASE_URL"), "DATABASE_URL integration target not set")
    def test_missing_extraction_is_skipped_without_adapter_call(self) -> None:
        database_url = os.environ["DATABASE_URL"]
        raw_entry_id = self.create_raw_entry(database_url, translation_policy="private_only")

        def fail_if_called(_input: TranslationInput) -> TranslationAdapterResult:
            raise AssertionError("missing extraction should not call adapter")

        result = translate_raw_entry(database_url, raw_entry_id, adapter=fail_if_called)
        model_call = self.latest_model_call(database_url)

        self.assertEqual(result.status, "skipped")
        self.assertEqual(model_call["status"], "skipped")
        self.assertEqual(model_call["provider"], "internal")

    @unittest.skipUnless(os.environ.get("DATABASE_URL"), "DATABASE_URL integration target not set")
    def test_disabled_translation_policy_is_skipped_without_adapter_call(self) -> None:
        database_url = os.environ["DATABASE_URL"]
        raw_entry_id = self.create_extracted_raw_entry(database_url, translation_policy="none")

        def fail_if_called(_input: TranslationInput) -> TranslationAdapterResult:
            raise AssertionError("disabled translation policy should not call adapter")

        result = translate_raw_entry(database_url, raw_entry_id, adapter=fail_if_called)
        model_call = self.latest_model_call(database_url)

        self.assertEqual(result.status, "skipped")
        self.assertEqual(model_call["status"], "skipped")
        self.assertEqual(model_call["provider"], "internal")

    @unittest.skipUnless(os.environ.get("DATABASE_URL"), "DATABASE_URL integration target not set")
    def test_blocked_rights_status_is_skipped_without_adapter_call(self) -> None:
        database_url = os.environ["DATABASE_URL"]
        raw_entry_id = self.create_extracted_raw_entry(database_url, translation_policy="private_only")
        self.set_rights_status(database_url, raw_entry_id, "blocked")

        def fail_if_called(_input: TranslationInput) -> TranslationAdapterResult:
            raise AssertionError("blocked rights should not call adapter")

        result = translate_raw_entry(database_url, raw_entry_id, adapter=fail_if_called)
        model_call = self.latest_model_call(database_url)

        self.assertEqual(result.status, "skipped")
        self.assertEqual(model_call["status"], "skipped")
        self.assertEqual(model_call["provider"], "internal")

    @unittest.skipUnless(os.environ.get("DATABASE_URL"), "DATABASE_URL integration target not set")
    def test_adapter_failure_is_logged(self) -> None:
        database_url = os.environ["DATABASE_URL"]
        raw_entry_id = self.create_extracted_raw_entry(database_url, translation_policy="private_only")

        def fail_adapter(_input: TranslationInput) -> TranslationAdapterResult:
            raise RuntimeError("adapter down")

        result = translate_raw_entry(database_url, raw_entry_id, adapter=fail_adapter)
        model_call = self.latest_model_call(database_url)

        self.assertEqual(result.status, "failure")
        self.assertEqual(result.error_code, "adapter_error")
        self.assertEqual(model_call["status"], "failure")
        self.assertEqual(model_call["error_code"], "adapter_error")

    def create_raw_entry(self, database_url: str, *, translation_policy: str) -> int:
        source_url = f"https://example.invalid/issue-008-source-{translation_policy}.xml"
        entry_url = f"https://example.invalid/issue-008-entry-{translation_policy}"
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
                    select id, 'rss', 'Issue 008 Test Source', %s, true
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
                    values (%s, true, 60, 12, 'full_text', 'private_allowed', %s, 'low')
                    """,
                    (source_id, translation_policy),
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
                      %s,
                      %s,
                      'Issue 008 Entry',
                      '{"test": "issue-008"}'::jsonb,
                      %s,
                      'new',
                      'extracted',
                      'private_allowed'
                    )
                    returning id
                    """,
                    (
                        source_id,
                        f"issue-008-entry-{translation_policy}",
                        entry_url,
                        f"issue-008-entry-{translation_policy}",
                    ),
                )
                raw_entry_id = cursor.fetchone()[0]
            connection.commit()
        return int(raw_entry_id)

    def create_extracted_raw_entry(self, database_url: str, *, translation_policy: str) -> int:
        raw_entry_id = self.create_raw_entry(database_url, translation_policy=translation_policy)
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
                      'https://example.invalid/issue-008-entry',
                      'Fixture title',
                      'deterministic extracted text for translation',
                      45,
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
                    select id::int, provider, purpose, status, error_code
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

    def latest_translation(self, database_url: str, raw_entry_id: int) -> dict[str, object]:
        with psycopg.connect(database_url, row_factory=dict_row) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    select model_call_id::int, translated_text
                    from translations
                    where raw_entry_id = %s
                    order by id desc
                    limit 1
                    """,
                    (raw_entry_id,),
                )
                return cursor.fetchone()


if __name__ == "__main__":
    unittest.main()
