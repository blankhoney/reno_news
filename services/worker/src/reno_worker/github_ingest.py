import hashlib
import json
from dataclasses import dataclass
from typing import Callable, Mapping
from urllib.parse import urlparse, urldefrag

import httpx
import psycopg
from psycopg.rows import dict_row

from reno_worker.rss_ingest import IngestResult, read_source, record_attempt


GithubJson = dict[str, object] | list[object]
FetchGithubJson = Callable[[str, dict[str, str]], "GithubHttpResponse"]


@dataclass(frozen=True)
class GithubSource:
    source_id: int
    url: str
    enabled: bool
    crawl_enabled: bool
    rights_policy: str


@dataclass(frozen=True)
class GithubHttpResponse:
    status_code: int
    json_body: GithubJson
    headers: Mapping[str, str]


@dataclass(frozen=True)
class GithubRawEntry:
    source_id: int
    external_id: str
    url: str
    title: str
    summary_raw: str | None
    published_at: str | None
    raw_payload_json: dict[str, object]
    canonical_hash: str
    rights_status: str


@dataclass(frozen=True)
class GithubCollectResult:
    source_id: int
    status: str
    entries_seen: int
    entries: list[GithubRawEntry]
    failure_type: str | None = None
    message: str | None = None


def collect_github_source_entries(
    source: GithubSource,
    *,
    fetch: FetchGithubJson,
) -> GithubCollectResult:
    if not source.enabled or not source.crawl_enabled:
        return GithubCollectResult(
            source_id=source.source_id,
            status="skipped",
            entries_seen=0,
            entries=[],
            failure_type="policy",
            message="Source or crawl policy disabled",
        )

    owner, repo = parse_github_repository_url(source.url)
    repository_url = f"https://api.github.com/repos/{owner}/{repo}"
    releases_url = f"https://api.github.com/repos/{owner}/{repo}/releases"
    headers = github_headers()

    repository_response = fetch(repository_url, headers)
    repository_error = response_error_result(source.source_id, repository_response)
    if repository_error is not None:
        return repository_error

    releases_response = fetch(releases_url, headers)
    releases_error = response_error_result(source.source_id, releases_response)
    if releases_error is not None:
        return releases_error

    repository_payload = require_object(repository_response.json_body, "repository response")
    releases_payload = require_list(releases_response.json_body, "releases response")

    entries = [
        repository_to_entry(
            source=source,
            owner=owner,
            repo=repo,
            payload=repository_payload,
        )
    ]

    for release in releases_payload:
        if not isinstance(release, dict):
            continue
        release_payload = dict(release)
        if release_payload.get("draft") is True:
            continue
        if not release_payload.get("published_at"):
            continue
        entries.append(
            release_to_entry(
                source=source,
                owner=owner,
                repo=repo,
                payload=release_payload,
            )
        )

    return GithubCollectResult(
        source_id=source.source_id,
        status="success",
        entries_seen=len(entries),
        entries=entries,
    )


def ingest_github_source(
    database_url: str,
    source_id: int,
    fetch: FetchGithubJson | None = None,
) -> IngestResult:
    fetch_github = fetch or fetch_github_json
    with psycopg.connect(database_url, row_factory=dict_row) as connection:
        source_row = read_source(connection, source_id)

        if source_row is None:
            raise ValueError(f"Source not found: {source_id}")

        if source_row["source_type"] != "github":
            raise ValueError(f"Source is not a GitHub source: {source_id}")

        source = GithubSource(
            source_id=source_id,
            url=str(source_row["url"]),
            enabled=bool(source_row["enabled"]),
            crawl_enabled=bool(source_row["crawl_enabled"]),
            rights_policy=str(source_row["rights_policy"]),
        )

        try:
            collect_result = collect_github_source_entries(source, fetch=fetch_github)
        except httpx.HTTPError as error:
            collect_result = GithubCollectResult(
                source_id=source_id,
                status="failure",
                entries_seen=0,
                entries=[],
                failure_type="network",
                message=str(error),
            )
        except ValueError as error:
            collect_result = GithubCollectResult(
                source_id=source_id,
                status="failure",
                entries_seen=0,
                entries=[],
                failure_type="parse",
                message=str(error),
            )

        entries_inserted = 0
        if collect_result.status == "success":
            for entry in collect_result.entries:
                entries_inserted += int(insert_github_raw_entry(connection, entry))

        ingest_result = IngestResult(
            source_id=source_id,
            status=collect_result.status,
            entries_seen=collect_result.entries_seen,
            entries_inserted=entries_inserted,
            failure_type=collect_result.failure_type,
            message=collect_result.message,
        )
        record_attempt(connection, ingest_result)
        connection.commit()
        return ingest_result


def fetch_github_json(url: str, headers: dict[str, str]) -> GithubHttpResponse:
    response = httpx.get(url, timeout=20.0, headers=headers)
    return GithubHttpResponse(
        status_code=response.status_code,
        json_body=response.json(),
        headers=response.headers,
    )


def insert_github_raw_entry(connection: psycopg.Connection, entry: GithubRawEntry) -> bool:
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
                entry.source_id,
                entry.external_id,
                entry.url,
                entry.title,
                entry.summary_raw,
                entry.published_at,
                entry_payload_json(entry),
                entry.canonical_hash,
                entry.rights_status,
            ),
        )
        return cursor.rowcount == 1


