# Backup And Restore Drill

This runbook covers local Backup Snapshots, Restore Drills, and the Goal 12 retained local backup timer for the PostgreSQL database used by Docker Compose.

It is local. It is not remote storage, WAL archiving, point-in-time recovery, monitoring, alerting, or release automation.

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

## Create Retained Production Local Backup

Goal 12 adds a retained local backup wrapper for the production VPS:

```bash
pnpm db:backup:local:retained
```

By default it writes dumps to `/srv/reno_news/backups/production`, keeps `reno_news-*.dump` files for 14 days, and writes `latest-local-backup-manifest.json` with the latest dump path and restore command.

Optional environment variables:

- `BACKUP_DIR`: retained dump directory. Default: `/srv/reno_news/backups/production`.
- `LOCAL_BACKUP_RETENTION_DAYS`: local dump retention period. Default: `14`; minimum: `7`.
- `BACKUP_RETENTION_DAYS`: fallback retention period when `LOCAL_BACKUP_RETENTION_DAYS` is unset.
- `LOCAL_BACKUP_MANIFEST_FILE`: local manifest path. Default: `$BACKUP_DIR/latest-local-backup-manifest.json`.

The wrapper only prunes first-level files matching `reno_news-*.dump` in the configured backup directory after a new dump succeeds.

This local timer does not replace off-host backup. It protects against short-term operator mistakes, but it does not protect against VPS loss, disk loss, host compromise, or point-in-time recovery needs.

## Install Production Local Backup Timer

Copy the systemd templates from the repository to the server systemd directory:

```bash
sudo cp infra/systemd/reno-news-db-backup.service /etc/systemd/system/reno-news-db-backup.service
sudo cp infra/systemd/reno-news-db-backup.timer /etc/systemd/system/reno-news-db-backup.timer
sudo systemctl daemon-reload
sudo systemctl enable --now reno-news-db-backup.timer
```

Run one backup immediately and inspect the result:

```bash
sudo systemctl start reno-news-db-backup.service
systemctl list-timers reno-news-db-backup.timer
journalctl -u reno-news-db-backup.service -n 80 --no-pager
```

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
- The Goal 12 timer schedules server-local dumps only; it does not ship backups off-machine.
- A production backup policy still needs explicit scope, storage retention, credential handling, monitoring, and restore objectives.
