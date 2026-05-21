# Goal 5 Plan: Reader Item BFF Proxy For Personal Hydration

## Requirement

Add the missing Web BFF route used by authenticated personal-state hydration when local snapshots are incomplete. The new route should proxy `GET /api/reader/items/:id` to the existing Fastify `GET /reader/items/:id` without changing personal-state behavior, reader APIs, digest ranking, pagination, authentication UI, or database schema.

## Context

- `personalState.ts` already calls `/api/reader/items/:id` through its default `/api` base URL.
- Goal 4 added `/api/reader/personal-state*` proxy routes but intentionally did not add item-detail proxy routes.
- Fastify already exposes `GET /reader/items/:id` and returns either `{ item }` or a 404 JSON error.
- Anonymous personal state must stay local and usable; missing item snapshots should not clear localStorage.

## Risks

- A route signature mismatch with the current Next.js version could make tests pass incorrectly if not exercised directly.
- Over-refactoring the existing personal-state proxy could expand the change surface.
- Direct Chrome navigation to `/api/...` may be blocked by browser extensions; use curl for endpoint evidence if that happens.

## Execution Approach

1. Add route handler tests that call the public `GET` route export and assert forwarded URL, cookie, 200 body, and 404 body.
2. Implement the smallest dynamic route handler under `apps/web/src/app/api/reader/items/[id]/route.ts`.
3. Run focused web tests and lint.
4. Verify the running local app with curl and Chrome `/personal`.
5. Review touched files, update `tasks.md`, and commit only this goal's files.

## Verification

- `pnpm --filter @reno-news/web test`
- `pnpm --filter @reno-news/web lint`
- `curl http://localhost:3000/api/reader/items/<real-id>`
- Chrome plugin opens `/personal` and records no app-owned `/api/reader/items/:id` 404.

## Rollback

Remove only the new `apps/web/src/app/api/reader/items/[id]/` route/test and the `goal-5/` files if the route causes issues. No database or data rollback is needed.
