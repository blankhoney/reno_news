# Backup And Restore Drill

This runbook covers the MVP local Backup Snapshot and Restore Drill for the PostgreSQL database used by Docker Compose.

It is manual and local. It is not production scheduling, remote storage, WAL archiving, point-in-time recovery, monitoring, alerting, or release automation.

For the V2 off-host S3-compatible backup contract, see `docs/ops/offhost-backup.md`.

## Prerequisites

- Docker Compose services are running from `infra/compose/compose.yml`.
- The `postgres` service is healthy.
- The operator is in the repository root.

## Create Backup Snapshot

```bash
pnpm db:backup:local
```

By default the script writes a timestamped custom-format dump to `backups/`, which is ignored by git.

Optional environment variables:

- `COMPOSE_FILE`: Compose file path. Default: `infra/compose/compose.yml`.
- `DATABASE_NAME`: source database. Default: `reno_news`.
- `DATABASE_USER`: database user. Default: `reno_news`.
- `BACKUP_DIR`: local dump directory. Default: `backups`.
- `BACKUP_FILE`: exact output file path.

## Run Restore Drill

```bash
pnpm db:restore:drill backups/reno_news-YYYYMMDDTHHMMSSZ.dump
```

The restore drill creates a disposable database, restores the dump with `pg_restore --exit-on-error`, checks expected MVP tables, and drops the disposable database on exit.

Optional environment variables:

- `COMPOSE_FILE`: Compose file path. Default: `infra/compose/compose.yml`.
- `DATABASE_NAME`: primary database name. Default: `reno_news`.
- `DATABASE_USER`: database user. Default: `reno_news`.
- `RESTORE_DATABASE`: disposable target. Default: `reno_news_restore_drill`.

`RESTORE_DATABASE` must not equal `DATABASE_NAME`.

## Cleanup

The restore drill drops the disposable database automatically. Backup dump files are local artifacts; remove them when they are no longer needed:

```bash
rm -f backups/*.dump
```

## Limitations

- This is a logical database dump, not a physical base backup.
- It does not provide point-in-time recovery.
- It does not copy uploads, object storage, logs, external service state, or secrets.
- It does not schedule backups or ship them off-machine.
- A production backup policy still needs explicit scope, storage retention, credential handling, monitoring, and restore objectives.
