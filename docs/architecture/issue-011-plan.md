# Issue 011 Plan: Reader Detail And Language View Foundation

## Goal

Issue 011 continues Milestone 4 with a reader-facing item detail page and a safe Chinese/original language view switch backed by a rights-filtered detail projection.

## Scope

In scope:
- Reader detail query for one non-blocked item from an enabled source.
- API endpoint for one reader item detail.
- Detail projection fields for board, source, title, URL, timestamps, summary block, original excerpt or body when rights allow it, and Chinese-first summary fields.
- Web detail page at `/items/[id]`.
- Internal links from reader item cards to the detail page.
- Query-string language switch using Server Components, `next/link`, and `cache: "no-store"` fetches.
- API documentation for the new reader detail endpoint.

Out of scope:
- Public translation publishing.
- Displaying translation draft full text by default.
- Saved items.
- Read later.
- Search.
- Digest generation.
- Auth, personalization, feedback, browser automation, or non-RSS adapters.

## Design

The detail page should be read-only and server-rendered. The page should use `/items/[id]` because the current reader card identity is the `raw_entries.id`; slug generation can wait until there is a real publishing workflow.

The API remains the data boundary for web. The repository should build a `ReaderItemDetail` projection rather than exposing raw extraction, translation, or model-call rows. The projection should include:

- shared metadata: `id`, `boardSlug`, `boardName`, `sourceTitle`, `title`, `url`, `publishedAt`, `createdAt`
- summary block: `oneSentence`, `detailedSummary`, `whyItMatters`, `sourceNote`, `chinaRelevance`, `relatedTopics`
- original view: title plus a policy-filtered excerpt/body
- Chinese view: translated title when available, summary block fields, and no translation draft full text unless a later public publishing workflow permits it

Rights behavior:

- `blocked` items are not returned.
- `metadata_only`, `private_allowed`, and `unknown` items can show metadata and summary snippets but no extracted body.
- `public_excerpt_allowed` items can show a bounded original excerpt.
- `public_fulltext_allowed` items can show extracted original text.
- Translation draft full text remains hidden in Issue 011.

## Proposed API

`GET /reader/items/:id`

Returns:
- `item`: a reader item detail object, or `404` if the item is missing, blocked, or from a disabled source.

Reader item detail fields:
- `id`
- `boardSlug`
- `boardName`
- `sourceTitle`
- `title`
- `url`
- `publishedAt`
- `createdAt`
- `summary`
- `detailSummary`
- `whyItMatters`
- `sourceNote`
- `chinaRelevance`
- `relatedTopics`
- `originalTitle`
- `originalText`
- `originalTextMode`: `none`, `excerpt`, or `full`
- `chineseTitle`
- `chineseText`
- `chineseTextMode`: `summary_only`

## TDD Plan

1. [x] Add DB repository tests for item detail projection, 404/null behavior, and rights-filtered text modes.
2. [x] Add API tests for `GET /reader/items/:id`.
3. [x] Add web API client tests for detail fetch and encoded language-view links.
4. [x] Implement repository and API endpoint.
5. [x] Implement item detail page and language switch.
6. [x] Update API docs, README, master plan, and log.

## Implemented Boundary

- `packages/db/src/readerRepository.ts` owns the reader detail projection.
- `apps/api` exposes `GET /reader/items/:id`.
- `apps/web` links reader cards to `/items/[id]` and renders the detail page with query-string `view=zh|original`.
- Original full text is exposed only for `public_fulltext_allowed`.
- Original excerpts are bounded and exposed only for `public_excerpt_allowed`.
- Translation draft full text is not selected or returned by the reader detail projection.
- `docs/api/reader.md` documents the reader detail endpoint.

## Acceptance Criteria

- Reader item cards link to internal detail pages.
- Detail page renders for a policy-eligible item.
- Unknown, blocked, or disabled-source items do not render as reader details.
- Chinese/original switch works without client-side state.
- Extracted full text is only exposed for `public_fulltext_allowed`.
- Extracted excerpts are bounded and only exposed for `public_excerpt_allowed`.
- Translation draft full text is not exposed.
- New reader detail API is documented.
- No search, digest generation, saved/read-later, personalization, public publishing workflow, browser automation, or non-RSS adapter is added.

## Research References

- Next.js App Router dynamic route params and `notFound()`: Context7 `/vercel/next.js/v16.2.2`
- Next.js Server Component fetch cache options and `next/link` navigation: Context7 `/vercel/next.js/v16.2.2`
