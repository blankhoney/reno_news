import os
import unittest

from reno_worker.source_policy import read_enabled_source_policies


class FakeCursor:
    def __enter__(self) -> "FakeCursor":
        return self

    def __exit__(self, *args: object) -> None:
        return None

    def execute(self, query: str) -> None:
        self.query = query

    def fetchall(self) -> list[dict[str, object]]:
        return [
            {
                "source_id": 1,
                "board_slug": "ai",
                "source_type": "rss",
                "title": "OpenAI News",
                "url": "https://openai.com/news/rss.xml",
                "crawl_enabled": True,
                "fetch_interval_minutes": 60,
                "max_requests_per_hour": 12,
                "save_level": "metadata_only",
                "rights_policy": "metadata_only",
                "translation_policy": "none",
                "risk_level": "medium",
            }
        ]


class FakeConnection:
    def __enter__(self) -> "FakeConnection":
        return self

    def __exit__(self, *args: object) -> None:
        return None

    def cursor(self) -> FakeCursor:
        return FakeCursor()


class SourcePolicyTest(unittest.TestCase):
    def test_read_enabled_source_policies_maps_rows(self) -> None:
        def connect(database_url: str, row_factory: object) -> FakeConnection:
            self.assertEqual(database_url, "postgres://example")
            self.assertIsNotNone(row_factory)
            return FakeConnection()

        policies = read_enabled_source_policies("postgres://example", connect=connect)

        self.assertEqual(len(policies), 1)
        self.assertEqual(policies[0].source_id, 1)
        self.assertEqual(policies[0].board_slug, "ai")
        self.assertEqual(policies[0].rights_policy, "metadata_only")

    @unittest.skipUnless(os.environ.get("DATABASE_URL"), "DATABASE_URL integration target not set")
    def test_read_enabled_source_policies_from_postgres(self) -> None:
        policies = read_enabled_source_policies(os.environ["DATABASE_URL"])

        self.assertTrue(any(policy.url == "https://openai.com/news/rss.xml" for policy in policies))


if __name__ == "__main__":
    unittest.main()