def response_error_result(
    source_id: int,
    response: GithubHttpResponse,
) -> GithubCollectResult | None:
    if response.status_code < 400:
        return None

    headers = {key.lower(): value for key, value in response.headers.items()}
    message = response_message(response.json_body)
    is_rate_limited = (
        response.status_code in {403, 429}
        and (
            "retry-after" in headers
            or headers.get("x-ratelimit-remaining") == "0"
            or "rate limit" in message.lower()
        )
    )

    if is_rate_limited:
        pause_reason = "retry-after" if "retry-after" in headers else "x-ratelimit-reset"
        return GithubCollectResult(
            source_id=source_id,
            status="failure",
            entries_seen=0,
            entries=[],
            failure_type="rate_limit",
            message=f"GitHub rate limit encountered; pause according to {pause_reason}",
        )

    return GithubCollectResult(
        source_id=source_id,
        status="failure",
        entries_seen=0,
        entries=[],
        failure_type="network",
        message=f"GitHub API returned HTTP {response.status_code}: {message}",
    )


def parse_github_repository_url(url: str) -> tuple[str, str]:
    parsed = urlparse(url.strip())
    path_parts = [part for part in parsed.path.split("/") if part]

    if parsed.netloc == "api.github.com" and len(path_parts) >= 3 and path_parts[0] == "repos":
        return path_parts[1], path_parts[2].removesuffix(".git")

    if parsed.netloc in {"github.com", "www.github.com"} and len(path_parts) >= 2:
        return path_parts[0], path_parts[1].removesuffix(".git")

    raise ValueError(f"Unsupported GitHub repository URL: {url}")


def github_headers() -> dict[str, str]:
    return {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2026-03-10",
        "User-Agent": "reno-news-worker/0.1",
    }


def repository_to_entry(
    *,
    source: GithubSource,
    owner: str,
    repo: str,
    payload: dict[str, object],
) -> GithubRawEntry:
    html_url = string_value(payload.get("html_url")) or f"https://github.com/{owner}/{repo}"
    normalized_url = normalize_url(html_url)
    full_name = string_value(payload.get("full_name")) or f"{owner}/{repo}"
    raw_payload = {
        "provider": "github",
        "endpoint": "repository",
        "owner": owner,
        "repo": repo,
        "id": payload.get("id"),
        "node_id": payload.get("node_id"),
        "full_name": full_name,
        "html_url": normalized_url,
        "description": payload.get("description"),
        "pushed_at": payload.get("pushed_at"),
        "updated_at": payload.get("updated_at"),
        "license": payload.get("license"),
    }

    return GithubRawEntry(
        source_id=source.source_id,
        external_id=f"github:repository:{owner}/{repo}",
        url=normalized_url,
        title=full_name,
        summary_raw=string_value(payload.get("description")),
        published_at=string_value(payload.get("pushed_at")),
        raw_payload_json=raw_payload,
        canonical_hash=canonical_hash(normalized_url),
        rights_status=source.rights_policy,
    )


def release_to_entry(
    *,
    source: GithubSource,
    owner: str,
    repo: str,
    payload: dict[str, object],
) -> GithubRawEntry:
    release_id = payload.get("id")
    html_url = string_value(payload.get("html_url")) or f"https://github.com/{owner}/{repo}/releases"
    normalized_url = normalize_url(html_url)
    tag_name = string_value(payload.get("tag_name"))
    title = string_value(payload.get("name")) or tag_name or normalized_url
    raw_payload = {
        "provider": "github",
        "endpoint": "release",
        "owner": owner,
        "repo": repo,
        "id": release_id,
        "node_id": payload.get("node_id"),
        "tag_name": tag_name,
        "name": payload.get("name"),
        "html_url": normalized_url,
        "body": payload.get("body"),
        "draft": payload.get("draft"),
        "prerelease": payload.get("prerelease"),
        "published_at": payload.get("published_at"),
        "created_at": payload.get("created_at"),
    }

    return GithubRawEntry(
        source_id=source.source_id,
        external_id=f"github:release:{owner}/{repo}:{release_id}",
        url=normalized_url,
        title=title,
        summary_raw=string_value(payload.get("body")),
        published_at=string_value(payload.get("published_at")),
        raw_payload_json=raw_payload,
        canonical_hash=canonical_hash(normalized_url),
        rights_status=source.rights_policy,
    )


def require_object(value: GithubJson, label: str) -> dict[str, object]:
    if isinstance(value, dict):
        return value
    raise ValueError(f"Expected {label} to be an object")


def require_list(value: GithubJson, label: str) -> list[object]:
    if isinstance(value, list):
        return value
    raise ValueError(f"Expected {label} to be a list")


def normalize_url(url: str) -> str:
    normalized_url, _fragment = urldefrag(url.strip())
    return normalized_url


def canonical_hash(url: str) -> str:
    return hashlib.sha256(url.encode("utf-8")).hexdigest()


def response_message(value: GithubJson) -> str:
    if isinstance(value, dict):
        message = value.get("message")
        if isinstance(message, str):
            return message
    return ""


def string_value(value: object) -> str | None:
    if isinstance(value, str) and value:
        return value
    return None


def entry_payload_json(entry: GithubRawEntry) -> str:
    return json.dumps(entry.raw_payload_json)
