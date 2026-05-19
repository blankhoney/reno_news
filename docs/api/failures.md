# Admin Failures API

Issue 014 introduces a read-only admin failure queue endpoint. It projects existing attempt and model-call records; it does not create retry, acknowledgement, assignment, or resolution workflow state.

## `GET /admin/failures`

Returns recent failure records ordered newest first.

Optional query fields:
- `limit`: integer from 1 to 200.

Response fields:
- `id`
- `failureStage`
- `status`
- `failureType`
- `errorCode`
- `message`
- `sourceId`
- `sourceTitle`
- `rawEntryId`
- `rawEntryTitle`
- `purpose`
- `createdAt`

Failure stages:
- `source_ingest`
- `extraction`
- `model_call`

## Validation Boundary

Fastify JSON Schema validates the optional query object. PostgreSQL remains the source of truth for recorded failure status, failure type, model-call error code, and timestamps.
