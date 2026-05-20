import hashlib
import os
import unittest

import psycopg
from psycopg.rows import dict_row

from reno_worker.arxiv_ingest import (
    ArxivHttpResponse,
    ArxivSource,
    collect_arxiv_source_entries,
    ingest_arxiv_source,
)


PAGE_1 = """<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom"
      xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/"
      xmlns:arxiv="http://arxiv.org/schemas/atom">
  <opensearch:totalResults>3</opensearch:totalResults>
  <opensearch:startIndex>0</opensearch:startIndex>
  <opensearch:itemsPerPage>2</opensearch:itemsPerPage>
  <entry>
    <id>http://arxiv.org/abs/2401.00001v2</id>
    <published>2024-01-01T00:00:00Z</published>
    <updated>2024-01-02T00:00:00Z</updated>
    <title> Sample Paper One </title>
    <summary>
      A compact abstract for the first paper.
    </summary>
    <author><name>Ada Lovelace</name></author>
    <author><name>Grace Hopper</name></author>
    <category term="cs.AI" scheme="http://arxiv.org/schemas/atom"/>
    <category term="cs.LG" scheme="http://arxiv.org/schemas/atom"/>
    <arxiv:primary_category term="cs.AI" scheme="http://arxiv.org/schemas/atom"/>
    <arxiv:comment>12 pages</arxiv:comment>
    <arxiv:doi>10.48550/arXiv.2401.00001</arxiv:doi>
    <link href="http://arxiv.org/abs/2401.00001v2" rel="alternate" type="text/html"/>
    <link title="pdf" href="http://arxiv.org/pdf/2401.00001v2" rel="related" type="application/pdf"/>
  </entry>
  <entry>
    <id>http://arxiv.org/abs/2401.00002</id>
    <published>2024-01-03T00:00:00Z</published>
    <updated>2024-01-03T00:00:00Z</updated>
    <title>Sample Paper Two</title>
    <summary>Second abstract.</summary>
    <author><name>Katherine Johnson</name></author>
    <category term="cs.CL" scheme="http://arxiv.org/schemas/atom"/>
    <arxiv:primary_category term="cs.CL" scheme="http://arxiv.org/schemas/atom"/>
    <link href="http://arxiv.org/abs/2401.00002" rel="alternate" type="text/html"/>
  </entry>
</feed>
"""

PAGE_2 = """<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom"
      xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/"
      xmlns:arxiv="http://arxiv.org/schemas/atom">
  <opensearch:totalResults>3</opensearch:totalResults>
  <opensearch:startIndex>2</opensearch:startIndex>
  <opensearch:itemsPerPage>1</opensearch:itemsPerPage>
  <entry>
    <id>http://arxiv.org/abs/2401.00003</id>
    <published>2024-01-04T00:00:00Z</published>
    <updated>2024-01-04T00:00:00Z</updated>
    <title>Sample Paper Three</title>
    <summary>Third abstract.</summary>
    <author><name>Margaret Hamilton</name></author>
    <category term="stat.ML" scheme="http://arxiv.org/schemas/atom"/>
    <arxiv:primary_category term="stat.ML" scheme="http://arxiv.org/schemas/atom"/>
    <link href="http://arxiv.org/abs/2401.00003" rel="alternate" type="text/html"/>
  </entry>
</feed>
"""


