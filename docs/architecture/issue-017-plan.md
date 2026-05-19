# Issue 017 Plan: Reader Feedback Capture Foundation

## Goal

Issue 017 adds the first feedback slice: a Reader can submit constrained feedback for a policy-visible reader item, and the system stores it for later moderation or ranking work without applying those effects yet.

## Scope

In scope:
- Current Next.js App Router Server Action form guidance for `FormData`, `revalidatePath`, and `redirect`.
- Current Fastify v5 full JSON Schema body validation guidance.
- SQL migration for item-scoped reader feedback events.
- Constrained Feedback Types: `correction`, `quality_issue`, `duplicate`, `broken_link`, and `rights_concern`.
- Optional bounded feedback message.
- DB repository method to create feedback for a visible reader item and list recent feedback for admin/debug inspection.
- API endpoint `POST /reader/items/:id/feedback`.
- API endpoint `GET /admin/feedback`.
- Reader item detail feedback form.
- Read-only admin feedback list.
- Feedback API documentation and implementation log updates.

Out of scope:
- Auth/RBAC, reader accounts, reputation, or identity proof.
- Backend saved/read-later or personal-state sync.
- Automatic ranking changes or feedback-to-ranking consumption.
- Automatic hide/restore, moderation workflow, assignment, resolution, or audit trail.
- Digest generation.
- Semantic/vector search, external search service, or search extension deployment.
- Browser automation or non-RSS adapters.

## Design

Feedback should be stored as append-only server-side events linked to a reader-visible item. The first slice should validate that the target item is eligible for the reader detail projection before accepting feedback, so feedback cannot be attached to hidden, blocked, disabled-source, or missing items through the reader API.

The feedback event should be anonymous for MVP v0.1. It should not create reader accounts, user tables, or backend personal-state APIs. A later issue can add identity, deduplication, or trust weighting if the product needs it.

The implementation should use a constrained `feedback_type` text value and optional bounded `message` text. Feedback storage must not mutate item lifecycle, search rank, board placement, digest inclusion, or moderation state in Issue 017.

## TDD Plan

1. [ ] Add SQL migration tests for a `reader_feedback` table and constrained feedback types.
2. [ ] Add DB integration tests for creating feedback on visible items and rejecting missing, hidden, blocked, or disabled-source items.
3. [ ] Implement feedback repository create/list methods.
4. [ ] Add API tests for `POST /reader/items/:id/feedback`, invalid item id, unsupported type, oversized message, and invisible item rejection.
5. [ ] Add API tests for `GET /admin/feedback`.
6. [ ] Implement Fastify routes with full JSON Schema validation.
7. [ ] Add web API client and Server Action tests for feedback form payload construction.
8. [ ] Add feedback form to reader item detail and read-only admin feedback page.
9. [ ] Update README, Feedback API docs, master plan, and log.

## Acceptance Criteria

- [ ] Reader can submit one constrained feedback event for a visible reader item.
- [ ] Feedback type is required and limited to the approved Feedback Types.
- [ ] Feedback message is optional and bounded.
- [ ] Missing, hidden, blocked, and disabled-source items cannot receive reader feedback.
- [ ] Admin can inspect recent feedback events in a read-only view.
- [ ] Feedback does not mutate item lifecycle, ranking, search result ordering, board placement, digest inclusion, or personal saved/read-later state.
- [ ] No auth/RBAC, reader account, backend personal-state sync, moderation workflow, feedback-to-ranking consumption, digest generation, semantic/vector search, external search service, search extension deployment, browser automation, or non-RSS adapter is added.

## Research References

- Next.js 16.2.2 App Router Server Actions, form `FormData`, `revalidatePath`, and `redirect`: Context7 `/vercel/next.js/v16.2.2`
- Fastify v5 full JSON Schema route validation: Context7 `/fastify/fastify`
