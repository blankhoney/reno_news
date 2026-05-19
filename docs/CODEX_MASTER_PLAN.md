# Project Progress

This file tracks implementation progress for the MVP v0.1 execution blueprint.

- Source of truth: `docs/CODEX_MASTER_PLAN.md`
- Research reference: original deep research report
- Rule: do not expand scope beyond MVP v0.1 without explicit approval

---

## 0. Current Status

| Field | Value |
|---|---|
| Current Milestone | Milestone 6 |
| Current Issue | Issue 019 / reader-safe digest preview implementation |
| Overall Status | In Progress |
| Last Updated | 2026-05-20 |
| Updated By | Codex |
| Blockers | None |

---

## 1. Scope Freeze

MVP v0.1 is frozen.

### In Scope

| Area | Decision |
|---|---|
| Boards | AI, Software Engineering, Semiconductor, Employment Trends, Open Source |
| Initial Source Adapter | RSS/Atom only |
| Runtime Services | Caddy, web, api, worker, scheduler, PostgreSQL, Redis |
| Database | PostgreSQL + SQL migrations |
| Queue | Dramatiq + Redis |
| Fetch Path | official API/feed → httpx + trafilatura |
| AI | adapter abstraction first; real model integration later |
| Compliance | rights policy controls public display |

### Out of Scope for MVP v0.1

| Feature | Status |
|---|---|
| Meilisearch | Deferred |
| ArchiveBox full integration | Deferred |
| OpenSearch | Deferred |
| Mobile app | Deferred |
| Full event graph | Deferred |
| User custom sources | Deferred |
| User login-state connectors | Deferred |
| Paywall full-text crawling | Deferred |
| Complex recommendation algorithm | Deferred |
| Large-scale social/forum crawling | Deferred |

---

## 2. Milestone Overview

| Milestone | Name | Status | Notes |
|---|---|---|---|
| Milestone 0 | Repo, Dev Environment, CI/CD | Done | Issues 001-002 done |
| Milestone 1 | Source Registry + RSS Ingest | Done | Issues 003-005 done |
| Milestone 2 | Fetch & Extraction | Done | Issue 006 done |
| Milestone 3 | AI Pipeline | Done | Issues 007-009 done |
| Milestone 4 | Reader UI | Done | Issues 010-012 done |
| Milestone 5 | Admin UI | Done | Issues 013-015 done |
| Milestone 6 | Search, Feedback, Digest | In Progress | Issue 019 planned; implementation next |
| Milestone 7 | Backup, Monitoring, Release Audit | Not Started | production readiness |

Status values:

```text
Not Started
In Progress
Blocked
Review Needed
Done
Deferred
```

---

## 3. Issue Tracker

### Milestone 0: Repo, Dev Environment, CI/CD

#### Issue 001: Initialize monorepo and base development environment

| Field | Value |
|---|---|
| Status | Done |
| Owner | Codex |
| Started At | 2026-05-20 |
| Completed At | 2026-05-20 |
| PR / Commit | this commit |

Goal

Create the base monorepo, local development environment, Docker Compose skeleton, and initial CI.

Required Tasks

- [x] Create monorepo structure.
- [x] Create apps/web.
- [x] Create apps/api.
- [x] Create services/worker.
- [x] Create packages/contracts.
- [x] Create packages/ui.
- [x] Create packages/config.
- [x] Create infra/compose.
- [x] Add root package manager config.
- [x] Add Python worker dependency manager config.
- [x] Add Docker Compose skeleton.
- [x] Add Caddy placeholder config.
- [x] Add basic health endpoints for web/api/worker.
- [x] Add GitHub Actions skeleton for lint/test/build.
- [x] Add top-level README.

Acceptance Criteria

- [x] Local dev environment starts.
- [x] web, api, worker, postgres, and redis containers can start.
- [x] Health checks return success.
- [x] CI runs without external API keys.
- [x] No AI, crawling, search, or RSS logic added yet.

**Completion Note**

Implemented:
- `pnpm` workspace with `apps/web`, `apps/api`, `packages/contracts`, `packages/ui`, and `packages/config`.
- `uv` Python worker project under `services/worker`.
- Docker Compose skeleton for `caddy`, `web`, `api`, `worker`, `scheduler`, `postgres`, and `redis`.
- Basic `/healthz` endpoints for web, API, and worker.
- GitHub Actions CI skeleton and top-level README.

Validated:
- `pnpm install`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `uv run python -m unittest discover -s tests`
- `docker compose -f infra/compose/compose.yml up --build -d`
- Direct health checks on `localhost:3000`, `localhost:3001`, and `localhost:3002`.
- Caddy proxy health checks on `localhost:8080/api/healthz` and `localhost:8080/worker/healthz`.

Known limitations:
- Services expose infrastructure health only.
- Scheduler is a placeholder service using the worker image; real scheduled work starts in a later issue.
- No RSS, crawling, search, AI, reader UI, admin workflow, or migration logic was added.

Notes

Keep this issue infrastructure-only.
Do not add RSS adapter here.

#### Issue 002: Add SQL migration framework and core enums

| Field | Value |
|---|---|
| Status | Done |
| Owner | Codex |
| Started At | 2026-05-20 |
| Completed At | 2026-05-20 |
| PR / Commit | this commit |

Goal

Establish SQL-first database schema management and MVP core enums.

Required Tasks

- [x] Add migration tool.
- [x] Add initial database schema.
- [x] Add enum or constrained fields for lifecycle status.
- [x] Add enum or constrained fields for processing stage.
- [x] Add enum or constrained fields for rights status.
- [x] Add enum or constrained fields for failure type.
- [x] Add seed script.
- [x] Seed five MVP boards.
- [x] Seed sample sources.
- [x] Seed sample raw entries for development only.

Acceptance Criteria

- [x] Fresh database can be migrated from zero.
- [x] Seed data can be loaded repeatedly in dev.
- [x] Migrations are idempotent where appropriate.
- [x] No ORM-specific schema is treated as source of truth.
- [x] SQL migrations are the source of truth.

**Completion Note**

Implemented:
- `packages/db` migration and seed CLI using node-postgres.
- SQL migration files under `infra/db/migrations`.
- Idempotent development seed SQL under `infra/db/seeds`.
- Five MVP boards, five sample RSS sources, and five sample raw entries.
- Constrained text fields for lifecycle status, processing stage, rights status, and failure type.

Validated:
- `pnpm --filter @reno-news/db lint`
- `pnpm --filter @reno-news/db test`
- `pnpm --filter @reno-news/db test:integration`
- Fresh database migration from zero.
- Repeated development seed load without duplicate rows.
- SQL count checks for boards, sources, raw entries, and applied migrations.
- Invalid values rejected for all four constrained status fields.
- Full repo install, lint, test, build, worker test, Compose startup, and health smoke.

Known limitations:
- `sources` is only the minimal development source table needed for seed data; Source Policy and admin source management remain Issue 003.
- No RSS fetching, scheduler ingest, extraction, AI, search, reader UI, or admin UI was added.

Notes

Do not add Meilisearch.
Do not add ArchiveBox.
Do not add AI tables beyond placeholders unless required by migration structure.

### Milestone 1: Source Registry + RSS Ingest

#### Issue 003: Build Source Registry and Source Policy tables

| Field | Value |
|---|---|
| Status | Done |
| Owner | Codex |
| Started At | 2026-05-20 |
| Completed At | 2026-05-20 |
| PR / Commit | this commit |

Goal

Create the source registry and source policy foundation.

Required Tasks

- [x] Create sources table.
- [x] Create source_policies table.
- [x] Add source type field.
- [x] Add board association.
- [x] Add crawl policy fields.
- [x] Add rights policy fields.
- [x] Add rate-limit fields.
- [x] Add save-level fields.
- [x] Add translation policy fields.
- [x] Add risk-level fields.
- [x] Add basic API endpoints for listing sources.
- [x] Add basic API endpoints for creating/updating sources.
- [x] Add validation for source policy.

