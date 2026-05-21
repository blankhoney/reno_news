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

- Status: Pending
- Expected result: `/login` provides a minimal form, `/admin/denied` links to login, and `/admin` exposes current admin email plus logout.
- Verification: Web tests cover login page state helpers and admin login/logout links; Chrome later confirms the flow.
- Completion notes:

## Large Check After Task 3

- Status: Pending
- Expected result: Web auth/UI checks pass before DB/API provenance changes.
- Completion notes:

## Task 4: Local Dev Auth Seed

- Status: Pending
- Expected result: dev seed idempotently creates local reader/admin accounts with a documented local-only password.
- Verification: DB integration proves both users exist with expected roles and argon2id password hashes after seed.
- Completion notes:

## Task 5: Reader Provenance API

- Status: Pending
- Expected result: Reader list/search/digest/detail/related item projections include `isDevelopmentSeed`, and Digest Edition snapshots store/read it safely.
- Verification: DB integration and API tests cover seed true, non-seed false, and old Digest Edition snapshot fallback.
- Completion notes:

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
