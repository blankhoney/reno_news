# Goal 8 Tasks

## Task 1: Add Goal Records

- Status: Completed
- Expected result: `goal-8/input.md`, `goal-8/plan.md`, and `goal-8/tasks.md` exist before documentation edits.
- Verification: files exist and preserve the requested plan.
- Completion notes:
  - Created `goal-8/input.md`, `goal-8/plan.md`, and `goal-8/tasks.md` before documentation edits.
  - Verified all three files exist and record the requested documentation cleanup plan, checks, and rollback.

## Task 2: README Alignment

- Status: Completed
- Expected result: English and Chinese README describe current auth, admin guard, audit, backend personal-state, pagination, digest diversity, and BFF proxy state without expanding into a full spec.
- Verification: stale boundary searches no longer find incorrect README claims.
- Completion notes:
  - Updated `README.md` to mention API-owned auth sessions, role guards, audit events, backend personal state, reader pagination, digest diversity, persisted Digest Editions, and Web BFF proxy routes.
  - Updated `README.zh-CN.md` with the same current-state facts and clarified remaining identity/auth boundaries.
  - Replaced stale README scope text that said auth, backend personal state, persisted digest tables, and audit logs were unimplemented.
  - Verified stale README searches for incorrect auth/personal-state/audit/persisted-digest claims return no matches.

## Task 3: API Documentation Alignment

- Status: Pending
- Expected result: Reader API docs describe pagination metadata; auth and personal-state docs describe current implemented boundaries and Web BFF proxy notes.
- Verification: stale API doc searches no longer find outdated personal-state or pagination statements.
- Completion notes:

## Large Check After Task 3

- Status: Pending
- Expected result: planned checks pass before final cleanup.
- Completion notes:

## Task 4: Generated File Drift Cleanup

- Status: Pending
- Expected result: `apps/web/next-env.d.ts` generated path drift is absent from the final worktree.
- Verification: `git status --short` has no `apps/web/next-env.d.ts` entry.
- Completion notes:

## Task 5: Final Review And Commit

- Status: Pending
- Expected result: documentation cleanup is reviewed, tests pass, and the goal is committed.
- Verification: final stale-phrase search, planned checks, `git diff --check`, and final `git status --short`.
- Completion notes:
