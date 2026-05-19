from dataclasses import dataclass
from datetime import datetime
from typing import Callable

import httpx
import psycopg
import trafilatura
from psycopg.rows import dict_row


@dataclass(frozen=True)
class FetchedArticle:
    html: str
    final_url: str


FetchArticle = Callable[[str], FetchedArticle | str]

ELIGIBLE_SAVE_LEVELS = {"full_text"}
ELIGIBLE_RIGHTS_POLICIES = {
    "private_allowed",
    "public_fulltext_allowed",
}


@dataclass(frozen=True)
class ExtractionResult:
    raw_entry_id: int
    status: str
    text_length: int = 0
    extraction_confidence: float = 0.0
    failure_type: str | None = None
    message: str | None = None


def fetch_article(url: str) -> FetchedArticle:
    response = httpx.get(
        url,
        timeout=20.0,
        follow_redirects=True,
        headers={"user-agent": "reno-news-worker/0.1"},
    )
    response.raise_for_status()
    return FetchedArticle(html=response.text, final_url=str(response.url))


def extract_raw_entry(
    database_url: str,
    raw_entry_id: int,
    fetch: FetchArticle = fetch_article,
) -> ExtractionResult:
    with psycopg.connect(database_url, row_factory=dict_row) as connection:
        raw_entry = read_raw_entry(connection, raw_entry_id)

        if raw_entry is None:
            raise ValueError(f"Raw entry not found: {raw_entry_id}")

        policy_error = policy_skip_reason(raw_entry)
        if policy_error:
            result = ExtractionResult(
                raw_entry_id=raw_entry_id,
                status="skipped",
                failure_type="policy",
                message=policy_error,
            )
            record_attempt(connection, result)
            connection.commit()
            return result

        try:
            fetched = fetched_article(fetch(str(raw_entry["url"])), str(raw_entry["url"]))
        except httpx.HTTPError as error:
            result = ExtractionResult(
                raw_entry_id=raw_entry_id,
                status="failure",
                failure_type="network",
                message=str(error),
            )
            record_attempt(connection, result)
            connection.commit()
            return result

        try:
            extracted_text = trafilatura.extract(
                fetched.html,
                url=fetched.final_url,
                include_comments=False,
                include_tables=False,
            )
        except Exception as error:
            result = ExtractionResult(
                raw_entry_id=raw_entry_id,
                status="failure",
                failure_type="parse",
                message=str(error),
            )
            record_attempt(connection, result)
            connection.commit()
            return result

        if not extracted_text or not extracted_text.strip():
            result = ExtractionResult(
                raw_entry_id=raw_entry_id,
                status="failure",
                failure_type="parse",
                message="No extractable text",
            )
            record_attempt(connection, result)
            connection.commit()
            return result

        try:
            metadata = trafilatura.extract_metadata(fetched.html, default_url=fetched.final_url)
        except Exception:
            metadata = None
        text = extracted_text.strip()
        confidence = extraction_confidence(text)
        result = ExtractionResult(
            raw_entry_id=raw_entry_id,
            status="success",
            text_length=len(text),
            extraction_confidence=confidence,
        )
        attempt_id = record_attempt(connection, result)
        store_extraction(connection, raw_entry_id, attempt_id, fetched.final_url, metadata, text, confidence)
        mark_raw_entry_extracted(connection, raw_entry_id)
        connection.commit()
        return result


def read_raw_entry(connection: psycopg.Connection, raw_entry_id: int) -> dict[str, object] | None:
    with connection.cursor() as cursor:
        cursor.execute(
            """
            select
              re.id::int as id,
              re.url,
              s.enabled as source_enabled,
              sp.crawl_enabled,
              sp.save_level,
              sp.rights_policy
            from raw_entries re
            join sources s on s.id = re.source_id
            join source_policies sp on sp.source_id = s.id
            where re.id = %s
            """,
            (raw_entry_id,),
        )
        return cursor.fetchone()


def policy_skip_reason(raw_entry: dict[str, object]) -> str | None:
    if not raw_entry["source_enabled"] or not raw_entry["crawl_enabled"]:
        return "Source or crawl policy disabled"

    if raw_entry["save_level"] not in ELIGIBLE_SAVE_LEVELS:
        return "Source save level does not allow article body storage"

    if raw_entry["rights_policy"] not in ELIGIBLE_RIGHTS_POLICIES:
        return "Rights policy does not allow article body storage"

    return None


def extraction_confidence(text: str) -> float:
    if not text.strip():
        return 0.0
    return min(1.0, max(0.1, len(text.strip()) / 1200))


def fetched_article(value: FetchedArticle | str, fallback_url: str) -> FetchedArticle:
    if isinstance(value, FetchedArticle):
        return value
    return FetchedArticle(html=value, final_url=fallback_url)


def record_attempt(connection: psycopg.Connection, result: ExtractionResult) -> int:
    with connection.cursor() as cursor:
        cursor.execute(
            """
            insert into raw_entry_extraction_attempts (
              raw_entry_id,
              status,
              failure_type,
              message,
              completed_at
            )
            values (%s, %s, %s, %s, now())
            returning id::int
            """,
            (result.raw_entry_id, result.status, result.failure_type, result.message),
        )
        return int(cursor.fetchone()["id"])


def store_extraction(
    connection: psycopg.Connection,
    raw_entry_id: int,
    attempt_id: int,
    final_url: str,
    metadata: object,
    extracted_text: str,
    confidence: float,
) -> None:
    with connection.cursor() as cursor:
        cursor.execute(
            """
            insert into raw_entry_extractions (
              raw_entry_id,
              attempt_id,
              extractor_name,
              extractor_version,
              final_url,
              title,
              author,
              published_at,
              language,
              extracted_text,
              text_length,
              extraction_confidence
            )
            values (%s, %s, 'trafilatura', %s, %s, %s, %s, %s, %s, %s, %s, %s)
            on conflict (raw_entry_id) do update
            set
              attempt_id = excluded.attempt_id,
              extractor_name = excluded.extractor_name,
              extractor_version = excluded.extractor_version,
              final_url = excluded.final_url,
              title = excluded.title,
              author = excluded.author,
              published_at = excluded.published_at,
              language = excluded.language,
              extracted_text = excluded.extracted_text,
              text_length = excluded.text_length,
              extraction_confidence = excluded.extraction_confidence,
              created_at = now()
            """,
            (
                raw_entry_id,
                attempt_id,
                trafilatura.__version__,
                final_url,
                metadata_value(metadata, "title"),
                metadata_value(metadata, "author"),
                metadata_datetime(metadata_value(metadata, "date")),
                metadata_value(metadata, "language"),
                extracted_text,
                len(extracted_text),
                confidence,
            ),
        )


def mark_raw_entry_extracted(connection: psycopg.Connection, raw_entry_id: int) -> None:
    with connection.cursor() as cursor:
        cursor.execute(
            """
            update raw_entries
            set processing_stage = 'extracted'
            where id = %s
            """,
            (raw_entry_id,),
        )


def metadata_value(metadata: object, key: str) -> object | None:
    return getattr(metadata, key, None)


def metadata_datetime(value: object | None) -> datetime | None:
    if isinstance(value, datetime):
        return value
    if isinstance(value, str) and value:
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    return None
