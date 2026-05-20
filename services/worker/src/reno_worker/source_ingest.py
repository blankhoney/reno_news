from collections.abc import Callable

import psycopg
from psycopg.rows import dict_row

from reno_worker.arxiv_ingest import ingest_arxiv_source
from reno_worker.github_ingest import ingest_github_source
from reno_worker.rss_ingest import IngestResult, ingest_source as ingest_rss_source


ReadSourceType = Callable[[str, int], str]
IngestHandler = Callable[[str, int], IngestResult]


def ingest_configured_source(
    database_url: str,
    source_id: int,
    *,
    read_source_type: ReadSourceType | None = None,
    ingest_rss: IngestHandler = ingest_rss_source,
    ingest_github: IngestHandler = ingest_github_source,
    ingest_arxiv: IngestHandler = ingest_arxiv_source,
) -> IngestResult:
    source_type_reader = read_source_type or read_configured_source_type
    source_type = source_type_reader(database_url, source_id)

    if source_type == "github":
        return ingest_github(database_url, source_id)

    if source_type == "arxiv":
        return ingest_arxiv(database_url, source_id)

    if source_type in {"rss", "atom"}:
        return ingest_rss(database_url, source_id)

    raise ValueError(f"Unsupported source type for ingest: {source_type}")


def read_configured_source_type(database_url: str, source_id: int) -> str:
    with psycopg.connect(database_url, row_factory=dict_row) as connection:
        with connection.cursor() as cursor:
            cursor.execute("select source_type from sources where id = %s", (source_id,))
            row = cursor.fetchone()

    if row is None:
        raise ValueError(f"Source not found: {source_id}")

    return str(row["source_type"])
