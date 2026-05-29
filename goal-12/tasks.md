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

- Status: Pending
- RED:
- GREEN:
- REFACTOR:
- Completion notes:

## Big Check 1

- Status: Pending
- Commands:
- Result:

## Task 4: Local Backup Manifest

- Status: Pending
- RED:
- GREEN:
- REFACTOR:
- Completion notes:

## Task 5: systemd Schedule Templates

- Status: Pending
- RED:
- GREEN:
- REFACTOR:
- Completion notes:

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
