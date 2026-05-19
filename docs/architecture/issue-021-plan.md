# Issue 021 Plan: Admin Feedback Review Foundation

## Objective

Issue 021 adds the smallest Admin feedback workflow: an Admin can review one Reader Feedback event and set a constrained Feedback Review Status. Dismissed feedback should no longer contribute to the bounded Quality Feedback Penalty. This must not become a general moderation workflow or content lifecycle mutation.

## Current Context

- Issue 017 stores Reader Feedback as append-only item-scoped events.
- Issue 020 uses eligible feedback rows to compute a bounded Digest ordering penalty.
- The current Admin feedback page is read-only.
- The project still has no auth/RBAC, Admin identity, moderation queue, feedback reply system, or audit log.

## Decision

Store Feedback Review state directly on `reader_feedback` for this MVP slice. Use constrained statuses:

| Status | Meaning |
|---|---|
| `open` | Default state for newly submitted feedback. |
| `reviewed` | Admin inspected it and keeps it eligible for penalty. |
| `dismissed` | Admin rejects it; it should not contribute to Quality Feedback Penalty. |
| `resolved` | Admin handled it outside this workflow; it remains eligible for penalty unless a later issue changes that policy. |

Do not add Admin identity, audit tables, moderation notes that mutate content, or automatic hide/restore in this issue.

## TDD Plan

1. [ ] Add migration tests for constrained `reader_feedback.review_status`, optional bounded review note, and review timestamp fields.
2. [ ] Add DB integration tests for default open feedback, constrained review updates, missing feedback, and dismissed feedback excluded from Digest penalty.
3. [ ] Implement feedback review repository update path.
4. [ ] Update `ReaderRepository.listReaderDigestItems` so dismissed feedback does not count toward Quality Feedback Penalty.
5. [ ] Add API tests for `PATCH /admin/feedback/:id`.
6. [ ] Implement Fastify route with full JSON Schema params/body validation.
7. [ ] Add web API client and Server Action tests for feedback review forms.
8. [ ] Add review controls to `/admin/feedback`.
9. [ ] Update Feedback API docs, README, master plan, goal plan, and implementation log.

## Acceptance Criteria

- [ ] New feedback defaults to `open`.
- [ ] Admin can set feedback review status to `open`, `reviewed`, `dismissed`, or `resolved`.
- [ ] Review note is optional and bounded.
- [ ] Missing feedback review updates return `404`.
- [ ] Dismissed feedback does not contribute to Quality Feedback Penalty.
- [ ] Feedback Review does not hide, restore, delete, moderate, re-board, personalize, or change raw-entry lifecycle.
- [ ] No auth/RBAC, Admin identity, audit log, reader identity, trust weighting, reply workflow, moderation queue, semantic/vector search, external search service, digest delivery, persisted digest table, editorial workflow, browser automation, or non-RSS adapter is added.

## Research References

- Next.js 16.2.2 Server Actions with forms, `FormData`, `revalidatePath`, and `redirect`: https://github.com/vercel/next.js/blob/v16.2.2/docs/01-app/02-guides/forms.mdx
- Fastify v5 full JSON Schema route validation: https://github.com/fastify/fastify/blob/main/docs/Guides/Migration-Guide-V5.md

## Rollback

If Feedback Review adds too much operational ambiguity, remove the admin review route and web controls while keeping stored feedback events and the Issue 020 penalty behavior. If a migration has already added review columns, leave them unused until a later scoped issue.
