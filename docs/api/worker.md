# Worker API

The worker exposes local operational endpoints for health checks and admin/debug ingest control.

## `GET /healthz`

Returns:

```json
{
  "status": "ok",
  "service": "worker"
}
```

## `POST /ingest/source/:id`

Triggers RSS/Atom ingest for one source ID and returns an ingest summary.

Response fields:
- `sourceId`
- `status`
- `entriesSeen`
- `entriesInserted`
- `failureType`
- `message`

Returns `503` if `DATABASE_URL` is not configured.
Returns `400` if the source ID is invalid.

## Boundary

This endpoint runs the existing RSS/Atom ingest path. It does not add full-text extraction, AI processing, search indexing, reader publication, or non-RSS adapters.
