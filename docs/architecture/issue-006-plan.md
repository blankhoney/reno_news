# Issue 006 Plan: Full-Text Extraction Foundation

## Goal

Issue 006 adds the first Milestone 2 extraction slice: fetch and extract readable text for one eligible raw entry, store the result, and record failures.

## Scope

In scope:
- SQL migration for extraction attempt/result storage linked to `raw_entries`.
- Worker repository path to read raw entry URL, source policy, and rights/save-level policy.
- HTTPX article HTML fetch with timeout, redirects, and status error handling.
- Trafilatura extraction from fetched HTML.
- Deterministic extraction confidence field.
- Failure recording for policy skip, network/status failure, and extraction/no-text failure.
- Tests using local HTML fixtures and fake fetchers.

Out of scope:
- Reader UI.
- AI scoring, summarization, translation, or model calls.
- Search indexing.
- Browser automation, Crawl4AI, Firecrawl, RSSHub, GitHub, arXiv, or GDELT.
- Paywall or login-state fetching.
- Public display of extracted full text.

## Design

`raw_entries` remains the metadata landing table. Issue 006 introduces extraction storage linked to a raw entry so extraction output does not redefine candidate, content, or publication lifecycle.

The Python worker owns article fetch and extraction. HTTPX handles article HTML fetches with explicit timeout, `follow_redirects=True`, and status failure classification. Trafilatura extracts readable text and metadata from HTML. The worker stores success output and records failure attempts.

Extraction is policy-gated before fetch. Sources with `save_level = 'metadata_only'` must not fetch/store article body text. Rights policy still controls later public display; Issue 006 only stores private worker output for eligible sources.

## Proposed Storage

`raw_entry_extraction_attempts`:
- `id`
- `raw_entry_id`
- `status`: `success`, `failure`, or `skipped`
- `failure_type`: `network`, `parse`, `policy`, or `unknown`
- `message`
- `started_at`
- `completed_at`

`raw_entry_extractions`:
- `id`
- `raw_entry_id`
- `attempt_id`
- `extractor_name`
- `extractor_version`
- `final_url`
- `title`
- `author`
- `published_at`
- `language`
- `extracted_text`
- `text_length`
- `extraction_confidence`
- `created_at`

## TDD Plan

1. Add migration tests for extraction tables and constrained status/failure/confidence fields.
2. Add worker tests for policy skip, HTTP failure, no-text extraction failure, and successful fixture extraction.
3. Add worker extraction repository functions.
4. Implement the worker extraction function for one raw entry.
5. Add a Dramatiq actor or callable trigger only after the direct extraction function is tested.
6. Verify full repo checks and worker PostgreSQL tests.

## Acceptance Criteria

- One eligible raw entry can be fetched, extracted, and stored without external network in tests.
- Metadata-only sources are skipped before article fetch.
- HTTP/status failures are recorded.
- Empty or unusable extraction output is recorded as an extraction failure.
- Extraction confidence is stored as a bounded numeric value.
- No AI, search, reader UI, browser automation, or non-RSS adapter is added.

## Research References

- Trafilatura Python extraction APIs: `fetch_url`, `extract`, `bare_extraction`, `extract_metadata`, and JSON/metadata output. Source: https://github.com/adbar/trafilatura
- HTTPX timeout, redirects, `raise_for_status`, `RequestError`, and `HTTPStatusError`. Source: https://github.com/encode/httpx
