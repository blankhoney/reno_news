# Issue 018 Plan: Reader-Safe Related Items Foundation

## Goal

Issue 018 adds the first lightweight Related Items slice: a Reader can see a small set of policy-visible items related to the current item detail, without adding feedback-to-ranking, personalization, digest generation, semantic search, or a new search service.

## Scope

In scope:
- Current PostgreSQL full-text search ranking guidance for `to_tsvector`, `setweight`, and `ts_rank_cd`.
- Current Next.js App Router dynamic page, `notFound`, and `Link` guidance.
- Current Fastify v5 full JSON Schema params/query validation guidance.
- Related Item terminology in `CONTEXT.md`.
- ADR for reader-safe PostgreSQL related item selection.
- DB repository method to list related reader items for one visible item.
- API endpoint `GET /reader/items/:id/related`.
- Web API helper and item detail related-items section.
- Reader API documentation and implementation log updates.

Out of scope:
- Feedback-to-ranking consumption or feedback weighting.
- Moderation workflow, automatic hide/restore, or review resolution.
- Digest generation, newsletter delivery, or scheduled digest jobs.
- Semantic/vector search, external search service, search extension deployment, `pg_trgm`, or `zhparser`.
- Auth/RBAC, reader accounts, backend personal-state sync, or personalized recommendations.
- Browser automation or non-RSS adapters.

## Design

Related Items should be a deterministic, explainable reader-detail affordance. The first slice should select from the same reader-visible pool used by reader lists, item details, and search. It must exclude the current item and must exclude hidden, blocked, disabled-source, and missing items.

The initial ordering should stay PostgreSQL-first and cheap enough for the MVP host. Acceptable signals are shared board, shared source, recency, and PostgreSQL full-text rank over reader-safe fields such as title, source title, board slug, raw summary, and summary blocks. The implementation should not add new services, new search extensions, semantic embeddings, feedback-weighted scores, digest membership, or personal saved/read-later state.

## TDD Plan

1. [x] Add DB integration tests for related items from the same visible reader pool, self exclusion, board/source/text signal ordering, hidden raw-entry exclusion, blocked item exclusion, disabled-source exclusion, missing target handling, and empty-result behavior.
2. [x] Implement `ReaderRepository.listRelatedReaderItems`.
3. [x] Add API tests for `GET /reader/items/:id/related`, optional `limit`, missing target, invalid id, and invalid limit.
4. [x] Implement Fastify route with full JSON Schema params/query validation.
5. [x] Add web API client tests for related item loading.
6. [x] Render a related-items section on the reader item detail page.
7. [x] Update README, Reader API docs, master plan, goal plan, and implementation log.

## Acceptance Criteria

- [x] Reader item detail can show related item cards for a visible item.
- [x] The current item is never returned as its own Related Item.
- [x] Related Items come only from reader-visible items.
- [x] Hidden raw entries, blocked items, disabled-source items, and missing items are excluded.
- [x] API validates item id and bounded limit with Fastify v5 full JSON Schema.
- [x] Related Items do not expose extracted full text, translation draft full text, private model payloads, feedback events, or admin-only diagnostics.
- [x] No feedback-to-ranking consumption, moderation workflow, digest generation, semantic/vector search, external search service, search extension deployment, auth/RBAC, backend personal-state sync, browser automation, or non-RSS adapter is added.

## Research References

- PostgreSQL 18 full-text search ranking, weighted vectors, and `ts_rank_cd`: Context7 `/websites/postgresql_18`
- Next.js 16.2.2 App Router dynamic pages, `notFound`, and `Link`: Context7 `/vercel/next.js/v16.2.2`
- Fastify v5 full JSON Schema route validation: Context7 `/fastify/fastify`
