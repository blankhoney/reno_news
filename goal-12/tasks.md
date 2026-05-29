# Goal 12 Tasks

## Task 1: Retained Backup Command Contract

- Status: Completed
- RED: Added `backup:local-schedule:check` contract check and confirmed it failed because `db:backup:local:retained` was missing.
- GREEN: Added `db:backup:local:retained` package script and a minimal placeholder shell entrypoint; `pnpm backup:local-schedule:check` passed.
- REFACTOR: Reviewed naming and output; no refactor needed because the slice only establishes the command contract.
- Completion notes: Task 1 intentionally does not create dumps, prune retention, write manifests, or install schedules.

## Task 2: Retained Backup Creates A Dump

- Status: Pending
- RED:
- GREEN:
- REFACTOR:
- Completion notes:

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
