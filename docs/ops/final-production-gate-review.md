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

Local pre-production evidence is sufficient to continue repository, CI/CD, and deployment-handoff work.

The project is not approved for public production launch. The remaining blockers are external-environment or production-governance gaps that cannot be honestly closed from the local repository alone.

## Blocking Production Gaps

- No production VPS/server layout has been verified against this code state.
- No production domain, TLS hostname, or real Caddy public endpoint has been verified.
- No configured production deployment secrets have been verified through a successful manual deploy run.
- No remote Prometheus scrape target, Alertmanager receiver, paging channel, or production alert delivery has been verified.
- No real object-store bucket, off-host backup upload, off-host restore drill, WAL/PITR policy, or restore objective has been verified.
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

`pnpm release:audit:local` was not used as the decisive Task 28 gate because it requires the full local Compose stack to already be running. At review time, only PostgreSQL was running locally, so claiming a successful release-health audit would be misleading.

## Non-Blocking Deferrals

These gaps do not block continuing the second-version repo work, but they remain out of production launch scope:

- GDELT runtime radar implementation;
- RSSHub route allowlist entries and runtime ingestion;
- pgvector extension, embeddings, and semantic clustering;
- email digest delivery and subscription management;
- admin duplicate review workflow;
- live GitHub/arXiv API calls in CI;
- browser smoke against a deployed production hostname.

## Verification

Local contract check:

```bash
pnpm production:gate:check
```

The check verifies that this report remains evidence-focused, records the production blockers, references the local checks, and does not claim deployment approval.
