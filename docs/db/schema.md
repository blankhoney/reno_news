# Database Schema

This document describes the SQL schema introduced by Issue 002. SQL files in `infra/db/migrations` remain the source of truth for product schema.

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

- Minimal seedable source records for development.
- `kind` is constrained to `rss` or `atom` for the current RSS/Atom-only startup path.
- Full Source Policy modeling is deferred to Issue 003.

## Development Raw Entries

`raw_entries`

- Minimal seedable raw entry records for development and later ingest tests.
- `lifecycle_status`, `processing_stage`, `rights_status`, and `failure_type` are constrained text fields.
- RSS fetching and duplicate ingest behavior are deferred to Issue 004.

## Status Boundaries

The constrained status fields are deliberately broad MVP values. They are not AI, extraction, or publishing workflows by themselves.
