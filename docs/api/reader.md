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

Returns latest reader item cards. Hidden raw entries are excluded. Optional query:

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

## `GET /reader/items/:id`

Returns one reader item detail projection. The endpoint returns `404` if the item is missing, hidden, blocked, or belongs to a disabled source.

Reader detail text fields are rights-filtered:

- `originalTextMode: "none"` means no extracted body is public.
- `originalTextMode: "excerpt"` means `originalText` is a bounded excerpt.
- `originalTextMode: "full"` means `originalText` is the full extracted original text.
- `chineseTextMode: "summary_only"` means the Chinese view uses summary fields and does not expose translation draft full text.

Response:

```json
{
  "item": {
    "id": 1,
    "boardSlug": "ai",
    "boardName": "AI",
    "sourceTitle": "OpenAI News",
    "title": "Sample AI item",
    "url": "https://example.invalid/ai/sample-ai-001",
    "summary": "Development seed item for the AI board.",
    "detailSummary": "Detailed summary.",
    "whyItMatters": "Why it matters.",
    "sourceNote": "Source note.",
    "chinaRelevance": "China relevance.",
    "relatedTopics": ["AI"],
    "originalTitle": "Sample AI item",
    "originalText": "",
    "originalTextMode": "none",
    "chineseTitle": "Sample AI item",
    "chineseText": "Detailed summary.",
    "chineseTextMode": "summary_only",
    "publishedAt": "2026-05-20T00:00:00.000Z",
    "createdAt": "2026-05-20T00:00:00.000Z"
  }
}
```
