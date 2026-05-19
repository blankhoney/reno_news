# Disk Usage Guard

This runbook covers the MVP local Disk Usage Guard. It bounds local Compose log growth and provides a read-only disk usage check for Docker artifacts and local backup files.

It is local and non-destructive. It is not a cleanup daemon, remote monitoring integration, alerting system, production deploy, or production backup scheduler.

## Prerequisites

- Run from the repository root.
- Docker is available.
- Docker Compose services use the logging limits in `infra/compose/compose.yml`.
- Local Backup Snapshots, if present, live under ignored `backups/`.

## Run Check

```bash
pnpm disk:check:local
```

The check reports:

- Docker daemon disk usage from `docker system df --format json`.
- Local backup artifact count and size under `backups/`.
- Whether the local backup artifact size is under `DISK_BACKUP_MAX_BYTES`.

Optional environment variables:

- `DISK_BACKUP_DIR`: local backup artifact directory. Default: `backups`.
- `DISK_BACKUP_MAX_BYTES`: maximum allowed local backup artifact size. Default: `1073741824`.

## Expected Evidence

Successful output ends with:

```text
Disk Usage Guard OK
```

The check should fail before that line if Docker disk usage cannot be inspected or if local backup artifacts exceed the configured size limit.

## Failure Handling

- If Docker disk usage cannot be inspected, confirm Docker is running and retry `docker system df`.
- If local backup artifacts exceed the threshold, inspect `backups/` and decide manually whether those local dump files are still needed.
- If Compose log limits are missing, restore the `logging` blocks in `infra/compose/compose.yml`.

## Manual Cleanup

This check does not delete anything. Manual cleanup must be deliberate:

- Remove only local dump files that are no longer needed.
- Use `docs/ops/backup-restore.md` before risky database work.
- Do not remove Docker volumes or prune Docker resources unless a later operational issue explicitly scopes that action.

## Limitations

- The check does not inspect host filesystem capacity outside Docker and local backup artifacts.
- The check does not rotate existing log files immediately; Compose log limits apply when containers are created with the configuration.
- The check does not create backups, run a Restore Drill, call remote monitors, send alerts, deploy, push images, or mutate production state.
