# Feedback API

Feedback endpoints capture reader-submitted item-scoped signals for later review. Digest preview may consume eligible feedback as a bounded Quality Feedback Penalty. Feedback does not mutate item lifecycle, search ordering, saved/read-later state, or moderation status by itself.

## Feedback Types

Allowed `feedbackType` values:

- `correction`
- `quality_issue`
- `duplicate`
- `broken_link`
- `rights_concern`

## `POST /reader/items/:id/feedback`

Stores one feedback event for a policy-visible reader item. The endpoint returns `404` if the item is missing, hidden, blocked, or belongs to a disabled source.

Request:

```json
{
  "feedbackType": "quality_issue",
  "message": "Summary is too vague."
}
```

`message` is optional, must contain non-whitespace text when present, and is limited to 2000 characters.

Response:

```json
{
  "feedback": {
    "id": 20,
    "rawEntryId": 1,
    "rawEntryTitle": "Sample AI item",
    "boardSlug": "ai",
    "boardName": "AI",
    "sourceTitle": "OpenAI News",
    "feedbackType": "quality_issue",
    "message": "Summary is too vague.",
    "reviewStatus": "open",
    "reviewNote": null,
    "reviewedAt": null,
    "createdAt": "2026-05-20T00:00:00.000Z"
  }
}
```

## `GET /admin/feedback`

Returns recent feedback events for admin/debug inspection. Optional query:

- `limit`: integer from 1 to 200.

Response:

```json
{
  "feedback": [
    {
      "id": 20,
      "rawEntryId": 1,
      "rawEntryTitle": "Sample AI item",
      "boardSlug": "ai",
      "boardName": "AI",
      "sourceTitle": "OpenAI News",
      "feedbackType": "quality_issue",
      "message": "Summary is too vague.",
      "reviewStatus": "open",
      "reviewNote": null,
      "reviewedAt": null,
      "createdAt": "2026-05-20T00:00:00.000Z"
    }
  ]
}
```

## `PATCH /admin/feedback/:id`

Updates event-local Feedback Review state for one feedback event. This endpoint does not hide, restore, delete, moderate, re-board, personalize, or change raw-entry lifecycle.

Request:

```json
{
  "reviewStatus": "dismissed",
  "reviewNote": "Invalid duplicate report."
}
```

Allowed `reviewStatus` values:

- `open`
- `reviewed`
- `dismissed`
- `resolved`

`reviewNote` is optional, must contain non-whitespace text when present, and is limited to 2000 characters. The endpoint returns `404` if the feedback event is missing.

Response:

```json
{
  "feedback": {
    "id": 20,
    "rawEntryId": 1,
    "rawEntryTitle": "Sample AI item",
    "boardSlug": "ai",
    "boardName": "AI",
    "sourceTitle": "OpenAI News",
    "feedbackType": "quality_issue",
    "message": "Summary is too vague.",
    "reviewStatus": "dismissed",
    "reviewNote": "Invalid duplicate report.",
    "reviewedAt": "2026-05-20T01:00:00.000Z",
    "createdAt": "2026-05-20T00:00:00.000Z"
  }
}
```

`dismissed` feedback is excluded from Quality Feedback Penalty. `open`, `reviewed`, and `resolved` feedback remains eligible unless a later issue changes that policy.
