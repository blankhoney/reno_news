# Digest Editions API

Task 20 defines the persisted Digest Edition schema and shared contract. Task 21 implements generation, list, detail, and replay routes.

A Digest Edition is a stable replay object. It stores selected item ids plus reader-safe item snapshots so replay does not silently change after source metadata, feedback penalties, or ranking signals change. New snapshots include `isDevelopmentSeed`; old snapshots that predate the field are normalized to `false` when read.

## Status Values

```text
draft
reviewed
archived
```

`draft` is the default generated state. `reviewed` records admin review. `archived` removes an edition from normal review queues without deleting replay history.

## Routes

### `POST /admin/digest-editions`

Generates a persisted edition from the current reader-safe digest selector.

Request:

```json
{
  "editionDate": "2026-05-21",
  "boardSlug": "ai",
  "limit": 12
}
```

Returns the generated edition with ordered items.

### `GET /admin/digest-editions`

Lists edition summaries for admin review.

### `GET /admin/digest-editions/:id`

Returns one persisted edition with ordered item snapshots.

### `GET /reader/digest-editions/:editionKey`

Replays one persisted edition from stored snapshots without rerunning the dynamic digest selector.

Returns `404` when the edition key does not exist.

## Authorization

- `POST /admin/digest-editions`, `GET /admin/digest-editions`, and `GET /admin/digest-editions/:id` require an authenticated admin session.
- Reader replay by `editionKey` is public-reader-facing and does not require a session.
- Anonymous or reader sessions cannot call admin digest edition routes.

## Boundaries

- Digest editions do not create email delivery, push delivery, or external distribution.
- Item snapshots must contain reader-safe card fields only, including `isDevelopmentSeed` for local development-sample marking.
- Feedback events, private extraction text, translation drafts, model payloads, and admin diagnostics must not be stored in `item_snapshot_json`.
- The existing dynamic `/reader/digest` preview can continue to exist, but it is not the stable replay artifact.
- Re-generating an existing `editionKey` returns the existing edition rather than rewriting stored item snapshots.
