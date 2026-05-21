# Goal 10 Tasks

## Task 1: Add Goal Records

- Status: Completed
- Expected result: `goal-10/input.md`, `goal-10/plan.md`, and `goal-10/tasks.md` exist before other source edits.
- Verification: files exist, `input.md` preserves the requested plan, and `git diff --check` passes.
- Completion notes:
  - Created `goal-10/input.md`, `goal-10/plan.md`, and `goal-10/tasks.md` before any production runbook or code changes.
  - Verified all three files exist and `input.md` preserves the requested Goal 10 production launch plan.
  - Ran `git diff --check -- goal-10/input.md goal-10/plan.md goal-10/tasks.md`; no whitespace errors were reported.

## Task 2: Production Readiness Preflight

- Status: Pending
- Expected result: current DNS, GitHub secrets, workflow state, SSH reachability, and production health state are known from real checks.
- Verification: record command evidence for DNS, GitHub, SSH, and HTTPS probes.
- Completion notes:

## Task 3: Server And GitHub Deployment Prerequisites

- Status: Pending
- Expected result: if prerequisites are missing, produce exact non-secret setup checklist for DNS, deploy user, server path, GitHub secrets, and production env; if ready, proceed to deploy.
- Verification: GitHub secrets exist by name, SSH deploy target is reachable, and `/srv/reno_news` is present before deployment.
- Completion notes:

## Large Check After Task 3

- Status: Pending
- Expected result: local production contracts still pass before any real deploy attempt.
- Completion notes:

## Task 4: GitHub Manual Deploy

- Status: Pending
- Expected result: `Deploy` workflow runs against `production` using a concrete image tag and completes successfully.
- Verification: GitHub Actions run log shows remote SSH command, migration, Compose up, and health checks passing.
- Completion notes:

## Task 5: Production Health And Chrome Acceptance

- Status: Pending
- Expected result: `https://news.blankhoney.xyz` serves Web/API/worker health and key Reader/Admin pages in Chrome.
- Verification: curl health probes pass and Chrome screenshots are saved under `/tmp/reno_news_goal10_*`.
- Completion notes:

## Task 6: R2 Backup Restore Drill

- Status: Pending
- Expected result: production backup uploads to Cloudflare R2 and a downloaded dump restores into a disposable database.
- Verification: backup command output, downloaded object path, and restore drill output are recorded without secrets.
- Completion notes:

## Large Check After Task 6

- Status: Pending
- Expected result: production health, deploy, backup, and local contracts are still consistent.
- Completion notes:

## Task 7: Resend Alert Test

- Status: Pending
- Expected result: Resend domain is verified and a test alert is sent to `13608729270@163.com`.
- Verification: record delivery evidence without exposing the Resend API key.
- Completion notes:

## Task 8: Rollback Readiness Drill

- Status: Pending
- Expected result: rollback state files exist; if a previous image tag exists, run a controlled rollback drill.
- Verification: current/previous image tags and health after rollback are recorded; if unavailable, record first-deploy limitation.
- Completion notes:

## Task 9: Production Evidence Documentation

- Status: Pending
- Expected result: production runbooks and gate review reflect real evidence and remaining blockers without claiming unverified success.
- Verification: production docs checks, stale blocker search, and `git diff --check`.
- Completion notes:

## Final Review

- Status: Pending
- Expected result: production launch status is factually classified as complete or blocked with exact remaining actions.
- Completion notes:
