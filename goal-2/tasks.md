# Goal Tasks: Reno News 第二版

## 执行规则

- 一次只执行一个任务。
- 每个实现任务按 TDD tracer bullet：一个行为 -> 一个失败测试 -> 最小实现 -> 测试通过 -> 必要重构。
- 每 3 个任务后执行一次 Check-Debug Loop。
- 完成任务后更新本文件，记录改动和验证证据。
- 有改动时提交该任务成果；提交时不得包含无关用户改动。

## Task 0: Goal Bootstrap And Full V2 Planning

- Status: Completed
- Objective: Create `goal-2/input.md`, `goal-2/plan.md`, and `goal-2/tasks.md` with the full second-version route before any code changes.
- Verification:
  - `goal-2/input.md` preserves the user input verbatim.
  - `goal-2/plan.md` covers requirement, context, risks, execution, verification, and rollback.
  - `goal-2/tasks.md` splits the work into independently verifiable tasks.
- Completion Record:
  - Created the full `goal-2` goal files before any business-code edits.
  - Read back `input.md`, `plan.md`, and `tasks.md` to verify content shape and execution constraints.
  - Ran `git diff --check -- goal-2/input.md goal-2/plan.md goal-2/tasks.md`; no whitespace errors were reported.

## Task 1: Second-Version Master Plan And ADR Bootstrap

- Status: Pending
- Objective: Extend the project planning docs with the second-version milestone route and create ADRs for irreversible decisions not already captured.
- TDD/Verification:
  - Failing check first: add or run a doc contract check that expects V2 milestone headings and ADR index entries.
  - Pass criteria: `docs/CODEX_MASTER_PLAN.md` references the V2 execution route, and new ADRs cover auth/session/RBAC, production deployment boundary, observability, AI model gate, personal state, and source expansion ordering.
- Completion Record:
  - Pending.

## Task 2: Auth/RBAC Schema Planning And Contract Tests

- Status: Pending
- Objective: Define the minimal database schema and API contract for users, sessions, invites, roles, and auth failure behavior.
- TDD/Verification:
  - Failing tests first for expected schema/contracts through public migration/API surfaces.
  - Pass criteria: migrations and contract tests define reader/admin identity, invite-only bootstrap, sessions, expiry, and uniqueness constraints.
- Completion Record:
  - Pending.

## Task 3: Minimal Invite-Only Auth Foundation

- Status: Pending
- Objective: Implement invite-only email/password login, argon2id password hashing, session creation, logout, and current-user endpoint.
- TDD/Verification:
  - One route behavior at a time: failed login, successful invite login, current session, logout.
  - Pass criteria: API tests prove anonymous, logged-in reader, expired session, and logout behavior.
- Completion Record:
  - Pending.

## Check-Debug Loop 1

- Status: Pending
- Scope: Tasks 1-3.
- Verification:
  - Run auth-related API tests, migration checks, lint/typecheck for touched packages, and `git diff --check`.
- Completion Record:
  - Pending.

## Task 4: API Authorization Matrix

- Status: Pending
- Objective: Protect admin/source/failure/feedback routes with role guards while preserving allowed reader/public routes.
- TDD/Verification:
  - Failing tests first for unauthorized, reader-forbidden, and admin-allowed cases.
  - Pass criteria: all admin APIs reject anonymous/reader users and allow admin users only.
- Completion Record:
  - Pending.

## Task 5: Web Session And Admin Route Guards

- Status: Pending
- Objective: Connect the web app to API-owned session state and protect admin UI entry points.
- TDD/Verification:
  - Failing web tests or browser smoke first for anonymous admin access and logged-in admin access.
  - Pass criteria: anonymous users are redirected or blocked from admin UI; reader pages keep working.
- Completion Record:
  - Pending.

## Task 6: Audit Log Foundation

- Status: Pending
- Objective: Add audit event storage and write events for login/logout, admin changes, retry/hide/restore, source policy edits, and feedback review.
- TDD/Verification:
  - Failing tests first through public API actions, asserting observable audit query results via admin API.
  - Pass criteria: audit events include actor, action, object, timestamp, request id, and safe metadata.
