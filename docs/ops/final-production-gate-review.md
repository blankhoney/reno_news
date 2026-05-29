# Final Production Gate Review

This review records the Task 28 production gate result for the second-version goal. It is not a production launch approval, deployment approval, security certification, incident-response process, or legal review.

## Review Method

The review checked the current repository state across these surfaces:

- client-side and reader-facing behavior: web tests, web build, reader search, related items, personal state, and digest edition playback;
- API and authorization: API tests for auth, RBAC, audit, personal state, digest editions, source admin routes, and reader routes;
- data integrity: SQL migration contracts, PostgreSQL integration tests, canonical duplicate constraints, `pg_trgm` similarity schema, account-backed state, and digest edition snapshots;
- operations: production Compose boundary, deploy contract, backup/off-host backup contracts, metrics, logging/trace, alert rules, disk guardrails, and release-health runbooks;
- AI quality gate: MiniMax adapter contract, schema validation/repair/quarantine, fake golden-set harness, and no-live-call default;
- source expansion: GitHub/arXiv adapters, GDELT radar constraint, RSSHub whitelist constraint, and low-concurrency policy checks;
- CI/CD and repository governance: GitHub Actions workflow contracts, GHCR publishing workflow, manual deploy workflow, public repository notes, and protected-production handoff docs.

## Gate Decision

Production is reachable and materially healthier than the earlier pre-production gate: `news.blankhoney.xyz` serves the app, real reader data is present, public worker ingest is blocked, server-local backup/restore passed, a local retained backup timer contract exists, Chrome production smoke passed, and image rollback was exercised. Goal 12 additionally proved the retained backup script and restore drill on production, but did not install the systemd timer because the `deploy` user cannot run passwordless sudo.

The project is still not approved for full public production launch. The remaining blockers are external-environment or production-governance gaps that cannot be honestly closed from the repository alone.

## Blocking Production Gaps

- No remote Prometheus scrape target, Alertmanager receiver, paging channel, or production alert delivery has been verified.
- Resend alert delivery is blocked because `send.blankhoney.xyz` is not verified in Resend.
- No real object-store bucket, off-host backup upload, off-host restore drill, WAL/PITR policy, or restore objective has been verified; off-host backup remains blocked even though the local retained backup timer exists.
- No installed production systemd backup timer has been verified; Deploy run `26650255337` failed at the sudo installation step.
- No live MiniMax key, live provider smoke test, live golden-set report, fallback provider, or real budget-enforcement evidence exists.
- No production incident owner, escalation process, or rollback duty owner is recorded.
- No host/container hardening review has been completed for non-root containers, host filesystem exposure, Docker daemon access, network policy, and secret storage.
- No production privacy/legal review has approved source retention, translation, digest snapshots, or third-party API terms for launch.

## Evidence Checked

Local checks expected before treating this gate as current:

```bash
pnpm source:expansion:check
pnpm github:source-policy:check
pnpm arxiv:source-policy:check
pnpm postgres:similarity:check
pnpm release:handoff:check
pnpm compose:production:check
pnpm deploy:contract:check
pnpm backup:offhost:check
pnpm alerts:check
pnpm ai:provider:check
pnpm ai:golden:check
pnpm --filter @reno-news/db test
pnpm --filter @reno-news/db test:integration
pnpm --filter @reno-news/api test
uv --project services/worker run python -m unittest discover -s services/worker/tests
pnpm lint
pnpm test
pnpm build
git diff --check
```

Goal 11 production evidence checked:

- `news.blankhoney.xyz` health probes for web, API, and worker;
- public `/worker/ingest/source/1` blocked with HTTP 404;
- 18 production sources imported and 18 latest ingest attempts successful;
- `raw_entries_total=1516` with all five boards populated;
- Chrome production acceptance screenshots under `/tmp/reno_news_goal11_20260527T182412Z`;
- server-local restore drill from `backups/goal-11/post-ingest-20260527T182622Z.dump`;
- Goal 12 local retained backup timer contract for daily server-local dumps;
- Goal 12 production retained backup `/srv/reno_news/backups/production/reno_news-20260529T165554Z.dump` and restore drill from Deploy run `26650499263`;
- Goal 12 Chrome smoke screenshots under `/tmp/reno_news_goal12_20260529T170008Z`;
- rollback drill from `sha-cd632d9` to `sha-004ad14` and back to `sha-cd632d9`.

## Non-Blocking Deferrals

These gaps do not block continuing the second-version repo work, but they remain out of production launch scope:

- GDELT runtime radar implementation;
- RSSHub route allowlist entries and runtime ingestion;
- pgvector extension, embeddings, and semantic clustering;
- admin duplicate review workflow;
- live GitHub/arXiv API calls in CI;
- full email digest delivery and subscription management.

## Verification

Local contract check:

```bash
pnpm production:gate:check
```

The check verifies that this report remains evidence-focused, records the production blockers, references the local checks, and does not claim deployment approval.
