# Goal 12 Plan

## Requirement

Implement production local PostgreSQL backup automation with strict vertical TDD. This goal intentionally does not configure off-host object storage and must not close the off-host backup blocker.

## Context

- Goal 11 proved production health, real reader data, hardened public worker ingress, server-local backup/restore, Chrome smoke, and rollback.
- Existing scripts already support manual local dumps (`scripts/db-backup.sh`) and disposable restore drills (`scripts/db-restore-drill.sh`).
- Existing off-host backup contract remains S3-compatible, but the user chose not to use off-host object storage in this round.

## Execution Approach

1. Create a local backup schedule contract check and grow it through strict RED -> GREEN -> REFACTOR slices.
2. Add a retained local backup wrapper that creates a `pg_dump -Fc` dump, prunes only matching old dumps in its target directory, and writes a manifest.
3. Add systemd service/timer templates for production server scheduling.
4. Update docs and production gate evidence without claiming full off-host backup readiness.
5. Verify locally, then verify production by installing the timer, running one backup, restoring it into a disposable database, checking health, and running Chrome smoke.

## Risks

- Local-only backups do not protect against VPS loss, disk loss, or host compromise.
- Retention code must not delete arbitrary files or descend into unrelated directories.
- systemd templates must not contain secrets or production passwords.
- Production verification must not run dev seed or mutate reader data beyond creating backup files and a disposable restore database.

## Verification

- Each TDD slice records RED, GREEN, and REFACTOR evidence in `goal-12/tasks.md`.
- Local checks:
  - `pnpm backup:local-schedule:check`
  - `pnpm backup:offhost:check`
  - `pnpm compose:production:check`
  - `pnpm deploy:contract:check`
  - `pnpm production:gate:check`
  - `git diff --check`
- Production checks:
  - systemd timer installed and enabled.
  - one manual service run creates a retained dump and manifest.
  - restore drill succeeds from the generated dump.
  - production health endpoints return 200.
  - Chrome smoke screenshots are saved under `/tmp/reno_news_goal12_*`.

## Rollback

- Repo rollback: revert the Goal 12 commits.
- Server rollback:
  - `sudo systemctl disable --now reno-news-db-backup.timer`
  - `sudo rm -f /etc/systemd/system/reno-news-db-backup.service /etc/systemd/system/reno-news-db-backup.timer`
  - `sudo systemctl daemon-reload`
- Backup artifact rollback is not automatic; keep generated dumps unless the user explicitly approves deletion.
