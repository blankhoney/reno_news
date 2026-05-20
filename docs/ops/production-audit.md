# Production Audit

This report records the MVP's current production-readiness evidence and Residual Production Gaps. It is not a deployment approval, production launch decision, release workflow, remote monitor, alerting integration, security certification, or production backup policy.

## Evidence Matrix

| Area | Current Evidence | Result |
|---|---|---|
| Repository checks | `pnpm release:audit:local` runs frozen install, lint, tests, build, worker tests, and worker lock verification. | Evidence exists locally |
| Runtime health | The Release Health Audit checks direct web/API/worker health and Caddy health probes including `http://localhost:8080/api/healthz`. `docs/ops/metrics.md` defines the API and worker `/metrics` surface, `docs/ops/logging-trace.md` defines the request id/logging contract, and `docs/ops/alerts.md` defines the alert runbooks. | Evidence exists locally |
| Data safety | `docs/ops/backup-restore.md` defines local Backup Snapshot and Restore Drill steps using a disposable restore target. `docs/ops/offhost-backup.md` and `pnpm backup:offhost:check` define the S3-compatible off-host backup contract. | Evidence exists locally |
| Disk guardrails | `pnpm disk:check:local` reports Docker disk usage and local backup artifact size without deleting data. | Evidence exists locally |
| Log retention | `infra/compose/compose.yml` defines bounded `json-file` log retention for all Compose services. | Evidence exists locally |
| Identity boundary | API-owned sessions, admin route guards, and audit events are covered by route and migration tests. | Evidence exists locally |
| AI provider boundary | `docs/ops/ai-provider.md`, `docs/ops/golden-set.md`, `pnpm ai:provider:check`, and `pnpm ai:golden:check` define the MiniMax M2.7 usage boundary, env contract, local schema gate, repair/quarantine policy, fake golden-set harness, and no-live-call default. | Evidence exists locally |
| GitHub CI/CD | `.github/workflows/ci.yml`, `.github/workflows/docker-publish.yml`, and `.github/workflows/deploy.yml` define CI checks, GHCR image publishing, production boundary checks, deploy contract checks, off-host backup contract checks, alert rule checks, and a manual deployment handoff. | Evidence exists in repo |
| GitHub repository governance | `blankhoney/reno_news` is public, uses `main` as the default branch, and has branch/environment protection configured in GitHub settings. | Evidence exists on GitHub |
| Scope control | `docs/CODEX_MASTER_PLAN.md` keeps remote monitoring, alerting, production backup automation, and deferred product features out of the current MVP. | Evidence exists locally |

## Residual Production Gaps

- No production deployment target or server layout.
- No configured production deployment secrets.
- No remote monitoring or alerting.
- No production backup schedule or PITR.
- No production secret management.
- No real object-store bucket or successful restore drill from an off-host object.
- No production restore objective or point-in-time recovery target.
- No security hardening review for container users, daemon access, host filesystem exposure, or network policy.
- No incident-response process, paging channel, or operational ownership model.
- No live MiniMax key, provider smoke test, fallback provider implementation, or live MiniMax golden-set quality report.

## Explicit Non-Goals

- This report does not deploy, create releases, update CI permissions, call remote monitors, send alerts, create credentials, mutate production data, prune Docker resources, delete backups, or approve launch.
- It does not add semantic/vector search, external search services, digest delivery, editorial workflow, browser automation, additional source adapters beyond the documented source-expansion boundaries, or production backup automation.
- It does not call MiniMax, create provider credentials, approve model quality, or bypass the local schema gate.
- It does not replace security review, privacy review, legal review, incident response, or a future production release process.

## Runbook References

- `docs/ops/final-production-gate-review.md`: Task 28 Final Production Gate Review, local evidence scope, blocking production gaps, non-blocking deferrals, and non-approval boundary.
- `docs/ops/release-health-audit.md`: local Release Health Audit command, expected evidence, failure handling, rollback references, and limitations.
- `docs/ops/production-deploy.md`: deployment secret contract, server env contract, health check, and rollback boundary.
- `docs/ops/metrics.md`: Prometheus-compatible API and worker metrics, metric names, and limitations.
- `docs/ops/logging-trace.md`: `x-request-id` propagation, safe structured log fields, and logging limitations.
- `docs/ops/alerts.md`: Prometheus alert runbooks for service, backlog, ingest, model, backup, and disk signals.
- `docs/ops/ai-provider.md`: MiniMax provider boundary, environment contract, timeout/retry/budget policy, schema gate, and fallback/quarantine rules.
- `docs/ops/golden-set.md`: fake-provider golden-set fixture, command, live-provider gate, CI boundary, and limitations.
- `docs/ops/backup-restore.md`: local Backup Snapshot and Restore Drill steps, cleanup, and production backup limitations.
- `docs/ops/offhost-backup.md`: S3-compatible backup dry-run, required environment, retention policy file, and restore drill flow.
- `docs/ops/disk-usage.md`: local Disk Usage Guard command, evidence, failure handling, manual cleanup guidance, and limitations.

## Production Launch Boundary

The current system has local evidence for checks, health probes, basic metrics endpoints, backup/restore drill readiness, off-host backup dry-run contracts, disk guardrails, identity boundaries, AI provider boundary documentation, a fake AI golden-set harness, GitHub CI, GHCR image publishing, production Compose boundary checks, and a manual deployment handoff. That is enough to continue repository and release workflow work. It is not enough to claim production launch approval.

Before a real production launch, a later explicitly scoped issue must decide deployment target, real secret handling, real object-store target, backup schedule, successful off-host restore drill cadence, remote monitoring, alerting, security hardening, rollback ownership, and incident response.
