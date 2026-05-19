# Issue 015 Plan: Admin Raw Entry Manual Hide Restore Foundation

## Goal

Issue 015 lets an Admin manually hide one raw entry from reader-facing surfaces and restore a hidden raw entry without adding a feedback workflow or moderation history table.

## Scope

In scope:
- Current Next.js Server Action form, `FormData`, `revalidatePath`, and `redirect` guidance.
- Current Fastify v5 route schema and JSON Schema validation guidance.
- Existing raw entry lifecycle values, especially `hidden`.
- DB mutation for one constrained raw-entry lifecycle action.
- API endpoint for one raw-entry lifecycle action.
- Admin raw-entry detail form controls for hide and restore.
- Reader visibility regression tests so hidden items disappear from reader list and detail projections.
- Raw entry API documentation and implementation log updates.

Out of scope:
- Reader feedback handling.
- Moderation reasons, notes, assignment, review queues, or audit history.
- Bulk moderation.
- Deleting raw entries or changing source policy.
- Retry, acknowledgement, or resolution workflow.
- Source creation UI, policy history, auth/RBAC, approval workflow, or production CMS polish.
- Search, digest generation, browser automation, or non-RSS adapters.

## Design

Issue 015 should reuse the existing `raw_entries.lifecycle_status` field rather than adding a new table. The MVP action set is intentionally small:

- `hide`: set `lifecycle_status` to `hidden`.
- `restore`: set `lifecycle_status` to `candidate`.

Restoring to `candidate` is deliberate because the current schema does not retain the previous lifecycle state. It makes the item visible for review again without inventing an audit/history model.

The public reader repositories should filter out `hidden` entries. Admin raw-entry list and detail views should continue to show hidden entries so an Admin can inspect and restore them.

The API should not become a generic status editor. It should accept a constrained action payload, for example:

```json
{ "action": "hide" }
```

or:

```json
{ "action": "restore" }
```

## TDD Plan

1. [ ] Add DB integration tests for hide, restore, missing raw entry, and reader hidden filtering.
2. [ ] Implement raw-entry lifecycle mutation in `RawEntryRepository`.
3. [ ] Add API tests for `PATCH /raw-entries/:id` hide, restore, invalid action, and missing raw entry.
4. [ ] Implement the Fastify route with full JSON Schema for params and body.
5. [ ] Add web API client tests for lifecycle action form parsing and PATCH payload shape.
6. [ ] Add Server Action for raw-entry lifecycle actions.
7. [ ] Add hide/restore controls to `/admin/raw-entries/[id]`.
8. [ ] Update README, Raw Entries API docs, master plan, and log.

## Acceptance Criteria

- [ ] Admin can hide a raw entry from its admin detail page.
- [ ] Admin can restore a hidden raw entry from its admin detail page.
- [ ] Hidden raw entries do not appear in reader item lists.
- [ ] Hidden raw entry detail requests through the reader API return not found.
- [ ] Admin raw-entry list and detail still include hidden entries for inspection.
- [ ] Restore sets the raw entry lifecycle to `candidate`.
- [ ] The endpoint uses Fastify v5 full JSON Schema for params and body validation.
- [ ] The web action revalidates the raw-entry list and detail page before redirecting.
- [ ] No feedback handling, moderation history, bulk moderation, delete flow, retry/resolution workflow, source creation UI, policy history, auth/RBAC, search, digest generation, browser automation, or non-RSS adapter is added.

## Research References

- Next.js App Router Server Actions, `revalidatePath`, and `redirect`: Context7 `/vercel/next.js/v16.2.2`
- Fastify v5 route validation and full JSON Schema guidance: Context7 `/fastify/fastify`
