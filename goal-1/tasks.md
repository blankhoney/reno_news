# Goal Tasks

## Task 1: Milestone 0 / Issue 001 Foundation

Status: Done

Scope:
- Create the monorepo skeleton.
- Create `apps/web`, `apps/api`, `services/worker`, `packages/contracts`, `packages/ui`, `packages/config`, and `infra/compose`.
- Add root `pnpm` workspace config.
- Add Python worker `uv` project config.
- Add Docker Compose and Caddy skeletons.
- Add basic health endpoints for web, API, and worker.
- Add CI skeleton for lint/test/build.
- Add top-level README.
- Add Milestone 0 technical, interface, and log documentation.

Verification:
- `pnpm install`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `uv run python -m unittest discover -s tests`
- `docker compose -f infra/compose/compose.yml up --build` health smoke, if dependency/image network is available.

Completion notes:
- Completed Milestone 0 / Issue 001 foundation on 2026-05-20.
- Verified local package install, lint, tests, build, worker tests, Docker Compose startup, direct health endpoints, and Caddy proxy health endpoints.

## Task 2: Milestone 0 Review And Closeout

Status: Done

Scope:
- Review Task 1 code, docs, tests, and container behavior against Issue 001 acceptance criteria.
- Update `docs/CODEX_MASTER_PLAN.md`.
- Commit completed Milestone 0 changes if code changed.

Verification:
- Prompt-to-artifact checklist covers every Issue 001 required task and acceptance criterion.
- No RSS, crawling, AI, search, or reader feature logic exists.

Completion notes:
- Completed Milestone 0 closeout on 2026-05-20.
- Close-read key code, test, Compose, Caddy, Docker, CI, and README files.
- Fixed review findings before final verification.
- Committed the completed foundation as `Initialize Milestone 0 foundation`.

## Task 3: Milestone 0 / Issue 002 SQL Migration Framework And Core Enums

Status: Done

Scope:
- Add a SQL-first migration runner.
- Add initial PostgreSQL schema needed for boards, development sources, and development raw entries.
- Add constrained status fields for lifecycle status, processing stage, rights status, and failure type.
- Add idempotent development seed data for five MVP boards, sample sources, and sample raw entries.
- Do not add Source Policy, RSS adapter behavior, crawling, AI, search, or reader/admin UI.

Verification:
- `pnpm --filter @reno-news/db test`
- `pnpm --filter @reno-news/db db:migrate`
- `pnpm --filter @reno-news/db db:seed`
- Re-run seed to prove idempotence.
- SQL assertions against the local Compose PostgreSQL database.

Completion notes:
- Completed Issue 002 on 2026-05-20.
- Added `packages/db` migration and seed tooling with SQL files as source of truth.
- Added initial SQL schema for boards, minimal development sources, and raw entries.
- Added constrained fields for lifecycle status, processing stage, rights status, and failure type.
- Added idempotent development seed data for five MVP boards, five sample sources, and five sample raw entries.
- Verified db lint, db unit test, db integration test, fresh migrate, repeated seed idempotence, count checks, constrained-field rejection, full repo install/lint/test/build, worker tests, Compose startup, and health smoke.

## Check-Debug Loop 1

Status: Done

Run after Tasks 1-3:
- Re-read `goal-1/input.md`, `goal-1/plan.md`, and `goal-1/tasks.md`.
- Audit docs, code, tests, and running behavior against the master plan.
- Repair gaps before continuing.

Completion notes:
- Completed after Tasks 1-3 on 2026-05-20.
- Re-read goal input, plan, and tasks after context compaction.
- Repaired stale goal plan context so it points to Milestone 1 / Issue 003.
- Verified master plan status, scope boundaries, forbidden dependency scan, service health, Caddy proxy health, lint, tests, build, worker tests, and DB integration test.
- Found no blocker to starting Issue 003.

## Task 4: Milestone 1 / Issue 003 Source Registry And Source Policy

Status: Done

Scope:
- Extend the SQL schema for source registry and source policy.
- Add source type, board association, crawl policy, rights policy, rate limit, save level, translation policy, and risk fields.
- Add basic API endpoints for listing, creating, and updating sources.
- Add validation for source policy.
- Add a worker-readable source policy path.
- Do not implement RSS fetching, scheduler ingest, full-text extraction, AI, search, reader UI, or non-RSS adapters.