- Completion Record:
  - Pending.

## Check-Debug Loop 2

- Status: Pending
- Scope: Tasks 4-6.
- Verification:
  - Run auth/RBAC/audit API tests, web guard checks, migration checks, and a security route matrix review.
- Completion Record:
  - Pending.

## Task 7: Production Compose Boundary

- Status: Pending
- Objective: Add or update production Compose profile so only Caddy is publicly exposed and internal services stay on private networks.
- TDD/Verification:
  - Failing config check first for forbidden public ports on web/api/worker/scheduler.
  - Pass criteria: `docker compose config` proves only Caddy binds host ports.
- Completion Record:
  - Pending.

## Task 8: Production Deploy Script And GitHub Secret Contract

- Status: Pending
- Objective: Define deploy script, required GitHub secrets, release health checks, and rollback path without hardcoding private values.
- TDD/Verification:
  - Failing shell/docs contract check first for required env names and health-check commands.
  - Pass criteria: deploy docs/scripts define GHCR pull, migration, health check, and rollback.
- Completion Record:
  - Pending.

## Task 9: Off-Host Backup Foundation

- Status: Pending
- Objective: Implement documented off-host PostgreSQL backup and restore drill flow using `pg_dump -Fc` and S3-compatible storage.
- TDD/Verification:
  - Failing dry-run or shell contract test first for required env and commands.
  - Pass criteria: backup script has dry-run, retention policy, restore instructions, and no secrets in repo.
- Completion Record:
  - Pending.

## Check-Debug Loop 3

- Status: Pending
- Scope: Tasks 7-9.
- Verification:
  - Run compose config checks, shellcheck or script syntax checks where available, docs contract checks, and `git diff --check`.
- Completion Record:
  - Pending.

## Task 10: Metrics Endpoint Foundation

- Status: Pending
- Objective: Expose minimal service and worker metrics for health, queue depth, ingest failures, model failures, and disk/backup signals where feasible.
- TDD/Verification:
  - Failing metrics endpoint tests first for expected metric names and labels.
  - Pass criteria: `/metrics` exposes stable Prometheus-compatible metrics without sensitive values.
- Completion Record:
  - Pending.

## Task 11: Structured Logging And Request Trace Id

- Status: Pending
- Objective: Ensure API and worker logs carry request/job ids and safe structured metadata.
- TDD/Verification:
  - Failing tests first for response trace header and log-context propagation in representative paths.
  - Pass criteria: trace id connects web/API/worker-visible work without logging secrets.
- Completion Record:
  - Pending.

## Task 12: Prometheus Alert Rules And Ops Runbooks

- Status: Pending
- Objective: Add Prometheus/Alertmanager rules and runbooks for service down, queue backlog, high failure rate, model failures, backup failure, and disk risk.
- TDD/Verification:
  - Failing rule syntax or docs contract check first.
  - Pass criteria: alert rules validate locally and runbooks describe diagnosis and mitigation.
- Completion Record:
  - Pending.

## Check-Debug Loop 4

- Status: Pending
- Scope: Tasks 10-12.
- Verification:
  - Run metrics tests, log/trace tests, alert rule validation if tooling exists, and ops doc checks.
- Completion Record:
  - Pending.

## Task 13: MiniMax Adapter Planning And ADR

- Status: Pending
- Objective: Document MiniMax M2.7 usage boundary, schema validation strategy, fallback policy, budgets, timeout, and retry behavior.
- TDD/Verification:
  - Failing doc/contract check first for provider capability sections and env contract.
  - Pass criteria: ADR and docs make clear that MiniMax is primary but schema correctness is locally verified.
- Completion Record:
  - Pending.

## Task 14: MiniMax Real Adapter Foundation

- Status: Pending
- Objective: Add real MiniMax adapter behind existing AI provider abstraction and record calls in `model_calls`.
- TDD/Verification:
  - Failing adapter tests first using mocked public HTTP boundary, not private internals.
  - Pass criteria: adapter handles success, timeout, retryable failure, non-retryable failure, and budget metadata.
- Completion Record:
  - Pending.

## Task 15: Schema Validation Repair And Failure Gate

- Status: Pending
- Objective: Add schema validation, repair pass, and failure isolation before structured AI results enter formal tables.
- TDD/Verification:
  - Failing tests first for malformed model output, repairable output, and unrecoverable output.
  - Pass criteria: invalid structured output is either repaired and validated or quarantined with a clear failure reason.
- Completion Record:
  - Pending.

## Check-Debug Loop 5

- Status: Pending
- Scope: Tasks 13-15.
- Verification:
  - Run AI adapter tests, schema tests, worker tests, and migration checks.
- Completion Record:
  - Pending.

## Task 16: Golden Set Regression Harness

- Status: Pending
- Objective: Create a 50-100 item golden sample evaluation harness for translation, summary, scoring, and fact/opinion/suspicion extraction.
- TDD/Verification:
  - Failing harness test first proving a small fixture can be evaluated deterministically.
  - Pass criteria: local fake fixtures produce a stable report; real provider execution is gated by env.
- Completion Record:
  - Pending.

## Task 17: Server-Side Personal State Planning And Schema

- Status: Pending
- Objective: Define backend schema and contracts for saved, read-later, and read_status bound to authenticated users.
- TDD/Verification:
  - Failing migration/API contract tests first.
  - Pass criteria: schema prevents cross-user conflicts and supports idempotent state changes.
- Completion Record:
  - Pending.

## Task 18: Saved/Read-Later Backend APIs

- Status: Pending
- Objective: Implement authenticated APIs for saved, read-later, and read status.
- TDD/Verification:
  - Failing API tests first for create, remove, list, idempotency, and cross-user isolation.
  - Pass criteria: authenticated users see only their own personal state; anonymous writes are rejected.
- Completion Record:
  - Pending.

## Check-Debug Loop 6

- Status: Pending
- Scope: Tasks 16-18.
- Verification:
  - Run golden harness fixture tests, personal state API tests, migration checks, and relevant worker/web tests.
- Completion Record:
  - Pending.

## Task 19: Web Personal State Migration From Local Storage

- Status: Pending
- Objective: Move reader saved/read-later/read state to backend APIs while preserving a migration path from existing localStorage state.
- TDD/Verification:
  - Failing web tests first for logged-in sync, anonymous read-only fallback, and local migration.
  - Pass criteria: personal state is consistent after reload and across browser contexts for logged-in users.
- Completion Record:
  - Pending.

## Task 20: Digest Edition Planning And Schema

- Status: Pending
- Objective: Convert digest from dynamic preview into persisted editions with edition id, date, items, status, and review metadata.
- TDD/Verification:
  - Failing migration/API contract tests first.
  - Pass criteria: digest editions can be generated, listed, retrieved, and replayed.
- Completion Record:
  - Pending.

## Task 21: Digest Edition API And Web Playback

- Status: Pending
- Objective: Implement digest edition generation/playback APIs and web views for stable replay.
- TDD/Verification:
  - Failing API/web tests first for generated edition retrieval and replay stability.
  - Pass criteria: a daily digest remains stable after source items change.
- Completion Record:
  - Pending.

## Check-Debug Loop 7

- Status: Pending
- Scope: Tasks 19-21.
- Verification:
  - Run reader web tests, personal state tests, digest API tests, and browser smoke if UI changed.
- Completion Record:
  - Pending.

## Task 22: GitHub Source Adapter Planning And Policy

- Status: Pending
- Objective: Define GitHub adapter scope, rate-limit policy, allowed entities, and source mapping before implementation.
- TDD/Verification:
  - Failing docs/config contract check first for allowlist and rate-limit settings.
  - Pass criteria: docs and config define Releases/Repository metadata first, low concurrency, and no broad search polling.
