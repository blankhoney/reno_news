# Issue 014 Plan: Admin Failure Queue Foundation

## Goal

Issue 014 adds a read-only admin failure queue so an Admin can inspect recent source ingest, extraction, and model-processing failures in one place.

## Scope

In scope:
- Current Fastify v5 route and JSON Schema guidance for a read-only admin API endpoint.
- DB failure queue projection over existing `source_ingest_attempts`, `raw_entry_extraction_attempts`, and `model_calls`.
- API endpoint `GET /admin/failures`.
- Web admin page `/admin/failures`.
- Links from existing admin surfaces to the failure queue.
- Failure queue API documentation and implementation log updates.

Out of scope:
- Retry buttons or automatic retry scheduling.
- Acknowledgement, assignment, resolution, or policy workflow state.
- New failure queue table.
- Source creation UI.
- Policy history or audit table.
- Auth, RBAC, approval workflow, or production CMS polish.
- Feedback handling.
- Raw-entry hide/restore.
- Search, digest generation, browser automation, or non-RSS adapters.

## Design

The failure queue should be a read-only normalized projection. Each queue row should include:

- `id`
- `failureStage`
- `status`
- `failureType` or `errorCode`
- `message`
- `sourceId` and `sourceTitle` when known
- `rawEntryId` and `rawEntryTitle` when known
- `purpose` for model calls
- `createdAt`

Issue 014 should use existing failure facts instead of adding a workflow table. Source ingest and extraction attempts already have `status`, `failure_type`, `message`, and timestamps. Model calls already have `status`, `purpose`, `error_code`, timestamps, and may include `rawEntryId` in redacted request metadata.

## TDD Plan

1. [x] Add DB repository tests for normalizing ingest, extraction, and model-call failures.
2. [x] Implement failure queue repository projection.
3. [x] Add API tests for `GET /admin/failures`.
4. [x] Implement the API endpoint.
5. [x] Add web API client tests for failure queue loading.
6. [x] Add `/admin/failures` page and links from admin surfaces.
7. [x] Update README, API docs, master plan, and log.

## Implemented Boundary

- `packages/db/src/failureQueueRepository.ts` owns the normalized read-only projection.
- `GET /admin/failures` returns `{ failures }` and validates `limit` with a Fastify v5 full JSON Schema query object.
- `apps/web/src/app/admin/failures/page.tsx` renders the queue and links to source or raw-entry admin details when context exists.
- The implementation does not add retry, acknowledgement, resolution state, a new failure queue table, auth/RBAC, feedback handling, raw-entry hide/restore, search, digest generation, browser automation, or non-RSS adapters.

## Acceptance Criteria

- [x] Admin can view recent source ingest failures.
- [x] Admin can view recent extraction failures.
- [x] Admin can view recent failed model calls.
- [x] Failure rows are ordered newest first.
- [x] Failure rows include enough source or raw-entry context for inspection when that context exists.
- [x] The endpoint uses Fastify v5 full JSON Schema for any query validation.
- [x] No retry, acknowledgement, resolution workflow, new failure queue table, source creation UI, policy history, auth/RBAC, feedback handling, raw-entry hide/restore, search, digest generation, browser automation, or non-RSS adapter is added.

## Research References

- Fastify v5 route validation and full JSON Schema guidance: Context7 `/fastify/fastify`
