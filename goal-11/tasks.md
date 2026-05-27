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

- Status: Completed
- Expected result: only the 18 Goal 3 successful sources exist in production with the requested source policies.
- Verification: URL/id list, enabled/crawl policy counts, and explicit exclusion record for `arXiv cs.SE` and `CNCF Blog`.
- Completion notes:
  - First remote SQL attempt in Deploy run `26529871603` failed before `psql` because a multi-line secret command was parsed by the shell; no import was performed in that attempt.
  - Retried with a base64-wrapped remote script in Deploy run `26529984489`; the run passed.
  - Created only the 5 required board metadata rows; did not run the dev seed, create dev users, or insert seed raw entries.
  - Verified production counts: `boards=5`, `sources=18`, `policies=18`, `enabled_imported_sources=18`.
  - Imported source ids:
    - `1` AI RSS Google AI
    - `2` AI RSS Google DeepMind
    - `3` AI RSS Hugging Face Blog
    - `4` AI arXiv cs.AI
    - `5` AI arXiv cs.LG
    - `6` Software Engineering RSS Cloudflare Blog
    - `7` Software Engineering RSS Cloudflare Developer Platform Changelog
    - `8` Software Engineering RSS Meta Engineering
    - `9` Software Engineering RSS AWS Architecture Blog
    - `10` Software Engineering GitHub Fastify
    - `11` Semiconductor RSS EE Times
    - `12` Semiconductor RSS SemiWiki
    - `13` Employment Trends RSS BLS JOLTS
    - `14` Employment Trends RSS Indeed Hiring Lab
    - `15` Open Source GitHub Kubernetes
    - `16` Open Source GitHub Node.js
    - `17` Open Source GitHub Next.js
    - `18` Open Source GitHub uv
  - Verified policies use `save=metadata_only`, `rights=metadata_only`, and `translation=none`; GitHub sources use `interval=360` and `max_rph=2`; BLS JOLTS uses `risk=low`.
  - Explicitly kept `arXiv cs.SE` and `CNCF Blog` excluded.

## Task 6: Production Source Ingest

- Status: Completed
- Expected result: each imported source has a latest `source_ingest_attempts` row; successful sources add real raw entries.
- Verification: latest attempt table, per-board raw entry counts, and disabled records for any production failures.
- Completion notes:
  - Triggered internal VPS worker ingest in Deploy run `26530118419`, using the worker container loopback endpoint instead of public `/worker/ingest/*`.
  - Ingest was source-by-source in source id order; arXiv source `4` and source `5` had an explicit 3 second spacing sleep between requests.
  - Worker responses showed success for all 18 sources. The run returned non-zero only because the follow-up SQL report reused a CTE across statements after the ingest had already completed.
  - Ran report-only Deploy run `26530231824`; the run passed.
  - Verified latest attempts: `attempt_success_count=18`, `attempt_failure_count=0`, `attempt_missing_count=0`.
  - Verified `raw_entries_total=1516`.
  - Verified raw entries by board: `ai=922`, `software-engineering=433`, `open-source=124`, `employment-trends=22`, `semiconductor=15`.
  - No production source was disabled.

## Task 7: Large Check After Ingest

- Status: Completed
- Expected result: reader APIs return real items for list, digest, search, and board filters.
- Verification: production API responses and board/source distribution summary.
- Completion notes:
  - Verified public production health through `news.blankhoney.xyz` with direct IP/SNI routing: `/healthz=200`, `/api/healthz=200`, `/worker/healthz=200`.
  - Verified public `/worker/ingest/source/1` remains blocked with HTTP 404.
  - Verified `/api/reader/items?limit=5` returns 5 real items with pagination `hasMore=true`.
  - Verified `/api/reader/digest?limit=12` returns 12 real items.
  - Verified `/api/reader/search?q=Kubernetes&limit=5` returns 5 real Kubernetes results with pagination `hasMore=true`.
  - Verified all board filters return real items: `ai`, `software-engineering`, `semiconductor`, `employment-trends`, and `open-source`.
  - Digest distribution for 12 items: boards `open-source=4`, `software-engineering=2`, `ai=1`, `semiconductor=4`, `employment-trends=1`; no source exceeded 2 items.

## Task 8: Chrome Production Acceptance

- Status: Completed
- Expected result: Chrome extension validates non-empty reader pages and key admin/personal surfaces.
- Verification: screenshots under `/tmp/reno_news_goal11_*`, no relevant console errors, and visible real titles.
- Completion notes:
  - Used the Chrome extension against production `https://news.blankhoney.xyz`.
  - Saved screenshots and `acceptance.json` under `/tmp/reno_news_goal11_20260527T182412Z`.
  - Verified pages: `/`, `/boards/ai`, `/boards/software-engineering`, `/boards/semiconductor`, `/boards/employment-trends`, `/boards/open-source`, `/digest`, `/search?q=Kubernetes`, a real item detail page, `/personal`, and `/admin`.
  - All reader pages showed real production titles. Examples: `astral-sh/uv`, `ITBench-AA: Frontier Models Score Below 50%...`, `Iran's Internet is partially restored...`, `SoC PLANNER...`, `A Shifting Pipeline...`, and `Kubernetes v1.35.0`.
  - `/personal` loaded the expected anonymous local empty state.
  - `/admin` showed the expected `Admin access required` denial page with login link.
  - Chrome console error count was `0` for every checked page.
  - Visible text checks found no raw HTML tag markers and no Markdown link syntax.

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
