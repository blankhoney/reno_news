# Goal 11 Plan

## Objective

Close the next production-readiness slice after the successful `news.blankhoney.xyz` deploy: harden the public ingress, initialize production with verified real sources, prove local backup/restore, run Chrome acceptance, and record remaining external blockers without claiming off-host backup completion.

## Current Context

- Production deploy is already successful through the existing edge Caddy on VPS `43.130.244.175`.
- The production database currently has no reader items, so public reader pages render empty states.
- Goal 3 proved a first real-source batch locally: 18 sources succeeded, while `arXiv cs.SE` and `CNCF Blog` were excluded.
- The current edge Caddy route exposes `/worker/*`, which makes worker operational routes publicly reachable if not constrained.
- Off-host backup is not configured; this goal uses server-local backup only and keeps off-host backup blocked.

## Execution Approach

1. Create Goal 11 records before implementation.
2. Use TDD for the Caddy ingress safety contract, then implement minimal Caddyfile changes.
3. Run local contracts, push, wait for CI and image publishing, then deploy the hardened ingress.
4. Take a pre-import production DB count snapshot and server-local backup.
5. Import only the 18 verified production candidate sources idempotently by URL.
6. Trigger production ingest internally source-by-source, with at least 3 seconds between arXiv sources.
7. Verify production reader APIs, Chrome pages, local backup restore drill, Resend readiness, rollback readiness, and documentation evidence.

## Verification

- Local contracts: `pnpm compose:production:check`, `pnpm deploy:contract:check`, `pnpm backup:offhost:check`, `pnpm alerts:check`, `pnpm production:gate:check`, `git diff --check`.
- Production health: `/healthz`, `/api/healthz`, `/worker/healthz` return 200; public worker ingest route is blocked.
- Production reader APIs return real items after ingest.
- Chrome extension screenshots under `/tmp/reno_news_goal11_*`.
- Server-local dump and restore drill pass.
- Resend and off-host backup are either verified from real evidence or recorded as blockers.

## Rollback

- Caddy ingress hardening can be rolled back by redeploying the prior image tag or restoring the previous edge Caddy snippet, but public worker ingest exposure should not be reintroduced unless explicitly approved.
- Source import rollback is URL-scoped: disable the imported source rows first; if a full rollback is required, delete dependent `raw_entries`, `source_ingest_attempts`, `source_policies`, and `sources` rows for the imported URLs.
- Production deploy rollback uses `.deploy/previous-image-tag` when available.
- Local backup artifacts are retained on the server unless explicitly cleaned.