Acceptance Criteria

- [x] Admin can create a source.
- [x] Admin can view sources.
- [x] Admin can enable/disable a source.
- [x] Worker can read source policy.
- [x] Rights policy is stored separately from UI display logic.

**Completion Note**

Implemented:
- Extended the existing `sources` table into the Source Registry foundation.
- Added `source_policies` with crawl, rate-limit, save-level, rights, translation, and risk fields.
- Added Fastify source list/create/update routes with JSON Schema validation.
- Added Source Repository database functions and Python worker Source Policy reader.
- Updated API docs, DB docs, `CONTEXT.md`, ADR, README, and implementation log.

Validated:
- API route tests for list/create/update and validation failure.
- DB integration tests for migration, seed idempotence, Source Repository create/update, policy constraints, and worker-readable policy rows.
- Worker unit and PostgreSQL integration tests for Source Policy reading.
- Fresh Issue 003 test database migration from zero and repeated seed.
- Real local API process against PostgreSQL for `GET /sources`, `POST /sources`, and `PATCH /sources/:id`.
- Full repo install, lint, tests, build, worker tests, Compose service health, and Caddy proxy health.

Known limitations:
- RSS fetching is not implemented; it starts in Issue 004.
- Source admin/debug UI was not implemented in Issue 004; it was completed in Issue 005.
- Container image rebuild was blocked by local Docker credential/network behavior, so Source API container endpoint verification is not claimed.

Notes

Do not implement GitHub/arXiv/GDELT/RSSHub adapters yet.
RSS is the only adapter allowed in the next issue.

#### Issue 004: Implement minimal RSS adapter ingest flow

| Field | Value |
|---|---|
| Status | Done |
| Owner | Codex |
| Started At | 2026-05-20 |
| Completed At | 2026-05-20 |
| PR / Commit | this commit |

Goal

Implement the first real source adapter: RSS/Atom only.

Required Tasks

- [x] Add RSS adapter interface.
- [x] Fetch RSS/Atom feed.
- [x] Parse feed metadata.
- [x] Normalize entry URL.
- [x] Compute canonical hash.
- [x] Insert into raw_entries.
- [x] Avoid duplicate entries.
- [x] Apply source policy before ingest.
- [x] Mark lifecycle status.
- [x] Mark processing stage.
- [x] Record basic failure details.
- [x] Add basic worker task for RSS ingest.
- [x] Add basic scheduler trigger for RSS sources.

Acceptance Criteria

- [x] One RSS source can be ingested end-to-end.
- [x] Duplicate feed entries are not inserted twice.
- [x] Disabled source is not fetched.
- [x] Failed fetch produces a recorded failure.
- [x] No full-text extraction is implemented yet.
- [x] No AI processing is implemented yet.

**Completion Note**

Implemented:
- Python RSS/Atom ingest path using HTTPX and feedparser.
- URL normalization, canonical hash computation, and metadata-only `raw_entries` inserts.
- `source_ingest_attempts` for success, skipped, and failure outcomes.
- Source Policy gating before fetch.
- Dramatiq worker actor and scheduler trigger for enabled RSS/Atom sources.

Validated:
- RSS ingest tests with deterministic local feed XML.
- Duplicate feed entries are not inserted twice.
- Disabled source is skipped without fetch.
- Fetch failure records `failure_type = network`.
- Scheduler trigger enqueues only RSS/Atom source types.
- Fresh Issue 004 test database migrated through 3 migrations and seeded.
- Full repo install, lint, tests, build, DB integration, and worker tests.

Known limitations:
- No article full-text extraction, trafilatura, AI processing, search, reader UI, admin UI, or non-RSS adapter was added.
- Scheduler trigger is implemented as a callable/script and Dramatiq actor; Compose scheduler process was not changed in this issue.

Notes

Do not add RSSHub, GitHub, arXiv, or GDELT here.
Do not fetch article full text yet.

#### Issue 005: Add admin/debug views for sources and raw entries

| Field | Value |
|---|---|
| Status | Done |
| Owner | Codex |
| Started At | 2026-05-20 |
| Completed At | 2026-05-20 |
| PR / Commit | this commit |

Goal

Create basic admin/debug pages so the system can be operated without direct database access.

Required Tasks

- [x] Add admin route shell.
- [x] Add sources list page.
- [x] Add source detail page.
- [x] Add raw entries list page.
- [x] Add raw entry detail page.
- [x] Show source policy summary.
- [x] Show lifecycle status.
- [x] Show processing stage.
- [x] Show failure type.
- [x] Add enable/disable source action.
- [x] Add manual RSS ingest trigger.
- [x] Add basic error display.

Acceptance Criteria

- [x] Admin can inspect sources.
- [x] Admin can inspect raw entries.
- [x] Admin can manually trigger RSS ingest.
- [x] Admin can see failed RSS ingest attempts.
- [x] UI is functional, not polished.
- [x] No unrelated reader UI is added yet.

Notes

Keep this as an admin/debug UI.
Do not start the full reading experience yet.

**Completion Note**

Implemented:
- Fastify source detail and raw entry list/detail endpoints.
- DB Raw Entry Repository for read-only admin inspection.
- Worker `POST /ingest/source/:id` endpoint for manual RSS ingest.
- Next.js App Router admin/debug pages for source list/detail and raw entry list/detail.
- Server actions for source enable/disable and manual RSS ingest trigger.
- Basic admin error boundary.

Validated:
- API route tests for source detail, raw entry list/detail, and missing raw entries.
- Worker HTTP tests for health and manual ingest routing.
- Web tests for admin service URL construction.
- Local web/API/worker smoke for `/admin`, `/admin/sources/1`, `/admin/raw-entries`, `/admin/raw-entries/983`, API detail endpoints, worker health, and manual ingest endpoint.
- Full repo install, lint, tests, build, DB integration, worker discovery, and RSS ingest tests with PostgreSQL.

Known limitations:
- Admin/debug UI is intentionally unpolished and unauthenticated for local MVP operation.
- Failed ingest attempts are recorded in `source_ingest_attempts`; Issue 005 exposes failure status on raw entries but does not build a dedicated failure queue.
- Reader UI, full-text extraction, AI processing, search, and non-RSS adapters were not added.

### Milestone 2: Fetch & Extraction

#### Issue 006: Add full-text extraction foundation

| Field | Value |
|---|---|
| Status | Done |
| Owner | Codex |
| Started At | 2026-05-20 |
| Completed At | 2026-05-20 |
| PR / Commit | this commit |

Goal

Fetch and extract readable text for one eligible raw entry, store extraction output separately from raw feed metadata, and record extraction failures.

Required Tasks

- [x] Research current Trafilatura and HTTPX extraction/fetch APIs.
- [x] Add extraction terminology to `CONTEXT.md`.
- [x] Add ADR for extraction result storage boundary.
- [x] Add Issue 006 technical plan.
- [x] Add SQL migration for extraction attempts and results.
- [x] Add worker repository path for raw entry extraction inputs.
- [x] Add policy gate before article body fetch.
- [x] Add HTTPX article fetch path.
- [x] Add Trafilatura extraction path.
- [x] Store extracted text and extraction confidence.
- [x] Record policy, network/status, and no-text extraction failures.
- [x] Add deterministic fixture tests.
- [x] Add worker trigger for one raw entry.

Acceptance Criteria

- [x] One eligible raw entry can be fetched, extracted, and stored in tests without external network.
- [x] Metadata-only sources are skipped before article body fetch.
- [x] HTTP/status failures are recorded.
- [x] Empty or unusable extraction output is recorded as an extraction failure.
- [x] Extraction confidence is stored as a bounded numeric value.
- [x] No AI, search, reader UI, browser automation, or non-RSS adapter is added.

Notes

Keep extraction output private and separate from publication.
Do not create reader-facing content pages in this issue.
Do not add Playwright/Crawl4AI or commercial fetch fallbacks in this issue.

**Completion Note**

Implemented:
- SQL migration for `raw_entry_extraction_attempts` and `raw_entry_extractions`.
- Python worker extraction path using HTTPX for article fetch and Trafilatura for text extraction.
- Policy gate requiring `save_level = 'full_text'` and rights policy allowing private or public full-text storage.
- Extraction attempt recording for policy skip, network/status failure, no-text parse failure, and success.
- Extraction result storage with extractor identity, final URL, optional metadata, text length, and bounded confidence.
- Dramatiq actor for one raw entry extraction.

Validated:
- Migration and seed integration tests include extraction table existence and constraints.
- Worker fixture tests cover successful extraction, metadata-only policy skip, fetch failure, and no-text parse failure.
- Full repo install, lint, tests, build, DB integration, worker discovery, RSS tests, extraction tests, and `uv lock --check`.

Known limitations:
- Extraction results are private worker output and are not exposed through reader UI or search.
- No browser automation, fallback extractor, AI processing, or non-RSS adapter was added.

### Milestone 3: AI Pipeline

#### Issue 007: Add AI evaluation adapter foundation

| Field | Value |
|---|---|
| Status | Done |
| Owner | Codex |
| Started At | 2026-05-20 |
| Completed At | 2026-05-20 |
| PR / Commit | this commit |

Goal

Evaluate one extracted item through a provider-neutral adapter, store the model call, and store structured AI evaluation output.

Required Tasks

- [x] Research current OpenAI Responses API and Structured Outputs guidance.
- [x] Add Model Call and Prefilter terminology to `CONTEXT.md`.
- [x] Add ADR for Responses API Structured Outputs.
- [x] Add Issue 007 technical plan.
- [x] Add SQL migration for `model_calls` and `ai_evaluations`.
- [x] Add versioned AI evaluation output schema.
- [x] Add provider-neutral adapter interface.
- [x] Add deterministic fake adapter for tests.
- [x] Add prefilter skip path.
- [x] Add model-call logging for success, failure, and skipped evaluation.
- [x] Store structured scores, rationale, evidence, and summary output.
- [x] Add OpenAI adapter boundary without requiring live API tests.

Acceptance Criteria

- [x] One extracted item can be evaluated through a fake adapter and stored without network access.
- [x] Every attempted evaluation creates a model-call record.
- [x] Structured evaluation output includes scores, rationale, evidence, and summary fields.
- [x] Prefilter can skip missing or policy-blocked text without calling the adapter.
- [x] Provider/model/schema version are durable.
- [x] No reader UI, search, translation publishing, browser automation, or non-RSS adapter is added.

Notes

Use fake adapters for tests.
Do not require `OPENAI_API_KEY` for local verification.
Do not add reader-facing summaries or translations in this issue.

**Implementation Note**

Implemented:
- `model_calls` and `ai_evaluations` SQL migration.
- Versioned AI evaluation schema and provider-neutral adapter result contract.
- Worker prefilter for missing extraction text or blocked rights.
- Model-call logging for success, skipped, and failure outcomes.
- Structured persistence for scores, rationale, evidence, and summary output.
- Injectable OpenAI Responses adapter boundary using Structured Outputs, without live API tests.

Validated:
- Migration and seed integration tests include AI table existence and model-call status constraints.
- Worker tests cover fake-adapter success, prefilter skip, adapter failure logging, and OpenAI boundary request/parse behavior.
- Full repo install, lint, tests, build, DB migration/seed, DB integration, worker discovery, targeted worker integration tests, Compose service status, health smoke, and `uv lock --check`.

Known limitations:
- No reader UI, search indexing, translation publishing, live OpenAI credentials, multi-provider routing, browser automation, or non-RSS adapter was added.

#### Issue 008: Add Chinese translation draft foundation

| Field | Value |
|---|---|
| Status | Done |
| Owner | Codex |
| Started At | 2026-05-20 |
| Completed At | 2026-05-20 |
| PR / Commit | this commit |

Goal

Translate one extracted, eligible item into a structured Chinese draft while recording the model call and keeping public publishing out of scope.

Required Tasks

- [x] Research current OpenAI text generation, Structured Outputs, and latest-model guidance.
- [x] Add Translation Draft and Translation Segment terminology to `CONTEXT.md`.
- [x] Add ADR for translation draft/public publishing separation.
- [x] Add Issue 008 technical plan.
- [x] Add SQL migration for `translations`.
- [x] Add versioned translation output schema.
- [x] Add provider-neutral translation adapter interface.
- [x] Add deterministic fake adapter for tests.
- [x] Add translation policy and rights prefilter skip path.
- [x] Add model-call logging for success, failure, and skipped translation.
- [x] Store translated title/text, aligned segments, and quality flags.
- [x] Add OpenAI adapter boundary without requiring live API tests.

Acceptance Criteria

- [x] One eligible extracted item can be translated through a fake adapter and stored without network access.
- [x] Every attempted translation creates a model-call record.
- [x] Translation output includes target language, title/text, aligned segments, and quality flags.
- [x] Prefilter skips missing extraction text, `translation_policy = 'none'`, and blocked rights without calling the adapter.
- [x] No reader UI, search, digest generation, public publishing, browser automation, or non-RSS adapter is added.

Notes

Use fake adapters for tests.
Do not require `OPENAI_API_KEY` for local verification.
Do not expose translations to readers or search in this issue.

**Implementation Note**

Implemented:
- `translations` SQL migration.
- Versioned translation output schema and provider-neutral adapter result contract.
- Worker prefilter for missing extraction text, disabled translation policy, and blocked rights.
- Model-call logging for success, skipped, and failure outcomes.
- Structured persistence for translated title/text, aligned segments, and quality flags.
- Injectable OpenAI Responses adapter boundary using Structured Outputs, without live API tests.

Validated:
- Migration and seed integration tests include translation table existence and target-language/status constraints.
- Worker tests cover fake-adapter success, missing extraction skip, disabled translation policy skip, blocked-rights skip, adapter failure logging, and OpenAI boundary request/parse behavior.
- Full repo install, lint, tests, build, DB migration/seed, DB integration, worker discovery, targeted worker integration tests, Compose service status, health smoke, and `uv lock --check`.

Known limitations:
- No reader UI, search indexing, digest generation, public translation publishing, live OpenAI credentials, multi-provider routing, browser automation, or non-RSS adapter was added.

#### Issue 009: Add summary block draft foundation

| Field | Value |
|---|---|
| Status | Done |
| Owner | Codex |
| Started At | 2026-05-20 |
| Completed At | 2026-05-20 |
| PR / Commit | this commit |

Goal

Generate structured summary blocks for one evaluated item while keeping ranking, publishing, digest generation, and reader UI out of scope.

Required Tasks

- [x] Re-read Milestone 3 summary block research and current OpenAI guidance.
- [x] Add Summary Block terminology to `CONTEXT.md`.
- [x] Add ADR for summary block/ranking/publishing separation.
- [x] Add Issue 009 technical plan.
- [x] Add SQL migration for `summary_blocks`.
- [x] Add versioned summary block output schema.
- [x] Add provider-neutral summary adapter interface.
- [x] Add deterministic fake adapter for tests.
- [x] Add missing extraction and missing AI evaluation prefilter skip path.
- [x] Add model-call logging for success, failure, and skipped summary generation.
- [x] Store one-sentence summary, detailed summary, why-it-matters, source note, China relevance, and related topic hints.
- [x] Add OpenAI adapter boundary without requiring live API tests.

Acceptance Criteria

- [x] One evaluated item can produce summary blocks through a fake adapter and be stored without network access.
- [x] Every attempted summary generation creates a model-call record.
- [x] Summary output includes one-sentence summary, detailed summary, why-it-matters, source note, China relevance, and related topic hints.
- [x] Prefilter skips missing extraction or missing AI evaluation without calling the adapter.
- [x] No reader UI, search, digest generation, public publishing, browser automation, or non-RSS adapter is added.

Notes

Use fake adapters for tests.
Do not require `OPENAI_API_KEY` for local verification.
Do not expose summary blocks to readers, search, or digests in this issue.

**Implementation Note**

Implemented:
- `summary_blocks` SQL migration.
- Versioned summary block output schema and provider-neutral adapter result contract.
- Worker prefilter for missing extraction text and missing AI evaluation.
- Model-call logging for success, skipped, and failure outcomes.
- Structured persistence for one-sentence summary, detailed summary, why-it-matters, source note, China relevance, and related topic hints.
- Injectable OpenAI Responses adapter boundary using Structured Outputs, without live API tests.

Validated:
- Migration and seed integration tests include summary block table existence and status constraint.
- Worker tests cover fake-adapter success, missing extraction skip, missing evaluation skip, adapter failure logging, and OpenAI boundary request/parse behavior.
- Full repo install, lint, tests, build, DB migration/seed, DB integration, worker discovery, targeted worker integration tests, Compose service status, health smoke, and `uv lock --check`.

Known limitations:
- No reader UI, search indexing, digest generation, public publishing, live OpenAI credentials, multi-provider routing, browser automation, or non-RSS adapter was added.

### Milestone 4: Reader UI

#### Issue 010: Add reader home and board listing foundation

| Field | Value |
|---|---|
| Status | Done |
| Owner | Codex |
| Started At | 2026-05-20 |
| Completed At | 2026-05-20 |
| PR / Commit | this commit |

Goal

Start the reader UI with a home page and board listing page backed by a policy-filtered metadata/summary projection.

Required Tasks

- [x] Research current Next.js App Router Server Component and Link guidance.
- [x] Add Reader Item Card terminology to `CONTEXT.md`.
- [x] Add ADR for reader card projection boundaries.
- [x] Add Issue 010 technical plan.
- [x] Add DB reader projection for boards and item cards.
- [x] Add API endpoints for reader boards and reader item cards.
- [x] Add web API client for reader data.
- [x] Replace the placeholder home page with reader board navigation and latest item cards.
- [x] Add `/boards/[slug]` reader board page.
- [x] Add reader API documentation.

Acceptance Criteria

- [x] Home page shows the five MVP boards.
- [x] Home page can render latest reader item cards or a clear empty state.
- [x] Board page filters cards by board slug and handles unknown boards according to the API contract.
- [x] Reader cards never include extracted full text, translated full text, private model payloads, or admin-only diagnostics.
- [x] New reader API endpoints are documented.
- [x] No article page, search, digest generation, saved/read-later, personalization, browser automation, public publishing workflow, or non-RSS adapter is added.

Notes

Use Server Components and `next/link`.
Do not add client-side state unless the page needs it.
Do not implement article detail pages in this issue.

**Implementation Note**

Implemented:
- DB reader projection for boards and metadata/summary item cards.
- API endpoints `GET /reader/boards` and `GET /reader/items`.
- Web reader API client with no-store fetches.
- Reader home page with board navigation and latest cards.
- Reader board page at `/boards/[slug]`.
- Reader API documentation and README endpoint notes.

Validated:
- DB integration covers board listing, board filtering, summary fallback, and absence of full text fields.
- API tests cover reader boards and board-filtered item cards.
- Web tests cover reader API client fetch behavior.
- Full repo install, lint, tests, build, DB migration/seed, DB integration, worker discovery, targeted worker integration tests, Compose service status, health smoke, and `uv lock --check`.
- Local dev smoke on `http://localhost:3100/`, `http://localhost:3100/boards/ai`, and reader API endpoints on `http://localhost:3101`.

Known limitations:
- No article page, Chinese/original switch, search, digest generation, saved/read-later, personalization, public publishing workflow, browser automation, or non-RSS adapter was added.

#### Issue 011: Add reader item detail and language view foundation

| Field | Value |
|---|---|
| Status | Done |
| Owner | Codex |
| Started At | 2026-05-20 |
| Completed At | 2026-05-20 |
| PR / Commit | this commit |

Goal

Add a reader-facing item detail page and safe Chinese/original language view switch.

Required Tasks

- [x] Research current Next.js App Router dynamic route, `notFound()`, Server Component fetch, and Link guidance.
- [x] Add Reader Detail Projection and Language View terminology to `CONTEXT.md`.
- [x] Add ADR for rights-filtered detail language views.
- [x] Add Issue 011 technical plan.
- [x] Add DB reader detail projection for one item.
- [x] Add API endpoint for reader item detail.
- [x] Add web API client path for reader item detail.
- [x] Link reader item cards to internal detail pages.
- [x] Add `/items/[id]` reader detail page.
- [x] Add query-string Chinese/original language switch without client-side state.
- [x] Update reader API documentation.

Acceptance Criteria

- [x] Reader item cards link to internal detail pages.
- [x] Detail page renders for a policy-eligible item.
- [x] Unknown, blocked, or disabled-source items do not render as reader details.
- [x] Chinese/original switch works without client-side state.
- [x] Extracted full text is only exposed for `public_fulltext_allowed`.
- [x] Extracted excerpts are bounded and only exposed for `public_excerpt_allowed`.
- [x] Translation draft full text is not exposed.
- [x] New reader detail API is documented.
- [x] No search, digest generation, saved/read-later, personalization, public publishing workflow, browser automation, or non-RSS adapter is added.

Notes

Use Server Components, awaited dynamic route params, `notFound()`, and `next/link`.
Do not turn translation drafts into public reader copy in this issue.
Do not implement saved/read-later in this issue.

**Implementation Note**

Implemented:
- DB reader detail projection for one item.
- API endpoint `GET /reader/items/:id`.
- Web reader API client detail fetch and item route helper.
- Internal item links from reader cards.
- Reader detail page at `/items/[id]`.
- Query-string Chinese/original language switch without client-side state.
- Reader API documentation and README endpoint notes.

Validated:
- DB integration covers full-text mode, excerpt mode, blocked item suppression, disabled-source suppression, related topics, translated title, and no translated body exposure.
- API tests cover reader detail success and missing-detail 404.
- Web tests cover detail fetch and language-view item links.
- Full repo install, lint, tests, build, DB migration/seed, DB integration, worker discovery, targeted worker integration tests, Compose service status, direct/Caddy health smoke, and `uv lock --check`.
- Local dev smoke on `http://localhost:3100/items/:id?view=zh`, `http://localhost:3100/items/:id?view=original`, `http://localhost:3101/reader/items/:id`, and internal links from `http://localhost:3100/`.

Known limitations:
- No saved/read-later, search, digest generation, personalization, public publishing workflow, browser automation, or non-RSS adapter was added.
- Translation draft full text remains non-public reader content.

#### Issue 012: Add local saved and read-later foundation

| Field | Value |
|---|---|
| Status | Done |
| Owner | Codex |
| Started At | 2026-05-20 |
| Completed At | 2026-05-20 |
| PR / Commit | this commit |

Goal

Add local saved and read-later behavior for the reader personal space without introducing auth or backend personal-state APIs.

Required Tasks

- [x] Research current Next.js Client Component, `'use client'`, browser API, and serializable props guidance.
- [x] Add Saved Item and Read Later Item terminology to `CONTEXT.md`.
- [x] Add ADR for local browser personal state.
- [x] Add Issue 012 technical plan.
- [x] Add pure local personal-state helper tests.
- [x] Implement local personal-state helpers.
- [x] Add Client Component controls for save/read-later.
- [x] Add controls to reader cards and detail pages.
- [x] Add `/personal` page for local saved/read-later lists.
- [x] Add local personal-state documentation.

Acceptance Criteria

- [x] Reader can save and unsave an item from card and detail surfaces.
- [x] Reader can add/remove read-later from card and detail surfaces.
- [x] Saved/read-later state persists across reloads in the same browser.
- [x] `/personal` shows saved and read-later lists from local state.
- [x] Corrupted local state recovers to an empty state.
- [x] Server Components pass only serializable item snapshots to Client Components.
- [x] No auth, backend personal-state API, ranking change, search, digest generation, public publishing workflow, browser automation, or non-RSS adapter is added.

Notes

Use a small Client Component boundary for browser state.
Do not add reader accounts or database-backed personal state in this issue.

**Implementation Note**

Implemented:
- Pure local personal-state helpers and tests.
- Client Component save/read-later controls.
- Controls on reader cards, board lists, and item detail pages.
- `/personal` local saved/read-later page.
- Local personal-state documentation and README endpoint notes.

Validated:
- Web tests cover empty storage, saved toggle, read-later toggle, independent removal, persistence, corrupted-state recovery, and snapshot stripping.
- Web lint and build cover the Client Component boundary and `/personal` route.
- Full repo install, lint, tests, build, worker discovery, `uv lock --check`, Compose service status, and direct/Caddy health smoke.
- Headless Chrome smoke verified Save and Read later clicks write localStorage, `/personal` renders both lists, and state persists after reload.

Known limitations:
- Saved/read-later is local to one browser.
- No auth, backend personal-state API, ranking change, search, digest generation, public publishing workflow, browser automation, or non-RSS adapter was added.

### Milestone 5: Admin UI

#### Issue 013: Add admin source policy edit foundation

| Field | Value |
|---|---|
| Status | Done |
| Owner | Codex |
| Started At | 2026-05-20 |
| Completed At | 2026-05-20 |
| PR / Commit | this commit |

Goal

Let an Admin edit the current Source Policy from the existing admin source detail page without adding policy history, auth/RBAC, or a separate CMS workflow.

Required Tasks

- [x] Research current Next.js Server Action form, `FormData`, `revalidatePath`, and `redirect` guidance.
- [x] Add Policy Change terminology to `CONTEXT.md`.
- [x] Add ADR for admin policy edits mutating the existing Source Policy.
- [x] Add Issue 013 technical plan.
- [x] Add web tests for policy form payload parsing.
- [x] Add admin API helper for source policy update.
- [x] Add Server Action for policy form submission.
- [x] Add policy edit form on `/admin/sources/[id]`.
- [x] Update admin documentation, README, master plan, and log.

Acceptance Criteria

- [x] Admin can edit crawl enabled state from the source detail page.
- [x] Admin can edit positive numeric fetch interval and rate-limit values.
- [x] Admin can edit save level, rights policy, translation policy, and risk level from constrained options.
- [x] Submitted values reach `PATCH /sources/:id` as a nested `policy` payload.
- [x] The admin source detail page is revalidated and shown again after mutation.
- [x] Existing enable/disable and manual ingest actions still work.
- [x] No source creation UI, policy history table, auth/RBAC, failure queue, feedback handling, raw-entry hide/restore, search, digest generation, browser automation, or non-RSS adapter is added.

Notes

Use the existing source update API and current source policy row for this issue.
Do not add policy version history until approval or audit requirements exist.

**Implementation Note**

Implemented:
- Web tests for policy form payload parsing and nested source API payload.
- Constrained policy option exports and `updateSourcePolicy`.
- `updateSourcePolicyAction` with source detail revalidation and redirect.
- Policy edit form on `/admin/sources/[id]`.
- README and Sources API documentation updates.

Validated:
- Red test first failed for missing policy form parsing and source policy update helper.
- Web tests cover policy form payload parsing, non-positive numeric rejection, and nested `PATCH /sources/:id` policy payload.
- Targeted web test, lint, and build passed.
- Full repo install, lint, tests, build, worker discovery, `uv lock --check`, Compose service status, and direct/Caddy health smoke passed.
- Local dev smoke submitted the admin policy form through Next Server Action, verified `PATCH /sources/:id` changed the Source Policy, and restored the original policy.

Known limitations:
- Policy edits mutate the current Source Policy only.
- No source creation UI, policy history table, auth/RBAC, failure queue, feedback handling, raw-entry hide/restore, search, digest generation, browser automation, or non-RSS adapter was added.

#### Issue 014: Add admin failure queue foundation

| Field | Value |
|---|---|
| Status | Done |
| Owner | Codex |
| Started At | 2026-05-20 |
| Completed At | 2026-05-20 |
| PR / Commit | this commit |

Goal

Let an Admin inspect recent source ingest, extraction, and model-processing failures from one read-only admin page.

Required Tasks

- [x] Research current Fastify v5 route and JSON Schema guidance.
- [x] Add Failure Queue terminology to `CONTEXT.md`.
- [x] Add ADR for failure queue using existing attempt logs.
- [x] Add Issue 014 technical plan.
- [x] Add DB repository tests for failure queue projection.
- [x] Implement failure queue repository.
- [x] Add API tests for `GET /admin/failures`.
- [x] Implement `GET /admin/failures`.
- [x] Add web API client tests for failure queue loading.
- [x] Add `/admin/failures` page and admin links.
- [x] Update README, API docs, master plan, and log.

Acceptance Criteria

- [x] Admin can view recent source ingest failures.
- [x] Admin can view recent extraction failures.
- [x] Admin can view recent failed model calls.
- [x] Failure rows are ordered newest first.
- [x] Failure rows include enough source or raw-entry context for inspection when that context exists.
- [x] The endpoint uses Fastify v5 full JSON Schema for any query validation.
- [x] No retry, acknowledgement, resolution workflow, new failure queue table, source creation UI, policy history, auth/RBAC, feedback handling, raw-entry hide/restore, search, digest generation, browser automation, or non-RSS adapter is added.

Notes

Use existing attempt/model-call records as a read-only projection.
Do not add retry or resolution workflow in this issue.

**Implementation Note**

Implemented:
- DB integration test coverage for source ingest, extraction, and model-call failure normalization.
- Failure queue repository projection over existing attempt/model-call logs.
- `GET /admin/failures` with optional `limit` query validation.
- Web failure queue client test, `/admin/failures`, and links from admin source/raw-entry surfaces.
- README and API documentation updates.

Validated:
- Red DB test first failed for missing `failureQueueRepository`.
- Red API test first failed with `GET /admin/failures` returning 404.
- Red web test first failed for missing `getFailures`.
- Targeted DB integration, API, and web tests passed.
- Full repo install, lint, tests, build, worker discovery, `uv lock --check`, Compose service status, and direct/Caddy health smoke passed.
- Local dev smoke verified `GET /admin/failures` and `/admin/failures` page rendering.

Known limitations:
- Failure queue is read-only.
- No retry, acknowledgement, resolution workflow, new failure queue table, source creation UI, policy history, auth/RBAC, feedback handling, raw-entry hide/restore, search, digest generation, browser automation, or non-RSS adapter was added.

#### Issue 015: Add admin raw entry manual hide restore foundation

| Field | Value |
|---|---|
| Status | Done |
| Owner | Codex |
| Started At | 2026-05-20 |
| Completed At | 2026-05-20 |
| PR / Commit | this commit |

Goal

Let an Admin hide one raw entry from reader-facing surfaces and restore a hidden raw entry from the existing admin raw-entry detail page.

