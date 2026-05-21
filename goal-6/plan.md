# Goal 6 Plan: Digest Source And Board Diversity

## Requirement

Make live digest preview and generated Digest Edition item selection less dominated by one high-frequency source or one board, without changing public API shape, database schema, reader-safe item fields, or feedback penalty semantics.

## Context

- `/reader/digest` and admin Digest Edition generation both call `readerRepository.listReaderDigestItems`.
- `listReaderDigestItems` currently orders only by bounded feedback quality penalty, item recency, and id.
- Real-source validation showed GitHub/open-source style feeds can dominate the digest when they publish many recent entries.
- Reader card summaries are already normalized and do not need to be changed in this goal.

## Risks

- Diversity must not promote penalized items ahead of unpenalized items.
- Source and board balancing should not under-fill the digest when the candidate pool has too little diversity.
- SQL-only ranking could become hard to read; TypeScript post-selection over an oversampled, already reader-safe candidate pool is easier to verify.
- Existing repository tests use larger limits than the API exposes, so the implementation must handle repository-level limits conservatively.

## Execution Approach

1. Add Goal 6 records before modifying source code.
2. Add one failing integration test for board-filtered source diversity.
3. Implement the smallest repository change needed to pass it.
4. Add global board-diversity and fallback-fill integration coverage.
5. Update the reader API docs to describe best-effort digest diversity.
6. Run DB integration, API tests, curl checks, Chrome checks, and a close-reading review.

## Verification

- `pnpm --filter @reno-news/db test:integration`
- `pnpm --filter @reno-news/api test`
- `curl http://localhost:3001/reader/digest?limit=12`
- `curl "http://localhost:3001/reader/digest?board=ai&limit=12"`
- Chrome plugin screenshots for `/digest` and a board-filtered digest page.

## Rollback

Revert the `readerRepository` digest selection change, the new/updated integration tests, the reader API doc note, and `goal-6/` files. No database rollback is needed because schema and data are unchanged.
