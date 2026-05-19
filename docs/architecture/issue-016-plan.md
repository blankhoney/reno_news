# Issue 016 Plan: PostgreSQL Reader Search Foundation

## Goal

Issue 016 adds the first Milestone 6 search slice: a reader-safe PostgreSQL search API and page for visible reader items.

## Scope

In scope:
- Current PostgreSQL 18 full-text search guidance for `tsvector`, `websearch_to_tsquery`, `@@`, `ts_rank`, and GIN index trade-offs.
- Reader-safe searchable fields from existing projections: raw entry title, URL, source title, board name, raw summary, and summary block fields.
- Hidden, blocked, or disabled-source filtering consistent with reader list and detail views.
- DB repository search method.
- API endpoint `GET /reader/search?q=...`.
- Optional board filter.
- Web reader search page and search form entrypoint.
- Reader API documentation and implementation log updates.

Out of scope:
- Feedback handling or feedback-to-ranking logic.
- Digest generation.
- Semantic/vector search.
- Meilisearch, OpenSearch, or another external search service.
- `pg_trgm`, `zhparser`, custom Chinese segmentation, or extension deployment.
- Searching private extraction text, translation draft full text, private model payloads, or admin-only diagnostics.
- Ranking formula changes outside text-search relevance ordering.
- Auth, backend personal-state APIs, browser automation, or non-RSS adapters.

## Design

The first search slice should query the existing reader-safe projection, not create a separate search document table. Search should return the same card shape as `GET /reader/items`, plus enough metadata to explain the query route if needed later.

The query path should use PostgreSQL built-in text search with user input parsed by `websearch_to_tsquery('simple', q)` because PostgreSQL documents it as robust for web-search-like user syntax. Since native PostgreSQL FTS does not solve Chinese segmentation by itself, implementation may include a conservative substring fallback over the same reader-safe fields for exact CJK/title matches. Do not introduce extensions or external services in this issue.

The API should validate `q` as a required non-empty string and keep the board filter optional.

## TDD Plan

1. [x] Add DB integration tests for title/source/summary matches, board filtering, hidden filtering, blocked filtering, disabled-source filtering, and no-result behavior.
2. [x] Implement reader search repository method over reader-safe fields.
3. [x] Add API tests for `GET /reader/search`, board filter, missing query, and empty query.
4. [x] Implement the Fastify route with full JSON Schema query validation.
5. [x] Add web API client tests for search query URL construction.
6. [x] Add `/search` reader page and a search form entrypoint from reader surfaces.
7. [x] Update README, Reader API docs, master plan, and log.

## Acceptance Criteria

- [x] Reader can search visible items by title.
- [x] Reader can search visible items by source title.
- [x] Reader can search visible items by summary text.
- [x] Reader can filter search by board.
- [x] Hidden raw entries are excluded from search results.
- [x] Blocked items and disabled-source items are excluded from search results.
- [x] Missing or empty query is rejected by the API.
- [x] Search results do not expose extracted full text, translation draft full text, private model payloads, or admin-only diagnostics.
- [x] No feedback handling, digest generation, semantic/vector search, external search service, search extension deployment, auth/RBAC, backend personal-state API, browser automation, or non-RSS adapter is added.

## Research References

- PostgreSQL 18 full text search controls, operators, ranking, and index guidance: Context7 `/websites/postgresql_18`
