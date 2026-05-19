# Issue 023 Plan: Release Health Audit Foundation

## Objective

Issue 023 adds a local Release Health Audit foundation for Milestone 7. The goal is to give an operator one reproducible pre-release gate over existing checks, Compose health, backup/restore readiness, and deferred-scope boundaries without adding a deployment workflow, remote monitoring integration, alerting, or production automation.

## Current Context

- Issue 022 added local Backup Snapshot and Restore Drill commands plus a backup/restore runbook.
- The repo already has `pnpm` checks, worker tests, `uv lock --check`, Compose health checks, direct health endpoints, and Caddy-proxied health endpoints.
- The current CI skeleton runs quality checks, but there is no release workflow or deployment target in this repo.
- Milestone 7 still needs release checklist, health checks, disk usage controls, and production audit work.

## Decision

Start with a local, non-deploying Release Health Audit command and runbook.

The audit should check readiness evidence only:

- repository checks: install lock consistency, lint, tests, build
- worker checks: unit tests and `uv lock --check`
- runtime checks: `docker compose ps` status and direct/Caddy `/healthz` probes
- data-safety checks: backup/restore scripts and runbook are present
- scope checks: no release deployment, remote monitoring, alerting, production credential, or deferred adapter implementation is introduced

This is a Release Gate, not a production release workflow. It deliberately does not push images, deploy to a server, create GitHub releases, modify CI permissions, call remote monitors, send alerts, mutate production data, or add audit-log identity.

## TDD Plan

1. [ ] Add script-contract tests for the release audit command and forbidden deployment operations.
2. [ ] Add a root package script for running the local Release Health Audit.
3. [ ] Implement a local audit script that runs existing checks and health probes with clear failure output.
4. [ ] Add `docs/ops/release-health-audit.md` with prerequisites, command, expected evidence, failure handling, and limitations.
5. [ ] Update README with the local release audit entrypoint.
6. [ ] Run the Release Health Audit locally against the current Compose stack.
7. [ ] Update master plan, goal plan, and implementation log.

## Acceptance Criteria

- [ ] A local operator can run one command from the repo root to perform the Release Health Audit.
- [ ] The audit verifies existing package checks, worker checks, Compose service status, and direct/Caddy health endpoints.
- [ ] The audit verifies backup/restore readiness without creating a production backup schedule or mutating the primary database.
- [ ] The audit fails clearly when a required check or health probe fails.
- [ ] The runbook documents prerequisites, expected evidence, failure handling, rollback references, and limitations.
- [ ] No release workflow, production deploy, image push, GitHub release, remote monitoring integration, alerting, production credential, auth/RBAC, Admin identity, audit log, semantic/vector search, external search service, digest delivery, persisted digest table, editorial workflow, browser automation, non-RSS adapter, or production backup automation is added.

## Research References

- Docker Compose `ps --format json` service status output: https://docs.docker.com/reference/cli/docker/compose/ps/
- Docker Compose service `healthcheck` and `service_healthy` dependency behavior: https://docs.docker.com/reference/compose-file/services/
- GitHub Actions workflow and permission syntax, used here only to preserve the no-release-workflow boundary: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax

## Rollback

If the local audit command proves too slow or brittle, remove the new package script and audit script while keeping the runbook as a manual checklist. If the audit starts any local runtime process during implementation, stop only that local process and leave the Compose stack and primary database unchanged.
