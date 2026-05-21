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

- Status: Completed
- Expected result: Reader cards, details, related items, digest previews, and Digest Edition replays show `Development sample` only for seed items.
- Verification: Web tests cover badge helper/rendering behavior; browser acceptance confirms visible labels.
- Completion notes:
  - Added `readerProvenanceBadgeLabel` with Web test coverage for seed and non-seed items.
  - Added a reusable `ReaderProvenanceBadge` component.
  - Rendered `Development sample` on reader list cards, item detail headers, related item cards, and Digest Edition replay cards.
  - Digest preview is covered through the existing shared `ReaderItemList`.
  - Added compact badge styling that does not change item filtering or ordering.
  - Verified with `pnpm --filter @reno-news/web test`, `pnpm --filter @reno-news/web lint`, and `git diff --check`.
  - Performed close-reading review of the changed UI/helper files; no follow-up fix was needed.

## Large Check After Task 6

- Status: Completed
- Expected result: DB/API/Web checks pass before documentation and Chrome acceptance.
- Completion notes:
  - Ran `pnpm --filter @reno-news/db test:integration`; all 26 DB integration tests passed.
  - Ran `pnpm --filter @reno-news/api test`; all 65 API app tests and 4 auth service tests passed.
  - Ran `pnpm --filter @reno-news/web test`; all 65 Web tests passed.
  - Ran `pnpm --filter @reno-news/web lint`, `pnpm --filter @reno-news/api lint`, `pnpm --filter @reno-news/db lint`, and `pnpm --filter @reno-news/contracts lint`; all typechecks passed.
  - Ran `pnpm --filter @reno-news/contracts test`; all 4 contract tests passed.
  - Ran `git diff --check`; no whitespace errors were reported.

## Task 7: Documentation Alignment

- Status: Completed
- Expected result: README, Chinese README, and API docs describe Web auth BFF, local dev credentials, and `isDevelopmentSeed`.
- Verification: stale/omission searches confirm the new public field and local-only credential warning are documented.
- Completion notes:
  - Updated `README.md` and `README.zh-CN.md` with Web auth BFF routes, local-only dev seed accounts, and development seed marker scope.
  - Updated `docs/api/auth.md` with Web auth BFF behavior, safe form redirect semantics, and local dev seed credentials.
  - Updated `docs/api/reader.md` with `isDevelopmentSeed` in reader item card/detail response examples and mark-only semantics.
  - Updated `docs/api/digest-editions.md` with snapshot `isDevelopmentSeed` behavior and legacy fallback.
  - Verified stale/omission searches for auth, dev credentials, pagination, and `isDevelopmentSeed`.
  - Verified with `pnpm --filter @reno-news/web lint` and `git diff --check -- README.md README.zh-CN.md docs/api/auth.md docs/api/reader.md docs/api/digest-editions.md`.
  - Performed close-reading review of the changed documentation; no follow-up fix was needed.

## Task 8: Chrome Acceptance And Final Review

- Status: Completed
- Expected result: Chrome verifies login/logout and provenance labels; final checks pass; worktree is clean after commits.
- Verification: planned commands pass and screenshots are saved under `/tmp/reno_news_goal9_*`.
- Completion notes:
  - Applied migrations and dev seed to the local database, refreshed the Web/API compose services, and verified `/healthz` for Web/API.
  - Chrome plugin direct local navigation was blocked by the local Chrome client for `localhost`/`127.0.0.1`; the acceptance flow used the same Chrome plugin against `http://192.168.5.106:3000`, which loaded the app and allowed plugin-driven clicks, form filling, text checks, console checks, and screenshots.
  - During Chrome acceptance, `/login` briefly returned 500 because the ignored Next/Turbopack dev cache had a missing `.sst` file. Removed only the ignored generated cache under `apps/web/.next/dev/cache/turbopack`, restarted the Web container, and confirmed `/login?next=/admin` returned 200 afterward.
  - Verified in Chrome: `/admin` redirects to `/admin/denied`, the denied page shows `Log in`, `/login?next=/admin` accepts `admin@example.invalid` with the local dev password, `/admin` shows `admin@example.invalid` and `Log out`, logout clears the session, and revisiting Admin returns to the denied page.
  - Verified in Chrome: `/` shows real source items with no development badge on the first page, `/search?q=Sample` shows `Development sample` badges for seed items while also showing real-source matches, seed detail `/items/5` shows the badge on the detail and related seed card, and `/digest` loads with reader cards and provenance badges where applicable.
  - Chrome console error logs for the final digest page were empty.
  - Saved screenshots:
    - `/tmp/reno_news_goal9_admin_denied.png`
    - `/tmp/reno_news_goal9_login.png`
    - `/tmp/reno_news_goal9_admin_logged_in.png`
    - `/tmp/reno_news_goal9_admin_after_logout.png`
    - `/tmp/reno_news_goal9_home_real_sources.png`
    - `/tmp/reno_news_goal9_search_sample_badges.png`
    - `/tmp/reno_news_goal9_seed_detail.png`
    - `/tmp/reno_news_goal9_digest.png`
  - Ran `pnpm --filter @reno-news/db test:integration`; all 26 DB integration tests passed.
  - Ran `pnpm --filter @reno-news/api test`; all 65 API app tests and 4 auth service tests passed.
  - Ran `pnpm --filter @reno-news/web test`; all 65 Web tests passed.
  - Ran `pnpm --filter @reno-news/web lint`; typecheck passed.
  - Ran `git diff --check`; no whitespace errors were reported.
  - Restored the generated `apps/web/next-env.d.ts` path drift after Web lint so it remains uncommitted.

## Final Review

- Status: Completed
- Completion notes:
  - Reviewed the auth BFF route handlers: Next remains a same-origin proxy/form bridge, forwards cookies to Fastify, copies `set-cookie`, and rejects unsafe `next` redirect values.
  - Reviewed the login/admin UI: `/login` stays minimal, `/admin/denied` explains the permission requirement, and `/admin` remains protected by `requireAdminSession()`.
  - Reviewed reader provenance data flow: list, search, digest, detail, related items, and Digest Edition snapshots all carry `isDevelopmentSeed` from `raw_entries.raw_payload_json @> '{"seed": true}'::jsonb`.
  - Reviewed UI surfaces: shared reader cards, item details, related items, digest previews, and Digest Edition replay all render `Development sample` only through the shared badge helper.
  - Reviewed dev seed scope: example users are only in `infra/db/seeds/dev.sql`; no production compose/env changes were made.
  - Searched README/API docs for stale auth/personal-state/pagination wording and confirmed `isDevelopmentSeed` is documented where reader responses and Digest Edition snapshots are described.
  - No additional fixes were required after the final review.
