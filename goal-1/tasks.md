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

## Task 9: Milestone 3 / Issue 007 Planning And ADR

Status: Done

Scope:
- Research current OpenAI Responses API, Structured Outputs, and model guidance.
- Re-read local research and current domain docs for AI pipeline boundaries.
- Define the first Milestone 3 issue without implementing AI code.
- Add Model Call and Prefilter terminology to `CONTEXT.md`.
- Add an ADR for Responses API Structured Outputs.
- Add Issue 007 technical plan and implementation log.
- Update `docs/CODEX_MASTER_PLAN.md` so Issue 007 is the active issue.
- Do not implement AI pipeline code in this planning task.

Verification:
- `docs/architecture/issue-007-plan.md` exists and maps Milestone 3 focus to concrete tasks and acceptance criteria.
- ADR 0011 records the Responses API Structured Outputs boundary.
- `CONTEXT.md` defines Model Call and Prefilter.
- `docs/CODEX_MASTER_PLAN.md` points to Issue 007 and does not start search, reader UI, browser automation, or non-RSS adapters.

Completion notes:
- Completed planning on 2026-05-20.
- Selected the smallest next vertical slice: fake-adapter AI evaluation for one extracted item.
- Deferred reader UI, search, translation publishing, browser automation, multi-provider routing, and non-RSS adapters.

## Check-Debug Loop 3

Status: Done

Run after Tasks 7-9:
- Re-read `goal-1/input.md`, `goal-1/plan.md`, and `goal-1/tasks.md`.
- Audit docs, code, tests, and running behavior against the master plan.
- Repair gaps before continuing.

Completion notes:
- Completed after Tasks 7-9 on 2026-05-20.
- Re-read goal input, plan, and tasks.
- Close-read Issue 007 planning docs, ADR, domain terminology, and master plan updates.
- Verified Issue 007 is planning-only and does not start search, reader UI, browser automation, live API calls, or non-RSS adapters.
- Found no blocker to starting Issue 007 implementation with fake adapters first.

## Task 10: Milestone 3 / Issue 007 AI Evaluation Adapter Foundation

Status: Done

Scope:
- Add SQL migration for `model_calls` and `ai_evaluations`.
- Add versioned AI evaluation output schema.
- Add provider-neutral adapter interface and deterministic fake adapter.
- Add prefilter skip path.
- Add model-call logging for success, failure, and skipped evaluation.
- Store structured scores, rationale, evidence, and summary output.
- Add OpenAI adapter boundary without requiring live API tests.

Verification:
- `DATABASE_URL=postgres://reno_news:reno_news@localhost:5432/reno_news_issue004_test pnpm db:migrate`
- `DATABASE_URL=postgres://reno_news:reno_news@localhost:5432/reno_news_issue004_test pnpm db:seed`
- `DATABASE_URL=postgres://reno_news:reno_news@localhost:5432/reno_news_issue004_test pnpm --filter @reno-news/db test:integration`
- `DATABASE_URL=postgres://reno_news:reno_news@localhost:5432/reno_news_issue004_test uv run python -m unittest tests/test_ai_evaluation.py`
- `pnpm install --frozen-lockfile`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `uv run python -m unittest discover -s tests`
- `DATABASE_URL=postgres://reno_news:reno_news@localhost:5432/reno_news_issue004_test uv run python -m unittest tests/test_rss_ingest.py tests/test_scheduler.py tests/test_health.py tests/test_extraction.py tests/test_ai_evaluation.py`
- `uv lock --check`
- `docker compose -f infra/compose/compose.yml ps`
- Direct and Caddy-proxied health smoke for web, API, and worker.

Completion notes:
- Completed Issue 007 on 2026-05-20.
- Added `model_calls` and `ai_evaluations`.
- Added versioned AI evaluation schema, provider-neutral adapter contract, deterministic fake adapter, prefilter skip path, model-call logging, structured evaluation persistence, and injectable OpenAI Responses adapter boundary.
- Covered fake-adapter success, missing extraction skip, blocked-rights skip, adapter failure logging, and OpenAI boundary request/parse behavior.
- Did not add reader UI, search indexing, translation publishing, live OpenAI credentials, multi-provider routing, browser automation, or non-RSS adapters.

## Task 11: Milestone 3 / Issue 008 Planning And ADR

Status: Done

Scope:
- Research current OpenAI text generation, Structured Outputs, and latest-model guidance.
- Re-read local research and current domain docs for translation boundaries.
- Define the next Milestone 3 issue without implementing translation code.
- Add Translation Draft and Translation Segment terminology to `CONTEXT.md`.
- Add an ADR for translation draft/public publishing separation.
- Add Issue 008 technical plan and implementation log.
- Update `docs/CODEX_MASTER_PLAN.md` so Issue 008 is the active issue.
- Do not implement translation code in this planning task.

Verification:
- `docs/architecture/issue-008-plan.md` exists and maps Milestone 3 translation focus to concrete tasks and acceptance criteria.
- ADR 0012 records the translation draft/public publishing boundary.
- `CONTEXT.md` defines Translation Draft and Translation Segment.
- `docs/CODEX_MASTER_PLAN.md` points to Issue 008 and does not start search, reader UI, digest generation, public publishing, browser automation, or non-RSS adapters.

Completion notes:
- Completed planning on 2026-05-20.
- Selected the smallest next vertical slice: fake-adapter Chinese translation draft for one extracted item.
- Deferred reader UI, search, digest generation, public publishing, browser automation, multi-provider routing, and non-RSS adapters.

## Task 12: Milestone 3 / Issue 008 Chinese Translation Draft Foundation

Status: Done

Scope:
- Add SQL migration for `translations`.
- Add versioned translation output schema.
- Add provider-neutral translation adapter interface and deterministic fake adapter.
- Add translation policy and rights prefilter skip path.
- Add model-call logging for success, failure, and skipped translation.
- Store translated title/text, aligned segments, and quality flags.
- Add OpenAI adapter boundary without requiring live API tests.

Verification:
- `DATABASE_URL=postgres://reno_news:reno_news@localhost:5432/reno_news_issue004_test pnpm db:migrate`
- `DATABASE_URL=postgres://reno_news:reno_news@localhost:5432/reno_news_issue004_test pnpm db:seed`
- `DATABASE_URL=postgres://reno_news:reno_news@localhost:5432/reno_news_issue004_test pnpm --filter @reno-news/db test:integration`
- `DATABASE_URL=postgres://reno_news:reno_news@localhost:5432/reno_news_issue004_test uv run python -m unittest tests/test_translation.py`
- `pnpm install --frozen-lockfile`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `uv run python -m unittest discover -s tests`
- `DATABASE_URL=postgres://reno_news:reno_news@localhost:5432/reno_news_issue004_test uv run python -m unittest tests/test_rss_ingest.py tests/test_scheduler.py tests/test_health.py tests/test_extraction.py tests/test_ai_evaluation.py tests/test_translation.py`
- `uv lock --check`
- `docker compose -f infra/compose/compose.yml ps`
- Direct and Caddy-proxied health smoke for web, API, and worker.

Completion notes:
- Completed Issue 008 on 2026-05-20.
- Added `translations`.
- Added versioned translation output schema, provider-neutral adapter contract, deterministic fake adapter, translation policy and rights prefilter skip path, model-call logging, structured translation draft persistence, and injectable OpenAI Responses adapter boundary.
- Covered fake-adapter success, missing extraction skip, disabled translation policy skip, blocked-rights skip, adapter failure logging, and OpenAI boundary request/parse behavior.
- Did not add reader UI, search indexing, digest generation, public translation publishing, live OpenAI credentials, multi-provider routing, browser automation, or non-RSS adapters.

## Check-Debug Loop 4

Status: Done

Run after Tasks 10-12:
- Re-read `goal-1/input.md`, `goal-1/plan.md`, and `goal-1/tasks.md`.
- Audit docs, code, tests, and running behavior against the master plan.
- Repair gaps before continuing.

Completion notes:
- Completed after Tasks 10-12 on 2026-05-20.
- Re-read goal input, plan, and tasks.
- Close-read Issue 007 and Issue 008 schema, worker paths, tests, planning docs, ADRs, domain terminology, and master plan updates during each task review.
- Verified full repo install, lint, tests, build, DB migration/seed, DB integration, worker discovery, targeted worker integration tests, `uv lock --check`, Compose service status, and direct/Caddy health smoke.
- Ran a deferred-scope scan and found no added reader UI, search, digest generation, public publishing, browser automation, or non-RSS adapter implementation.
- Found no blocker to planning the next Milestone 3 issue.

## Task 13: Milestone 3 / Issue 009 Planning And ADR

Status: Done

Scope:
- Re-read Milestone 3 summary block research and current OpenAI guidance.
- Re-read local AI evaluation and translation boundaries.
- Define the next Milestone 3 issue without implementing summary code.
- Add Summary Block terminology to `CONTEXT.md`.
- Add an ADR for summary block/ranking/publishing separation.
- Add Issue 009 technical plan and implementation log.
- Update `docs/CODEX_MASTER_PLAN.md` so Issue 009 is the active issue.
- Do not implement summary code in this planning task.

Verification:
- `docs/architecture/issue-009-plan.md` exists and maps Milestone 3 summary block focus to concrete tasks and acceptance criteria.
- ADR 0013 records the summary block/ranking/publishing boundary.
- `CONTEXT.md` defines Summary Block.
- `docs/CODEX_MASTER_PLAN.md` points to Issue 009 and does not start search, reader UI, digest generation, public publishing, browser automation, or non-RSS adapters.

Completion notes:
- Completed planning on 2026-05-20.
- Selected the smallest next vertical slice: fake-adapter summary block draft for one evaluated item.
- Deferred reader UI, search, digest generation, public publishing, browser automation, multi-provider routing, and non-RSS adapters.

## Task 14: Milestone 3 / Issue 009 Summary Block Draft Foundation

Status: Done

Scope:
- Add SQL migration for `summary_blocks`.
- Add versioned summary block output schema.
- Add provider-neutral summary adapter interface and deterministic fake adapter.
- Add missing extraction and missing AI evaluation prefilter skip path.
- Add model-call logging for success, failure, and skipped summary generation.
- Store one-sentence summary, detailed summary, why-it-matters, source note, China relevance, and related topic hints.
- Add OpenAI adapter boundary without requiring live API tests.

Verification:
- `DATABASE_URL=postgres://reno_news:reno_news@localhost:5432/reno_news_issue004_test pnpm db:migrate`
- `DATABASE_URL=postgres://reno_news:reno_news@localhost:5432/reno_news_issue004_test pnpm db:seed`
- `DATABASE_URL=postgres://reno_news:reno_news@localhost:5432/reno_news_issue004_test pnpm --filter @reno-news/db test:integration`
- `DATABASE_URL=postgres://reno_news:reno_news@localhost:5432/reno_news_issue004_test uv run python -m unittest tests/test_summary_blocks.py`
- `pnpm install --frozen-lockfile`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `uv run python -m unittest discover -s tests`
- `DATABASE_URL=postgres://reno_news:reno_news@localhost:5432/reno_news_issue004_test uv run python -m unittest tests/test_rss_ingest.py tests/test_scheduler.py tests/test_health.py tests/test_extraction.py tests/test_ai_evaluation.py tests/test_translation.py tests/test_summary_blocks.py`
- `uv lock --check`
- `docker compose -f infra/compose/compose.yml ps`
- Direct and Caddy-proxied health smoke for web, API, and worker.

Completion notes:
- Completed Issue 009 on 2026-05-20.
- Added `summary_blocks`.
- Added versioned summary block output schema, provider-neutral adapter contract, deterministic fake adapter, missing-extraction and missing-evaluation prefilter skip path, model-call logging, structured summary block draft persistence, and injectable OpenAI Responses adapter boundary.
- Covered fake-adapter success, missing extraction skip, missing evaluation skip, adapter failure logging, and OpenAI boundary request/parse behavior.
- Did not add reader UI, search indexing, digest generation, public publishing, live OpenAI credentials, multi-provider routing, browser automation, or non-RSS adapters.

## Task 15: Milestone 4 / Issue 010 Planning And ADR

Status: Done

Scope:
- Research current Next.js App Router Server Component and Link guidance.
- Re-read local reader UI and domain docs.
- Define the first Milestone 4 issue without implementing reader UI code.
- Add Reader Item Card terminology to `CONTEXT.md`.
- Add an ADR for reader card projection boundaries.
- Add Issue 010 technical plan and implementation log.
- Update `docs/CODEX_MASTER_PLAN.md` so Issue 010 is the active issue.
- Do not implement reader UI code in this planning task.

Verification:
- `docs/architecture/issue-010-plan.md` exists and maps Milestone 4 home/board listing focus to concrete tasks and acceptance criteria.
- ADR 0014 records the reader card projection boundary.
- `CONTEXT.md` defines Reader Item Card.
- `docs/CODEX_MASTER_PLAN.md` points to Issue 010 and does not start article pages, search, digest generation, saved/read-later, public publishing workflow, browser automation, or non-RSS adapters.

Completion notes:
- Completed planning on 2026-05-20.
- Selected the smallest reader UI vertical slice: home and board listing over metadata/summary cards.
- Deferred article detail pages, Chinese/original switch, saved/read-later, search, digest generation, personalization, browser automation, public publishing workflow, and non-RSS adapters.

## Check-Debug Loop 5

Status: Done

Run after Tasks 13-15:
- Re-read `goal-1/input.md`, `goal-1/plan.md`, and `goal-1/tasks.md`.
- Audit docs, code, tests, and running behavior against the master plan.
- Repair gaps before continuing.

Completion notes:
- Completed after Tasks 13-15 on 2026-05-20.
- Re-read goal input, plan, and tasks.
- Verified Issue 009 completed Milestone 3 foundation and Issue 010 is planning-only.
- Ran a file-name scan and found no added reader, search, digest, browser automation, or non-RSS implementation files before Issue 010 implementation starts.
- Confirmed Issue 010 scope excludes article pages, saved/read-later, search, digest generation, public publishing workflow, browser automation, and non-RSS adapters.
- Found no blocker to starting Issue 010 implementation.

## Task 16: Milestone 4 / Issue 010 Reader Home And Board Listing Foundation

Status: Done

Scope:
- Add DB reader projection for boards and item cards.
- Add API endpoints for reader boards and reader item cards.
- Add web API client for reader data.
- Replace the placeholder home page with reader board navigation and latest item cards.
- Add `/boards/[slug]` reader board page.
- Add reader API documentation.

Verification:
- `DATABASE_URL=postgres://reno_news:reno_news@localhost:5432/reno_news_issue004_test pnpm --filter @reno-news/db test:integration`
- `pnpm --filter @reno-news/api test`
- `pnpm --filter @reno-news/web test`
- `pnpm install --frozen-lockfile`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `uv run python -m unittest discover -s tests`
- `DATABASE_URL=postgres://reno_news:reno_news@localhost:5432/reno_news_issue004_test pnpm db:migrate`
- `DATABASE_URL=postgres://reno_news:reno_news@localhost:5432/reno_news_issue004_test pnpm db:seed`
- `DATABASE_URL=postgres://reno_news:reno_news@localhost:5432/reno_news_issue004_test uv run python -m unittest tests/test_rss_ingest.py tests/test_scheduler.py tests/test_health.py tests/test_extraction.py tests/test_ai_evaluation.py tests/test_translation.py tests/test_summary_blocks.py`
- `uv lock --check`
- `docker compose -f infra/compose/compose.yml ps`
- Direct and Caddy-proxied health smoke for web, API, and worker.
- Local dev smoke on `http://localhost:3100/`, `http://localhost:3100/boards/ai`, `http://localhost:3101/reader/boards`, and `http://localhost:3101/reader/items?board=ai`.

Completion notes:
- Completed Issue 010 on 2026-05-20.
- Added DB reader projection for boards and item cards.
- Added API endpoints for reader boards and reader item cards.
- Added web reader API client, reader home page, and `/boards/[slug]` board page.
- Added reader API documentation and README endpoint notes.
- Did not add article pages, Chinese/original switch, search, digest generation, saved/read-later, personalization, public publishing workflow, browser automation, or non-RSS adapters.

## Task 17: Milestone 4 / Issue 011 Planning And ADR

Status: Done

Scope:
- Research current Next.js App Router dynamic route, `notFound()`, Server Component fetch, and Link guidance.
- Re-read local reader, rights, translation, and summary boundaries.
- Define the next Milestone 4 issue without implementing detail-page code.
- Add Reader Detail Projection and Language View terminology to `CONTEXT.md`.
- Add an ADR for rights-filtered detail language views.
- Add Issue 011 technical plan and implementation log.
- Update `docs/CODEX_MASTER_PLAN.md` so Issue 011 implementation is next.
- Do not implement detail-page code in this planning task.

Verification:
- `docs/architecture/issue-011-plan.md` exists and maps Milestone 4 detail/language-view focus to concrete tasks and acceptance criteria.
- ADR 0015 records the detail-page rights boundary.
- `CONTEXT.md` defines Reader Detail Projection and Language View.
- `docs/CODEX_MASTER_PLAN.md` points to Issue 011 implementation and does not start search, digest generation, saved/read-later, public publishing workflow, browser automation, or non-RSS adapters.

Completion notes:
- Completed planning on 2026-05-20.
- Selected the smallest next reader UI vertical slice: item detail page and safe Chinese/original language view over a rights-filtered projection.
- Deferred saved/read-later, search, digest generation, public publishing workflow, browser automation, and non-RSS adapters.

## Task 18: Milestone 4 / Issue 011 Reader Item Detail And Language View Foundation

Status: Done

Scope:
- Add DB reader detail projection for one item.
- Add API endpoint for reader item detail.
- Add web API client path for reader item detail.
- Link reader item cards to internal detail pages.
- Add `/items/[id]` reader detail page.
- Add query-string Chinese/original language switch without client-side state.
- Update reader API documentation.
- Do not expose translation draft full text.
- Do not add saved/read-later, search, digest generation, public publishing workflow, browser automation, or non-RSS adapters.

Verification:
- `DATABASE_URL=postgres://reno_news:reno_news@localhost:5432/reno_news_issue004_test pnpm --filter @reno-news/db test:integration`
- `pnpm --filter @reno-news/api test`
- `pnpm --filter @reno-news/web test`
- `pnpm install --frozen-lockfile`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `uv run python -m unittest discover -s tests`
- `DATABASE_URL=postgres://reno_news:reno_news@localhost:5432/reno_news_issue004_test pnpm db:migrate`
- `DATABASE_URL=postgres://reno_news:reno_news@localhost:5432/reno_news_issue004_test pnpm db:seed`
- `DATABASE_URL=postgres://reno_news:reno_news@localhost:5432/reno_news_issue004_test uv run python -m unittest tests/test_rss_ingest.py tests/test_scheduler.py tests/test_health.py tests/test_extraction.py tests/test_ai_evaluation.py tests/test_translation.py tests/test_summary_blocks.py`
- `uv lock --check`
- Direct/local smoke for reader detail API and `/items/[id]`.

Completion notes:
- Completed Issue 011 on 2026-05-20.
- Added DB reader detail projection, `GET /reader/items/:id`, web detail fetch, internal item links, `/items/[id]`, and query-string Chinese/original language switch.
- Covered full-text mode, excerpt mode, blocked item suppression, disabled-source suppression, translated title, related topics, missing-detail 404, no-store detail fetch, and language-view links.
- Verified full repo install, lint, tests, build, DB migration/seed, DB integration, worker discovery, targeted worker integration tests, `uv lock --check`, Compose service status, direct/Caddy health smoke, and local dev reader detail smoke.
- Did not expose translation draft full text.
- Did not add saved/read-later, search, digest generation, public publishing workflow, browser automation, or non-RSS adapters.

## Check-Debug Loop 6

Status: Done

Run after Tasks 16-18:
- Re-read `goal-1/input.md`, `goal-1/plan.md`, and `goal-1/tasks.md`.
- Audit docs, code, tests, and running behavior against the master plan.
- Repair gaps before continuing.

Completion notes:
- Completed after Tasks 16-18 on 2026-05-20.
- Re-read goal input, plan, and tasks.
- Confirmed Issue 010 and Issue 011 are complete, and `docs/CODEX_MASTER_PLAN.md` points to the next Milestone 4 planning step.
- Ran deferred-scope file scan and found no search, digest, saved/read-later, browser automation, or non-RSS adapter implementation files.
- Confirmed reader detail projection does not select translation draft full text or model payloads, and original extracted text remains rights-filtered.
- Reused Task 18 verification evidence for full repo install, lint, tests, build, DB migration/seed, DB integration, worker tests, Compose status, health smoke, and local reader detail smoke.
- Found no blocker to planning the next Milestone 4 issue.

## Task 19: Milestone 4 / Issue 012 Planning And ADR

Status: Done

Scope:
- Research current Next.js Client Component, `'use client'`, browser API, and serializable props guidance.
- Re-read local reader and personal-space domain docs.
- Define the next Milestone 4 issue without implementing saved/read-later code.
- Add Saved Item and Read Later Item terminology to `CONTEXT.md`.
- Add an ADR for local browser personal state.
- Add Issue 012 technical plan and implementation log.
- Update `docs/CODEX_MASTER_PLAN.md` so Issue 012 implementation is next.
- Do not implement saved/read-later code in this planning task.

Verification:
- `docs/architecture/issue-012-plan.md` exists and maps Milestone 4 saved/read-later focus to concrete tasks and acceptance criteria.
- ADR 0016 records the local browser-state boundary.
- `CONTEXT.md` defines Saved Item and Read Later Item.
- `docs/CODEX_MASTER_PLAN.md` points to Issue 012 implementation and does not start auth, backend personal-state APIs, ranking changes, search, digest generation, public publishing workflow, browser automation, or non-RSS adapters.

Completion notes:
- Completed planning on 2026-05-20.
- Selected the smallest next reader personal-space slice: local browser saved/read-later state with a small Client Component boundary.
- Deferred auth, backend personal-state APIs, cross-device sync, ranking changes, search, digest generation, public publishing workflow, browser automation, and non-RSS adapters.

## Task 20: Milestone 4 / Issue 012 Local Saved And Read Later Foundation

Status: Done

Scope:
- Add pure local personal-state helper tests.
- Implement local personal-state helpers.
- Add Client Component controls for save/read-later.
- Add controls to reader cards and detail pages.
- Add `/personal` page for local saved/read-later lists.
- Add local personal-state documentation.
- Do not add auth, backend personal-state APIs, ranking changes, search, digest generation, public publishing workflow, browser automation, or non-RSS adapters.

Verification:
- `pnpm --filter @reno-news/web test`
- `pnpm install --frozen-lockfile`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `uv run python -m unittest discover -s tests`
- Local browser/dev smoke for save/read-later persistence and `/personal`.

Completion notes:
- Completed Issue 012 on 2026-05-20.
- Added pure local personal-state helpers and tests, Client Component save/read-later controls, controls on card/detail surfaces, `/personal`, and local personal-state docs.
- Verified web state helpers for empty storage, saved/read-later toggles, independent removal, persistence, corrupted-state recovery, and snapshot stripping.
- Verified full repo install, lint, tests, build, worker discovery, `uv lock --check`, Compose service status, direct/Caddy health smoke, and headless Chrome localStorage persistence smoke.
- Did not add auth, backend personal-state APIs, ranking changes, search, digest generation, public publishing workflow, browser automation, or non-RSS adapters.

## Task 21: Milestone 5 / Issue 013 Planning And ADR

Status: Done

Scope:
- Research current Next.js Server Action form, `FormData`, `revalidatePath`, and `redirect` guidance.
- Re-read local admin and policy domain docs.
- Define the first Milestone 5 issue without implementing policy-edit code.
- Add Policy Change terminology to `CONTEXT.md`.
- Add an ADR for admin policy edits mutating the existing Source Policy.
- Add Issue 013 technical plan and implementation log.
- Update `docs/CODEX_MASTER_PLAN.md` so Issue 013 implementation is next.
- Do not implement source creation UI, policy history, auth/RBAC, failure queue, feedback handling, raw-entry hide/restore, search, digest generation, browser automation, or non-RSS adapters in this planning task.

Verification:
- `docs/architecture/issue-013-plan.md` exists and maps Milestone 5 policy-admin focus to concrete tasks and acceptance criteria.
- ADR 0017 records the current Source Policy mutation boundary.
- `CONTEXT.md` defines Policy Change.
- `docs/CODEX_MASTER_PLAN.md` points to Issue 013 implementation and does not start failure queue, feedback handling, raw-entry hide/restore, auth/RBAC, search, digest generation, browser automation, or non-RSS adapters.

Completion notes:
- Completed planning on 2026-05-20.
- Selected the smallest first Milestone 5 admin UI slice: editing the current Source Policy from the existing admin source detail page through the existing source update API.
- Deferred source creation UI, policy history, auth/RBAC, failure queue, feedback handling, raw-entry hide/restore, search, digest generation, browser automation, and non-RSS adapters.

## Check-Debug Loop 7

Status: Done

Run after Tasks 19-21:
- Re-read `goal-1/input.md`, `goal-1/plan.md`, and `goal-1/tasks.md`.
- Audit docs, code, tests, and running behavior against the master plan.
- Repair gaps before continuing.

Completion notes:
- Completed after Tasks 19-21 on 2026-05-20.
- Re-read goal input, plan, and tasks.
- Confirmed Issue 012 is complete and Issue 013 planning points to policy edit implementation.
- Ran deferred-scope scan and found no new source creation UI, policy history, auth/RBAC, failure queue, feedback handling, raw-entry hide/restore, search, digest generation, browser automation, or non-RSS adapter implementation.
- Verified full repo `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm test`, and `pnpm build`.
- Verified worker tests with `uv --project services/worker run python -m unittest discover -s services/worker/tests`; the bare root `uv run python -m unittest discover -s tests` invocation fails because the Python project and tests live under `services/worker`.
- Verified `uv lock --check` from `services/worker`, Compose service status, and direct plus Caddy-proxied health endpoints for web, API, and worker.
- Found no blocker to starting Issue 013 implementation.

## Task 22: Milestone 5 / Issue 013 Admin Source Policy Edit Foundation

Status: Done

Scope:
- Add web tests for policy form payload parsing.
- Add admin API helper for source policy updates.
- Add Server Action for policy form submission.
- Add policy edit form on `/admin/sources/[id]`.
- Update admin documentation, README, master plan, and log.
- Do not add source creation UI, policy history, auth/RBAC, failure queue, feedback handling, raw-entry hide/restore, search, digest generation, browser automation, or non-RSS adapters.

Verification:
- `pnpm --filter @reno-news/web test`
- `pnpm --filter @reno-news/web lint`
- `pnpm --filter @reno-news/web build`
- Full repo checks as needed for touched surfaces.

Completion notes:
- Completed Issue 013 on 2026-05-20.
- Added red tests for policy form parsing and nested source policy update payloads.
- Added constrained policy option exports, `sourcePolicyUpdateFromFormData`, and `updateSourcePolicy`.
- Added `updateSourcePolicyAction` with source detail revalidation and redirect.
- Added policy edit controls on `/admin/sources/[id]`.
- Updated README, Sources API docs, Issue 013 plan, implementation log, and master plan.
- Verified targeted web tests, web lint, web build, full repo install, lint, tests, build, worker discovery, `uv lock --check`, Compose service status, direct/Caddy health smoke, and local admin policy form smoke through Next Server Action.
- Did not add source creation UI, policy history, auth/RBAC, failure queue, feedback handling, raw-entry hide/restore, search, digest generation, browser automation, or non-RSS adapters.

## Task 23: Milestone 5 / Issue 014 Planning And ADR

Status: Done

Scope:
- Research current Fastify v5 route and JSON Schema guidance.
- Re-read local admin, attempt, and model-call domain docs.
- Define the next Milestone 5 issue without implementing failure queue code.
- Add Failure Queue terminology to `CONTEXT.md`.
- Add an ADR for failure queue using existing attempt and model-call logs.
- Add Issue 014 technical plan and implementation log.
- Update `docs/CODEX_MASTER_PLAN.md` so Issue 014 implementation is next.
- Do not implement retry, acknowledgement, resolution workflow, source creation UI, policy history, auth/RBAC, feedback handling, raw-entry hide/restore, search, digest generation, browser automation, or non-RSS adapters in this planning task.

Verification:
- `docs/architecture/issue-014-plan.md` exists and maps Milestone 5 failure queue focus to concrete tasks and acceptance criteria.
- ADR 0018 records the existing attempt/model-call log projection boundary.
- `CONTEXT.md` defines Failure Queue.
- `docs/CODEX_MASTER_PLAN.md` points to Issue 014 implementation and does not start retry, acknowledgement, resolution workflow, source creation UI, policy history, auth/RBAC, feedback handling, raw-entry hide/restore, search, digest generation, browser automation, or non-RSS adapters.

Completion notes:
- Completed planning on 2026-05-20.
- Selected the smallest next Milestone 5 admin UI slice: read-only recent failure inspection from existing source ingest attempts, extraction attempts, and model calls.
- Deferred retry, acknowledgement, resolution workflow, source creation UI, policy history, auth/RBAC, feedback handling, raw-entry hide/restore, search, digest generation, browser automation, and non-RSS adapters.

## Task 24: Milestone 5 / Issue 014 Admin Failure Queue Foundation

Status: Done

Scope:
- Add DB repository tests for failure queue projection.
- Implement failure queue repository.
- Add API tests for `GET /admin/failures`.
- Implement `GET /admin/failures`.
- Add web API client tests for failure queue loading.
- Add `/admin/failures` page and admin links.
- Update README, API docs, master plan, and log.
- Do not add retry, acknowledgement, resolution workflow, source creation UI, policy history, auth/RBAC, feedback handling, raw-entry hide/restore, search, digest generation, browser automation, or non-RSS adapters.

Verification:
- `pnpm --filter @reno-news/db test:integration`
- `pnpm --filter @reno-news/api test`
- `pnpm --filter @reno-news/web test`
- Full repo checks as needed for touched surfaces.

Completion notes:
- Completed Issue 014 on 2026-05-20.
- Added DB integration tests for normalizing source ingest, extraction, and model-call failures.
- Added `FailureQueueRepository` over existing attempt/model-call logs.
- Added `GET /admin/failures` with optional `limit` query validation.
- Added web failure queue client test, `/admin/failures`, and links from admin surfaces.
- Updated README, Admin Failures API docs, Issue 014 plan, implementation log, and master plan.
- Verified targeted DB integration, API, and web tests, full repo install, lint, tests, build, worker discovery, `uv lock --check`, Compose service status, direct/Caddy health smoke, and local failure queue API/page smoke.
- Did not add retry, acknowledgement, resolution workflow, new failure queue table, source creation UI, policy history, auth/RBAC, feedback handling, raw-entry hide/restore, search, digest generation, browser automation, or non-RSS adapters.