class ArxivIngestTest(unittest.TestCase):
    def test_collect_arxiv_source_entries_normalizes_atom_pages_with_serial_throttle(self) -> None:
        calls: list[str] = []
        sleeps: list[float] = []

        def fetch(url: str, headers: dict[str, str]) -> ArxivHttpResponse:
            calls.append(url)
            self.assertEqual(headers["Accept"], "application/atom+xml")
            self.assertEqual(headers["User-Agent"], "reno-news-worker/0.1")
            if "start=0" in url:
                return ArxivHttpResponse(status_code=200, text=PAGE_1, headers={})
            if "start=2" in url:
                return ArxivHttpResponse(status_code=200, text=PAGE_2, headers={})
            raise AssertionError(f"unexpected URL: {url}")

        result = collect_arxiv_source_entries(
            ArxivSource(
                source_id=9,
                url=(
                    "https://export.arxiv.org/api/query?"
                    "search_query=cat:cs.AI&max_results=2&sortBy=submittedDate&sortOrder=descending"
                ),
                enabled=True,
                crawl_enabled=True,
                rights_policy="metadata_only",
            ),
            fetch=fetch,
            sleep=sleeps.append,
            max_pages=2,
        )

        self.assertEqual(result.status, "success")
        self.assertEqual(result.entries_seen, 3)
        self.assertEqual(sleeps, [3.0])
        self.assertEqual(
            calls,
            [
                "https://export.arxiv.org/api/query?search_query=cat%3Acs.AI&start=0&max_results=2&sortBy=submittedDate&sortOrder=descending",
                "https://export.arxiv.org/api/query?search_query=cat%3Acs.AI&start=2&max_results=2&sortBy=submittedDate&sortOrder=descending",
            ],
        )

        first_entry = result.entries[0]
        self.assertEqual(first_entry.external_id, "arxiv:2401.00001")
        self.assertEqual(first_entry.url, "https://arxiv.org/abs/2401.00001")
        self.assertEqual(first_entry.title, "Sample Paper One")
        self.assertEqual(first_entry.summary_raw, "A compact abstract for the first paper.")
        self.assertEqual(first_entry.published_at, "2024-01-01T00:00:00Z")
        self.assertEqual(
            first_entry.canonical_hash,
            hashlib.sha256("https://arxiv.org/abs/2401.00001".encode("utf-8")).hexdigest(),
        )
        self.assertEqual(first_entry.raw_payload_json["provider"], "arxiv")
        self.assertEqual(first_entry.raw_payload_json["arxiv_id"], "2401.00001")
        self.assertEqual(first_entry.raw_payload_json["authors"], ["Ada Lovelace", "Grace Hopper"])
        self.assertEqual(first_entry.raw_payload_json["categories"], ["cs.AI", "cs.LG"])
        self.assertEqual(first_entry.raw_payload_json["primary_category"], "cs.AI")
        self.assertEqual(
            first_entry.raw_payload_json["attribution"],
            "Thank you to arXiv for use of its open access interoperability.",
        )
        self.assertNotIn("pdf_url", first_entry.raw_payload_json)

    def test_collect_arxiv_source_entries_rejects_unallowlisted_queries_before_fetch(self) -> None:
        calls: list[str] = []

        result = collect_arxiv_source_entries(
            ArxivSource(
                source_id=9,
                url="https://export.arxiv.org/api/query?search_query=all:electron&max_results=10",
                enabled=True,
                crawl_enabled=True,
                rights_policy="metadata_only",
            ),
            fetch=lambda url, _headers: calls.append(url) or ArxivHttpResponse(200, PAGE_1, {}),
        )

        self.assertEqual(result.status, "failure")
        self.assertEqual(result.failure_type, "policy")
        self.assertIn("not allowlisted", result.message or "")
        self.assertEqual(calls, [])

    def test_collect_arxiv_source_entries_classifies_rate_limit(self) -> None:
        result = collect_arxiv_source_entries(
            ArxivSource(
                source_id=9,
                url="https://export.arxiv.org/api/query?search_query=cat:cs.AI&max_results=10",
                enabled=True,
                crawl_enabled=True,
                rights_policy="metadata_only",
            ),
            fetch=lambda _url, _headers: ArxivHttpResponse(status_code=429, text="", headers={}),
        )

        self.assertEqual(result.status, "failure")
        self.assertEqual(result.failure_type, "rate_limit")
        self.assertEqual(result.entries_seen, 0)
        self.assertEqual(result.entries, [])

    @unittest.skipUnless(os.environ.get("DATABASE_URL"), "DATABASE_URL integration target not set")
    def test_ingest_arxiv_source_inserts_entries_once_and_records_attempts(self) -> None:
        database_url = os.environ["DATABASE_URL"]
        source_id = self.create_test_source(database_url)

        try:
            def fetch(_url: str, _headers: dict[str, str]) -> ArxivHttpResponse:
                return ArxivHttpResponse(status_code=200, text=PAGE_1, headers={})

            result = ingest_arxiv_source(database_url, source_id, fetch=fetch)
            second_result = ingest_arxiv_source(database_url, source_id, fetch=fetch)

            self.assertEqual(result.status, "success")
            self.assertEqual(result.entries_seen, 2)
            self.assertEqual(result.entries_inserted, 2)
            self.assertEqual(second_result.entries_inserted, 0)
            self.assertEqual(
                self.raw_entry_external_ids(database_url, source_id),
                ["arxiv:2401.00001", "arxiv:2401.00002"],
            )
            self.assertEqual(self.latest_attempt(database_url, source_id)["status"], "success")
        finally:
            self.cleanup_test_source(database_url)

    @unittest.skipUnless(os.environ.get("DATABASE_URL"), "DATABASE_URL integration target not set")
    def test_ingest_arxiv_source_records_rate_limit_attempts(self) -> None:
        database_url = os.environ["DATABASE_URL"]
        source_id = self.create_test_source(database_url)

        try:
            result = ingest_arxiv_source(
                database_url,
                source_id,
                fetch=lambda _url, _headers: ArxivHttpResponse(status_code=503, text="", headers={}),
            )
            latest_attempt = self.latest_attempt(database_url, source_id)

            self.assertEqual(result.status, "failure")
            self.assertEqual(result.failure_type, "rate_limit")
            self.assertEqual(result.entries_inserted, 0)
            self.assertEqual(latest_attempt["status"], "failure")
            self.assertEqual(latest_attempt["failure_type"], "rate_limit")
        finally:
            self.cleanup_test_source(database_url)

    def create_test_source(self, database_url: str) -> int:
        source_url = "https://export.arxiv.org/api/query?search_query=cat:cs.AI&max_results=10"
        self.cleanup_test_source(database_url)
        with psycopg.connect(database_url) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    insert into sources (board_id, source_type, title, url, enabled)
                    select id, 'arxiv', 'arXiv cs.AI', %s, true
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
                    values (%s, true, 180, 1, 'metadata_only', 'metadata_only', 'none', 'low')
                    """,
                    (source_id,),
                )
            connection.commit()
        return int(source_id)

    def cleanup_test_source(self, database_url: str) -> None:
        source_url = "https://export.arxiv.org/api/query?search_query=cat:cs.AI&max_results=10"
        with psycopg.connect(database_url) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    delete from raw_entries
                    where source_id in (select id from sources where url = %s)
                    """,
                    (source_url,),
                )
                cursor.execute(
                    """
                    delete from source_ingest_attempts
                    where source_id in (select id from sources where url = %s)
                    """,
                    (source_url,),
                )
                cursor.execute("delete from sources where url = %s", (source_url,))
            connection.commit()

    def raw_entry_external_ids(self, database_url: str, source_id: int) -> list[str]:
        with psycopg.connect(database_url) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    select external_id
                    from raw_entries
                    where source_id = %s
                    order by external_id
                    """,
                    (source_id,),
                )
                return [str(row[0]) for row in cursor.fetchall()]

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
