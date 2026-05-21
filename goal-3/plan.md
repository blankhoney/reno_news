# Goal 3 Plan: Local Real Source Import and Ingest Test

## Requirement
Import a first batch of verified real content sources into the local test database only, run ingestion through existing adapters, and verify that reader/admin surfaces show real data. Do not modify default seed data, production configuration, or committed source lists.

## Context
- The repo is a pnpm monorepo with Next.js web, Fastify API, a Python worker, and SQL-backed repositories.
- Existing adapters cover RSS/Atom, GitHub, and arXiv. The task explicitly excludes adding new source types, GDELT, or RSSHub.
- Goal Mode requires `goal-3/input.md`, `goal-3/plan.md`, and `goal-3/tasks.md` before any code or database modification.

## Assumptions
- The target database is the currently configured local database from the repo environment.
- Idempotency is keyed by `sources.url`.
- Failed external sources should be recorded as excluded candidates or disabled locally, not turned into default project configuration.
- If adapter defects are found, code changes must be TDD-scoped to the failing adapter behavior.

## Risks
- Local services may not be running or may point at the wrong database.
- External feeds may change, rate-limit, redirect, or fail transiently.
- arXiv and GitHub calls must respect conservative request limits.
- Browser/UI verification may require starting web/API/worker services.

## Execution Approach
1. Inspect schema, environment, and worker ingestion entrypoints.
2. Capture baseline counts for `sources`, `raw_entries`, and `source_ingest_attempts`.
3. Insert the approved source list into local `sources` and `source_policies` with upsert-by-URL behavior.
4. Trigger ingestion source-by-source through the worker endpoint, spacing arXiv calls by at least 3 seconds.
5. Verify DB attempt status, raw entry counts, reader API results, and local UI pages.
6. If an adapter defect blocks ingestion, add a failing test first, fix minimally, and rerun the narrow check.

## Verification Method
- SQL counts before and after import/ingest.
- Latest `source_ingest_attempts` status per newly added source.
- Raw entry counts by board/source.
- Reader API responses for target boards and a Kubernetes search.
- Browser checks for `/boards/ai`, `/boards/software-engineering`, `/boards/semiconductor`, `/boards/employment-trends`, `/boards/open-source`, `/digest`, and `/search?q=Kubernetes`.

## Rollback Plan
- For a full rollback, delete rows for the newly imported URLs from `raw_entries`, `source_ingest_attempts`, `source_policies`, and `sources`.
- For source-quality failures, locally disable only the bad source with `sources.enabled=false` and `source_policies.crawl_enabled=false`.
- No Git rollback should be needed unless adapter code must be changed.
