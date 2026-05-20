import hashlib
import os
import unittest

import psycopg
from psycopg.rows import dict_row

from reno_worker.github_ingest import (
    GithubHttpResponse,
    GithubSource,
    collect_github_source_entries,
    ingest_github_source,
)


REPOSITORY_RESPONSE = {
    "id": 42,
    "node_id": "R_kgDOExample",
    "full_name": "example/project",
    "html_url": "https://github.com/example/project",
    "description": "Example project metadata",
    "pushed_at": "2026-05-20T12:00:00Z",
    "updated_at": "2026-05-20T12:30:00Z",
    "license": {"spdx_id": "MIT"},
}

RELEASES_RESPONSE = [
    {
        "id": 101,
        "node_id": "RE_kwDOExample",
        "tag_name": "v1.2.3",
        "name": "Version 1.2.3",
        "html_url": "https://github.com/example/project/releases/tag/v1.2.3",
        "body": "Release notes",
        "draft": False,
        "prerelease": False,
        "published_at": "2026-05-21T08:00:00Z",
        "created_at": "2026-05-21T07:30:00Z",
    },
    {
        "id": 102,
        "node_id": "RE_kwDODraft",
        "tag_name": "v1.2.4-draft",
        "name": "Draft release",
        "html_url": "https://github.com/example/project/releases/tag/v1.2.4-draft",
        "body": "Draft notes",
        "draft": True,
        "prerelease": False,
        "published_at": None,
        "created_at": "2026-05-21T09:00:00Z",
    },
]


