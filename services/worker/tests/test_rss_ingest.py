import os
import unittest

import httpx
import psycopg
from psycopg.rows import dict_row

from reno_worker.rss_ingest import ingest_source, normalize_entry_url


SAMPLE_FEED = """<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Issue 004 Feed</title>
    <link>https://example.invalid/</link>
    <description>Test feed</description>
    <item>
      <guid>issue-004-entry-1</guid>
      <title>Issue 004 Entry 1</title>
      <link>https://example.invalid/news/1#fragment</link>
      <description>First entry summary.</description>
      <pubDate>Wed, 20 May 2026 00:00:00 GMT</pubDate>
    </item>
    <item>
      <guid>issue-004-entry-2</guid>
      <title>Issue 004 Entry 2</title>
      <link>https://example.invalid/news/2</link>
      <description>Second entry summary.</description>
    </item>
  </channel>
</rss>
"""


class RssIngestTest(unittest.TestCase):
    def test_normalize_entry_url_removes_fragment(self) -> None:
        self.assertEqual(
            normalize_entry_url("https://example.invalid/news/1#fragment"),
            "https://example.invalid/news/1",
        )

    @unittest.skipUnless(os.environ.get("DATABASE_URL"), "DATABASE_URL integration target not set")
    def test_ingest_source_inserts_feed_entries_once(self) -> None:
        database_url = os.environ["DATABASE_URL"]
        source_id = self.create_test_source(database_url, enabled=True, crawl_enabled=True)

        result = ingest_source(database_url, source_id, fetch=lambda _url: SAMPLE_FEED)
        second_result = ingest_source(database_url, source_id, fetch=lambda _url: SAMPLE_FEED)

        self.assertEqual(result.entries_seen, 2)
        self.assertEqual(result.entries_inserted, 2)
        self.assertEqual(second_result.entries_inserted, 0)
        self.assertEqual(self.count_raw_entries(database_url, source_id), 2)

    @unittest.skipUnless(os.environ.get("DATABASE_URL"), "DATABASE_URL integration target not set")
    def test_disabled_source_is_skipped_without_fetch(self) -> None:
        database_url = os.environ["DATABASE_URL"]
        source_id = self.create_test_source(database_url, enabled=False, crawl_enabled=True)

        def fail_if_called(_url: str) -> str:
            raise AssertionError("disabled source should not be fetched")

        result = ingest_source(database_url, source_id, fetch=fail_if_called)

        self.assertEqual(result.status, "skipped")
        self.assertEqual(result.failure_type, "policy")
        self.assertEqual(self.latest_attempt(database_url, source_id)["status"], "skipped")

    @unittest.skipUnless(os.environ.get("DATABASE_URL"), "DATABASE_URL integration target not set")
    def test_fetch_failure_is_recorded(self) -> None:
        database_url = os.environ["DATABASE_URL"]
        source_id = self.create_test_source(database_url, enabled=True, crawl_enabled=True)

        def fail_fetch(url: str) -> str:
            raise httpx.RequestError("network down", request=httpx.Request("GET", url))

        result = ingest_source(database_url, source_id, fetch=fail_fetch)
        latest_attempt = self.latest_attempt(database_url, source_id)

        self.assertEqual(result.status, "failure")
        self.assertEqual(result.failure_type, "network")
        self.assertEqual(latest_attempt["status"], "failure")
        self.assertEqual(latest_attempt["failure_type"], "network")

    def create_test_source(self, database_url: str, *, enabled: bool, crawl_enabled: bool) -> int:
        source_url = "https://example.invalid/issue-004-feed.xml"
        with psycopg.connect(database_url) as connection:
            with connection.cursor() as cursor:
                cursor.execute("select id from sources where url = %s", (source_url,))
                existing = cursor.fetchone()
                if existing:
                    cursor.execute("delete from raw_entries where source_id = %s", (existing[0],))
                    cursor.execute("delete from source_ingest_attempts where source_id = %s", (existing[0],))
                    cursor.execute("delete from sources where id = %s", (existing[0],))

                cursor.execute(
                    """
                    insert into sources (board_id, source_type, title, url, enabled)
                    select id, 'rss', 'Issue 004 Test Feed', %s, %s
                    from boards
                    where slug = 'ai'
                    returning id
                    """,
                    (source_url, enabled),
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
                    values (%s, %s, 60, 12, 'metadata_only', 'metadata_only', 'none', 'low')
                    """,
                    (source_id, crawl_enabled),
                )
            connection.commit()
        return int(source_id)

    def count_raw_entries(self, database_url: str, source_id: int) -> int:
        with psycopg.connect(database_url) as connection:
            with connection.cursor() as cursor:
                cursor.execute("select count(*) from raw_entries where source_id = %s", (source_id,))
                return int(cursor.fetchone()[0])

    def latest_attempt(self, database_url: str, source_id: int) -> dict[str, object]:
        with psycopg.connect(database_url, row_factory=dict_row) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    select status, failure_type
                    from source_ingest_attempts
                    where source_id = %s
                    order by id desc
                    limit 1
                    """,
                    (source_id,),
                )
                return cursor.fetchone()


if __name__ == "__main__":
    unittest.main()
