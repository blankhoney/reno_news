# Sources API

Issue 003 introduces basic Source Registry endpoints for admin/debug operation. These endpoints are not RSS ingest endpoints.

## `GET /sources`

Returns all sources with board identity and Source Policy fields.

Response fields:
- `id`
- `boardId`
- `boardSlug`
- `sourceType`
- `title`
- `url`
- `enabled`
- `policy`

## `GET /sources/:id`

Returns one source with board identity and Source Policy fields.

Response body is the same source object shape returned inside `GET /sources`.

Returns `404` when the source does not exist.

## `POST /sources`

Creates a source and Source Policy.

Required body fields:
- `boardSlug`
- `sourceType`
- `title`
- `url`

Optional body fields:
- `enabled`
- `policy`

## `PATCH /sources/:id`

Updates source metadata, enable/disable state, and policy fields.

Allowed body fields:
- `boardSlug`
- `sourceType`
- `title`
- `url`
- `enabled`
- `policy`

Admin policy edit forms submit only a nested `policy` payload:

```json
{
  "policy": {
    "crawlEnabled": true,
    "fetchIntervalMinutes": 60,
    "maxRequestsPerHour": 12,
    "saveLevel": "metadata_only",
    "rightsPolicy": "metadata_only",
    "translationPolicy": "none",
    "riskLevel": "medium"
  }
}
```

## Validation Boundary

Fastify JSON Schema rejects invalid request shape before repository calls. PostgreSQL check constraints remain the durable policy vocabulary guard.
