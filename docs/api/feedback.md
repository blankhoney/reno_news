# Feedback API

Feedback endpoints capture reader-submitted item-scoped signals for later review. They do not mutate item lifecycle, ranking, search ordering, digest inclusion, saved/read-later state, or moderation status.

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
      "createdAt": "2026-05-20T00:00:00.000Z"
    }
  ]
}
```
