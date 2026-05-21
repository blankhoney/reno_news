# Goal 7 Plan: Reader List And Search Pagination

## Requirement

Add offset-based pagination for reader list and search surfaces while keeping item card shape, database schema, digest, personal state, admin, seed data, and real-source configuration unchanged. API callers that only read `items` should remain compatible.

## Context

- `ReaderRepository.listReaderItems` and `searchReaderItems` currently hard-code `limit 100`.
- `/reader/items` accepts only an optional board filter and has no schema validation.
- `/reader/search` accepts `q` and optional board, with no pagination.
- Web home, board, and search pages render the full returned array at once.

## Risks

- Search ordering must remain rank-first, then recency and id.
- Adding pagination metadata must not remove the existing `items` field.
- Web URL generation must preserve board and search query parameters.
- Existing tests and callers expect array-returning repository methods, so paginated methods should be added without removing the current methods.

## Execution Approach

1. Create Goal 7 records before source edits.
2. Add DB integration coverage for list pagination, board-filtered pagination, and search pagination.
3. Implement repository page methods using `limit + 1` and keep existing array methods as wrappers.
4. Add API query schemas and route tests for pagination passthrough and invalid query rejection.
5. Add web fetch helpers, URL helpers, and page wiring for Load more navigation.
6. Run focused checks, local curl, Chrome validation, close reading review, and commit scoped changes.

## Verification

- `pnpm --filter @reno-news/db test:integration`
- `pnpm --filter @reno-news/api test`
- `pnpm --filter @reno-news/web test`
- `pnpm --filter @reno-news/web lint`
- Curl checks for `/reader/items` and `/reader/search` with `limit=5&offset=0`.
- Chrome screenshots for `/`, `/boards/ai`, and `/search?q=Kubernetes`.

## Rollback

Revert the repository pagination additions, API query schema and route changes, web Load more wiring, docs updates, tests, and `goal-7/` files. No database rollback is needed because schema and data are unchanged.
