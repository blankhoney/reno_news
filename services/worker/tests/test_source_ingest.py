import unittest

from reno_worker.rss_ingest import IngestResult
from reno_worker.source_ingest import ingest_configured_source


class SourceIngestTest(unittest.TestCase):
    def test_ingest_configured_source_dispatches_github_sources(self) -> None:
        calls: list[tuple[str, str, int]] = []

        def ingest_rss(database_url: str, source_id: int) -> IngestResult:
            calls.append(("rss", database_url, source_id))
            raise AssertionError("github source should not use RSS ingest")

        def ingest_github(database_url: str, source_id: int) -> IngestResult:
            calls.append(("github", database_url, source_id))
            return IngestResult(source_id=source_id, status="success", entries_seen=2, entries_inserted=2)

        result = ingest_configured_source(
            "postgres://example",
            42,
            read_source_type=lambda _database_url, _source_id: "github",
            ingest_rss=ingest_rss,
            ingest_github=ingest_github,
        )

        self.assertEqual(result.status, "success")
        self.assertEqual(calls, [("github", "postgres://example", 42)])

    def test_ingest_configured_source_keeps_rss_and_atom_on_rss_ingest(self) -> None:
        calls: list[tuple[str, str, int]] = []

        def ingest_rss(database_url: str, source_id: int) -> IngestResult:
            calls.append(("rss", database_url, source_id))
            return IngestResult(source_id=source_id, status="success", entries_seen=1, entries_inserted=1)

        def ingest_github(database_url: str, source_id: int) -> IngestResult:
            calls.append(("github", database_url, source_id))
            raise AssertionError("RSS/Atom source should not use GitHub ingest")

        for source_type in ["rss", "atom"]:
            result = ingest_configured_source(
                "postgres://example",
                7,
                read_source_type=lambda _database_url, _source_id, value=source_type: value,
                ingest_rss=ingest_rss,
                ingest_github=ingest_github,
            )
            self.assertEqual(result.status, "success")

        self.assertEqual(
            calls,
            [
                ("rss", "postgres://example", 7),
                ("rss", "postgres://example", 7),
            ],
        )


if __name__ == "__main__":
    unittest.main()
