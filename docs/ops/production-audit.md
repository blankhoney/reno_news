# Production Audit

This report records the MVP's current production-readiness evidence and Residual Production Gaps. It is not a deployment approval, production launch decision, release workflow, remote monitor, alerting integration, security certification, or production backup policy.

## Evidence Matrix

| Area | Current Evidence | Result |
|---|---|---|
| Repository checks | `pnpm release:audit:local` runs frozen install, lint, tests, build, worker tests, and worker lock verification. | Evidence exists locally |
| Runtime health | The Release Health Audit checks direct web/API/worker health and Caddy health probes including `http://localhost:8080/api/healthz`. | Evidence exists locally |
| Data safety | `docs/ops/backup-restore.md` defines local Backup Snapshot and Restore Drill steps using a disposable restore target. | Evidence exists locally |
| Disk guardrails | `pnpm disk:check:local` reports Docker disk usage and local backup artifact size without deleting data. | Evidence exists locally |
| Log retention | `infra/compose/compose.yml` defines bounded `json-file` log retention for all Compose services. | Evidence exists locally |
| Scope control | `docs/CODEX_MASTER_PLAN.md` keeps production deploy, remote monitoring, alerting, auth/RBAC, Admin identity, audit logs, production backup automation, and deferred product features out of the current MVP. | Evidence exists locally |

## Residual Production Gaps

- No production deployment target.
- No protected deployment environment.
- No remote monitoring or alerting.
- No production backup schedule or PITR.
- No production secret management.
- No auth/RBAC.
- No Admin identity.
- No audit logs.
- No production restore objective, retention period, or off-machine storage policy.
- No security hardening review for container users, daemon access, host filesystem exposure, or network policy.
- No incident-response process, paging channel, or operational ownership model.

## Explicit Non-Goals

- This report does not deploy, publish images, create releases, update CI permissions, call remote monitors, send alerts, create credentials, mutate production data, prune Docker resources, delete backups, or approve launch.
- It does not add auth/RBAC, Admin identity, audit logs, semantic/vector search, external search services, digest delivery, persisted digest tables, editorial workflow, browser automation, non-RSS adapters, or production backup automation.
- It does not replace security review, privacy review, legal review, incident response, or a future production release process.

## Runbook References

- `docs/ops/release-health-audit.md`: local Release Health Audit command, expected evidence, failure handling, rollback references, and limitations.
- `docs/ops/backup-restore.md`: local Backup Snapshot and Restore Drill steps, cleanup, and production backup limitations.
- `docs/ops/disk-usage.md`: local Disk Usage Guard command, evidence, failure handling, manual cleanup guidance, and limitations.

## Production Launch Boundary

The current MVP has local evidence for checks, health probes, backup/restore drill readiness, and disk guardrails. That is enough to continue implementation and local release audit work. It is not enough to claim production launch approval.

Before a real production launch, a later explicitly scoped issue must decide deployment target, environment protection, secret handling, backup schedule and retention, remote monitoring, alerting, access control, Admin identity, audit logs, security hardening, rollback ownership, and incident response.