Verification:
- `pnpm install --frozen-lockfile`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `pnpm --filter @reno-news/db test:integration`
- `uv run python -m unittest discover -s tests`
- `DATABASE_URL=postgres://reno_news:reno_news@localhost:5432/reno_news_issue003_test uv run python -m unittest tests/test_source_policy.py`
- Fresh Issue 003 test database migration from zero and repeated seed.
- Real local API smoke for `GET /sources`, `POST /sources`, and `PATCH /sources/:id`.
- Compose service health using existing images with `--no-build`.

Completion notes:
- Completed Issue 003 on 2026-05-20.
- Extended `sources` into the Source Registry and added `source_policies`.
- Added API list/create/update source endpoints with validation.
- Added DB Source Repository and Python worker Source Policy reader.
- Updated CONTEXT, ADR, API docs, DB docs, README, implementation log, and master plan.
- Docker image rebuild was blocked by local Docker credential/network behavior; Source API was verified via a real local API process against PostgreSQL, and Compose health was verified with existing images.

## Task 5: Milestone 1 / Issue 004 Minimal RSS Adapter Ingest Flow

Status: Done

Scope:
- Add RSS/Atom adapter interface and feed fetch/parse path.
- Normalize entry URL, compute canonical hash, and insert feed metadata into `raw_entries`.
- Avoid duplicate raw entries.
- Apply Source Policy before ingest and skip disabled sources.
- Record basic fetch/parse/policy failures.
- Add basic worker task and scheduler trigger.
- Do not add full-text extraction, AI processing, search, reader UI, admin UI, RSSHub, GitHub, arXiv, GDELT, or other non-RSS adapters.

Verification:
- `DATABASE_URL=postgres://reno_news:reno_news@localhost:5432/reno_news_issue004_test pnpm db:migrate`
- `DATABASE_URL=postgres://reno_news:reno_news@localhost:5432/reno_news_issue004_test pnpm db:seed`
- `DATABASE_URL=postgres://reno_news:reno_news@localhost:5432/reno_news_issue004_test uv run python -m unittest tests/test_rss_ingest.py tests/test_scheduler.py`
- `pnpm install --frozen-lockfile`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `pnpm --filter @reno-news/db test:integration`
- `uv run python -m unittest discover -s tests`

Completion notes:
- Completed Issue 004 on 2026-05-20.
- Added RSS/Atom metadata ingest in the Python worker using HTTPX and feedparser.
- Added `source_ingest_attempts` and basic success/skipped/failure recording.
- Added URL normalization, canonical hashing, duplicate avoidance, Source Policy gating, Dramatiq actor, and scheduler trigger.
- Verified deterministic feed ingest, duplicate prevention, disabled-source skip, fetch-failure recording, and scheduler enqueue filtering.
- Did not add full-text extraction, AI, search, reader UI, admin UI, RSSHub, GitHub, arXiv, GDELT, or other non-RSS adapters.

## Task 6: Milestone 1 / Issue 005 Admin Debug Views

Status: Done

Scope:
- Add admin/debug route shell.
- Add source list/detail and raw entry list/detail pages.
- Show source policy, lifecycle status, processing stage, and failure type.
- Add enable/disable source action.
- Add manual RSS ingest trigger.
- Add basic error display.
- Do not build the reader UI, full-text extraction, AI processing, search, or non-RSS adapters.

Verification:
- `pnpm install --frozen-lockfile`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `pnpm --filter @reno-news/db test:integration`
- `uv run python -m unittest discover -s tests`
- `DATABASE_URL=postgres://reno_news:reno_news@localhost:5432/reno_news_issue004_test pnpm db:migrate`
- `DATABASE_URL=postgres://reno_news:reno_news@localhost:5432/reno_news_issue004_test pnpm db:seed`
- `DATABASE_URL=postgres://reno_news:reno_news@localhost:5432/reno_news_issue004_test uv run python -m unittest tests/test_rss_ingest.py tests/test_scheduler.py`
- Local web/API/worker smoke for admin pages, source/raw entry API detail endpoints, worker health, and worker manual ingest endpoint.

