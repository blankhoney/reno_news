# Production Audit

This report records the MVP's current production-readiness evidence and Residual Production Gaps. It is not a deployment approval, production launch approval, security certification, incident-response process, privacy/legal review, or production backup policy.

## Evidence Matrix

| Area | Current Evidence | Result |
|---|---|---|
| Repository checks | `pnpm release:audit:local` runs frozen install, lint, tests, build, worker tests, and worker lock verification. | Evidence exists locally |
| Runtime health | `news.blankhoney.xyz` is served from VPS `43.130.244.175` through the existing edge Caddy. Goal 11 verified `/healthz`, `/api/healthz`, and `/worker/healthz` return 200 after deploy and rollback. | Production evidence exists |
| Public ingress boundary | Goal 11 hardened production Caddy to expose only `/worker/healthz`; public `/worker/ingest/source/1` returns 404. `pnpm compose:production:check` rejects `handle_path /worker/*`. | Production evidence exists |
| Production reader data | Goal 11 imported 18 verified real sources, ingested all 18 successfully, and verified `raw_entries_total=1516` with all five boards populated. Chrome screenshots are under `/tmp/reno_news_goal11_20260527T182412Z`. | Production evidence exists |
| Data safety | `docs/ops/backup-restore.md` defines local Backup Snapshot and Restore Drill steps. Goal 11 created server-local dumps before and after import, then restored `backups/goal-11/post-ingest-20260527T182622Z.dump` into a disposable database. `docs/ops/offhost-backup.md` and `pnpm backup:offhost:check` define the S3-compatible off-host backup contract. | Local/server evidence exists; off-host blocked |
| Disk guardrails | `pnpm disk:check:local` reports Docker disk usage and local backup artifact size without deleting data. | Evidence exists locally |
| Log retention | `infra/compose/compose.yml` defines bounded `json-file` log retention for all Compose services. | Evidence exists locally |
| Identity boundary | API-owned sessions, admin route guards, and audit events are covered by route and migration tests. | Evidence exists locally |
| AI provider boundary | `docs/ops/ai-provider.md`, `docs/ops/golden-set.md`, `pnpm ai:provider:check`, and `pnpm ai:golden:check` define the MiniMax M2.7 usage boundary, env contract, local schema gate, repair/quarantine policy, fake golden-set harness, and no-live-call default. | Evidence exists locally |
| GitHub CI/CD | `.github/workflows/ci.yml`, `.github/workflows/docker-publish.yml`, and `.github/workflows/deploy.yml` define CI checks, GHCR image publishing, production boundary checks, deploy contract checks, off-host backup contract checks, alert rule checks, and manual production deploy. Goal 11 deploy and operational runs succeeded through the protected `production` environment. | Repository and production evidence exists |
| GitHub repository governance | `blankhoney/reno_news` is public, uses `main` as the default branch, and has branch/environment protection configured in GitHub settings. | Evidence exists on GitHub |
| Rollback | Goal 11 rollback drill moved from `sha-cd632d9` to `sha-004ad14`, verified health, then restored `sha-cd632d9` and verified health again. | Production evidence exists |
| Alert delivery | Server `.env` contains `RESEND_API_KEY`, but Resend returned HTTP 403 because `send.blankhoney.xyz` is not verified. | Blocked by external provider configuration |
| Scope control | `docs/CODEX_MASTER_PLAN.md` keeps remote monitoring, alerting, production backup automation, and deferred product features out of the current MVP. | Evidence exists locally |

## Residual Production Gaps

- No remote Prometheus scrape target, Alertmanager receiver, paging channel, or production alert delivery.
- No verified Resend sending domain for `send.blankhoney.xyz`.
- No real object-store bucket, off-host backup upload, or successful restore drill from an off-host object.
- No production backup schedule, PITR, restore objective, or backup retention ownership.
- No formal production secret rotation, access-review, or incident ownership model.
- No security hardening review for container users, daemon access, host filesystem exposure, or network policy.
- No incident-response process, paging channel, or operational ownership model.
- No live MiniMax key, provider smoke test, fallback provider implementation, or live MiniMax golden-set quality report.

## Explicit Non-Goals

- This report does not create releases, update CI permissions, call remote monitors, create credentials, prune Docker resources, delete backups, or approve launch.
- It does not add semantic/vector search, external search services, digest delivery, editorial workflow, browser automation, additional source adapters beyond the documented source-expansion boundaries, or production backup automation.
- It does not call MiniMax, create provider credentials, approve model quality, or bypass the local schema gate.
- It does not replace security review, privacy review, legal review, incident response, or a future production release process.

## Runbook References

- `docs/ops/final-production-gate-review.md`: Task 28 Final Production Gate Review, local evidence scope, blocking production gaps, non-blocking deferrals, and non-approval boundary.
- `docs/ops/release-handoff.md`: Task 29 public repository, CI/CD, branch protection, environment protection, secrets, package-scope, and deployment-handoff evidence.
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

The current system is publicly reachable at `https://news.blankhoney.xyz/`, has production reader data, has a hardened worker ingress boundary, has a successful server-local backup/restore drill, and has a successful image rollback drill. That is enough to continue production hardening and user acceptance work. It is not enough to claim full production launch approval.

Before a full production launch claim, a later explicitly scoped issue must finish off-host backup, Resend domain verification and alert delivery, remote monitoring, security hardening, secret rotation/ownership, live provider validation, and incident response.
