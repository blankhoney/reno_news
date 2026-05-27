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
  - Initial preflight used the original requested VPS target `205.186.67.177` / `2400:8d60:0003:0000:0000:0001:6661:0ce4`.
  - Operator corrected the target afterward: use IPv4-only `43.130.244.175`; no IPv6 record should be configured for this launch.
  - Checked `news.blankhoney.xyz` DNS from this local environment: A currently resolves to `198.18.0.54`, and no AAAA record was returned. The operator reports the intended authoritative A target is `43.130.244.175`; local resolver behavior must be treated as inconclusive until DNS is verified from a trusted resolver or DNS provider panel.
  - Checked `blankhoney.xyz` nameservers: Porkbun nameservers are active.
  - Checked `send.blankhoney.xyz`: MX points to `feedback-smtp.ap-northeast-1.amazonses.com.` and TXT includes `v=spf1 include:amazonses.com ~all`; DKIM-specific CNAME/TXT records still need to be verified from the Resend dashboard values.
  - Checked GitHub workflows: `CI`, `Deploy`, and `Publish Images` are active.
  - Checked GitHub secrets: repository secrets and `production` environment secrets currently list no configured values.
  - Checked recent GitHub runs: latest observed `CI` and `Publish Images` runs on `main` were successful before Goal 10.
  - Rechecked corrected VPS ports: `43.130.244.175` has ports 22, 80, and 443 open.
  - Checked SSH reachability for `deploy@43.130.244.175`: host key is present locally, but authentication fails with `Permission denied (publickey)`, so deploy user key setup is still required.
  - Current ED25519 fingerprint observed for `43.130.244.175`: `SHA256:0zU9NtCHAnPiHhwUoDqAsEENtty7cXDKx3LKKiyvgLY`.
  - Checked production HTTP health by corrected IPv4: `/healthz`, `/api/healthz`, and `/worker/healthz` return Caddy `308 Permanent Redirect` to HTTPS.
  - Checked HTTPS via `--resolve news.blankhoney.xyz:443:43.130.244.175`: TLS fails with `tlsv1 alert internal error`, so Caddy is reachable but not serving a valid Reno News HTTPS health response yet.
  - Checked production HTTPS health by domain: `/healthz`, `/api/healthz`, and `/worker/healthz` fail with TLS internal error.
  - Current status: real production deploy is blocked by GitHub deploy secrets, deploy SSH key access, server-side app/env readiness, and trusted DNS/TLS verification for `news.blankhoney.xyz`.

## Task 3: Server And GitHub Deployment Prerequisites

- Status: Completed
- Expected result: if prerequisites are missing, produce exact non-secret setup checklist for DNS, deploy user, server path, GitHub secrets, and production env; if ready, proceed to deploy.
- Verification: GitHub secrets exist by name, SSH deploy target is reachable, and `/srv/reno_news` is present before deployment.
- Completion notes:
  - Added `goal-10/setup-checklist.md` with only non-secret production values and operator setup steps for DNS, VPS, SSH trust, GitHub production secrets, server env, Cloudflare R2 backup, and Resend alerts.
  - Updated the checklist after operator correction: production VPS is IPv4-only `43.130.244.175`; no AAAA record is required.
  - Found a production Compose defect before deploy: `Caddyfile.production` reads `RENO_NEWS_SITE_ADDRESS`, but the caddy service did not receive that environment value.
  - Added a failing production Compose contract check for caddy receiving `RENO_NEWS_SITE_ADDRESS`, then fixed `infra/compose/compose.production.yml` to pass the variable into caddy.
  - Verified rendered production Compose now includes `RENO_NEWS_SITE_ADDRESS` for caddy.
  - Current deployment remains blocked until the operator configures/validates DNS, GitHub production secrets, deploy SSH key access, server env, R2 credentials, and Resend verification.

## Large Check After Task 3

- Status: Completed
- Expected result: local production contracts still pass before any real deploy attempt.
- Completion notes:
  - Ran `pnpm compose:production:check`; passed.
  - Ran `pnpm deploy:contract:check`; passed.
  - Ran `pnpm backup:offhost:check`; passed.
  - Ran `pnpm alerts:check`; passed.
  - Ran `pnpm production:gate:check`; passed.
  - Ran `git diff --check`; no whitespace errors were reported.

## Task 4: GitHub Manual Deploy

- Status: Blocked
- Expected result: `Deploy` workflow runs against `production` using a concrete image tag and completes successfully.
- Verification: GitHub Actions run log shows remote SSH command, migration, Compose up, and health checks passing.
- Completion notes:
  - Did not trigger `Deploy`; current production prerequisites are missing and the workflow would fail before remote deploy.
  - GitHub `production` environment secrets currently list no configured values, so `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, and `DEPLOY_COMMAND` are absent.
  - `news.blankhoney.xyz` still resolves to `198.18.0.54` in this local environment instead of the corrected VPS target `43.130.244.175`; verify DNS from the provider panel or a trusted resolver before deploy.
  - Local `main` is ahead of `origin/main`, including Goal 4 through Goal 10 work. A push/PR and successful `CI` plus `Publish Images` are required before the GitHub deploy can use the current code.
  - Recovery condition: confirm DNS points to `43.130.244.175`, configure deploy SSH key access, configure GitHub production secrets, push/merge current code to `main`, wait for `CI` and `Publish Images`, then rerun this task.

## Task 4A: Existing Edge Caddy Ingress Recovery

- Status: Completed
- Expected result: Reno News can deploy behind the existing `myrss-edge-caddy-1` public Caddy without binding host ports 80/443 itself.
- Verification: production compose contracts cover an edge-managed ingress mode; deploy script can skip the Reno-owned Caddy service in that mode; edge Caddy config is documented without secrets.
- Completion notes:
  - Operator-side inspection found `myrss-edge-caddy-1` already owns public 80/443 and imports `/srv/caddy-conf.d/*.caddy`.
  - Existing `blog.blankhoney.xyz` reaches `brianstorm-web:3000` because that app container is also attached to the edge Caddy network `myrss-app`.
  - Reno News containers currently run only on `compose_default`, so the edge Caddy cannot reach `compose-web-1`, `compose-api-1`, or `compose-worker-1`.
  - The recovery path is to add an edge-managed ingress mode: connect web/API/worker to `myrss-app` with stable aliases, provide a `news.blankhoney.xyz` edge Caddy snippet, and deploy without starting Reno News' own Caddy service.
  - Added `infra/compose/compose.edge.yml` to attach web/API/worker to the external edge network with stable aliases and keep the project Caddy behind a disabled profile.
  - Added `infra/compose/Caddyfile.edge-news` for the existing edge Caddy import directory.
  - Updated `scripts/deploy-production.sh` with `RENO_NEWS_INGRESS_MODE=edge`, so deploys can skip and remove the project Caddy service while still running migrations, app services, health checks, and rollback.
  - Updated production compose and deploy contract checks to cover both dedicated and edge-managed ingress modes.
  - Ran `pnpm compose:production:check`; passed.
  - Ran `RENO_NEWS_EDGE_NETWORK=myrss-app pnpm compose:production:check`; passed.
  - Ran `pnpm deploy:contract:check`; passed.
  - Ran `pnpm production:gate:check`; passed.
  - Ran edge and dedicated deploy dry-runs with `DRY_RUN=1`; both produced the expected service lists.
  - Ran `git diff --check`; passed.
  - Local Caddy syntax validation through Docker could not run because the local Docker daemon is unavailable; validate `infra/compose/Caddyfile.edge-news` inside `myrss-edge-caddy-1` before reloading the edge Caddy.

## Task 5: Production Health And Chrome Acceptance

- Status: Blocked
- Expected result: `https://news.blankhoney.xyz` serves Web/API/worker health and key Reader/Admin pages in Chrome.
- Verification: curl health probes pass and Chrome screenshots are saved under `/tmp/reno_news_goal10_*`.
- Completion notes:
  - Blocked by Task 4. Current HTTPS checks for `news.blankhoney.xyz` fail with TLS internal error and cannot serve Reno News pages.

## Task 6: R2 Backup Restore Drill

- Status: Blocked
- Expected result: production backup uploads to Cloudflare R2 and a downloaded dump restores into a disposable database.
- Verification: backup command output, downloaded object path, and restore drill output are recorded without secrets.
- Completion notes:
  - Blocked until server production environment and R2 credentials are configured outside the repository.

## Large Check After Task 6

- Status: Blocked
- Expected result: production health, deploy, backup, and local contracts are still consistent.
- Completion notes:
  - Blocked because Tasks 4-6 could not run against production.

## Task 7: Resend Alert Test

- Status: Blocked
- Expected result: Resend domain is verified and a test alert is sent to `13608729270@163.com`.
- Verification: record delivery evidence without exposing the Resend API key.
- Completion notes:
  - Blocked until Resend dashboard verification for `send.blankhoney.xyz` is confirmed and a Resend API/SMTP key is configured outside the repository.

## Task 8: Rollback Readiness Drill

- Status: Blocked
- Expected result: rollback state files exist; if a previous image tag exists, run a controlled rollback drill.
- Verification: current/previous image tags and health after rollback are recorded; if unavailable, record first-deploy limitation.
- Completion notes:
  - Blocked until at least one successful production deploy records `.deploy/current-image-tag`. A previous image tag may not exist on the first launch.

## Task 9: Production Evidence Documentation

- Status: Blocked
- Expected result: production runbooks and gate review reflect real evidence and remaining blockers without claiming unverified success.
- Verification: production docs checks, stale blocker search, and `git diff --check`.
- Completion notes:
  - Blocked from converting production runbooks into success evidence because no real deploy, production health, R2 restore drill, Resend alert, or rollback drill has passed.
  - Do not update `docs/ops/production-audit.md`, `production-deploy.md`, `release-handoff.md`, or `final-production-gate-review.md` to claim launch readiness until Tasks 4-8 pass.

## Final Review

- Status: Blocked
- Expected result: production launch status is factually classified as complete or blocked with exact remaining actions.
- Completion notes:
  - Current classification: production launch is blocked, not complete.
  - Remaining required actions are recorded in `goal-10/setup-checklist.md` and Task 4 recovery notes.
