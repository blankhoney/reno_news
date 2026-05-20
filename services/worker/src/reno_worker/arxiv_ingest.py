import hashlib
import json
import re
import time
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from typing import Callable, Mapping
from urllib.parse import parse_qs, urlencode, urlparse

import httpx
import psycopg
from psycopg.rows import dict_row

from reno_worker.rss_ingest import IngestResult, read_source, record_attempt


FetchArxivFeed = Callable[[str, dict[str, str]], "ArxivHttpResponse"]
Sleep = Callable[[float], object]

ATOM_NS = "http://www.w3.org/2005/Atom"
OPENSEARCH_NS = "http://a9.com/-/spec/opensearch/1.1/"
ARXIV_NS = "http://arxiv.org/schemas/atom"
NS = {"atom": ATOM_NS, "opensearch": OPENSEARCH_NS, "arxiv": ARXIV_NS}
ARXIV_ATTRIBUTION = "Thank you to arXiv for use of its open access interoperability."
REQUEST_SPACING_SECONDS = 3.0
MAX_RESULTS_PER_REQUEST = 100
ALLOWED_SEARCH_QUERIES = {
    "cat:cs.AI",
    "cat:cs.CL",
    "cat:cs.CY",
    "cat:cs.LG",
    "cat:cs.SE",
    "cat:stat.ML",
}


@dataclass(frozen=True)
class ArxivSource:
    source_id: int
    url: str
    enabled: bool
    crawl_enabled: bool
    rights_policy: str


@dataclass(frozen=True)
class ArxivHttpResponse:
    status_code: int
    text: str
    headers: Mapping[str, str]


@dataclass(frozen=True)
class ArxivQuery:
    search_query: str
    start: int
    max_results: int
    sort_by: str
    sort_order: str


@dataclass(frozen=True)
class ArxivRawEntry:
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
class ArxivCollectResult:
    source_id: int
    status: str
    entries_seen: int
    entries: list[ArxivRawEntry]
    failure_type: str | None = None
    message: str | None = None


@dataclass(frozen=True)
class ArxivPage:
    total_results: int
    start_index: int
    items_per_page: int
    entries: list[ArxivRawEntry]
    error_message: str | None = None


def collect_arxiv_source_entries(
    source: ArxivSource,
    *,
    fetch: FetchArxivFeed,
    sleep: Sleep = time.sleep,
    max_pages: int = 1,
) -> ArxivCollectResult:
    if not source.enabled or not source.crawl_enabled:
        return ArxivCollectResult(
            source_id=source.source_id,
            status="skipped",
            entries_seen=0,
            entries=[],
            failure_type="policy",
            message="Source or crawl policy disabled",
        )

    try:
        query = parse_arxiv_source_url(source.url)
    except ValueError as error:
        return ArxivCollectResult(
            source_id=source.source_id,
            status="failure",
            entries_seen=0,
            entries=[],
            failure_type="policy",
            message=str(error),
        )

    entries: list[ArxivRawEntry] = []
    next_start = query.start

    for page_index in range(max(1, max_pages)):
        if page_index > 0:
            sleep(REQUEST_SPACING_SECONDS)

        page_url = build_arxiv_query_url(query, start=next_start)
        response = fetch(page_url, arxiv_headers())
        response_error = response_error_result(source.source_id, response)
        if response_error is not None:
            return response_error

        try:
            page = parse_arxiv_atom_page(response.text, source)
        except (ET.ParseError, ValueError) as error:
            return ArxivCollectResult(
                source_id=source.source_id,
                status="failure",
                entries_seen=0,
                entries=[],
                failure_type="parse",
                message=str(error),
            )

        if page.error_message is not None:
            return ArxivCollectResult(
                source_id=source.source_id,
                status="failure",
                entries_seen=0,
                entries=[],
                failure_type="parse",
                message=page.error_message,
            )

        entries.extend(page.entries)
        if not page.entries:
            break

        next_start = page.start_index + page.items_per_page
        if len(entries) >= page.total_results:
            break

    return ArxivCollectResult(
        source_id=source.source_id,
        status="success",
        entries_seen=len(entries),
        entries=entries,
    )


