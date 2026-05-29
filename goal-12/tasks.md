# Goal 12 Tasks

## Task 1: Retained Backup Command Contract

- Status: Completed
- RED: Added `backup:local-schedule:check` contract check and confirmed it failed because `db:backup:local:retained` was missing.
- GREEN: Added `db:backup:local:retained` package script and a minimal placeholder shell entrypoint; `pnpm backup:local-schedule:check` passed.
- REFACTOR: Reviewed naming and output; no refactor needed because the slice only establishes the command contract.
- Completion notes: Task 1 intentionally does not create dumps, prune retention, write manifests, or install schedules.

## Task 2: Retained Backup Creates A Dump

- Status: Completed
- RED: Extended `pnpm backup:local-schedule:check` to require `scripts/db-backup-local-retained.sh` to call `scripts/db-backup.sh`; it failed against the placeholder.
- GREEN: Implemented the retained wrapper by setting the production default backup directory and delegating to `scripts/db-backup.sh`; contract check passed.
- REFACTOR: Removed duplicate timestamp/database default parsing from the wrapper and let `scripts/db-backup.sh` keep owning dump creation; contract check and `sh -n` passed.
- Completion notes: Task 2 creates the retained dump path only. Retention pruning and manifests remain unimplemented until later slices.

## Task 3: Retention Safety Boundary

- Status: Completed
- RED: Extended `pnpm backup:local-schedule:check` to require retention configuration, minimum 7-day validation, and a first-level `reno_news-*.dump` cleanup boundary; it failed because retention did not exist.
- GREEN: Added `LOCAL_BACKUP_RETENTION_DAYS` / `BACKUP_RETENTION_DAYS` parsing, minimum 7-day validation, and post-dump pruning limited to `find "$BACKUP_DIR" -maxdepth 1 -type f -name 'reno_news-*.dump' -exec rm -f {} +`.
- REFACTOR: Reviewed the script and kept pruning after successful dump creation; no extra refactor was needed. `pnpm backup:local-schedule:check`, `sh -n`, and invalid retention exit-2 smoke passed.
- Completion notes: Retention is local-only and safe-scoped. Manifest and schedule templates remain unimplemented until later slices.

## Big Check 1

- Status: Completed
- Commands: `pnpm backup:local-schedule:check`; `pnpm backup:offhost:check`; `pnpm compose:production:check`; `pnpm deploy:contract:check`; `pnpm production:gate:check`; `git diff --check`.
- Result: All passed after Task 1-3. Off-host contract remains present and separate from local retained backup.

## Task 4: Local Backup Manifest

- Status: Completed
- RED: Extended `pnpm backup:local-schedule:check` to require a local manifest path and `createdAt`, `dumpFile`, `retentionDays`, and `restoreCommand` fields; it failed because no manifest existed.
- GREEN: Added `LOCAL_BACKUP_MANIFEST_FILE` defaulting to `latest-local-backup-manifest.json` under the backup directory and wrote the manifest after successful dump creation.
- REFACTOR: Reviewed manifest contents and kept only non-secret evidence fields. `pnpm backup:local-schedule:check` and `sh -n` passed after review.
- Completion notes: Manifest records the local restore drill command but does not upload data or claim off-host backup readiness.

## Task 5: systemd Schedule Templates

- Status: Completed
- RED: Extended `pnpm backup:local-schedule:check` to require systemd service/timer templates, daily 03:15 scheduling, `Persistent=true`, `/srv/reno_news`, deploy user, and no embedded secrets; it failed because templates did not exist.
- GREEN: Added `infra/systemd/reno-news-db-backup.service` and `infra/systemd/reno-news-db-backup.timer`; contract check passed.
- REFACTOR: Reviewed templates and retained the minimal oneshot/timer shape; no refactor needed.
- Completion notes: The templates are installable artifacts only. They do not install themselves or write production secrets.

## Task 6: Documentation And Production Gate

- Status: Pending
- RED:
- GREEN:
- REFACTOR:
- Completion notes:

## Big Check 2

- Status: Pending
- Commands:
- Result:

## Production Verification

- Status: Pending
- Timer/service:
- Backup:
- Restore drill:
- Health:
- Chrome:

## Final Review

- Status: Pending
- Result:
