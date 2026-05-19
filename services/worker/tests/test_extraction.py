import os
import unittest

import httpx
import psycopg
from psycopg.rows import dict_row

from reno_worker.extraction import extract_raw_entry


ARTICLE_HTML = """
<!doctype html>
<html>
  <head>
    <title>Fixture Article</title>
    <meta name="author" content="Reno Test" />
    <meta property="article:published_time" content="2026-05-20T00:00:00Z" />
  </head>
  <body>
    <article>
      <h1>Fixture Article</h1>
      <p>This is a deterministic article fixture with enough readable body text for extraction.</p>
      <p>It lets the extraction worker run without external network access or browser automation.</p>
    </article>
  </body>
</html>
"""


class ExtractionTest(unittest.TestCase):
    @unittest.skipUnless(os.environ.get("DATABASE_URL"), "DATABASE_URL integration target not set")
    def test_extract_raw_entry_stores_text_for_eligible_source(self) -> None:
        database_url = os.environ["DATABASE_URL"]
        raw_entry_id = self.create_raw_entry(
            database_url,
            save_level="full_text",
            rights_policy="private_allowed",
        )

        result = extract_raw_entry(database_url, raw_entry_id, fetch=lambda _url: ARTICLE_HTML)
        extraction = self.latest_extraction(database_url, raw_entry_id)

        self.assertEqual(result.status, "success")
        self.assertGreater(result.text_length, 80)
        self.assertGreater(result.extraction_confidence, 0)
        self.assertLessEqual(result.extraction_confidence, 1)
        self.assertIn("deterministic article fixture", extraction["extracted_text"])
        self.assertEqual(extraction["extractor_name"], "trafilatura")
        self.assertEqual(self.raw_entry_stage(database_url, raw_entry_id), "extracted")

    @unittest.skipUnless(os.environ.get("DATABASE_URL"), "DATABASE_URL integration target not set")
    def test_metadata_only_source_is_skipped_without_fetch(self) -> None:
        database_url = os.environ["DATABASE_URL"]
        raw_entry_id = self.create_raw_entry(
            database_url,
            save_level="metadata_only",
            rights_policy="metadata_only",
        )

        def fail_if_called(_url: str) -> str:
            raise AssertionError("metadata-only source should not fetch article body")

        result = extract_raw_entry(database_url, raw_entry_id, fetch=fail_if_called)
        attempt = self.latest_attempt(database_url, raw_entry_id)

        self.assertEqual(result.status, "skipped")
        self.assertEqual(result.failure_type, "policy")
        self.assertEqual(attempt["status"], "skipped")

    @unittest.skipUnless(os.environ.get("DATABASE_URL"), "DATABASE_URL integration target not set")
    def test_fetch_failure_is_recorded(self) -> None:
        database_url = os.environ["DATABASE_URL"]
        raw_entry_id = self.create_raw_entry(
            database_url,
            save_level="full_text",
            rights_policy="private_allowed",
        )

        def fail_fetch(url: str) -> str:
            raise httpx.RequestError("network down", request=httpx.Request("GET", url))

        result = extract_raw_entry(database_url, raw_entry_id, fetch=fail_fetch)
        attempt = self.latest_attempt(database_url, raw_entry_id)

        self.assertEqual(result.status, "failure")
        self.assertEqual(result.failure_type, "network")
        self.assertEqual(attempt["failure_type"], "network")

    @unittest.skipUnless(os.environ.get("DATABASE_URL"), "DATABASE_URL integration target not set")
    def test_no_text_extraction_failure_is_recorded(self) -> None:
        database_url = os.environ["DATABASE_URL"]
        raw_entry_id = self.create_raw_entry(
            database_url,
            save_level="full_text",
            rights_policy="private_allowed",
        )

        result = extract_raw_entry(database_url, raw_entry_id, fetch=lambda _url: "<html></html>")
        attempt = self.latest_attempt(database_url, raw_entry_id)

        self.assertEqual(result.status, "failure")
        self.assertEqual(result.failure_type, "parse")
        self.assertEqual(attempt["status"], "failure")

    def create_raw_entry(
        self,
        database_url: str,
        *,
        save_level: str,
        rights_policy: str,
    ) -> int:
        source_url = f"https://example.invalid/issue-006-source-{save_level}.xml"
        entry_url = f"https://example.invalid/issue-006-entry-{save_level}"
        with psycopg.connect(database_url) as connection:
            with connection.cursor() as cursor:
                cursor.execute("select id from sources where url = %s", (source_url,))
                existing = cursor.fetchone()
                if existing:
                    cursor.execute(
                        "delete from raw_entry_extraction_attempts where raw_entry_id in (select id from raw_entries where source_id = %s)",
                        (existing[0],),
                    )
                    cursor.execute(
                        "delete from raw_entries where source_id = %s",
                        (existing[0],),
                    )
                    cursor.execute("delete from sources where id = %s", (existing[0],))

                cursor.execute(
                    """
                    insert into sources (board_id, source_type, title, url, enabled)
                    select id, 'rss', 'Issue 006 Test Source', %s, true
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
                    values (%s, true, 60, 12, %s, %s, 'none', 'low')
                    """,
                    (source_id, save_level, rights_policy),
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
                      'Issue 006 Entry',
                      '{"test": "issue-006"}'::jsonb,
                      %s,
                      'new',
                      'metadata_ingested',
                      %s
                    )
                    returning id
                    """,
                    (
                        source_id,
                        f"issue-006-{save_level}",
                        entry_url,
                        f"issue-006-{save_level}",
                        rights_policy,
                    ),
                )
                raw_entry_id = cursor.fetchone()[0]
            connection.commit()
        return int(raw_entry_id)

    def latest_attempt(self, database_url: str, raw_entry_id: int) -> dict[str, object]:
        with psycopg.connect(database_url, row_factory=dict_row) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    select status, failure_type
                    from raw_entry_extraction_attempts
                    where raw_entry_id = %s
                    order by id desc
                    limit 1
                    """,
                    (raw_entry_id,),
                )
                return cursor.fetchone()

    def latest_extraction(self, database_url: str, raw_entry_id: int) -> dict[str, object]:
        with psycopg.connect(database_url, row_factory=dict_row) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    select extractor_name, extracted_text
                    from raw_entry_extractions
                    where raw_entry_id = %s
                    order by id desc
                    limit 1
                    """,
                    (raw_entry_id,),
                )
                return cursor.fetchone()

    def raw_entry_stage(self, database_url: str, raw_entry_id: int) -> str:
        with psycopg.connect(database_url) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    "select processing_stage from raw_entries where id = %s",
                    (raw_entry_id,),
                )
                return str(cursor.fetchone()[0])


if __name__ == "__main__":
    unittest.main()
