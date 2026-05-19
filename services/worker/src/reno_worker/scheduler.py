import os
from collections.abc import Callable

from reno_worker.source_policy import SourcePolicy, read_enabled_source_policies
from reno_worker.tasks import ingest_source_actor


SendTask = Callable[[str, int], object]
ReadPolicies = Callable[[str], list[SourcePolicy]]


def schedule_enabled_rss_sources(
    database_url: str,
    *,
    read_policies: ReadPolicies = read_enabled_source_policies,
    send_task: SendTask = ingest_source_actor.send,
) -> int:
    scheduled = 0

    for policy in read_policies(database_url):
        if policy.source_type not in {"rss", "atom"}:
            continue

        send_task(database_url, policy.source_id)
        scheduled += 1

    return scheduled


def main() -> None:
    database_url = os.environ["DATABASE_URL"]
    schedule_enabled_rss_sources(database_url)


if __name__ == "__main__":
    main()
