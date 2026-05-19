# Issue 003 Plan: Source Registry And Source Policy

## Goal

Issue 003 turns the minimal development `sources` table into the Source Registry foundation and stores Source Policy separately from UI display behavior.

## Scope

In scope:
- Extend SQL schema with Source Registry fields and `source_policies`.
- Keep SQL migrations as the database source of truth.
- Add basic API endpoints for listing, creating, and updating sources.
- Validate Source Policy values at the API boundary and in PostgreSQL constraints.
- Add a worker-readable Source Policy query path.

Out of scope:
- RSS fetching, scheduler ingest, full-text extraction, AI, search, reader UI, admin UI polish, and non-RSS adapters.

## Design

The existing Issue 002 `sources` table remains the Source Registry table. Issue 003 renames the early `kind` column to `source_type`, adds source metadata fields, and creates `source_policies` as a one-to-one table keyed by `source_id`.

API routes use Fastify JSON Schema validation and a repository interface so route tests can run without PostgreSQL. Database integration stays in `packages/db`, where SQL and parameterized node-postgres queries are tested against local PostgreSQL.

The Python worker gets a small read-only Source Policy query function using Psycopg 3. This proves worker readability without implementing RSS ingest.

## API Shape

- `GET /sources`: list sources with board and policy summary.
- `POST /sources`: create a source and its policy.
- `PATCH /sources/:id`: update source metadata, enable/disable state, and policy fields.

## Policy Fields

- `crawl_enabled`: whether worker crawl/ingest may consider this source.
- `fetch_interval_minutes`: minimum interval between fetch attempts.
- `max_requests_per_hour`: source-level rate limit.
- `save_level`: how much content may be retained.
- `rights_policy`: public/private display and storage boundary.
- `translation_policy`: whether translation is disabled, private-only, or public excerpt/full.
- `risk_level`: operational/compliance risk bucket for admin review.

## TDD Plan

1. Add API route tests with a fake repository for list/create/update and validation failure.
2. Add database integration tests for Source Registry creation, update, policy constraints, and worker-readable policy rows.
3. Add worker tests for Source Policy row mapping and optional PostgreSQL integration.
4. Implement the SQL migration, seed update, repository, API routes, and worker reader.
5. Re-run full checks and Compose health smoke.

## Research References

- Fastify validation and `inject`: https://github.com/fastify/fastify
- node-postgres pool query and transaction guidance: https://github.com/brianc/node-postgres
- Psycopg 3 basic usage and `dict_row`: https://www.psycopg.org/psycopg3/docs/basic/usage.html
- PostgreSQL `ALTER TABLE` and constraints: https://www.postgresql.org/docs/current/ddl-alter.html
