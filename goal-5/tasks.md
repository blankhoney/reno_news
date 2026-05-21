# Goal 5 Tasks

## Task 1: Add Reader Item Proxy Route Test

- Status: Completed
- Expected result: failing test proves `/api/reader/items/:id` route is absent or unimplemented.
- Verification: `pnpm --filter @reno-news/web test` fails only on the new route test before implementation.
- Completion notes:
  - Added dynamic route tests for 200 item detail and 404 missing item responses.
  - Confirmed red test failed because `./route` was missing.

## Task 2: Implement Reader Item Proxy

- Status: Completed
- Expected result: `GET /api/reader/items/:id` proxies to Fastify and preserves response status/body/content type.
- Verification: `pnpm --filter @reno-news/web test` passes.
- Completion notes:
  - Implemented the smallest `GET` route under `/api/reader/items/[id]`.
  - The route forwards `GET`, optional cookie, no-store fetch, status, status text, body, and content-type.
  - Verified with `pnpm --filter @reno-news/web test` and `pnpm --filter @reno-news/web lint`.

## Task 3: Local And Chrome Validation

- Status: Completed
- Expected result: local curl confirms the proxy works; Chrome `/personal` has no app-owned item hydration 404.
- Verification: `pnpm --filter @reno-news/web lint`, curl output, and Chrome screenshot/log notes.
- Completion notes:
  - Verified `curl http://localhost:3000/api/reader/items/8245` returns `200 { item }`.
  - Verified `curl http://localhost:3000/api/reader/items/999999999` returns `404 { error: "Reader item not found" }`.
  - Verified Chrome `/personal` with screenshot and logs under `/tmp/reno_news_chrome_goal5_1779354406516`.
  - Chrome log check found no app-owned `/api/reader/items` 404.

## Large Check After Task 3

- Status: Completed
- Expected result: all focused checks pass and no unrelated files are touched.
- Completion notes:
  - Passed `pnpm --filter @reno-news/web test`.
  - Passed `pnpm --filter @reno-news/web lint`.

## Task 4: Final Review And Commit

- Status: Completed
- Expected result: scoped changes are reviewed and committed; worktree retains only pre-existing unrelated changes.
- Verification: `git status --short` after commit.
- Completion notes:
  - Reviewed the new dynamic route and tests.
  - Kept the change scoped to the missing reader item BFF route.
  - No database, Fastify API, digest, pagination, seed, or auth UI behavior was changed.
