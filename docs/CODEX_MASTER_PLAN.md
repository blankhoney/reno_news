# Project Progress

This file tracks implementation progress for the MVP v0.1 execution blueprint.

- Source of truth: `docs/CODEX_MASTER_PLAN.md`
- Research reference: original deep research report
- Rule: do not expand scope beyond MVP v0.1 without explicit approval

---

## 0. Current Status

| Field | Value |
|---|---|
| Current Milestone | Milestone 1 |
| Current Issue | Issue 004 |
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
| Milestone 1 | Source Registry + RSS Ingest | In Progress | Issue 003 done; Issue 004 next |
| Milestone 2 | Fetch & Extraction | Not Started | trafilatura main path |
| Milestone 3 | AI Pipeline | Not Started | adapter + schema first |
| Milestone 4 | Reader UI | Not Started | home, board, article pages |
| Milestone 5 | Admin UI | Not Started | source/policy/failure views |
| Milestone 6 | Search, Feedback, Digest | Not Started | PostgreSQL-first |
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
- Source admin/debug UI is not implemented; it remains Issue 005.
- Container image rebuild was blocked by local Docker credential/network behavior, so Source API container endpoint verification is not claimed.

Notes

Do not implement GitHub/arXiv/GDELT/RSSHub adapters yet.
RSS is the only adapter allowed in the next issue.

#### Issue 004: Implement minimal RSS adapter ingest flow

| Field | Value |
|---|---|
| Status | Not Started |
| Owner | Codex |
| Started At | |
| Completed At | |
| PR / Commit | |

Goal

Implement the first real source adapter: RSS/Atom only.

Required Tasks

- [ ] Add RSS adapter interface.
- [ ] Fetch RSS/Atom feed.
- [ ] Parse feed metadata.
- [ ] Normalize entry URL.
- [ ] Compute canonical hash.
- [ ] Insert into raw_entries.
- [ ] Avoid duplicate entries.
- [ ] Apply source policy before ingest.
- [ ] Mark lifecycle status.
- [ ] Mark processing stage.
- [ ] Record basic failure details.
- [ ] Add basic worker task for RSS ingest.
- [ ] Add basic scheduler trigger for RSS sources.

Acceptance Criteria

- [ ] One RSS source can be ingested end-to-end.
- [ ] Duplicate feed entries are not inserted twice.
- [ ] Disabled source is not fetched.
- [ ] Failed fetch produces a recorded failure.
- [ ] No full-text extraction is implemented yet.
- [ ] No AI processing is implemented yet.

Notes

Do not add RSSHub, GitHub, arXiv, or GDELT here.
Do not fetch article full text yet.

#### Issue 005: Add admin/debug views for sources and raw entries

| Field | Value |
|---|---|
| Status | Not Started |
| Owner | Codex |
| Started At | |
| Completed At | |
| PR / Commit | |

Goal

Create basic admin/debug pages so the system can be operated without direct database access.

Required Tasks

- [ ] Add admin route shell.
- [ ] Add sources list page.
- [ ] Add source detail page.
- [ ] Add raw entries list page.
- [ ] Add raw entry detail page.
- [ ] Show source policy summary.
- [ ] Show lifecycle status.
- [ ] Show processing stage.
- [ ] Show failure type.
- [ ] Add enable/disable source action.
- [ ] Add manual RSS ingest trigger.
- [ ] Add basic error display.

Acceptance Criteria

- [ ] Admin can inspect sources.
- [ ] Admin can inspect raw entries.
- [ ] Admin can manually trigger RSS ingest.
- [ ] Admin can see failed RSS ingest attempts.
- [ ] UI is functional, not polished.
- [ ] No unrelated reader UI is added yet.

Notes

Keep this as an admin/debug UI.
Do not start the full reading experience yet.

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

Start Issue 004.
Do not implement Issue 005 until Issue 004 meets acceptance criteria.
Implement RSS/Atom adapter only in Issue 004.
Do not implement any non-RSS adapter in Milestone 1.
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
- [ ] RSS source can be fetched by worker.
- [ ] RSS entries are inserted into `raw_entries`.
- [ ] Duplicate RSS entries are not inserted twice.
- [ ] Failed RSS fetches are recorded.
- [ ] Admin/debug UI can view sources.
- [ ] Admin/debug UI can view raw entries.
- [ ] Admin/debug UI can manually trigger RSS ingest.
- [x] No GitHub/arXiv/GDELT/RSSHub adapter was added.
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
- feedback handling
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
Start Issue 004.
Do not start Issue 005 yet.
Implement RSS/Atom ingest only.
Do not implement AI, search, reader UI, or non-RSS adapters yet.
```
