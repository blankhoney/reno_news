# Goal 4 Tasks

## Task 1: Reader Display Text Normalization

- Status: Completed
- Expected result: reader list/search/digest/detail summaries are pure text, whitespace-collapsed, and bounded for card display.
- Verification: failing integration fixture added first; `pnpm --filter @reno-news/db test:integration` passes after implementation.
- Completion notes:
  - Added a raw-summary fallback fixture with HTML, Markdown, script content, and long text.
  - Added reader display text normalization at the repository boundary.
  - Adjusted digest integration fixtures so local real-source data cannot crowd out test records.
  - Verified with `pnpm --filter @reno-news/db test:integration`.

## Task 2: Reader Card Overflow Guard

- Status: Completed
- Expected result: long summaries cannot visually stretch cards beyond a readable preview.
- Verification: `pnpm --filter @reno-news/web lint` passes; Chrome board/search screenshots show stable cards.
- Completion notes:
  - Added four-line overflow protection and long-word wrapping to reader card summaries.
  - Verified with `pnpm --filter @reno-news/web lint`.

## Task 3: Explicit Admin Denied Page

- Status: Completed
- Expected result: anonymous `/admin` reaches a clear denied page instead of the homepage.
- Verification: web tests pass; Chrome `/admin` screenshot shows denied state.
- Completion notes:
  - Updated the admin denied redirect target to `/admin/denied`.
  - Added a plain denied page that links back home and states the admin-session requirement.
  - Verified with `pnpm --filter @reno-news/web test`.

## Large Check After Task 3

- Status: Completed
- Expected result: focused DB/web tests and lint pass before continuing.
- Completion notes:
  - Passed `pnpm --filter @reno-news/db test:integration`.
  - Passed `pnpm --filter @reno-news/web test`.
  - Passed `pnpm --filter @reno-news/web lint`.

## Task 4: Personal-State BFF Proxy

- Status: Completed
- Expected result: client `/api/reader/personal-state*` requests reach Fastify and anonymous local state remains usable.
- Verification: route handler tests pass; Chrome personal/detail console shows no `/api/...` 404.
- Completion notes:
  - Added route-handler tests for GET and all three PUT mutation routes.
  - Added Next BFF proxy handlers for `/api/reader/personal-state`, `/saved`, `/read-later`, and `/read-status`.
  - Added personal snapshot summary normalization after Chrome found old localStorage snapshots still rendering pre-fix raw HTML.
  - Verified with `pnpm --filter @reno-news/web test` and `pnpm --filter @reno-news/web lint`.

## Task 5: Chrome Repair Validation

- Status: Completed
- Expected result: actual Chrome plugin validates core reader surfaces with screenshots under `/tmp/reno_news_chrome_repair_*`.
- Verification: screenshots and console observations recorded.
- Completion notes:
  - Saved Chrome screenshots and `validation.json` under `/tmp/reno_news_chrome_repair_1779352189794`.
  - Checked `/boards/ai`, `/search?q=Kubernetes`, `/items/8245`, `/personal`, `/admin`, and `/digest`.
  - Rechecked `/personal` after the local snapshot fix; visible raw marker count is 0.
  - Confirmed `/admin` reaches `/admin/denied`.
  - Confirmed the personal-state proxy via `curl`: `/api/reader/personal-state` returns API 401 JSON instead of 404. Direct Chrome navigation to `/api/...` was blocked by a Chrome client extension.

## Task 6: Final Review And Commit

- Status: Completed
- Expected result: scoped changes are reviewed, committed without touching unrelated worktree files, and residual issues are reported.
- Verification: `git status --short` shows only pre-existing unrelated changes after commit.
- Completion notes:
  - Reviewed the reader repository normalizer, personal-state snapshot normalization, personal-state proxy, admin guard/page, and card CSS.
  - Passed final `pnpm --filter @reno-news/db test:integration`.
  - Passed final `pnpm --filter @reno-news/web test`.
  - Passed final `pnpm --filter @reno-news/web lint`.
