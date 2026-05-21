# Reader API

Reader endpoints expose policy-filtered metadata and summary cards for the reader UI. They do not expose extracted full text, translated full text, private model payloads, or admin-only diagnostics.

Reader item cards and details include `isDevelopmentSeed`. The value is `true` only when the source raw entry payload is marked with `{"seed": true}`. Clients may display this as a local development-sample marker, but the field does not filter, rank, hide, or promote items.

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
- `limit`: item count from 1 to 100. Defaults to 100.
- `offset`: item offset, minimum 0. Defaults to 0.

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
      "isDevelopmentSeed": true,
      "publishedAt": "2026-05-20T00:00:00.000Z",
      "createdAt": "2026-05-20T00:00:00.000Z"
    }
  ],
  "pagination": {
    "limit": 100,
    "offset": 0,
    "hasMore": false,
    "nextOffset": null
  }
}
```

## `GET /reader/search`

Searches visible reader item cards with PostgreSQL over reader-safe metadata and summary fields. Hidden raw entries, blocked items, and disabled-source items are excluded. Required and optional query parameters:

- `q`: required non-empty reader search query.
- `board`: optional board slug filter.
- `limit`: item count from 1 to 100. Defaults to 100.
- `offset`: item offset, minimum 0. Defaults to 0.

Searchable fields are limited to raw entry title, URL, source title, board name, raw summary, and summary block fields. The endpoint does not search extracted full text, translation draft full text, private model payloads, or admin-only diagnostics.

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
      "isDevelopmentSeed": true,
      "publishedAt": "2026-05-20T00:00:00.000Z",
      "createdAt": "2026-05-20T00:00:00.000Z"
    }
  ],
  "pagination": {
    "limit": 100,
    "offset": 0,
    "hasMore": false,
    "nextOffset": null
  }
}
```

`hasMore` is computed by fetching one extra candidate beyond `limit`. When `hasMore` is true, `nextOffset` is `offset + limit`. Clients that only read `items` remain compatible with the response shape.

## `GET /reader/digest`

Returns a reader-safe digest preview of visible item cards. Optional query parameters:

- `board`: board slug filter.
- `limit`: bounded digest item count, 1 to 24.

Digest preview uses the same reader-visible pool as reader lists, item details, search, and related items. Ordering first applies a bounded Quality Feedback Penalty derived from stored item-scoped Reader Feedback, then applies best-effort source and board diversity within the same penalty tier. Board-filtered digests limit single-source dominance when alternatives exist; all-board digests also try to include multiple boards before filling by recency. Diversity never personalizes results and may be relaxed to fill the requested limit. This endpoint does not create a persisted digest, schedule delivery, send email, hide or moderate items, personalize results, or expose extracted full text, translation draft full text, private model payloads, feedback events, or admin-only diagnostics.

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
      "isDevelopmentSeed": true,
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
    "isDevelopmentSeed": true,
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

## `GET /reader/items/:id/related`

Returns a small set of related reader item cards for one visible item. The endpoint returns `404` if the target item is missing, hidden, blocked, or belongs to a disabled source.

Optional query:

- `limit`: bounded related item count, 1 to 12.

Related item selection uses the same reader-visible pool as reader lists, item details, and search. It excludes the current item and does not expose extracted full text, translation draft full text, private model payloads, feedback events, or admin-only diagnostics.

Ordering signals are, in order: explicit `raw_entry_similarity_signals`, title trigram similarity, shared source, shared board, PostgreSQL full-text rank, recency, and id. Items in the same Duplicate Group are folded to the group's representative item when present, and entries in the target item's own Duplicate Group are excluded.

Response:

```json
{
  "items": [
    {
      "id": 2,
      "boardSlug": "ai",
      "boardName": "AI",
      "sourceTitle": "OpenAI News",
      "title": "Related AI item",
      "url": "https://example.invalid/ai/related-ai-001",
      "summary": "Related summary.",
      "isDevelopmentSeed": false,
      "publishedAt": "2026-05-20T00:00:00.000Z",
      "createdAt": "2026-05-20T00:00:00.000Z"
    }
  ]
}
```
