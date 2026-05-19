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

## Task 3: Milestone 1 / Issue 002 SQL Migration Framework And Core Enums

Status: Pending

Scope:
- Start only after Task 1 and Task 2 are complete.
- Follow `docs/CODEX_MASTER_PLAN.md` Issue 002.

Verification:
- To be detailed before implementation.

Completion notes:
- Pending.

## Check-Debug Loop 1

Status: Pending

Run after Tasks 1-3:
- Re-read `goal-1/input.md`, `goal-1/plan.md`, and `goal-1/tasks.md`.
- Audit docs, code, tests, and running behavior against the master plan.
- Repair gaps before continuing.

## Future Tasks

Tasks for Issues 003+ will be expanded only when earlier tasks are complete, so later implementation is not overdesigned from stale assumptions.
