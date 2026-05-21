# Goal 3 Tasks

## Task 1: Inspect Runtime, Schema, and Baseline Counts
- Status: completed
- Verify independently by recording current service/database configuration and counts for `sources`, `raw_entries`, and `source_ingest_attempts`.
- Completion notes:
  - Verified `docs/db/schema.md`, SQL migrations, `sourceRepository.ts`, and worker ingest adapter dispatch.
  - Local Compose currently has Postgres and Redis running healthy; web/API/worker are not running yet.
  - Baseline counts: `sources=5`, `raw_entries=5`, `source_ingest_attempts=0`.
  - Existing seed sources remain the five board defaults: OpenAI News, GitHub Engineering, Semiconductor Engineering, BLS Employment Situation, and GitHub Blog.

## Task 2: Import Approved Sources Locally
- Status: completed
- Verify independently by listing newly inserted or existing source rows by URL and confirming source policies match the requested defaults.
- Completion notes:
  - Upserted 20 approved local test sources into `sources` by URL and matching rows into `source_policies`.
  - Used the actual Cloudflare Developer Platform changelog RSS URL listed by Cloudflare docs: `https://developers.cloudflare.com/changelog/rss/developer-platform.xml`.
  - Verified all new source rows are enabled and crawl-enabled with `metadata_only` save/rights policy and `none` translation policy.
  - Verified GitHub sources use `fetch_interval_minutes=360` and `max_requests_per_hour=2`; BLS JOLTS uses `risk_level=low`.
  - Post-import counts: `sources=25`, `raw_entries=5`, `source_ingest_attempts=0`.

## Task 3: Trigger Ingestion for Newly Added Sources
- Status: completed
- Verify independently by checking latest ingest attempt status per source and noting any excluded or disabled source.
- Completion notes:
  - Started local Compose worker and verified `http://localhost:3002/healthz`.
  - Triggered all 20 new sources through `POST /ingest/source/:id`, serially, with a 3 second wait after arXiv requests.
  - Fixed RSS redirect handling with TDD after Google AI and Google DeepMind failed on 301/302 redirects.
  - Re-ran failed RSS sources successfully after worker restart.
  - Latest status: 18 sources `success`; excluded and locally disabled `arXiv cs.SE` after repeated arXiv timeout/temporary failures and `CNCF Blog` after 403.
  - Post-ingest counts: `sources=25`, `raw_entries=1514`, `source_ingest_attempts=25`.

## Comprehensive Check After Task 3
- Status: completed
- Verify DB consistency, policy consistency, rate-limit compliance, and whether any adapter failures require TDD before continuing.
- Completion notes:
  - Verified all 20 imported sources have matching source policies.
  - Verified the two excluded candidates have `sources.enabled=false` and `source_policies.crawl_enabled=false`.
  - Verified GitHub requests completed serially and source policies keep GitHub at `fetch_interval_minutes=360`, `max_requests_per_hour=2`.
  - Verified RSS redirect defect is covered by `test_fetch_feed_follows_redirects`.
  - Verified narrow worker RSS test command: `uv run python -m unittest tests/test_rss_ingest.py`.

## Task 4: Verify Reader API and Local UI
- Status: completed
- Verify independently with reader API responses and browser checks for the requested board, digest, and search pages.
- Completion notes:
  - Started local API and Web services with Compose and verified `/healthz` on ports 3001 and 3000.
  - Verified API `/reader/items?board=ai`, `software-engineering`, `semiconductor`, `employment-trends`, and `open-source` return real source titles and article/release titles.
  - Verified API `/reader/search?q=Kubernetes` returns real Kubernetes release results.
  - Verified API `/reader/digest?limit=8` returns real source-backed digest items.
  - Browser plugin Node REPL tooling was unavailable in this session, so UI verification used the Playwright CLI fallback.
  - Verified Web pages `/boards/ai`, `/boards/software-engineering`, `/boards/semiconductor`, `/boards/employment-trends`, `/boards/open-source`, `/digest`, and `/search?q=Kubernetes`.
  - Noted non-blocking existing Web console noise: client requests to `/api/reader/personal-state` return 404 because no Web `/api` proxy route is present in the local dev surface.

## Task 5: Final Review and Rollback Record
- Status: completed
- Verify independently by performing the task quality review, documenting changed local data, and confirming no seed/production defaults were modified.
- Completion notes:
  - Re-read modified `rss_ingest.py`, `test_rss_ingest.py`, and this task record during review.
  - Verified worker test suite: `uv run python -m unittest discover -s tests` passed with 58 tests, 25 skipped.
  - Verified local DB board raw entry counts: `ai=920`, `software-engineering=430`, `semiconductor=16`, `employment-trends=23`, `open-source=125`.
  - Verified imported source enablement: 18 enabled, 2 disabled (`arXiv cs.SE`, `CNCF Blog`).
  - Verified no diff in `infra/db/seeds/dev.sql`, `infra/compose/compose.yml`, or `infra/compose/compose.production.yml`.
  - Code/test/initial goal files were committed in `a40b410` (`Test local real source ingest`); the final task-record update was committed separately after review.
  - Rollback is URL-scoped: delete dependent rows for the 20 imported URLs from `raw_entries`, `source_ingest_attempts`, `source_policies`, and `sources`, or keep data and leave poor sources disabled.