def ingest_arxiv_source(
    database_url: str,
    source_id: int,
    fetch: FetchArxivFeed | None = None,
) -> IngestResult:
    fetch_arxiv = fetch or fetch_arxiv_feed
    with psycopg.connect(database_url, row_factory=dict_row) as connection:
        source_row = read_source(connection, source_id)

        if source_row is None:
            raise ValueError(f"Source not found: {source_id}")

        if source_row["source_type"] != "arxiv":
            raise ValueError(f"Source is not an arXiv source: {source_id}")

        source = ArxivSource(
            source_id=source_id,
            url=str(source_row["url"]),
            enabled=bool(source_row["enabled"]),
            crawl_enabled=bool(source_row["crawl_enabled"]),
            rights_policy=str(source_row["rights_policy"]),
        )

        try:
            collect_result = collect_arxiv_source_entries(source, fetch=fetch_arxiv, max_pages=1)
        except httpx.HTTPError as error:
            collect_result = ArxivCollectResult(
                source_id=source_id,
                status="failure",
                entries_seen=0,
                entries=[],
                failure_type="network",
                message=str(error),
            )

        entries_inserted = 0
        if collect_result.status == "success":
            for entry in collect_result.entries:
                entries_inserted += int(insert_arxiv_raw_entry(connection, entry))

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


def fetch_arxiv_feed(url: str, headers: dict[str, str]) -> ArxivHttpResponse:
    response = httpx.get(url, timeout=20.0, headers=headers)
    return ArxivHttpResponse(status_code=response.status_code, text=response.text, headers=response.headers)


def insert_arxiv_raw_entry(connection: psycopg.Connection, entry: ArxivRawEntry) -> bool:
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


def parse_arxiv_source_url(url: str) -> ArxivQuery:
    parsed = urlparse(url.strip())
    if parsed.netloc not in {"export.arxiv.org", "www.export.arxiv.org"} or parsed.path != "/api/query":
        raise ValueError(f"Unsupported arXiv API URL: {url}")

    params = parse_qs(parsed.query, keep_blank_values=True)
    search_query = single_param(params, "search_query")
    if search_query not in ALLOWED_SEARCH_QUERIES:
        raise ValueError(f"arXiv search_query is not allowlisted: {search_query}")

    start = int_param(params, "start", default=0)
    max_results = int_param(params, "max_results", default=10)
    sort_by = single_param(params, "sortBy", default="submittedDate")
    sort_order = single_param(params, "sortOrder", default="descending")

    if start < 0:
        raise ValueError("arXiv start must be >= 0")
    if max_results < 1 or max_results > MAX_RESULTS_PER_REQUEST:
        raise ValueError(f"arXiv max_results must be between 1 and {MAX_RESULTS_PER_REQUEST}")
    if sort_by not in {"submittedDate", "lastUpdatedDate"}:
        raise ValueError(f"Unsupported arXiv sortBy: {sort_by}")
    if sort_order not in {"ascending", "descending"}:
        raise ValueError(f"Unsupported arXiv sortOrder: {sort_order}")

    return ArxivQuery(
        search_query=search_query,
        start=start,
        max_results=max_results,
        sort_by=sort_by,
        sort_order=sort_order,
    )


def build_arxiv_query_url(query: ArxivQuery, *, start: int) -> str:
    query_string = urlencode(
        {
            "search_query": query.search_query,
            "start": str(start),
            "max_results": str(query.max_results),
            "sortBy": query.sort_by,
            "sortOrder": query.sort_order,
        }
    )
    return f"https://export.arxiv.org/api/query?{query_string}"


def parse_arxiv_atom_page(feed_text: str, source: ArxivSource) -> ArxivPage:
    root = ET.fromstring(feed_text)
    total_results = int_text(root, "opensearch:totalResults", default=0)
    start_index = int_text(root, "opensearch:startIndex", default=0)
    items_per_page = int_text(root, "opensearch:itemsPerPage", default=0)
    entries: list[ArxivRawEntry] = []

    for entry_element in root.findall("atom:entry", NS):
        title = normalized_text(entry_element.findtext("atom:title", default="", namespaces=NS))
        entry_id = normalized_text(entry_element.findtext("atom:id", default="", namespaces=NS))
        if title == "Error" or "/api/errors#" in entry_id:
            return ArxivPage(
                total_results=total_results,
                start_index=start_index,
                items_per_page=items_per_page,
                entries=[],
                error_message=normalized_text(entry_element.findtext("atom:summary", default="", namespaces=NS)),
            )

        entries.append(entry_to_raw_entry(source, entry_element))

    return ArxivPage(
        total_results=total_results,
        start_index=start_index,
        items_per_page=items_per_page or len(entries),
        entries=entries,
    )


def entry_to_raw_entry(source: ArxivSource, entry_element: ET.Element) -> ArxivRawEntry:
    entry_id = normalized_text(required_text(entry_element, "atom:id"))
    arxiv_id = stable_arxiv_id(entry_id)
    url = f"https://arxiv.org/abs/{arxiv_id}"
    authors = [
        normalized_text(name.text or "")
        for name in entry_element.findall("atom:author/atom:name", NS)
        if normalized_text(name.text or "")
    ]
    categories = [
        term
        for category in entry_element.findall("atom:category", NS)
        if (term := category.attrib.get("term"))
    ]
    primary_category = entry_element.find("arxiv:primary_category", NS)
    primary_category_term = primary_category.attrib.get("term") if primary_category is not None else None
    title = normalized_text(required_text(entry_element, "atom:title"))
    summary = normalized_text(entry_element.findtext("atom:summary", default="", namespaces=NS)) or None
    published = normalized_text(entry_element.findtext("atom:published", default="", namespaces=NS)) or None
    updated = normalized_text(entry_element.findtext("atom:updated", default="", namespaces=NS)) or None
    comment = normalized_text(entry_element.findtext("arxiv:comment", default="", namespaces=NS)) or None
    doi = normalized_text(entry_element.findtext("arxiv:doi", default="", namespaces=NS)) or None
    journal_ref = normalized_text(entry_element.findtext("arxiv:journal_ref", default="", namespaces=NS)) or None

    raw_payload = {
        "provider": "arxiv",
        "arxiv_id": arxiv_id,
        "entry_id": entry_id,
        "normalized_url": url,
        "source_url": source.url,
        "authors": authors,
        "categories": categories,
        "primary_category": primary_category_term,
        "published": published,
        "updated": updated,
        "comment": comment,
        "doi": doi,
        "journal_ref": journal_ref,
        "attribution": ARXIV_ATTRIBUTION,
    }

    return ArxivRawEntry(
        source_id=source.source_id,
        external_id=f"arxiv:{arxiv_id}",
        url=url,
        title=title,
        summary_raw=summary,
        published_at=published,
        raw_payload_json=raw_payload,
        canonical_hash=canonical_hash(url),
        rights_status=source.rights_policy,
    )


def response_error_result(source_id: int, response: ArxivHttpResponse) -> ArxivCollectResult | None:
    if response.status_code < 400:
        return None

    if response.status_code in {429, 503}:
        return ArxivCollectResult(
            source_id=source_id,
            status="failure",
            entries_seen=0,
            entries=[],
            failure_type="rate_limit",
            message="arXiv rate limit or temporary availability response; pause source ingest",
        )

    return ArxivCollectResult(
        source_id=source_id,
        status="failure",
        entries_seen=0,
        entries=[],
        failure_type="network",
        message=f"arXiv API returned HTTP {response.status_code}",
    )


def arxiv_headers() -> dict[str, str]:
    return {
        "Accept": "application/atom+xml",
        "User-Agent": "reno-news-worker/0.1",
    }


def single_param(params: dict[str, list[str]], key: str, default: str | None = None) -> str:
    values = params.get(key)
    if not values or values[0] == "":
        if default is not None:
            return default
        raise ValueError(f"Missing required arXiv query parameter: {key}")
    if len(values) > 1:
        raise ValueError(f"Duplicate arXiv query parameter: {key}")
    return values[0]


def int_param(params: dict[str, list[str]], key: str, *, default: int) -> int:
    value = single_param(params, key, default=str(default))
    try:
        return int(value)
    except ValueError as error:
        raise ValueError(f"arXiv {key} must be an integer") from error


def int_text(root: ET.Element, path: str, *, default: int) -> int:
    value = root.findtext(path, default=str(default), namespaces=NS)
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def required_text(element: ET.Element, path: str) -> str:
    value = normalized_text(element.findtext(path, default="", namespaces=NS))
    if not value:
        raise ValueError(f"Missing required arXiv Atom element: {path}")
    return value


def stable_arxiv_id(entry_id: str) -> str:
    value = entry_id.strip().removeprefix("http://arxiv.org/abs/").removeprefix("https://arxiv.org/abs/")
    value = re.sub(r"v\d+$", "", value)
    if not value:
        raise ValueError(f"Unsupported arXiv entry id: {entry_id}")
    return value


def normalized_text(value: str) -> str:
    return " ".join(value.split())


def canonical_hash(url: str) -> str:
    return hashlib.sha256(url.encode("utf-8")).hexdigest()


def entry_payload_json(entry: ArxivRawEntry) -> str:
    return json.dumps(entry.raw_payload_json)
