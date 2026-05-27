# Goal 11 Tasks

## Task 1: Goal 11 Records

- Status: Completed
- Expected result: `goal-11/input.md`, `goal-11/plan.md`, and `goal-11/tasks.md` exist before implementation edits.
- Verification: files exist, `input.md` preserves the requested plan, and `git diff --check` passes.
- Completion notes:
  - Created `goal-11/input.md`, `goal-11/plan.md`, and `goal-11/tasks.md` before implementation edits.
  - Preserved the requested Goal 11 plan verbatim in `input.md`.
  - Ran `git diff --check -- goal-11/input.md goal-11/plan.md goal-11/tasks.md`; no whitespace errors were reported.

## Task 2: Caddy Ingress Safety TDD

- Status: Completed
- Expected result: production Caddy config exposes only `/worker/healthz` publicly and blocks worker ingest paths from the public internet.
- Verification: failing contract first, then `pnpm compose:production:check`, direct config inspection, and production health/blocked-route probes after deploy.
- Completion notes:
  - Red: updated `scripts/check-production-compose.mjs` to reject production Caddy configs that publicly proxy `handle_path /worker/*`; `pnpm compose:production:check` failed on the existing config.
  - Green: changed both production Caddy configs to proxy only `/worker/healthz`, rewriting it to worker `/healthz`.
  - Ran `pnpm compose:production:check`; passed.
  - Ran `pnpm deploy:contract:check`; passed.
  - Ran `git diff --check`; passed.
  - Production route verification is deferred to Task 3 after the hardened config is deployed.

## Task 3: Large Check And Hardened Deploy

- Status: Completed
- Expected result: local contracts pass, CI and Publish Images pass, and hardened ingress is deployed to production.
- Verification: GitHub Actions run ids, production health probes, and public worker ingest blocked.
- Completion notes:
  - Ran `pnpm compose:production:check && pnpm deploy:contract:check && pnpm production:gate:check && git diff --check`; passed.
  - Waited for CI run `26529303815`; passed.
  - Waited for Publish Images run `26529303821`; passed.
  - Triggered Deploy run `26529386088` with image tag `sha-cd632d9` and approved the `production` environment deployment.
  - Deploy run `26529386088` passed with `compose.edge.yml`, database migration, service restart, and health check success.
  - Verified production `/healthz`, `/api/healthz`, and `/worker/healthz` return HTTP 200.
  - Verified public `/worker/ingest/source/1` returns HTTP 404 and does not expose worker ingest JSON.

## Task 4: Production Pre-Import Snapshot

- Status: Completed
- Expected result: production `sources`, `raw_entries`, and `source_ingest_attempts` counts are recorded and a server-local pre-import dump exists.
- Verification: non-secret command output with counts and dump path.
- Completion notes:
  - Ran GitHub Deploy run `26529540432` as a remote operational command, not an app redeploy.
  - Recorded pre-import counts: `sources=0`, `raw_entries=0`, `source_ingest_attempts=0`.
  - Created server-local pre-import dump: `backups/goal-11/pre-import-20260527T180736Z.dump` with size `95K`.

## Task 5: Import 18 Verified Real Sources

- Status: Pending
- Expected result: only the 18 Goal 3 successful sources exist in production with the requested source policies.
- Verification: URL/id list, enabled/crawl policy counts, and explicit exclusion record for `arXiv cs.SE` and `CNCF Blog`.
- Completion notes:

## Task 6: Production Source Ingest

- Status: Pending
- Expected result: each imported source has a latest `source_ingest_attempts` row; successful sources add real raw entries.
- Verification: latest attempt table, per-board raw entry counts, and disabled records for any production failures.
- Completion notes:

## Task 7: Large Check After Ingest

- Status: Pending
- Expected result: reader APIs return real items for list, digest, search, and board filters.
- Verification: production API responses and board/source distribution summary.
- Completion notes:

## Task 8: Chrome Production Acceptance

- Status: Pending
- Expected result: Chrome extension validates non-empty reader pages and key admin/personal surfaces.
- Verification: screenshots under `/tmp/reno_news_goal11_*`, no relevant console errors, and visible real titles.
- Completion notes:

## Task 9: Server-Local Backup And Restore Drill

- Status: Pending
- Expected result: post-ingest local dump restores into a disposable database.
- Verification: dump path and restore drill output; off-host backup remains blocked.
- Completion notes:

## Task 10: Resend Alert Test

- Status: Pending
- Expected result: Resend readiness is either proven by a real test alert or recorded as blocked by missing server-side configuration.
- Verification: delivery evidence without secrets, or blocker evidence.
- Completion notes:

## Task 11: Rollback Drill

- Status: Pending
- Expected result: controlled rollback is tested when previous image state exists and can be safely restored to current.
- Verification: current/previous image tags, health after rollback, health after redeploy current.
- Completion notes:

## Task 12: Final Checks And Evidence Docs

- Status: Pending
- Expected result: Goal 11 and production docs reflect only verified evidence and exact remaining blockers.
- Verification: local contracts, CI status, production health, Chrome smoke, and `git diff --check`.
- Completion notes:
