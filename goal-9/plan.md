# Goal 9 Plan

## Requirement

Add a same-origin Web login/logout path backed by the existing Fastify auth API, and make development seed reader items visibly distinguishable without hiding or filtering them.

## Context

- Fastify already owns invite-only auth, sessions, role guards, cookies, and audit events.
- Web admin pages already call `/auth/me` through server-side helpers and redirect non-admin users to `/admin/denied`.
- Reader projections already normalize display text and power list, search, digest, detail, related items, personal snapshots, and Digest Edition snapshots.
- Dev seed raw entries already carry `raw_payload_json = {"seed": true}`.
- There is no Web BFF auth route or user-facing login page yet.

## Risks

- Accidentally turning Next.js into a second identity authority instead of a BFF proxy.
- Open redirect through the `next` parameter.
- Committing production-like credentials or implying the dev seed accounts are safe for production.
- Changing seed visibility or reader ranking while only adding provenance labels.
- Breaking old Digest Edition snapshots that do not contain the new provenance field.

## Approach

1. Create Goal Mode records before source edits.
2. Add Web auth BFF tests and route handlers for `/api/auth/me`, `/api/auth/login`, and `/api/auth/logout`.
3. Add the `/login` page plus minimal admin denied/admin shell wiring for login and logout.
4. Add development users to `infra/db/seeds/dev.sql` with an argon2id PHC hash and document them as local-only.
5. Add `isDevelopmentSeed` to reader projections and public API responses while keeping existing shapes backward compatible for consumers that ignore extra fields.
6. Render a `Development sample` badge anywhere reader cards/details or Digest Edition snapshots display seed items.
7. Update README and API docs with auth BFF and provenance field behavior.
8. Run planned package checks and Chrome acceptance.

## Verification

- TDD tracer bullets per task.
- `pnpm --filter @reno-news/db test:integration`
- `pnpm --filter @reno-news/api test`
- `pnpm --filter @reno-news/web test`
- `pnpm --filter @reno-news/web lint`
- `git diff --check`
- Chrome flow screenshots under `/tmp/reno_news_goal9_*`.

## Rollback

Revert Goal 9 commits. If local dev seed users were inserted into a local database and need manual cleanup, delete only `admin@example.invalid` and `reader@example.invalid` from `users`; reader item data and existing real-source rows are not removed.
