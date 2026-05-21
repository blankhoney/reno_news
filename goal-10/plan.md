# Goal 10 Plan

## Requirement

Move the project from local readiness contracts to a real production launch attempt on `news.blankhoney.xyz`, using the prepared IPv4-only VPS, GitHub manual Deploy workflow, Cloudflare R2 backups, and Resend alert email.

## Current Context

- The repository already has CI, GHCR image publishing, a manual Deploy workflow, production Compose overlays, local release-health audit scripts, off-host backup scripts, alert-rule contracts, and production gate documentation.
- Current GitHub deploy secrets were previously observed as absent; this must be rechecked before any deploy attempt.
- The operator corrected the production VPS target after the original request: use IPv4 `43.130.244.175` and do not configure an IPv6 record for this launch.
- Production secrets must not be written into the repo or chat.
- Production launch is blocked unless DNS, GitHub secrets, server env, R2, and Resend are all configured and verifiable.

## Risks

- Public DNS or the local resolver may not yet return `43.130.244.175`, so Caddy TLS and production health checks may fail.
- SSH access may not exist from GitHub or this local environment until the `deploy` user and key are configured.
- GitHub Deploy can fail if `DEPLOY_COMMAND` is wrong, the server path is missing, Docker permissions are missing, or GHCR image pulls are unauthorized.
- Production database migrations are image-level rollback only; destructive migrations remain out of scope.
- R2 and Resend cannot be verified without secrets configured outside the repository.
- Documentation must not claim production success until real checks pass.

## Execution Approach

1. Create Goal Mode files before any code or documentation edits.
2. Recheck local contracts and external readiness: DNS, GitHub secrets, workflows, SSH reachability, production endpoint health, and current documentation gap state.
3. If external prerequisites are missing, record exact blockers and provide setup commands/checklists without mutating production.
4. If prerequisites are ready, trigger GitHub `Deploy` manually with a concrete image tag and monitor logs.
5. Verify production health, reader/admin pages, R2 backup/restore drill, Resend test alert, and rollback state.
6. Update production runbooks and gate review only with evidence that was actually collected.

## Verification

- `pnpm compose:production:check`
- `pnpm deploy:contract:check`
- `pnpm backup:offhost:check`
- `pnpm alerts:check`
- `pnpm production:gate:check`
- `git diff --check`
- DNS/TLS probes for `news.blankhoney.xyz`
- GitHub Deploy run log
- Chrome screenshots under `/tmp/reno_news_goal10_*`
- R2 backup upload and restore drill output
- Resend test alert delivery evidence

## Rollback

- If deploy health fails, rely on `scripts/deploy-production.sh` rollback to `.deploy/previous-image-tag` when available.
- If no previous tag exists because this is the first deploy, do not mark rollback complete; record that the next deploy must run a controlled rollback drill.
- If DNS/TLS fails, revert DNS records or point them away from the VPS; do not change app code.
- If backup or alert verification fails, keep production launch marked blocked until R2 or Resend configuration is repaired.
