from dataclasses import dataclass
from typing import Any, Callable

import psycopg
from psycopg.rows import dict_row


@dataclass(frozen=True)
class SourcePolicy:
    source_id: int
    board_slug: str
    source_type: str
    title: str
    url: str
    crawl_enabled: bool
    fetch_interval_minutes: int
    max_requests_per_hour: int
    save_level: str
    rights_policy: str
    translation_policy: str
    risk_level: str


Connect = Callable[..., Any]


def read_enabled_source_policies(
    database_url: str, connect: Connect = psycopg.connect
) -> list[SourcePolicy]:
    with connect(database_url, row_factory=dict_row) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                select
                  s.id::int as source_id,
                  b.slug as board_slug,
                  s.source_type,
                  s.title,
                  s.url,
                  sp.crawl_enabled,
                  sp.fetch_interval_minutes,
                  sp.max_requests_per_hour,
                  sp.save_level,
                  sp.rights_policy,
                  sp.translation_policy,
                  sp.risk_level
                from sources s
                join boards b on b.id = s.board_id
                join source_policies sp on sp.source_id = s.id
                where s.enabled = true and sp.crawl_enabled = true
                order by s.id
                """
            )
            rows = cursor.fetchall()

    return [
        SourcePolicy(
            source_id=int(row["source_id"]),
            board_slug=str(row["board_slug"]),
            source_type=str(row["source_type"]),
            title=str(row["title"]),
            url=str(row["url"]),
            crawl_enabled=bool(row["crawl_enabled"]),
            fetch_interval_minutes=int(row["fetch_interval_minutes"]),
            max_requests_per_hour=int(row["max_requests_per_hour"]),
            save_level=str(row["save_level"]),
            rights_policy=str(row["rights_policy"]),
            translation_policy=str(row["translation_policy"]),
            risk_level=str(row["risk_level"]),
        )
        for row in rows
    ]
