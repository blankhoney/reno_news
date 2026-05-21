# Goal 7 Tasks

## Task 1: Add Goal Records

- Status: Completed
- Expected result: `goal-7/input.md`, `goal-7/plan.md`, and `goal-7/tasks.md` exist before source edits.
- Verification: files are present and preserve the requested plan.
- Completion notes:
  - Created `goal-7/input.md`, `goal-7/plan.md`, and `goal-7/tasks.md` before source edits.
  - Verified the files exist and record the requested pagination plan, checks, and rollback.

## Task 2: DB Pagination

- Status: Completed
- Expected result: repository page methods return stable `items` and `pagination` for list, board-filtered list, and search.
- Verification: DB integration tests fail before implementation and pass afterward.
- Completion notes:
  - Added a failing DB integration test for `listReaderItemsPage` with board filter, `limit`, `offset`, `hasMore`, and `nextOffset`.
  - Implemented paginated repository methods while preserving existing array-returning `listReaderItems` and `searchReaderItems`.
  - Added search pagination coverage with board filter and stable ordering.
  - Verified `pnpm --filter @reno-news/db test:integration` passes with 24 tests.

## Task 3: API Pagination Contract

- Status: Completed
- Expected result: `/reader/items` and `/reader/search` accept `limit` and `offset`, pass them to the repository, return pagination metadata, and reject invalid values.
- Verification: API tests fail before implementation and pass afterward.
- Completion notes:
  - Added failing API route tests for `/reader/items?board=ai&limit=25&offset=25`, `/reader/search?q=Sample&board=ai&limit=25&offset=25`, and invalid pagination values.
  - Added reader pagination query schemas with `limit` constrained to `1..100` and `offset` constrained to `>= 0`.
  - Routed list and search requests through the paginated repository methods and returned `{ items, pagination }` unchanged.
  - Verified `pnpm --filter @reno-news/api test` passes with 69 tests across app and auth suites.

## Large Check After Task 3

- Status: Completed
- Expected result: DB and API checks pass before moving to Web.
- Completion notes:
  - Verified `pnpm --filter @reno-news/db test:integration` passes with 24 tests.
  - Verified `pnpm --filter @reno-news/api test` passes with 69 tests across app and auth suites.

## Task 4: Web Fetch And Load More

- Status: Pending
- Expected result: home, board, and search pages request 25 items by default, read URL `limit/offset`, and render a Load more link when `hasMore` is true.
- Verification: web tests cover query serialization and Load more URL generation.
- Completion notes:

## Task 5: Local And Chrome Validation

- Status: Pending
- Expected result: curl and Chrome confirm paginated lists render with Load more and no relevant console errors.
- Verification: curl summaries, Chrome screenshots/log notes, and final focused checks.
- Completion notes:

## Task 6: Final Review And Commit

- Status: Pending
- Expected result: scoped changes are reviewed and committed; worktree retains only pre-existing unrelated changes.
- Verification: close-reading review and `git status --short`.
- Completion notes:
