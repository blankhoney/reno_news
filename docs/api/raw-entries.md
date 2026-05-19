# Raw Entries API

Raw Entry endpoints expose RSS/Atom metadata already stored in `raw_entries` for admin/debug inspection. Issue 015 adds a constrained manual hide/restore action; these endpoints do not fetch article full text.

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

## `PATCH /raw-entries/:id`

Applies one constrained lifecycle action to a raw entry.

Request:

```json
{ "action": "hide" }
```

or:

```json
{ "action": "restore" }
```

Behavior:
- `hide` sets `lifecycleStatus` to `hidden`.
- `restore` sets `lifecycleStatus` to `candidate`.
- Unsupported actions return `400`.
- Missing raw entries return `404`.

## Boundary

Raw Entry endpoints are for admin/debug inspection and manual lifecycle moderation only. They do not add feedback handling, moderation history, bulk moderation, delete flow, retry/resolution workflow, full-text extraction, AI evaluation, search, or publication workflow.