Completion notes:
- Completed Issue 005 on 2026-05-20.
- Added admin/debug source list/detail and raw entry list/detail pages.
- Added source detail and raw entry read APIs.
- Added source enable/disable and manual RSS ingest Server Actions.
- Added worker manual ingest endpoint.
- Updated `CONTEXT.md`, API docs, README, implementation plan, implementation log, and master plan.
- Did not add reader UI, full-text extraction, AI processing, search, or non-RSS adapters.

## Check-Debug Loop 2

Status: Done

Run after Tasks 4-6:
- Re-read `goal-1/input.md`, `goal-1/plan.md`, and `goal-1/tasks.md`.
- Audit docs, code, tests, and running behavior against the master plan.
- Repair gaps before continuing.

Completion notes:
- Completed after Tasks 4-6 on 2026-05-20.
- Re-read goal input, plan, and tasks.
- Close-read Issue 005 API, DB, worker, web admin, and documentation changes.
- Fixed worker manual ingest URL parsing before closing the task.
- Verified full repo install, lint, tests, build, DB integration, worker discovery, RSS ingest tests, and local web/API/worker smoke.
- Found no blocker to starting Milestone 2 planning.

## Task 7: Milestone 2 / Issue 006 Planning And ADR

Status: Done

Scope:
- Research current Trafilatura and HTTPX docs for extraction/fetch APIs.
- Re-read local research and current domain docs for extraction boundaries.
- Define the first Milestone 2 issue without redesigning later milestones.
- Add extraction terminology to `CONTEXT.md`.
- Add an ADR for extraction result storage boundary.
- Add Issue 006 technical plan and implementation log.
- Update `docs/CODEX_MASTER_PLAN.md` so Issue 006 is the active issue.
- Do not implement extraction code in this planning task.

Verification:
- `docs/architecture/issue-006-plan.md` exists and maps Milestone 2 focus to concrete tasks and acceptance criteria.
- ADR 0010 records the extraction storage boundary.
- `CONTEXT.md` defines Extraction Attempt, Extraction Result, and Extraction Confidence.
- `docs/CODEX_MASTER_PLAN.md` points to Issue 006 and does not start AI, search, reader UI, browser automation, or non-RSS adapters.

Completion notes:
- Completed planning on 2026-05-20.
- Selected the smallest next vertical slice: extraction for one eligible raw entry.
- Deferred reader UI, AI, search, browser automation, and non-RSS adapters.

## Task 8: Milestone 2 / Issue 006 Full-Text Extraction Foundation

Status: Done

Scope:
- Add SQL migration for extraction attempts and results.
- Add worker repository path for raw entry extraction inputs.
- Add policy gate before article body fetch.
- Add HTTPX article fetch path.
- Add Trafilatura extraction path.
- Store extracted text and bounded extraction confidence.
- Record policy, network/status, and no-text extraction failures.
- Add deterministic fixture tests and worker trigger for one raw entry.

Verification:
- `pnpm install --frozen-lockfile`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `DATABASE_URL=postgres://reno_news:reno_news@localhost:5432/reno_news_issue004_test pnpm db:migrate`
- `DATABASE_URL=postgres://reno_news:reno_news@localhost:5432/reno_news_issue004_test pnpm db:seed`
- `DATABASE_URL=postgres://reno_news:reno_news@localhost:5432/reno_news_issue004_test pnpm --filter @reno-news/db test:integration`
- `uv run python -m unittest discover -s tests`
- `DATABASE_URL=postgres://reno_news:reno_news@localhost:5432/reno_news_issue004_test uv run python -m unittest tests/test_rss_ingest.py tests/test_scheduler.py tests/test_health.py tests/test_extraction.py`
- `uv lock --check`

Completion notes:
- Completed Issue 006 on 2026-05-20.
- Added extraction attempt/result tables.
- Added worker full-text extraction path using HTTPX and Trafilatura.
- Added strict policy gate before article body fetch.
- Added deterministic fixture tests for success, policy skip, network failure, and no-text parse failure.
- Added worker actor for one raw entry extraction.
- Did not add AI, search, reader UI, browser automation, fallback extractors, or non-RSS adapters.

## Future Tasks

Task 9 starts Milestone 3 planning. Do not code AI pipeline behavior until the first Milestone 3 issue is defined with scope, acceptance criteria, tests, and rollback notes.
