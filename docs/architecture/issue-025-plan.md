# Issue 025 Plan: Production Audit Report Foundation

## Objective

Issue 025 closes the Milestone 7 production-audit slice with a local evidence report. The goal is to make the current MVP's release evidence, production-readiness gaps, and non-goals explicit without implementing deployment automation, remote monitoring, alerting, production credentials, auth/RBAC, Admin identity, audit logs, or production backup automation.

## Current Context

- Issue 022 added local Backup Snapshot and Restore Drill commands plus a backup/restore runbook.
- Issue 023 added a local, non-deploying Release Health Audit command and runbook.
- Issue 024 added bounded Compose log retention and a read-only Disk Usage Guard command and runbook.
- Docker Compose is currently the local runtime model for web, API, worker, scheduler, PostgreSQL, Redis, and Caddy.
- The repo still has no production deployment target, remote monitoring system, alerting channel, production credentials, protected deployment environment, auth/RBAC, Admin identity, audit logs, production backup schedule, WAL/PITR, or remote object storage.

## Decision

Start Production Audit as a local documentation artifact:

- `docs/ops/production-audit.md` should gather evidence from the existing Release Health Audit, Backup Snapshot and Restore Drill, Disk Usage Guard, health endpoints, and master-plan scope boundaries.
- It should identify residual production gaps separately from issues that block the current local MVP.
- It should distinguish "MVP local readiness evidence exists" from "approved for production launch".

This is not a release approval workflow. The implementation must not deploy, publish images, create GitHub releases, modify CI permissions, call remote monitors, send alerts, create production credentials, add auth/RBAC, introduce Admin identity, create audit logs, prune Docker resources, delete backups, or add deferred product features.

## TDD Plan

1. [x] Add script-contract or documentation-contract tests for the Production Audit report sections and forbidden operational behavior.
2. [x] Add `docs/ops/production-audit.md` with an evidence matrix covering local checks, data safety, runtime health, disk guardrails, deployment governance gaps, security gaps, and deferred product scope.
3. [x] Cross-reference existing runbooks: `docs/ops/release-health-audit.md`, `docs/ops/backup-restore.md`, and `docs/ops/disk-usage.md`.
4. [x] Update README with the Production Audit report location and its non-approval boundary.
5. [x] Update `docs/CODEX_MASTER_PLAN.md`, the goal plan, this issue plan, and the implementation log after implementation.
6. [x] Run the Release Health Audit and Disk Usage Guard locally before marking the audit report complete.
7. [x] Verify no production deployment, remote monitoring, alerting, credential, auth/RBAC, Admin identity, audit log, destructive cleanup, or deferred feature implementation was added.

## Acceptance Criteria

- [x] `docs/ops/production-audit.md` exists and separates evidence, residual gaps, and explicit non-goals.
- [x] The report cites local evidence from the Release Health Audit, backup/restore runbook and drill, Disk Usage Guard, Compose health checks, and scope-boundary scans.
- [x] Residual Production Gaps are explicit and include no production deployment target, no protected deployment environment, no remote monitoring or alerting, no production backup schedule or PITR, no production secret management, no auth/RBAC, no Admin identity, and no audit logs.
- [x] The report clearly states that it is not a deployment approval, release workflow, GitHub release, image push, remote monitor, alerting integration, security certification, or production backup policy.
- [x] The implementation does not add production deploy, release workflow, image push, GitHub release, remote monitoring, alerting, production credentials, auth/RBAC, Admin identity, audit logs, destructive cleanup automation, semantic/vector search, external search services, digest delivery, persisted digest tables, editorial workflow, browser automation, non-RSS adapters, or production backup automation.

## Research References

- Docker Compose production guidance: https://docs.docker.com/compose/how-tos/production/
- Docker Engine security guidance: https://docs.docker.com/engine/security/
- GitHub deployment environments overview: https://docs.github.com/en/actions/concepts/workflows-and-actions/deployment-environments
- GitHub deployment protection rules and environment secrets: https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments

## Rollback

If the audit report overreaches into launch approval or production workflow design, remove the overreaching sections and keep only the evidence and residual-gap matrix. If the contract tests become too brittle, narrow them to required headings, runbook references, and forbidden-operation checks.
