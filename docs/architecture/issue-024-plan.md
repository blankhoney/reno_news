# Issue 024 Plan: Disk Usage Guard Foundation

## Objective

Issue 024 adds the first Disk Usage Guard for Milestone 7. The goal is to bound local container log growth and provide a read-only operator check for Docker disk usage and local backup artifacts without adding destructive cleanup automation, remote monitoring, alerting, or production release behavior.

## Current Context

- Issue 022 added local Backup Snapshot and Restore Drill commands and keeps dump files under ignored `backups/`.
- Issue 023 added a local Release Health Audit that verifies existing checks and runtime health without deploying.
- Docker Compose runs long-lived local services for web, API, worker, scheduler, PostgreSQL, Redis, and Caddy.
- There is no remote observability stack, alerting service, production disk monitor, or cleanup policy in this repo.

## Decision

Start with two local guardrails:

- Compose `logging` options for every service using bounded `max-size` and `max-file`.
- A read-only local disk usage check command that reports Docker daemon disk usage and local backup artifact size.

This is not a cleanup daemon or monitoring integration. The implementation should inspect and bound disk usage only; it must not prune Docker resources, remove volumes, delete backups, call remote monitoring, send alerts, deploy, push images, or mutate production state.

## TDD Plan

1. [x] Add script-contract tests for Disk Usage Guard command boundaries and forbidden destructive operations.
2. [x] Add Compose logging limits for all services.
3. [x] Add a root package script for a local read-only disk usage check.
4. [x] Implement a local disk usage check script that reports Docker disk usage and local backup artifact size with clear failure output for missing tools or oversized local artifacts.
5. [x] Add `docs/ops/disk-usage.md` with prerequisites, command, expected evidence, failure handling, manual cleanup references, and limitations.
6. [x] Update README with the local disk usage guard entrypoint.
7. [x] Run the disk usage check locally and verify Compose config still renders.
8. [x] Update master plan, goal plan, and implementation log.

## Acceptance Criteria

- [x] Compose services have bounded local log retention settings.
- [x] A local operator can run one read-only command from the repo root to inspect Docker disk usage and local backup artifact size.
- [x] The disk usage check fails clearly if Docker disk usage cannot be inspected or if local backup artifacts exceed a documented threshold.
- [x] The runbook documents manual failure handling and explicitly separates checking from destructive cleanup.
- [x] The implementation does not delete backups, prune Docker resources, remove volumes, add remote monitoring, send alerts, deploy, push images, create GitHub releases, add auth/RBAC, add Admin identity, add audit logs, add semantic/vector search, add external search services, add digest delivery, add persisted digest tables, add editorial workflow, add browser automation, add non-RSS adapters, or add production backup automation.

## Research References

- Docker `json-file` logging driver rotation options: https://docs.docker.com/engine/logging/drivers/json-file/
- Docker logging driver configuration notes, including default `json-file` behavior: https://docs.docker.com/engine/logging/configure/
- Docker Compose service `logging` configuration: https://docs.docker.com/reference/compose-file/services/
- Docker `system df` disk usage command: https://docs.docker.com/reference/cli/docker/system/df/

## Rollback

If Compose logging limits break local runtime behavior, remove only the added `logging` blocks and keep the read-only disk check/runbook. If the disk usage check is too noisy or brittle, remove the package script and local script while preserving the manual runbook guidance.
