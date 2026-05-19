import hashlib
import json
from dataclasses import dataclass
from datetime import datetime, timezone
from time import struct_time
from typing import Callable
from urllib.parse import urldefrag

import feedparser
import httpx
import psycopg
from psycopg.rows import dict_row


FetchFeed = Callable[[str], str]


@dataclass(frozen=True)
class IngestResult:
    source_id: int
    status: str
    entries_seen: int
    entries_inserted: int
    failure_type: str | None = None
    message: str | None = None


def normalize_entry_url(url: str) -> str:
    normalized_url, _fragment = urldefrag(url.strip())
    return normalized_url


def fetch_feed(url: str) -> str:
    response = httpx.get(url, timeout=20.0, headers={"user-agent": "reno-news-worker/0.1"})
    response.raise_for_status()
    return response.text


def ingest_source(database_url: str, source_id: int, fetch: FetchFeed = fetch_feed) -> IngestResult:
    with psycopg.connect(database_url, row_factory=dict_row) as connection:
        source = read_source(connection, source_id)

        if source is None:
            raise ValueError(f"Source not found: {source_id}")

        if not source["enabled"] or not source["crawl_enabled"]:
            result = IngestResult(
                source_id=source_id,
                status="skipped",
                entries_seen=0,
                entries_inserted=0,
                failure_type="policy",
                message="Source or crawl policy disabled",
            )
            record_attempt(connection, result)
            connection.commit()
            return result

        try:
            feed_text = fetch(str(source["url"]))
            parsed = feedparser.parse(feed_text)

            if parsed.bozo and not parsed.entries:
                result = IngestResult(
                    source_id=source_id,
                    status="failure",
                    entries_seen=0,
                    entries_inserted=0,
                    failure_type="parse",
                    message=str(parsed.bozo_exception),
                )
                record_attempt(connection, result)
                connection.commit()
                return result

            entries_inserted = 0
            for entry in parsed.entries:
                inserted = insert_raw_entry(connection, source_id, source, entry)
                entries_inserted += int(inserted)

            result = IngestResult(
                source_id=source_id,
                status="success",
                entries_seen=len(parsed.entries),
                entries_inserted=entries_inserted,
            )
            record_attempt(connection, result)
            connection.commit()
            return result
        except httpx.HTTPError as error:
            result = IngestResult(
                source_id=source_id,
                status="failure",
                entries_seen=0,
                entries_inserted=0,
                failure_type="network",
                message=str(error),
            )
            record_attempt(connection, result)
            connection.commit()
            return result


def read_source(connection: psycopg.Connection, source_id: int) -> dict[str, object] | None:
    with connection.cursor() as cursor:
        cursor.execute(
            """
            select
              s.id::int as id,
              s.url,
              s.source_type,
              s.enabled,
              sp.crawl_enabled,
              sp.rights_policy
            from sources s
            join source_policies sp on sp.source_id = s.id
            where s.id = %s
            """,
            (source_id,),
        )
        return cursor.fetchone()


def insert_raw_entry(
    connection: psycopg.Connection,
    source_id: int,
    source: dict[str, object],
    entry: object,
) -> bool:
    link = str(get_entry_value(entry, "link") or "").strip()
    if not link:
        return False

    normalized_url = normalize_entry_url(link)
    external_id = str(get_entry_value(entry, "id") or normalized_url)
    canonical_hash = hashlib.sha256(normalized_url.encode("utf-8")).hexdigest()
    title = str(get_entry_value(entry, "title") or normalized_url)
    summary = get_entry_value(entry, "summary")
    published_at = parsed_time_to_datetime(get_entry_value(entry, "published_parsed"))
    raw_payload = {
        "source_url": source["url"],
        "entry_id": external_id,
        "normalized_url": normalized_url,
    }

    with connection.cursor() as cursor:
        cursor.execute(
            """
            insert into raw_entries (
              source_id,
              external_id,
              url,
              title,
              summary_raw,
              published_at,
              raw_payload_json,
              canonical_hash,
              lifecycle_status,
              processing_stage,
              rights_status
            )
            values (%s, %s, %s, %s, %s, %s, %s::jsonb, %s, 'new', 'metadata_ingested', %s)
            on conflict do nothing
            """,
            (
                source_id,
                external_id,
                normalized_url,
                title,
                str(summary) if summary else None,
                published_at,
                json.dumps(raw_payload),
                canonical_hash,
                source["rights_policy"],
            ),
        )
        return cursor.rowcount == 1


def record_attempt(connection: psycopg.Connection, result: IngestResult) -> None:
    with connection.cursor() as cursor:
        cursor.execute(
            """
            insert into source_ingest_attempts (
              source_id,
              status,
              failure_type,
              message,
              entries_seen,
              entries_inserted
            )
            values (%s, %s, %s, %s, %s, %s)
            """,
            (
                result.source_id,
                result.status,
                result.failure_type,
                result.message,
                result.entries_seen,
                result.entries_inserted,
            ),
        )


def get_entry_value(entry: object, key: str) -> object | None:
    if isinstance(entry, dict):
        return entry.get(key)
    return getattr(entry, key, None)


def parsed_time_to_datetime(value: object | None) -> datetime | None:
    if not isinstance(value, struct_time):
        return None
    return datetime(*value[:6], tzinfo=timezone.utc)