class GithubIngestTest(unittest.TestCase):
    def test_collect_github_source_entries_normalizes_repository_and_published_releases(self) -> None:
        calls: list[str] = []

        def fetch(url: str, headers: dict[str, str]) -> GithubHttpResponse:
            calls.append(url)
            self.assertEqual(headers["Accept"], "application/vnd.github+json")
            self.assertEqual(headers["X-GitHub-Api-Version"], "2026-03-10")
            if url == "https://api.github.com/repos/example/project":
                return GithubHttpResponse(status_code=200, json_body=REPOSITORY_RESPONSE, headers={})
            if url == "https://api.github.com/repos/example/project/releases":
                return GithubHttpResponse(status_code=200, json_body=RELEASES_RESPONSE, headers={})
            raise AssertionError(f"unexpected URL: {url}")

        result = collect_github_source_entries(
            GithubSource(
                source_id=7,
                url="https://github.com/example/project",
                enabled=True,
                crawl_enabled=True,
                rights_policy="metadata_only",
            ),
            fetch=fetch,
        )

        self.assertEqual(result.status, "success")
        self.assertEqual(result.entries_seen, 2)
        self.assertEqual(calls, [
            "https://api.github.com/repos/example/project",
            "https://api.github.com/repos/example/project/releases",
        ])

        repository_entry = result.entries[0]
        release_entry = result.entries[1]

        self.assertEqual(repository_entry.external_id, "github:repository:example/project")
        self.assertEqual(repository_entry.url, "https://github.com/example/project")
        self.assertEqual(repository_entry.title, "example/project")
        self.assertEqual(repository_entry.summary_raw, "Example project metadata")
        self.assertEqual(repository_entry.published_at, "2026-05-20T12:00:00Z")
        self.assertEqual(
            repository_entry.canonical_hash,
            hashlib.sha256("https://github.com/example/project".encode("utf-8")).hexdigest(),
        )
        self.assertEqual(repository_entry.raw_payload_json["provider"], "github")
        self.assertEqual(repository_entry.raw_payload_json["endpoint"], "repository")

        self.assertEqual(release_entry.external_id, "github:release:example/project:101")
        self.assertEqual(
            release_entry.url,
            "https://github.com/example/project/releases/tag/v1.2.3",
        )
        self.assertEqual(release_entry.title, "Version 1.2.3")
        self.assertEqual(release_entry.summary_raw, "Release notes")
        self.assertEqual(release_entry.published_at, "2026-05-21T08:00:00Z")
        self.assertEqual(release_entry.raw_payload_json["endpoint"], "release")
        self.assertEqual(release_entry.raw_payload_json["tag_name"], "v1.2.3")

    def test_collect_github_source_entries_classifies_rate_limit_and_stops(self) -> None:
        calls: list[str] = []

        def fetch(url: str, _headers: dict[str, str]) -> GithubHttpResponse:
            calls.append(url)
            return GithubHttpResponse(
                status_code=403,
                json_body={"message": "You have exceeded a secondary rate limit."},
                headers={"retry-after": "60"},
            )

        result = collect_github_source_entries(
            GithubSource(
                source_id=7,
                url="https://github.com/example/project",
                enabled=True,
                crawl_enabled=True,
                rights_policy="metadata_only",
            ),
            fetch=fetch,
        )

        self.assertEqual(result.status, "failure")
        self.assertEqual(result.failure_type, "rate_limit")
        self.assertEqual(result.entries_seen, 0)
        self.assertEqual(result.entries, [])
        self.assertIn("retry-after", result.message or "")
        self.assertEqual(calls, ["https://api.github.com/repos/example/project"])

    @unittest.skipUnless(os.environ.get("DATABASE_URL"), "DATABASE_URL integration target not set")
    def test_ingest_github_source_inserts_entries_once_and_records_attempts(self) -> None:
        database_url = os.environ["DATABASE_URL"]
        source_id = self.create_test_source(database_url)

        try:
            def fetch(url: str, _headers: dict[str, str]) -> GithubHttpResponse:
                if url == "https://api.github.com/repos/example/project":
                    return GithubHttpResponse(status_code=200, json_body=REPOSITORY_RESPONSE, headers={})
                if url == "https://api.github.com/repos/example/project/releases":
                    return GithubHttpResponse(status_code=200, json_body=RELEASES_RESPONSE, headers={})
                raise AssertionError(f"unexpected URL: {url}")

            result = ingest_github_source(database_url, source_id, fetch=fetch)
            second_result = ingest_github_source(database_url, source_id, fetch=fetch)

            self.assertEqual(result.status, "success")
            self.assertEqual(result.entries_seen, 2)
            self.assertEqual(result.entries_inserted, 2)
            self.assertEqual(second_result.entries_inserted, 0)
            self.assertEqual(
                self.raw_entry_external_ids(database_url, source_id),
                [
                    "github:release:example/project:101",
                    "github:repository:example/project",
                ],
            )
            self.assertEqual(self.latest_attempt(database_url, source_id)["status"], "success")
        finally:
            self.cleanup_test_source(database_url)

    @unittest.skipUnless(os.environ.get("DATABASE_URL"), "DATABASE_URL integration target not set")
    def test_ingest_github_source_records_rate_limit_attempts(self) -> None:
        database_url = os.environ["DATABASE_URL"]
        source_id = self.create_test_source(database_url)

        try:
            def fetch(_url: str, _headers: dict[str, str]) -> GithubHttpResponse:
                return GithubHttpResponse(
                    status_code=429,
                    json_body={"message": "API rate limit exceeded"},
                    headers={"x-ratelimit-remaining": "0", "x-ratelimit-reset": "1779300000"},
                )

            result = ingest_github_source(database_url, source_id, fetch=fetch)
            latest_attempt = self.latest_attempt(database_url, source_id)

            self.assertEqual(result.status, "failure")
            self.assertEqual(result.failure_type, "rate_limit")
            self.assertEqual(result.entries_inserted, 0)
            self.assertEqual(latest_attempt["status"], "failure")
            self.assertEqual(latest_attempt["failure_type"], "rate_limit")
        finally:
            self.cleanup_test_source(database_url)

    def create_test_source(self, database_url: str) -> int:
        source_url = "https://github.com/example/project"
        self.cleanup_test_source(database_url)
        with psycopg.connect(database_url) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    insert into sources (board_id, source_type, title, url, enabled)
                    select id, 'github', 'Example Project', %s, true
                    from boards
                    where slug = 'open-source'
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
                    values (%s, true, 60, 12, 'metadata_only', 'metadata_only', 'none', 'low')
                    """,
                    (source_id,),
                )
            connection.commit()
        return int(source_id)

    def cleanup_test_source(self, database_url: str) -> None:
        source_url = "https://github.com/example/project"
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
