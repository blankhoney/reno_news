# arXiv Source Adapter

This runbook defines the policy and Task 24 implementation boundary for arXiv source expansion. The adapter ingests allowlisted arXiv Atom metadata into the existing source/raw-entry/failure pipeline. It is metadata-only and performs no PDF mirroring, source file mirroring, full corpus harvesting, or broad free-text search.

## Scope

The arXiv adapter uses the legacy arXiv API query interface:

```text
GET /api/query
```

The committed policy is query allowlist based. The first slice accepts only category-scoped `search_query` values listed in `config/source-adapters/arxiv.json`, such as `cat:cs.AI`, `cat:cs.CL`, `cat:cs.LG`, `cat:cs.SE`, and `cat:stat.ML`. It does not accept `all:*` or other free-text broad search patterns.

The source URL is an operator-managed Source Registry value shaped like:

```text
https://export.arxiv.org/api/query?search_query=cat:cs.AI&sortBy=submittedDate&sortOrder=descending&max_results=50
```

## Pagination And Throttle Policy

arXiv API responses are Atom feeds. Pagination uses `start` and `max_results`. The adapter normalizes the configured query into a deterministic API URL and may request later pages by incrementing `start`.

The local policy is deliberately conservative:

```text
concurrency = 1
one request every three seconds
single connection
max_results <= 100
```

The runtime adapter enforces a 3 second delay before each follow-up page in the same collection call. The default DB-backed ingest path fetches one page per run; deeper pagination requires an explicit worker call boundary and must preserve the same spacing.

## Attribution And Rights Boundary

arXiv asks API users to acknowledge data usage with:

```text
Thank you to arXiv for use of its open access interoperability.
```

The adapter stores that attribution statement in `raw_payload_json` for each arXiv raw entry. It stores descriptive metadata only: title, abstract, authors, categories, primary category, published/updated timestamps, DOI, journal reference, and comments when present. The article URL points readers to the arXiv abstract page.

It does not store or serve PDFs, source files, or other e-print content. The default committed policy remains `"enabled": false`; production enablement is an explicit operator decision.

## Source Mapping

arXiv Atom entries map to:

```text
external_id = `arxiv:{arxiv_id}`
url = https://arxiv.org/abs/{arxiv_id}
title = entry.title
summary_raw = entry.summary
published_at = entry.published
```

Version suffixes such as `v2` are stripped from `arxiv_id` so repeat runs for the same article deduplicate through the existing raw-entry uniqueness constraints. `raw_payload_json` keeps provider metadata and the attribution statement; it must not include PDF mirrors or local copies of source files.

## Failure Isolation

arXiv failures must not block RSS, Atom, or GitHub ingestion. Network failures, parse failures, policy skips, arXiv error feeds, and 429/503 rate-limit or temporary availability responses are recorded through the existing source ingest attempts table. Rate-limit-like responses use `failure_type = rate_limit`.

## Verification

Local contract check:

```bash
pnpm arxiv:source-policy:check
```

Worker checks:

```bash
uv --project services/worker run python -m unittest services.worker.tests.test_arxiv_ingest
uv --project services/worker run python -m unittest services.worker.tests.test_source_ingest
```

Expected behavior:

- `config/source-adapters/arxiv.json` defines only `GET /api/query`;
- allowed queries are category-scoped and operator-managed;
- no PDF mirroring, source file mirroring, or broad free-text search is permitted;
- pagination uses `start` and `max_results`;
- follow-up page requests wait 3 seconds;
- mappings target the existing source/raw-entry/failure pipeline;
- repeated runs deduplicate by existing raw-entry uniqueness constraints;
- RSS/Atom/GitHub baseline ingestion remains independent.

## References

- arXiv API User Manual: https://info.arxiv.org/help/api/user-manual.html
- arXiv API Terms of Use: https://info.arxiv.org/help/api/tou.html
- arXiv API Access and attribution guidance: https://info.arxiv.org/help/api/index.html
