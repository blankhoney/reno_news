# Goal 9 Tasks

## Task 1: Add Goal Records

- Status: Completed
- Expected result: `goal-9/input.md`, `goal-9/plan.md`, and `goal-9/tasks.md` exist before source edits.
- Verification: files exist and preserve the requested plan.
- Completion notes:
  - Created `goal-9/input.md`, `goal-9/plan.md`, and `goal-9/tasks.md` before any business-code edits.
  - Verified all three files exist and `input.md` preserves the requested Goal 9 plan.
  - Ran `git diff --check -- goal-9/input.md goal-9/plan.md goal-9/tasks.md`; no whitespace errors were reported.

## Task 2: Web Auth BFF Routes

- Status: Completed
- Expected result: `/api/auth/me`, `/api/auth/login`, and `/api/auth/logout` proxy to Fastify, preserve JSON responses/cookies, and support safe form redirects.
- Verification: Web route tests cover JSON forwarding, cookie forwarding, set-cookie copying, success/failure form redirects, and open-redirect rejection.
- Completion notes:
  - Added Web BFF route handlers for `/api/auth/me`, `/api/auth/login`, and `/api/auth/logout`.
  - Added route tests for session-cookie forwarding, JSON login forwarding, `set-cookie` preservation, form login success and failure redirects, unsafe `next` fallback, and logout redirect with cleared cookie.
  - Kept auth ownership in Fastify: Next routes proxy credentials/cookies and only handle same-origin form redirects.
  - Verified with `pnpm --filter @reno-news/web test`, `pnpm --filter @reno-news/web lint`, and `git diff --check -- apps/web/src/app/api/auth goal-9/tasks.md`.

## Task 3: Login And Admin UI

- Status: Completed
- Expected result: `/login` provides a minimal form, `/admin/denied` links to login, and `/admin` exposes current admin email plus logout.
- Verification: Web tests cover login page state helpers and admin login/logout links; Chrome later confirms the flow.
- Completion notes:
  - Added `/login` with email/password form posting to the Web auth BFF and safe `next` handling.
  - Added login error message mapping for auth failures.
  - Added `/admin/denied` login link to `/login?next=/admin`.
  - Added current admin email display and logout form to `/admin`.
  - Added focused Web tests for login form action, error messages, admin login link, and admin logout action.
  - Verified with `pnpm --filter @reno-news/web test`, `pnpm --filter @reno-news/web lint`, and `git diff --check -- apps/web/src/app/login apps/web/src/app/admin apps/web/src/app/styles.css goal-9/tasks.md`.

## Large Check After Task 3

- Status: Completed
- Expected result: Web auth/UI checks pass before DB/API provenance changes.
- Completion notes:
  - Ran `pnpm --filter @reno-news/web test`; all 64 Web tests passed.
  - Ran `pnpm --filter @reno-news/web lint`; lint passed.
  - Ran `pnpm --filter @reno-news/api test`; all 65 API app tests and 4 auth service tests passed.
  - Ran `git diff --check`; no whitespace errors were reported.
  - Confirmed the worktree was otherwise clean before starting DB/API provenance changes.

## Task 4: Local Dev Auth Seed

- Status: Completed
- Expected result: dev seed idempotently creates local reader/admin accounts with a documented local-only password.
- Verification: DB integration proves both users exist with expected roles and argon2id password hashes after seed.
- Completion notes:
  - Added a failing DB integration assertion that the dev seed creates `admin@example.invalid` and `reader@example.invalid`.
  - Confirmed the test failed before the seed change because no matching users existed.
  - Added idempotent dev seed upserts for both local users with the password `reno-news-dev-password` hashed as argon2id.
  - Verified with `pnpm --filter @reno-news/db test:integration`.
  - Performed close-reading review of the modified test and seed SQL; no follow-up fix was needed.

## Task 5: Reader Provenance API

- Status: Completed
- Expected result: Reader list/search/digest/detail/related item projections include `isDevelopmentSeed`, and Digest Edition snapshots store/read it safely.
- Verification: DB integration and API tests cover seed true, non-seed false, and old Digest Edition snapshot fallback.
- Completion notes:
  - Added DB integration coverage for `isDevelopmentSeed` across reader list, search, digest, detail, and related projections.
  - Added Digest Edition coverage for new snapshots preserving `isDevelopmentSeed=true` and legacy snapshots normalizing missing provenance to `false`.
  - Added `isDevelopmentSeed` to reader repository projections and Digest Edition snapshots without changing filters, ranking, or schema.
  - Updated API, Web reader types, and contracts fixtures/tests so the response shape is explicit.
  - Verified with `pnpm --filter @reno-news/db test:integration`, `pnpm --filter @reno-news/api test`, `pnpm --filter @reno-news/web test`, `pnpm --filter @reno-news/web lint`, `pnpm --filter @reno-news/contracts lint`, `pnpm --filter @reno-news/contracts test`, `pnpm --filter @reno-news/api lint`, `pnpm --filter @reno-news/db lint`, and `git diff --check`.
  - Performed close-reading review of the changed repository, contract, API, Web, and integration-test files; no follow-up fix was needed.

## Task 6: Reader Provenance UI

- Status: Pending
- Expected result: Reader cards, details, related items, digest previews, and Digest Edition replays show `Development sample` only for seed items.
- Verification: Web tests cover badge helper/rendering behavior; browser acceptance confirms visible labels.
- Completion notes:

## Large Check After Task 6

- Status: Pending
- Expected result: DB/API/Web checks pass before documentation and Chrome acceptance.
- Completion notes:

## Task 7: Documentation Alignment

- Status: Pending
- Expected result: README, Chinese README, and API docs describe Web auth BFF, local dev credentials, and `isDevelopmentSeed`.
- Verification: stale/omission searches confirm the new public field and local-only credential warning are documented.
- Completion notes:

## Task 8: Chrome Acceptance And Final Review

- Status: Pending
- Expected result: Chrome verifies login/logout and provenance labels; final checks pass; worktree is clean after commits.
- Verification: planned commands pass and screenshots are saved under `/tmp/reno_news_goal9_*`.
- Completion notes:
