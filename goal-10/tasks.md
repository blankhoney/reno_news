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

- Status: Completed
- Expected result: current DNS, GitHub secrets, workflow state, SSH reachability, and production health state are known from real checks.
- Verification: record command evidence for DNS, GitHub, SSH, and HTTPS probes.
- Completion notes:
  - Checked `news.blankhoney.xyz` DNS: A currently resolves to `198.18.0.54`, not the target VPS `205.186.67.177`; no AAAA record was returned for the target IPv6.
  - Checked `blankhoney.xyz` nameservers: Porkbun nameservers are active.
  - Checked `send.blankhoney.xyz`: MX points to `feedback-smtp.ap-northeast-1.amazonses.com.` and TXT includes `v=spf1 include:amazonses.com ~all`; DKIM-specific CNAME/TXT records still need to be verified from the Resend dashboard values.
  - Checked GitHub workflows: `CI`, `Deploy`, and `Publish Images` are active.
  - Checked GitHub secrets: repository secrets and `production` environment secrets currently list no configured values.
  - Checked recent GitHub runs: latest observed `CI` and `Publish Images` runs on `main` were successful before Goal 10.
  - Checked VPS ports: `205.186.67.177` has ports 22, 80, and 443 open.
  - Checked SSH reachability for `deploy@205.186.67.177`: blocked by local SSH host-key mismatch. Existing `known_hosts` entries do not match the current ED25519 fingerprint `SHA256:ot9wN93KiyAzDbUeGpwAOw2MzGQNRdTNfmmYLsVsGjA`; this requires operator confirmation before replacing local known-host data.
  - Checked production HTTP health by IPv4: `/healthz`, `/api/healthz`, and `/worker/healthz` return empty replies, not Reno News health payloads.
  - Checked production HTTPS health by domain: `/healthz`, `/api/healthz`, and `/worker/healthz` fail with TLS internal error.
  - Current status: real production deploy is blocked by DNS, GitHub deploy secrets, SSH trust confirmation, and server-side app/env readiness.

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
