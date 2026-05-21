# Goal 4 Plan: Real-Source Reader Repair

## Requirement

Repair the most visible reader/admin issues found during real-source Chrome validation. Keep the scope local to the existing reader, admin guard, and personal-state sync paths. Do not add rich HTML rendering, sanitizer dependencies, pagination, digest-ranking changes, seed-data changes, or source-list defaults.

## Context

- Real feeds can place HTML and Markdown into `raw_entries.summary_raw`.
- Reader API surfaces card, search, digest, related, and detail data through `packages/db/src/readerRepository.ts`.
- React currently escapes those strings, which prevents HTML execution but makes tags visible to readers.
- `/admin` redirects anonymous users to `/`, which makes access denial look like a successful homepage navigation.
- Client personal state defaults to `/api/reader/personal-state*`, but the web app currently has no Next route handler proxy for that BFF path.
- Saved and Read later are intentionally independent states per existing docs/tests.

## Risks

- Cleaning too late in the UI would miss API consumers and stored personal snapshots.
- Rendering rich HTML would expand the XSS surface and contradict the chosen pure-text strategy.
- Over-filtering seed data would break the existing development seed contract.
- Personal-state proxy must preserve cookie forwarding while keeping anonymous local behavior usable.

## Execution Approach

1. Add failing behavior tests for reader display text normalization, then implement the smallest normalizer at the reader repository boundary.
2. Add card overflow CSS as a visual guard after data is clean.
3. Update the admin denied route and tests so anonymous admin navigation is explicit.
4. Add Web BFF proxy route handlers for personal-state endpoints and route-level tests.
5. Run the focused checks, then complete real Chrome validation with screenshots.

## Verification

- `pnpm --filter @reno-news/db test:integration`
- `pnpm --filter @reno-news/web test`
- `pnpm --filter @reno-news/web lint`
- Chrome plugin screenshots for `/boards/ai`, `/search?q=Kubernetes`, one detail page, `/personal`, `/admin`, and `/digest`.

## Rollback

- Revert only files touched by this goal.
- If a data/display issue appears in local validation, adjust normalizer behavior without deleting real-source data.
- If a proxy route causes auth/session trouble, remove only the new web route handlers and keep local personal state behavior intact.