- Completion Record:
  - Pending.

## Task 23: GitHub Releases Adapter Foundation

- Status: Pending
- Objective: Implement GitHub Releases/Repository metadata ingestion into the existing source pipeline.
- TDD/Verification:
  - Failing adapter tests first using public adapter interface and fixture HTTP responses.
  - Pass criteria: releases are normalized, deduplicated, rate-limit aware, and failures go to the existing failure queue.
- Completion Record:
  - Pending.

## Task 24: arXiv Adapter Planning And Foundation

- Status: Pending
- Objective: Add arXiv Atom adapter with query allowlist, attribution, pagination, and 3-second request spacing policy.
- TDD/Verification:
  - Failing adapter tests first with Atom fixtures and throttle contract.
  - Pass criteria: arXiv items enter the existing pipeline with stable ids, attribution, and safe throttling.
- Completion Record:
  - Pending.

## Check-Debug Loop 8

- Status: Pending
- Scope: Tasks 22-24.
- Verification:
  - Run source adapter tests, worker tests, rate-limit contract checks, and source docs review.
- Completion Record:
  - Pending.

## Task 25: GDELT Radar And RSSHub Whitelist Planning

- Status: Pending
- Objective: Document and configure GDELT as candidate radar only, and RSSHub as explicit whitelist only.
- TDD/Verification:
  - Failing config/docs check first for radar-only and whitelist-only constraints.
  - Pass criteria: no full GDELT ingest or open RSSHub route expansion is introduced.
- Completion Record:
  - Pending.

## Task 26: PostgreSQL Similarity/Dedup Planning

- Status: Pending
- Objective: Define the minimal pg_trgm/pgvector usage for related items and duplicate folding.
- TDD/Verification:
  - Failing migration/query contract tests first for similarity indexes and canonical duplicate behavior.
  - Pass criteria: design remains compatible with PostgreSQL FTS as the main search path.
- Completion Record:
  - Pending.

## Task 27: Related/Duplicate Fold Enhancement

- Status: Pending
- Objective: Implement related item and duplicate folding improvements without replacing existing search.
- TDD/Verification:
  - Failing API/query tests first for duplicate clusters and related item ordering.
  - Pass criteria: duplicates fold predictably and related items improve without breaking existing search endpoints.
- Completion Record:
  - Pending.

## Check-Debug Loop 9

- Status: Pending
- Scope: Tasks 25-27.
- Verification:
  - Run search/query tests, source config checks, migration checks, and relevant API tests.
- Completion Record:
  - Pending.

## Task 28: Final Production Gate Review

- Status: Pending
- Objective: Audit the project across user-facing behavior, API, auth, security, data integrity, ops, AI quality, and docs.
- TDD/Verification:
  - Review-first: enumerate concrete failure candidates, then add regression tests or fixes for confirmed issues.
  - Pass criteria: all blocking production gate issues are fixed or explicitly documented as external-environment blockers.
- Completion Record:
  - Pending.

## Task 29: Public Repo/CI/CD Verification And Release Handoff

- Status: Pending
- Objective: Verify public GitHub repo, branch protection, Actions, image publish, deploy workflow contract, and release handoff docs.
- TDD/Verification:
  - Check actual GitHub workflow status where network/auth allows.
  - Pass criteria: local checks pass, CI/CD expectations are documented, and any remote-only validation gaps are explicit.
- Completion Record:
  - Pending.

## Task 30: Goal Completion Review

- Status: Pending
- Objective: Mark all tasks complete, perform final evidence review, update goal status, and report what shipped.
- TDD/Verification:
  - Pass criteria: `tasks.md` has completion records for every task, final checks are recorded, and the active goal is marked complete only after all required work is done.
- Completion Record:
  - Pending.

## Final Review

- Status: Pending
- Scope: Full second-version goal.
- Verification:
  - Run the broadest feasible local test suite, build, migrations, compose config checks, browser smoke for changed UI, docs review, and security route matrix review.
- Completion Record:
  - Pending.
