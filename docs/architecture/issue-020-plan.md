# Issue 020 Plan: Feedback Quality Penalty For Digest Ordering

## Objective

Issue 020 adds the smallest feedback-to-ranking slice: Digest preview ordering may use a bounded Quality Feedback Penalty derived from existing item-scoped Reader Feedback. It must not add moderation workflow, automatic hide/restore, reader identity, personalization, new ranking tables, semantic search, external search services, or digest delivery/persistence.

## Current Context

- Issue 017 stores constrained Reader Feedback as append-only item-scoped events.
- Issue 019 added Digest preview over the reader-safe item card projection.
- ADR 0021 intentionally kept feedback separate from ranking until ranking semantics were defined.
- ADR 0023 intentionally kept Digest preview free of feedback weighting until a later issue scoped it.
- Issue 020 is that scoping step; implementation remains limited to Digest preview ordering.

## Decision

Use a computed, bounded Quality Feedback Penalty from existing `reader_feedback` rows. Treat it as an ordering signal only. Do not persist a rank table or materialized digest edition in this issue.

Initial feedback weights:

| Feedback Type | Penalty Weight |
|---|---:|
| `rights_concern` | 4 |
| `correction` | 3 |
| `quality_issue` | 2 |
| `duplicate` | 1 |
| `broken_link` | 1 |

Clamp the total penalty into a small range before applying it to Digest ordering. The penalty must never remove an item from the reader-safe pool; existing visibility filters remain the only reader-surface gate.

## TDD Plan

1. [x] Add DB integration tests proving Digest ordering lowers otherwise comparable items with higher Quality Feedback Penalty.
2. [x] Cover penalty clamping and all current Feedback Types.
3. [x] Cover that hidden raw entries, blocked items, and disabled-source items remain excluded by existing visibility filters.
4. [x] Implement the computed penalty inside `ReaderRepository.listReaderDigestItems`.
5. [x] Keep `GET /reader/digest` response shape unchanged.
6. [x] Update README, Reader API docs, master plan, goal plan, and implementation log.

## Acceptance Criteria

- [x] Digest preview ordering can use a bounded Quality Feedback Penalty.
- [x] Feedback penalty is derived only from existing item-scoped `reader_feedback` rows.
- [x] Penalty affects ordering only and does not hide, restore, delete, moderate, or personalize items.
- [x] Existing reader visibility filters still exclude hidden raw entries, blocked items, and disabled-source items.
- [x] API response shape for `GET /reader/digest` remains unchanged.
- [x] No moderation workflow, feedback resolution state, reader identity, trust weighting, backend personal-state sync, semantic/vector search, external search service, search extension deployment, digest delivery, persisted digest table, editorial workflow, browser automation, or non-RSS adapter is added.

## Research References

- PostgreSQL 18 aggregate functions: https://www.postgresql.org/docs/18/functions-aggregate.html
- PostgreSQL 18 `CREATE VIEW` docs: https://www.postgresql.org/docs/18/sql-createview.html
- PostgreSQL 18 `SELECT` docs for bounded result ordering and limits: https://www.postgresql.org/docs/18/sql-select.html
- Fastify v5 route schemas require full JSON Schema for route validation: https://github.com/fastify/fastify/blob/main/docs/Guides/Migration-Guide-V5.md

## Rollback

If the penalty makes digest ordering confusing or too easy to manipulate, remove the penalty term from the digest SQL ordering while keeping Reader Feedback storage intact. No data migration should be needed because Issue 020 should not introduce a new ranking table.
