# Issue 022 Plan: Backup And Restore Drill Foundation

## Objective

Issue 022 adds the first Milestone 7 operational slice: a local, manually invoked PostgreSQL Backup Snapshot and Restore Drill. The goal is to prove that the current MVP database can be dumped and restored into a disposable target before adding production scheduling, remote storage, monitoring, or release automation.

## Current Context

- The app already runs PostgreSQL through Docker Compose for local development.
- SQL migrations and seed data are repeatable.
- Compose health checks already cover web, API, worker, PostgreSQL, and Redis.
- There is no production backup automation, monitoring integration, alerting, release workflow, or deployment target in this repo.

## Decision

Use PostgreSQL custom-format logical dumps for the MVP Backup Snapshot:

- backup command: `pg_dump -Fc`
- restore command: `pg_restore --exit-on-error` into a disposable database
- local execution path: Docker Compose PostgreSQL service with non-interactive `docker compose exec -T`

This is not a complete production backup strategy. It deliberately does not add physical base backups, WAL archiving, point-in-time recovery, remote object storage, cron/systemd timers, alerts, or production credentials.

## TDD Plan

1. [ ] Add script-contract tests that verify the backup and restore-drill commands use `pg_dump -Fc`, `pg_restore --exit-on-error`, non-interactive Compose execution, and a disposable restore target.
2. [ ] Add local backup script or package script for creating a timestamped PostgreSQL custom-format Backup Snapshot.
3. [ ] Add local restore-drill script or package script that restores a selected dump into a disposable database and verifies expected tables.
4. [ ] Add `docs/ops/backup-restore.md` with backup, restore drill, verification, cleanup, and limitations.
5. [ ] Update README with the manual backup/restore drill entrypoints.
6. [ ] Run a local backup/restore drill against the Compose PostgreSQL service and clean up the disposable restore database and dump file.
7. [ ] Update master plan, goal plan, and implementation log.

## Acceptance Criteria

- [ ] A local operator can create a timestamped PostgreSQL custom-format Backup Snapshot.
- [ ] A local operator can run a Restore Drill into a disposable database target.
- [ ] The Restore Drill verifies expected MVP tables or counts before reporting success.
- [ ] The runbook documents cleanup and clearly states that this is not production scheduling or PITR.
- [ ] The primary project database is not dropped, overwritten, or mutated by the Restore Drill.
- [ ] No cron/systemd timer, remote object storage, monitoring integration, alerting, production credentials, release workflow, auth/RBAC, Admin identity, audit logs, semantic/vector search, external search service, digest delivery, persisted digest table, editorial workflow, browser automation, or non-RSS adapter is added.

## Research References

- PostgreSQL 18 `pg_dump` custom-format archive guidance: https://www.postgresql.org/docs/18/app-pgdump.html
- PostgreSQL `pg_restore` archive restore behavior and warnings: https://www.postgresql.org/docs/17/app-pgrestore.html
- Docker Compose `exec` non-interactive command guidance: https://docs.docker.com/reference/cli/docker/compose/exec/

## Rollback

If the scripts prove too brittle, remove the local script entrypoints and keep only the runbook commands. If a disposable restore database is created during testing, drop only that disposable database and leave the primary Compose database untouched.
