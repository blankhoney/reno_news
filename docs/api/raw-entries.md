# Raw Entries API

Issue 005 adds read-only Raw Entry endpoints for admin/debug inspection. These endpoints expose RSS/Atom metadata already stored in `raw_entries`; they do not fetch article full text.

## `GET /raw-entries`

Returns the latest 100 raw entries.

Response fields:
- `id`
- `sourceId`
- `sourceTitle`
- `title`
- `url`
- `lifecycleStatus`
- `processingStage`
- `rightsStatus`
- `failureType`
- `createdAt`

## `GET /raw-entries/:id`

Returns one raw entry with source identity and status fields.

Returns `404` when the raw entry does not exist.

## Boundary

Raw Entry endpoints are for admin/debug inspection only. Reader UI, full-text extraction, AI evaluation, search, and publication state are later milestone work.
