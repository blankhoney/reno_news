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

- Status: Completed
- RED: Extended `pnpm backup:local-schedule:check` to require retained local backup docs, systemd timer docs, and explicit off-host blocker wording; it failed because the docs were not updated.
- GREEN: Updated `docs/ops/backup-restore.md`, `docs/ops/production-audit.md`, `docs/ops/final-production-gate-review.md`, and `docs/ops/release-handoff.md`; contract check passed.
- REFACTOR: Removed stale wording that said the backup runbook did not cover production scheduling; re-ran the contract and searched for contradictory phrases.
- Completion notes: Documentation now distinguishes server-local scheduled dumps from incomplete off-host backup/PITR readiness.

## Big Check 2

- Status: Completed
- Commands: `pnpm backup:local-schedule:check`; `pnpm backup:offhost:check`; `pnpm compose:production:check`; `pnpm deploy:contract:check`; `pnpm production:gate:check`; `pnpm release:handoff:check`; `git diff --check`.
- Result: All passed after Task 4-6. Local schedule docs and contracts are green while off-host remains a separate blocker.

## Production Verification

- Status: Partially completed; timer install blocked by VPS sudo policy.
- Timer/service: Deploy run `26650255337` deployed `sha-b435860` and then failed at `sudo cp` / `sudo systemctl` because the `deploy` user requires a password for sudo. The normal `DEPLOY_COMMAND` was restored afterward.
- Backup: Deploy run `26650499263` ran `sh scripts/db-backup-local-retained.sh` without sudo and created `/srv/reno_news/backups/production/reno_news-20260529T165554Z.dump`; manifest recorded `retentionDays: 14`.
- Restore drill: Deploy run `26650499263` restored the dump into disposable database `reno_news_restore_drill` and printed `Restore Drill OK`.
- Health: Remote GET health checks in run `26650499263` passed; local GET checks returned `/healthz=200`, `/api/healthz=200`, `/worker/healthz=200`, and `/worker/ingest/source/1=404`.
- Chrome: Chrome smoke passed for `/`, `/digest`, and `/admin`; screenshots saved to `/tmp/reno_news_goal12_20260529T170008Z`; console error count was 0.

## Final Review

- Status: Completed with one external production blocker.
- Result:
  - CI debug note: first pushed Goal 12 run failed because the existing production audit contract still required `No production backup schedule`. Updated the contract to recognize the new local retained backup timer while still requiring off-host backup completion as a residual gap.
  - Local code, docs, contracts, CI, image publish, production deploy, manual retained backup, restore drill, health checks, and Chrome smoke were verified.
  - Final local checks passed: `pnpm backup:local-schedule:check`, `pnpm backup:offhost:check`, `pnpm compose:production:check`, `pnpm deploy:contract:check`, `pnpm production:gate:check`, `pnpm release:handoff:check`, `pnpm --filter @reno-news/db test`, and `git diff --check`.
  - Remaining blocker: installing the system-level timer requires VPS root or passwordless sudo for `deploy`.
