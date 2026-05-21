# Goal 8 Plan

## Requirement

Bring public project documentation back in line with the current implemented state and remove the local `next-env` generated-file drift from the final worktree. This is a documentation and workspace hygiene goal only.

## Context

- Goal 7 pagination has been implemented and committed.
- Review/testing before this goal showed DB integration, API tests, Web tests, Web lint, and `git diff --check` passing.
- Current dirty state before this goal:
  - `README.md` adds a Chinese README link.
  - `README.zh-CN.md` is untracked and should become a committed document.
  - `apps/web/next-env.d.ts` points to `.next/dev/types/routes.d.ts`; this is generated drift and should not be committed.
- API docs are stale for reader pagination and auth/personal-state boundaries.

## Risks

- Overstating implemented auth/admin UI capabilities: API auth and route guards exist, but a full frontend login system is still not the target of this documentation pass.
- Accidentally committing generated `apps/web/next-env.d.ts` drift.
- Expanding README into an exhaustive spec instead of keeping it an entrypoint.
- Changing business code while trying to update documentation.

## Approach

1. Create Goal Mode files before source edits.
2. Update README and Chinese README to describe current implemented capabilities and remaining boundaries accurately.
3. Update reader/auth/personal-state API docs for pagination, admin guard/auth state, and Web BFF proxy notes.
4. Restore `apps/web/next-env.d.ts` only if its diff remains the known generated path drift.
5. Run targeted stale-phrase searches and the planned Web/API checks.
6. Commit the documentation cleanup.

## Verification

- Search README and API docs for stale claims about auth, backend personal state, audit logs, and reader pagination.
- Run:
  - `pnpm --filter @reno-news/web lint`
  - `pnpm --filter @reno-news/web test`
  - `pnpm --filter @reno-news/api test`
  - `git diff --check`
- Confirm `git status --short` has no `apps/web/next-env.d.ts` diff before final commit.

## Rollback

Revert this goal's documentation commit and remove `goal-8/` if needed. No database, seed, schema, service, or runtime state rollback is required.