Required Tasks

- [x] Research current Next.js Server Action form, `FormData`, `revalidatePath`, and `redirect` guidance.
- [x] Research current Fastify v5 route and JSON Schema guidance.
- [x] Add Manual Moderation Action terminology to `CONTEXT.md`.
- [x] Add ADR for manual hide/restore using current raw-entry lifecycle state.
- [x] Add Issue 015 technical plan and implementation log.
- [x] Add DB integration tests for hide, restore, missing raw entry, and reader hidden filtering.
- [x] Implement raw-entry lifecycle mutation in `RawEntryRepository`.
- [x] Add API tests for `PATCH /raw-entries/:id`.
- [x] Implement constrained raw-entry lifecycle API route.
- [x] Add web API client tests for raw-entry lifecycle actions.
- [x] Add Server Action for hide/restore form submission.
- [x] Add hide/restore controls on `/admin/raw-entries/[id]`.
- [x] Update README, Raw Entries API docs, master plan, and log.

Acceptance Criteria

- [x] Admin can hide a raw entry from its admin detail page.
- [x] Admin can restore a hidden raw entry from its admin detail page.
- [x] Hidden raw entries do not appear in reader item lists.
- [x] Hidden raw entry detail requests through the reader API return not found.
- [x] Admin raw-entry list and detail still include hidden entries for inspection.
- [x] Restore sets the raw entry lifecycle to `candidate`.
- [x] The endpoint uses Fastify v5 full JSON Schema for params and body validation.
- [x] The web action revalidates the raw-entry list and detail page before redirecting.
- [x] No feedback handling, moderation history, bulk moderation, delete flow, retry/resolution workflow, source creation UI, policy history, auth/RBAC, search, digest generation, browser automation, or non-RSS adapter is added.

Notes

Use existing `raw_entries.lifecycle_status`.
Do not add feedback handling, moderation history, or generic status editing in this issue.

**Implementation Note**

Implemented:
- DB integration test coverage for hide, restore, missing raw entry, and reader hidden filtering.
- `RawEntryRepository.updateRawEntryLifecycle`, using `hidden` for hide and `candidate` for restore.
- Reader list and detail filtering for hidden raw entries.
- `PATCH /raw-entries/:id` with constrained action payload validation.
- Web lifecycle helper tests, `updateRawEntryLifecycleAction`, and hide/restore controls on `/admin/raw-entries/[id]`.
- README, Raw Entries API, and Reader API documentation updates.

Validated:
- Red DB test first failed for missing `updateRawEntryLifecycle`.
- Red API test first failed with `PATCH /raw-entries/:id` returning 404.
- Red web test first failed for missing lifecycle helper functions.
- Targeted DB integration, API, and web tests passed.
- Full repo install, lint, tests, build, worker discovery, `uv lock --check`, Compose service status, and direct/Caddy health smoke passed.
- Local dev smoke submitted the Hide and Restore forms through Next Server Action, verified reader detail returned 404 while hidden and 200 after restore, then reset the seed entry lifecycle to `new`.

Known limitations:
- Restore returns hidden items to `candidate`; previous lifecycle history is not retained.
- No feedback handling, moderation history, bulk moderation, delete flow, retry/resolution workflow, source creation UI, policy history, auth/RBAC, search, digest generation, browser automation, or non-RSS adapter was added.

### Milestone 6: Search, Feedback, Digest

#### Issue 016: Add PostgreSQL reader search foundation

| Field | Value |
|---|---|
| Status | Done |
| Owner | Codex |
| Started At | 2026-05-20 |
| Completed At | 2026-05-20 |
| PR / Commit | this commit |

Goal

Let a Reader search visible reader items using PostgreSQL over reader-safe metadata and summary fields.

Required Tasks

- [x] Research current PostgreSQL full-text search guidance.
- [x] Add Reader Search Query and Reader Search Result terminology to `CONTEXT.md`.
- [x] Add ADR for reader-safe PostgreSQL search projection.
- [x] Add Issue 016 technical plan and implementation log.
- [x] Add DB integration tests for title, source, summary, board filter, hidden, blocked, disabled-source, and no-result search behavior.
- [x] Implement reader search repository method over reader-safe fields.
- [x] Add API tests for `GET /reader/search`.
- [x] Implement `GET /reader/search` with Fastify v5 full JSON Schema query validation.
- [x] Add web API client tests for search query URL construction.
- [x] Add `/search` page and reader search form entrypoint.
- [x] Update README, Reader API docs, master plan, and log.

Acceptance Criteria

- [x] Reader can search visible items by title.
- [x] Reader can search visible items by source title.
- [x] Reader can search visible items by summary text.
- [x] Reader can filter search by board.
- [x] Hidden raw entries are excluded from search results.
- [x] Blocked items and disabled-source items are excluded from search results.
- [x] Missing or empty query is rejected by the API.
- [x] Search results do not expose extracted full text, translation draft full text, private model payloads, or admin-only diagnostics.
- [x] No feedback handling, digest generation, semantic/vector search, external search service, search extension deployment, auth/RBAC, backend personal-state API, browser automation, or non-RSS adapter is added.

Notes

Use PostgreSQL built-in text search over reader-safe fields first.
Do not add Meilisearch, OpenSearch, `pg_trgm`, `zhparser`, semantic search, feedback logic, or digest generation in this issue.

**Completion Note**

Implemented:
- `ReaderRepository.searchReaderItems` over reader-safe title, URL, source, board, raw summary, and summary block fields.
- PostgreSQL built-in text search using `websearch_to_tsquery('simple', q)`, `to_tsvector('simple', ...)`, rank ordering, and conservative substring fallback over the same field set.
- `GET /reader/search?q=...` with optional `board` filter and Fastify query validation.
- Web API helper, `/search` page, home search form, and board-scoped search form.
- README, Reader API docs, Issue 016 plan, and implementation log updates.

Validated:
- DB integration tests cover title, source title, summary text, board filtering, hidden raw entries, blocked items, disabled-source items, and no-result search behavior.
- API tests cover success, optional board filter, missing query, and empty query.
- Web tests cover search URL construction.
- Search results use the existing reader card projection and do not expose extracted full text, translation draft full text, private model payloads, or admin-only diagnostics.

Known limitations:
- Search is PostgreSQL-only and intentionally does not add semantic/vector search, external search services, search extensions, feedback-to-ranking, digest generation, auth/RBAC, backend personal-state APIs, browser automation, or non-RSS adapters.

#### Issue 017: Add reader feedback capture foundation

| Field | Value |
|---|---|
| Status | Done |
| Owner | Codex |
| Started At | 2026-05-20 |
| Completed At | 2026-05-20 |
| PR / Commit | this commit |

Goal

Let a Reader submit constrained feedback for a policy-visible reader item, storing it for later moderation or ranking work without applying those effects yet.

Required Tasks

- [x] Research current Next.js Server Action form guidance.
- [x] Research current Fastify v5 JSON Schema validation guidance.
- [x] Refine Feedback terminology and add Feedback Type to `CONTEXT.md`.
- [x] Add ADR for feedback storage staying separate from local personal state, moderation, and ranking mutation.
- [x] Add Issue 017 technical plan and implementation log.
- [x] Add SQL migration tests for reader feedback storage and constrained feedback types.
- [x] Add DB integration tests for visible item feedback and missing/hidden/blocked/disabled-source rejection.
- [x] Implement feedback repository create/list methods.
- [x] Add API tests for `POST /reader/items/:id/feedback`.
- [x] Add API tests for `GET /admin/feedback`.
- [x] Implement Fastify routes with full JSON Schema validation.
- [x] Add web API client and Server Action tests for feedback form payload construction.
- [x] Add feedback form to reader item detail and read-only admin feedback page.
- [x] Update README, Feedback API docs, master plan, and log.

Acceptance Criteria

- [x] Reader can submit one constrained feedback event for a visible reader item.
- [x] Feedback type is required and limited to approved Feedback Types.
- [x] Feedback message is optional and bounded.
- [x] Missing, hidden, blocked, and disabled-source items cannot receive reader feedback.
- [x] Admin can inspect recent feedback events in a read-only view.
- [x] Feedback does not mutate item lifecycle, ranking, search result ordering, board placement, digest inclusion, or personal saved/read-later state.
- [x] No auth/RBAC, reader account, backend personal-state sync, moderation workflow, feedback-to-ranking consumption, digest generation, semantic/vector search, external search service, search extension deployment, browser automation, or non-RSS adapter is added.

Notes

Store feedback as append-only item-scoped server-side events first.
Do not add reader identity, trust weighting, moderation resolution, automatic hide/restore, or ranking consumption in this issue.

**Completion Note**

Implemented:
- `reader_feedback` SQL migration with constrained Feedback Types, optional bounded message, and item association.
- `FeedbackRepository.createFeedback` and `listFeedback`, with creation limited to reader-visible items.
- `POST /reader/items/:id/feedback` and `GET /admin/feedback` with Fastify v5 JSON Schema validation.
- Reader item detail feedback form, Server Action wiring, and read-only admin feedback page.
- README, Feedback API docs, Issue 017 plan, implementation log, master plan, and goal plan updates.

Validated:
- Migration tests cover the feedback table and allowed types.
- DB integration tests cover visible item feedback and missing, hidden, blocked, and disabled-source rejection.
- API tests cover feedback creation, invalid payloads, invisible item rejection, and admin feedback listing.
- Web tests cover feedback payload construction, POST helper behavior, and admin feedback fetch.
- Local current-code smoke verified direct feedback creation, item page form rendering, admin API visibility, admin page rendering, and cleanup of the smoke feedback row.

Known limitations:
- Feedback is captured but not consumed by ranking, moderation workflow, digest generation, identity/reputation, or personal-state sync.

#### Issue 018: Add reader-safe related items foundation

| Field | Value |
|---|---|
| Status | Done |
| Owner | Codex |
| Started At | 2026-05-20 |
| Completed At | 2026-05-20 |
| PR / Commit | this commit |

Goal

Let a Reader see a small set of policy-visible Related Items on a reader item detail page without adding personalization, feedback-to-ranking, digest generation, semantic search, or a new search service.

Required Tasks

- [x] Research current PostgreSQL full-text ranking guidance.
- [x] Research current Next.js App Router dynamic page guidance.
- [x] Research current Fastify v5 JSON Schema validation guidance.
- [x] Add Related Item terminology to `CONTEXT.md`.
- [x] Add ADR for reader-safe PostgreSQL related item selection.
- [x] Add Issue 018 technical plan and implementation log.
- [x] Add DB integration tests for related item visibility, self exclusion, ordering signals, missing target, and empty-result behavior.
- [x] Implement reader related-items repository method over reader-safe fields.
- [x] Add API tests for `GET /reader/items/:id/related`.
- [x] Implement `GET /reader/items/:id/related` with Fastify v5 full JSON Schema params/query validation.
- [x] Add web API client tests for related item loading.
- [x] Add related item section to the reader item detail page.
- [x] Update README, Reader API docs, master plan, and log.

Acceptance Criteria

- [x] Reader item detail can show related item cards for a visible item.
- [x] The current item is never returned as its own Related Item.
- [x] Related Items come only from reader-visible items.
- [x] Hidden raw entries, blocked items, disabled-source items, and missing items are excluded.
- [x] API validates item id and bounded limit with Fastify v5 full JSON Schema.
- [x] Related Items do not expose extracted full text, translation draft full text, private model payloads, feedback events, or admin-only diagnostics.
- [x] No feedback-to-ranking consumption, moderation workflow, digest generation, semantic/vector search, external search service, search extension deployment, auth/RBAC, backend personal-state sync, browser automation, or non-RSS adapter is added.

Notes

Use PostgreSQL and the existing reader-safe projection first.
Do not add feedback weighting, personal recommendations, semantic/vector search, digest generation, or search extensions in this issue.

**Completion Note**

Implemented:
- `ReaderRepository.listRelatedReaderItems` over reader-safe title, source, board, raw summary, and summary block fields.
- Deterministic ordering with shared source, shared board, PostgreSQL full-text rank, recency, and id tie-breakers.
- `GET /reader/items/:id/related` with optional bounded `limit` validation.
- Web API helper and related item cards on reader item detail pages.
- README, Reader API docs, Issue 018 plan, implementation log, master plan, and goal plan updates.

Validated:
- DB integration tests cover related item visibility, self exclusion, same-board and text-match behavior, hidden raw entries, blocked items, disabled-source items, missing targets, bounded limits, and empty results.
- API tests cover related item loading, optional limit, missing target, and invalid limit.
- Web tests cover related item URL construction and response handling.

Known limitations:
- Related Items are PostgreSQL-only and intentionally do not add feedback-to-ranking, personalization, digest generation, semantic/vector search, external search services, search extensions, auth/RBAC, backend personal-state sync, browser automation, or non-RSS adapters.

#### Issue 019: Add reader-safe digest preview foundation

| Field | Value |
|---|---|
| Status | In Progress |
| Owner | Codex |
| Started At | 2026-05-20 |
| Completed At | TBD |
| PR / Commit | pending |

Goal

Let a Reader view a small Digest preview of policy-visible items for a board or homepage period without adding email delivery, scheduled generation, persisted digest tables, editorial workflow, feedback-to-ranking, or personalization.

Required Tasks

- [x] Re-read current reader-safe projection and Digest boundaries.
- [x] Add Digest Window and Digest Item terminology to `CONTEXT.md`.
- [x] Add ADR for starting MVP Digest as a reader-safe preview.
- [x] Add Issue 019 technical plan and implementation log.
- [ ] Add DB integration tests for digest item visibility, board filtering, bounded limit, hidden raw-entry exclusion, blocked item exclusion, disabled-source exclusion, and empty-result behavior.
- [ ] Implement reader digest repository method over reader-safe fields.
- [ ] Add API tests for `GET /reader/digest`.
- [ ] Implement `GET /reader/digest` with Fastify v5 full JSON Schema query validation.
- [ ] Add web API client tests for digest loading.
- [ ] Add `/digest` reader page and navigation entrypoint.
- [ ] Update README, Reader API docs, master plan, and log.

Acceptance Criteria

- [ ] Reader can view a digest preview of visible item cards.
- [ ] Reader can filter digest preview by board.
- [ ] Digest limit is bounded by API validation.
- [ ] Hidden raw entries, blocked items, and disabled-source items are excluded.
- [ ] Digest Items do not expose extracted full text, translation draft full text, private model payloads, feedback events, or admin-only diagnostics.
- [ ] No email delivery, scheduler job, persisted digest table, editorial workflow, feedback-to-ranking consumption, moderation workflow, semantic/vector search, external search service, search extension deployment, auth/RBAC, backend personal-state sync, browser automation, or non-RSS adapter is added.

Notes

Use the existing reader-safe PostgreSQL projection first.
Do not add delivery, scheduling, durable digest editions, editorial workflow, or feedback weighting in this issue.

---

## 4. Deferred Backlog

These items are explicitly deferred. Do not implement unless the master plan is updated.

| Item | Reason |
|---|---|
| GitHub adapter | Start after RSS ingest is stable |
| arXiv adapter | Start after RSS ingest is stable |
| GDELT adapter | Start after RSS ingest is stable |
| RSSHub adapter | Start after RSS ingest is stable |
| Full-text extraction | Milestone 2 |
| AI scoring | Milestone 3 |
| AI translation | Milestone 3 |
| Reader homepage | Milestone 4 |
| Article reading page | Milestone 4 |
| Feedback workflow | Milestone 6 |
| Meilisearch | Post-MVP |
| ArchiveBox full integration | Post-MVP |
| OpenSearch | Not planned for MVP |
| Mobile app | Not planned for MVP |

---

## 5. Decision Log

| Date | Decision | Reason | Impact |
|---|---|---|---|
| YYYY-MM-DD | Freeze MVP v0.1 | Prevent scope expansion | Codex follows only master plan |
| YYYY-MM-DD | Start with RSS adapter only | Avoid Phase 1 explosion | Other adapters deferred |
| YYYY-MM-DD | PostgreSQL-first search | Reduce 4C8G resource pressure | Meilisearch deferred |
| YYYY-MM-DD | ArchiveBox not常驻 | Reduce storage and ops pressure | Only interface/profile later |
| YYYY-MM-DD | Rights policy controls public display | Reduce copyright/re-distribution risk | Full translation not public by default |
| 2026-05-20 | Use pnpm and uv for bootstrap | Keep TypeScript workspace and Python worker tooling separate | Milestone 0 uses `pnpm` and `uv` |

---

## 6. Blockers

| Date | Blocker | Impact | Owner | Status |
|---|---|---|---|---|

---

## 7. Change Requests

Any scope change must be recorded here before implementation.

| Date | Request | Decision | Reason | Approved By |
|---|---|---|---|---|

---

## 8. Current Next Action

Implement Issue 019: reader-safe digest preview foundation.
Do not implement email delivery, scheduler jobs, persisted digest tables, editorial workflow, feedback-to-ranking consumption, moderation workflow, semantic/vector search, external search service, search extension deployment, auth/RBAC, backend personal-state sync, browser automation, or non-RSS adapters.
---
## 9. Codex Operating Rules

Codex must follow these rules during implementation.

### 9.1 Scope Control

- Follow `docs/CODEX_MASTER_PLAN.md` as the execution blueprint.
- Do not expand MVP v0.1 scope.
- Do not introduce deferred services unless explicitly approved.
- Do not implement future adapters before RSS ingest is stable.
- Do not add AI logic before the AI milestone.
- Do not add reader UI before the admin/debug flow is usable.

### 9.2 Implementation Order

Codex must implement issues in strict order:

```text
Issue 001
Issue 002
Issue 003
Issue 004
Issue 005
Issue 006
Issue 007
```

An issue is not complete until all acceptance criteria are met.

### 9.3 Progress Updates

After each completed issue, Codex must update:

- `docs/CODEX_MASTER_PLAN.md`
- relevant README files if setup behavior changed
- migration notes if database schema changed
- API contract docs if endpoints changed

### 9.4 No Silent Architecture Changes

Codex must not silently change:

- runtime service list
- database source-of-truth strategy
- queue system
- monorepo structure
- source policy semantics
- rights policy semantics
- adapter priority
- MVP board list
- MVP source list

Any proposed change must be added to **Change Requests** first.

---

## 10. Required Update Format

When Codex updates this file, use the following format.

### 10.1 Issue Start

```markdown
| Status | In Progress |
| Started At | YYYY-MM-DD |
| PR / Commit | <link-or-hash> |
```

Add a short note under the issue:

```markdown
**Progress Note**

Started implementation. Current focus:
- ...
```

### 10.2 Issue Completion

```markdown
| Status | Done |
| Completed At | YYYY-MM-DD |
| PR / Commit | <link-or-hash> |
```

Add a short completion note:

```markdown
**Completion Note**

Implemented:
- ...

Validated:
- ...

Known limitations:
- ...
```

### 10.3 Blocked Issue

```markdown
| Status | Blocked |
```

Also add an entry under **Blockers**.

---

## 11. Validation Checklist

Before marking any issue as `Done`, Codex must verify:

- [ ] Code builds locally.
- [ ] Tests pass.
- [ ] Docker Compose still starts required services.
- [ ] No deferred service was introduced.
- [ ] No non-MVP feature was added.
- [ ] Database migration is reversible or documented.
- [ ] New environment variables are documented.
- [ ] README or setup docs were updated if needed.
- [ ] `docs/CODEX_MASTER_PLAN.md` was updated.

---

## 12. Milestone 0 Exit Criteria

Milestone 0 is complete only when:

- [x] Monorepo structure exists.
- [x] Web app starts.
- [x] API service starts.
- [x] Worker service starts.
- [x] PostgreSQL starts.
- [x] Redis starts.
- [x] Caddy placeholder config exists.
- [x] Local Docker Compose works.
- [x] CI runs lint/test/build placeholders successfully.
- [x] Health checks exist.
- [x] Initial README exists.
- [x] `docs/CODEX_MASTER_PLAN.md` is updated.

---

## 13. Milestone 1 Exit Criteria

Milestone 1 is complete only when:

- [x] Source Registry tables exist.
- [x] Source Policy tables exist.
- [x] RSS source can be created.
- [x] RSS source can be enabled/disabled.
- [x] RSS source can be fetched by worker.
- [x] RSS entries are inserted into `raw_entries`.
- [x] Duplicate RSS entries are not inserted twice.
- [x] Failed RSS fetches are recorded.
- [x] Admin/debug UI can view sources.
- [x] Admin/debug UI can view raw entries.
- [x] Admin/debug UI can manually trigger RSS ingest.
- [x] No GitHub/arXiv/GDELT/RSSHub adapter was added.
- [x] `docs/CODEX_MASTER_PLAN.md` is updated.

---

## 13.1 Milestone 2 Exit Criteria

Milestone 2 is complete only when:

- [x] Extraction attempt/result tables exist.
- [x] One eligible raw entry can be extracted from deterministic HTML.
- [x] Metadata-only sources are skipped before article body fetch.
- [x] Network/status extraction failures are recorded.
- [x] Empty extraction output is recorded as a parse failure.
- [x] Extraction confidence is stored as a bounded numeric value.
- [x] No AI, search, reader UI, browser automation, or non-RSS adapter was added.
- [x] `docs/CODEX_MASTER_PLAN.md` is updated.

---

## 14. Notes for Future Milestones

These are reminders only. Do not implement them during Milestone 0 or Milestone 1.

### Milestone 2

Focus:

- full-text fetch
- trafilatura extraction
- extraction failure tracking
- extracted text storage
- extraction confidence

### Milestone 3

Focus:

- AI adapter abstraction
- structured JSON schema
- model call logging
- prefilter
- scoring
- translation
- summary blocks

### Milestone 4

Focus:

- home page
- board page
- article page
- Chinese/original switch
- saved items
- read later

### Milestone 5

Focus:

- source admin
- policy admin
- failure queue
- manual hide/restore

### Milestone 6

Focus:

- PostgreSQL FTS
- feedback-to-ranking logic
- digest generation
- lightweight related items

### Milestone 7

Focus:

- backup
- restore
- release checklist
- health checks
- disk usage controls
- production audit

---

## 15. File Maintenance Rules

- Keep this file short enough to remain readable.
- Move completed low-level notes into PR descriptions if this file becomes too long.
- Do not delete historical decisions.
- Do not rewrite completed milestones unless correcting factual errors.
- Keep `docs/CODEX_MASTER_PLAN.md` as the execution source of truth.
- Keep the original deep research report as research reference only.

---

## 16. End Marker

Current required next action:

```text
Implement Issue 019: reader-safe digest preview foundation.
Do not implement email delivery, scheduler jobs, persisted digest tables, editorial workflow, feedback-to-ranking consumption, moderation workflow, semantic/vector search, external search service, search extension deployment, auth/RBAC, backend personal-state sync, browser automation, or non-RSS adapters.
```
