# Goal 6 Tasks

## Task 1: Add Goal Records

- Status: Completed
- Expected result: `goal-6/input.md`, `goal-6/plan.md`, and `goal-6/tasks.md` exist before source edits.
- Verification: files are present and preserve the requested plan.
- Completion notes:
  - Created `goal-6/input.md`, `goal-6/plan.md`, and `goal-6/tasks.md` before source edits.
  - Verified the files exist and record the requested plan, execution approach, checks, and rollback.

## Task 2: Board-Filtered Source Diversity

- Status: Completed
- Expected result: an AI-board digest with multiple recent items from one source still includes an older item from another source when `limit=3`.
- Verification: DB integration test fails before implementation and passes afterward.
- Completion notes:
  - Added a failing DB integration test where one AI source had three newer digest candidates and another AI source had one older candidate.
  - Confirmed the test failed before implementation because the alternate source item was absent.
  - Implemented digest candidate oversampling and same-penalty source diversity in `readerRepository`.
  - Verified `pnpm --filter @reno-news/db test:integration` passes.

## Task 3: Global Board Diversity And Fallback

- Status: Completed
- Expected result: global digest prefers different boards when candidates exist and still fills the requested limit when only one source exists.
- Verification: DB integration tests cover both behaviors.
- Completion notes:
  - Added coverage for all-board digest selection so another board is included instead of allowing one source/board to fill the preview.
  - Added a temporary empty board fixture to verify single-source fallback still fills the requested `limit`.
  - Verified `pnpm --filter @reno-news/db test:integration` passes with 22 tests.

## Large Check After Task 3

- Status: Completed
- Expected result: focused DB and API checks pass after three tasks.
- Completion notes:
  - Passed `pnpm --filter @reno-news/db test:integration`.
  - Passed `pnpm --filter @reno-news/api test`.

## Task 4: Documentation And Local API Validation

- Status: Pending
- Expected result: reader API docs state digest diversity behavior and local API curls show source distribution.
- Verification: doc diff plus curl output.
- Completion notes:

## Task 5: Chrome Validation And Final Review

- Status: Pending
- Expected result: Chrome `/digest` and board-filtered digest render without obvious single-source domination, screenshots are saved, final review confirms no out-of-scope behavior changed.
- Verification: Chrome screenshots/log notes, final `git status --short`, and commit.
- Completion notes:
