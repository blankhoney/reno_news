# Issue 004 Plan: Minimal RSS Adapter Ingest

## Goal

Issue 004 implements the first real Source Adapter: RSS/Atom only. It discovers feed entries, stores metadata in `raw_entries`, and records basic ingest attempts without fetching article full text.

## Scope

In scope:
- Python RSS/Atom adapter using HTTPX for fetch and feedparser for parsing.
- Source Policy gate before fetch.
- URL normalization and canonical hash generation.
- Idempotent insert into `raw_entries`.
- Basic source ingest attempt records for success, skipped, and failure cases.
- Dramatiq actor and scheduler trigger for enabled RSS/Atom sources.

Out of scope:
- RSSHub, GitHub, arXiv, GDELT, full-text extraction, trafilatura, AI processing, search, reader UI, and admin UI.

## Design

The Python worker owns RSS ingest because later fetch/extraction and AI work are Python-heavy. The TypeScript API remains the admin/control surface and does not fetch feeds.

`source_ingest_attempts` records durable worker-visible execution outcomes. `raw_entries` remains the metadata landing table for discovered feed entries.

The scheduler trigger only enqueues eligible RSS/Atom source IDs. The worker actor runs the ingest function. Tests call the ingest function directly with fake fetchers so RSS behavior is deterministic and does not depend on external network.

## Failure Recording

- Disabled source or disabled crawl policy: `skipped` with `failure_type = 'policy'`.
- HTTP/network/status failure: `failure` with `failure_type = 'network'`.
- Feed parse failure with no usable entries: `failure` with `failure_type = 'parse'`.
- Successful parse: `success` with inserted row count.

## TDD Plan

1. Add worker tests for URL normalization, one-source ingest, duplicate avoidance, disabled source skip, and fetch failure recording.
2. Add scheduler tests for enqueueing only enabled RSS/Atom sources.
3. Add SQL migration for source ingest attempts.
4. Implement RSS adapter, Dramatiq actor, and scheduler trigger.
5. Verify with a fresh local PostgreSQL test database and no external feed network.

## Research References

- feedparser RSS/Atom parsing and bozo handling: https://github.com/kurtmckee/feedparser
- HTTPX timeout and error handling: https://github.com/encode/httpx
- Dramatiq Redis broker and actor usage: https://github.com/Bogdanp/dramatiq
