# Issue 013 Plan: Admin Source Policy Edit Foundation

## Goal

Issue 013 starts Milestone 5 by letting an Admin edit the current Source Policy from the existing source detail page.

## Scope

In scope:
- Current Next.js Server Action form guidance for `FormData`, `revalidatePath`, and `redirect`.
- Policy edit form on `/admin/sources/[id]`.
- Admin updates for `crawlEnabled`, `fetchIntervalMinutes`, `maxRequestsPerHour`, `saveLevel`, `rightsPolicy`, `translationPolicy`, and `riskLevel`.
- Use the existing API `PATCH /sources/:id` source update path.
- Web tests for policy update request payload parsing.
- Admin documentation and implementation log updates.

Out of scope:
- Source creation UI.
- Policy version history or audit trail.
- Auth, RBAC, approval workflow, or production CMS polish.
- Failure queue.
- Feedback handling.
- Raw-entry hide/restore.
- Search, digest generation, browser automation, or non-RSS adapters.

## Design

The current admin source detail page already reads Source Policy and supports enable/disable plus manual RSS ingest actions. Issue 013 should add a small policy form to that same page and submit through a Server Action. The Server Action should parse `FormData`, build a partial `policy` payload, call the existing `PATCH /sources/:id`, call `revalidatePath` for admin source views, and redirect back to the source detail page.

The first slice should edit the current policy row only. It should not introduce a separate policy history model, because Milestone 5 has not yet defined approval, audit, or release governance requirements.

## TDD Plan

1. [ ] Add web tests for converting admin policy form values into a source policy update payload.
2. [ ] Add an admin API helper for source policy updates.
3. [ ] Add a Server Action that parses policy form values and redirects after mutation.
4. [ ] Add the policy edit form to `/admin/sources/[id]`.
5. [ ] Update README, admin API/docs, master plan, and log.

## Acceptance Criteria

- Admin can edit crawl enabled state from the source detail page.
- Admin can edit positive numeric fetch interval and rate-limit values.
- Admin can edit save level, rights policy, translation policy, and risk level from constrained options.
- Submitted values reach `PATCH /sources/:id` as a nested `policy` payload.
- The admin source detail page is revalidated and shown again after mutation.
- Existing enable/disable and manual ingest actions still work.
- No source creation UI, policy history table, auth/RBAC, failure queue, feedback handling, raw-entry hide/restore, search, digest generation, browser automation, or non-RSS adapter is added.

## Research References

- Next.js Server Actions, forms, `FormData`, `revalidatePath`, and `redirect`: Context7 `/vercel/next.js/v16.2.2`
