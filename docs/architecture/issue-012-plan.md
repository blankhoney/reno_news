# Issue 012 Plan: Local Saved And Read Later Foundation

## Goal

Issue 012 completes the first Milestone 4 personal-space slice by letting a reader save items and mark items for read later using local browser state.

## Scope

In scope:
- Local browser storage schema for saved/read-later item snapshots.
- Pure state helpers with tests for add/remove/toggle and corrupted-storage recovery.
- Small Client Component boundary for save/read-later controls.
- Controls on reader item cards and reader detail pages.
- Personal-space page at `/personal` that renders local saved and read-later lists.
- Web documentation for the local state contract.
- Current Next.js Server Component plus Client Component boundary guidance.

Out of scope:
- Authentication.
- Reader accounts.
- Backend personal-state tables or APIs.
- Cross-device sync.
- Feedback-to-ranking logic.
- Search.
- Digest generation.
- Public publishing workflow.
- Browser automation or non-RSS adapters.

## Design

Reader pages should remain Server Components for data fetching. Only the small controls and personal-space list need a Client Component because they use `localStorage`, `useState`, and event handlers.

The client boundary receives serializable item snapshots:

- `id`
- `boardSlug`
- `boardName`
- `sourceTitle`
- `title`
- `summary`
- `publishedAt`
- `createdAt`

Local storage key:

```text
reno-news:personal-state:v1
```

Stored shape:

```json
{
  "saved": [],
  "readLater": []
}
```

Each array contains item snapshots, not only ids, so `/personal` can render immediately without adding a backend batch lookup API. Later account-backed sync can migrate from this shape without changing public item projection semantics.

## TDD Plan

1. [x] Add pure local personal-state helper tests for empty state, toggle, remove, ordering, and corrupted storage.
2. [x] Implement local personal-state helpers.
3. [x] Add Client Component controls for save/read-later.
4. [x] Add controls to reader cards and detail pages using serializable snapshots.
5. [x] Add `/personal` page and client-rendered saved/read-later lists.
6. [x] Update README, docs, master plan, and log.

## Implemented Boundary

- `apps/web/src/app/personalState.ts` owns the local storage schema and pure state helpers.
- `apps/web/src/app/PersonalControls.tsx` is the small Client Component boundary for item actions.
- `apps/web/src/app/PersonalPageClient.tsx` renders local saved/read-later lists.
- Server Components pass only `PersonalItemSnapshot` data into Client Components.
- The stored snapshot excludes extracted full text, translation draft full text, model payloads, admin policy fields, and reader identity.
- `docs/web/personal-state.md` documents the local state contract.

## Acceptance Criteria

- Reader can save and unsave an item from card and detail surfaces.
- Reader can add/remove read-later from card and detail surfaces.
- Saved/read-later state persists across reloads in the same browser.
- `/personal` shows saved and read-later lists from local state.
- Corrupted local state recovers to an empty state.
- Server Components pass only serializable item snapshots to Client Components.
- No auth, backend personal-state API, ranking change, search, digest generation, public publishing workflow, browser automation, or non-RSS adapter is added.

## Research References

- Next.js Client Components and `'use client'`: Context7 `/vercel/next.js/v16.2.2`
- Next.js Server-to-Client serializable props guidance: Context7 `/vercel/next.js/v16.2.2`
