# Reader API

Reader endpoints expose policy-filtered metadata and summary cards for the reader UI. They do not expose extracted full text, translated full text, private model payloads, or admin-only diagnostics.

## `GET /reader/boards`

Returns the MVP board list.

Response:

```json
{
  "boards": [
    {
      "slug": "ai",
      "name": "AI",
      "description": "Artificial intelligence research, products, and policy."
    }
  ]
}
```

## `GET /reader/items`

Returns latest reader item cards. Optional query:

- `board`: board slug filter.

Response:

```json
{
  "items": [
    {
      "id": 1,
      "boardSlug": "ai",
      "boardName": "AI",
      "sourceTitle": "OpenAI News",
      "title": "Sample AI item",
      "url": "https://example.invalid/ai/sample-ai-001",
      "summary": "Development seed item for the AI board.",
      "publishedAt": "2026-05-20T00:00:00.000Z",
      "createdAt": "2026-05-20T00:00:00.000Z"
    }
  ]
}
```
