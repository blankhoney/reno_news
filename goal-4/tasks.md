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

- Status: Pending
- Expected result: long summaries cannot visually stretch cards beyond a readable preview.
- Verification: `pnpm --filter @reno-news/web lint` passes; Chrome board/search screenshots show stable cards.
- Completion notes:

## Task 3: Explicit Admin Denied Page

- Status: Pending
- Expected result: anonymous `/admin` reaches a clear denied page instead of the homepage.
- Verification: web tests pass; Chrome `/admin` screenshot shows denied state.
- Completion notes:

## Large Check After Task 3

- Status: Pending
- Expected result: focused DB/web tests and lint pass before continuing.
- Completion notes:

## Task 4: Personal-State BFF Proxy

- Status: Pending
- Expected result: client `/api/reader/personal-state*` requests reach Fastify and anonymous local state remains usable.
- Verification: route handler tests pass; Chrome personal/detail console shows no `/api/...` 404.
- Completion notes:

## Task 5: Chrome Repair Validation

- Status: Pending
- Expected result: actual Chrome plugin validates core reader surfaces with screenshots under `/tmp/reno_news_chrome_repair_*`.
- Verification: screenshots and console observations recorded.
- Completion notes:

## Task 6: Final Review And Commit

- Status: Pending
- Expected result: scoped changes are reviewed, committed without touching unrelated worktree files, and residual issues are reported.
- Verification: `git status --short` shows only pre-existing unrelated changes after commit.
- Completion notes:
