# Goal Plan

## Requirement

Execute `docs/CODEX_MASTER_PLAN.md` in order until the final milestone is complete, with working software, lean code, accurate technical documentation, interface documentation, tests, review, and per-round logs.

## Current Context

- Current milestone: Milestone 4.
- Current issue: next Milestone 4 issue planning.
- Existing durable docs: `CONTEXT.md` and `docs/adr/`.
- Execution source of truth: `docs/CODEX_MASTER_PLAN.md`.
- Completed baseline: Issues 001-010 are done, with `pnpm`, `uv`, Docker Compose, SQL migrations, constrained status fields, development seed data, Source Registry, Source Policy, source and raw entry API routes, worker-readable policies, RSS/Atom metadata ingest, basic admin/debug views, full-text extraction foundation, model-call logging, AI evaluation adapter foundation, Chinese translation draft foundation, summary block draft foundation, and reader home/board listing foundation in place.

## Execution Approach

1. Work strictly in master-plan order.
2. Before each milestone or issue, read relevant local docs and query official/current technical docs for the selected tools.
3. Write or update technical docs, interface docs, and a short implementation log before marking an issue complete.
4. Use TDD vertical slices: one behavior test, minimal implementation, then repeat.
5. After implementation, run the smallest relevant local checks and, where required by acceptance criteria, container checks.
6. Review the resulting plan, technical choices, code, docs, and tests before closing the task.
7. Update `docs/CODEX_MASTER_PLAN.md` and this goal's `tasks.md` after each completed task.

## Risks

- The master plan is large; completing all milestones will require multiple task rounds.
- External dependency installs and container image pulls may require network access.
- Some later milestones need product decisions that should not block Milestone 0.
- Documentation can drift from implementation unless updated at task close.

## Verification Method

- Map every issue acceptance criterion to a concrete file, command, endpoint, or test result.
- Prefer behavior tests through public interfaces.
- Verify local commands before claiming a task is done.
- For Milestone 0, verify package scripts, health endpoints, Docker Compose startup, and CI skeleton commands without external API keys.

## Rollback Plan

- Keep changes scoped to the active issue.
- If a selected tool proves unsuitable before dependent code is built, adjust the plan and document the reason.
- If implementation breaks verification, revert only the changes from the active task and keep prior docs intact.
