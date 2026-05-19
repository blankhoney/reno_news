# Issue 010 Plan: Reader Home And Board Listing Foundation

## Goal

Issue 010 starts Milestone 4 with a reader-facing home page and board listing page backed by a policy-filtered metadata/summary projection.

## Scope

In scope:
- Reader board list query for the five MVP boards.
- Reader item card query using raw entry metadata and latest summary block when present.
- API endpoints for reader boards and reader item cards.
- Web home page that shows board navigation, latest item cards, and empty states.
- Web board page at `/boards/[slug]` that filters item cards by board.
- Interface docs for the new reader API endpoints.
- Server Component data fetching with `cache: "no-store"` and `next/link` navigation.

Out of scope:
- Article detail page.
- Chinese/original switch.
- Saved items.
- Read later.
- Search.
- Digest generation.
- Public publishing workflow.
- Auth, personalization, feedback, browser automation, or non-RSS adapters.

## Design

The first reader surface should be read-only and card-based. Cards should show board, source, title, URL, raw summary or summary block one-sentence text, and timestamps. They should not show extracted full text, translated full text, full model responses, or admin policy internals.

The API remains the data boundary for web. The Next.js app should use App Router Server Components for the reader pages and fetch through the API with `cache: "no-store"`, matching the current admin/API split and current Next.js guidance.

## Proposed API

`GET /reader/boards`

Returns:
- `boards`: array of `{ slug, name, description }`

`GET /reader/items`

Optional query:
- `board`: board slug

Returns:
- `items`: array of reader item cards

Reader item card fields:
- `id`
- `boardSlug`
- `boardName`
- `sourceTitle`
- `title`
- `url`
- `summary`
- `publishedAt`
- `createdAt`

## TDD Plan

1. Add DB repository tests for board listing and reader item card projection.
2. Add API tests for `GET /reader/boards` and `GET /reader/items`.
3. Add web API client tests for URL joining and payload parsing.
4. Implement repository and API endpoints.
5. Implement home and board pages using Server Components.
6. Update API docs, README, master plan, and log.

## Acceptance Criteria

- Home page shows the five MVP boards.
- Home page can render latest reader item cards or a clear empty state.
- Board page filters cards by board slug and returns 404 or empty state for unknown boards according to the API contract.
- Reader cards never include extracted full text, translated full text, private model payloads, or admin-only diagnostics.
- New reader API endpoints are documented.
- No article page, search, digest generation, saved/read-later, personalization, browser automation, public publishing workflow, or non-RSS adapter is added.

## Research References

- Next.js App Router data fetching and Server Components: Context7 `/vercel/next.js/v16.2.2`
- Next.js Link navigation: Context7 `/vercel/next.js/v16.2.2`
