# Issue 002 Plan: SQL Migration Framework And Core Enums

## Goal

Issue 002 establishes SQL-first database schema management and the first constrained lifecycle/status fields needed by later ingestion work.

## Scope

In scope:
- A small migration runner that executes SQL files in order and records applied filenames in PostgreSQL.
- SQL migration files under `infra/db/migrations`.
- Idempotent development seed SQL under `infra/db/seeds`.
- Core tables required to seed MVP boards, sample sources, and sample raw entries.
- Constrained text fields for lifecycle status, processing stage, rights status, and failure type.

Out of scope:
- Source Policy tables and validation.
- RSS fetching, scheduler triggers, full-text extraction, AI tables, search services, ArchiveBox, Meilisearch, reader UI, and admin UI.

## Design

Use `packages/db` as a workspace package for database tooling. The SQL files remain the source of truth; TypeScript only locates files, opens a PostgreSQL connection, wraps each migration in a transaction, and records the filename in `schema_migrations`.

Status values use constrained `text` fields instead of PostgreSQL enum types in this issue. This satisfies the master plan's "enum or constrained fields" requirement while avoiding early enum lock-in before the ingestion model is proven by Issue 003 and Issue 004.

## Initial Tables

- `boards`: the five MVP boards.
- `sources`: minimal development sources for seeding only.
- `raw_entries`: minimal development raw entries with constrained lifecycle, processing, rights, and failure fields.

## TDD Plan

1. Add a unit test for migration-file discovery and ordering, then implement the file discovery helper.
2. Add a migration runner using node-postgres transactions.
3. Add SQL migration and seed files.
4. Run migration and seed against the local Compose PostgreSQL database.
5. Re-run seed to verify idempotence and query expected counts/status constraints.

## Research References

- node-postgres transactions: https://node-postgres.com/features/transactions
- PostgreSQL `CREATE TYPE`: https://www.postgresql.org/docs/current/sql-createtype.html
- PostgreSQL `INSERT ... ON CONFLICT`: https://www.postgresql.org/docs/current/sql-insert.html
