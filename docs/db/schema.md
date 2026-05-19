# Database Schema

This document summarizes the current SQL schema. SQL files in `infra/db/migrations` remain the source of truth for product schema.

## Migration Metadata

`schema_migrations`

- Created by the migration runner as migration metadata.
- `filename`: migration filename, primary key.
- `applied_at`: timestamp when the migration was applied.

## Boards

`boards`

- Stores MVP board definitions.
- `slug` is unique and stable.
- Seeded values: `ai`, `software-engineering`, `semiconductor`, `employment-trends`, `open-source`.

## Development Sources

`sources`

- Source Registry records.
- `source_type` is constrained to `rss` or `atom` for the current RSS/Atom-only startup path.
- Each source belongs to one board.
- Source-specific access and rights controls live in `source_policies`.

## Source Policies

`source_policies`

- One policy row per source.
- `crawl_enabled` controls whether worker ingest may consider the source.
- `fetch_interval_minutes` and `max_requests_per_hour` define source-level crawl/rate policy.
- `save_level`, `rights_policy`, `translation_policy`, and `risk_level` define operational and rights boundaries.
- Rights policy is stored separately from UI display logic.

## Development Raw Entries

`raw_entries`

- Minimal seedable raw entry records for development and later ingest tests.
- `lifecycle_status`, `processing_stage`, `rights_status`, and `failure_type` are constrained text fields.
- RSS/Atom feed metadata lands here before full-text extraction.
- Duplicate feed entries are ignored through existing unique constraints and `on conflict do nothing`.

## Source Ingest Attempts

`source_ingest_attempts`

- Records one Source Adapter execution outcome for one source.
- `status` is constrained to `success`, `failure`, or `skipped`.
- `failure_type` is constrained to `network`, `parse`, `policy`, `duplicate`, or `unknown` when present.
- Stores entry counts and failure messages for worker/debug visibility.

## Raw Entry Extraction Attempts

`raw_entry_extraction_attempts`

- Records one extraction attempt for one raw entry.
- `status` is constrained to `success`, `failure`, or `skipped`.
- `failure_type` is constrained to `network`, `parse`, `policy`, or `unknown` when present.
- Stores failure messages and start/completion timestamps.

## Raw Entry Extractions

`raw_entry_extractions`

- Stores the latest successful extraction result for one raw entry.
- Links back to the raw entry and the attempt that produced the result.
- Stores extractor identity, final URL, optional metadata, extracted text, text length, and extraction confidence.
- `extraction_confidence` is constrained to the inclusive range `0..1`.

## Status Boundaries

The constrained status fields are deliberately broad MVP values. They are not AI, extraction, or publishing workflows by themselves.
