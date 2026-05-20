import unittest

from reno_worker.scheduler import schedule_enabled_sources
from reno_worker.source_policy import SourcePolicy


class SchedulerTest(unittest.TestCase):
    def test_schedule_enabled_sources_enqueues_rss_atom_and_github(self) -> None:
        sent_source_ids: list[int] = []

        def read_policies(_database_url: str) -> list[SourcePolicy]:
            return [
                self.policy(source_id=1, source_type="rss"),
                self.policy(source_id=2, source_type="atom"),
                self.policy(source_id=3, source_type="github"),
                self.policy(source_id=4, source_type="gdelt"),
            ]

        scheduled = schedule_enabled_sources(
            "postgres://example",
            read_policies=read_policies,
            send_task=lambda database_url, source_id: sent_source_ids.append(source_id),
        )

        self.assertEqual(scheduled, 3)
        self.assertEqual(sent_source_ids, [1, 2, 3])

    def policy(self, *, source_id: int, source_type: str) -> SourcePolicy:
        return SourcePolicy(
            source_id=source_id,
            board_slug="ai",
            source_type=source_type,
            title="Example",
            url="https://example.invalid/feed.xml",
            crawl_enabled=True,
            fetch_interval_minutes=60,
            max_requests_per_hour=12,
            save_level="metadata_only",
            rights_policy="metadata_only",
            translation_policy="none",
            risk_level="low",
        )


if __name__ == "__main__":
    unittest.main()
