# Public Repo CI/CD Release Handoff

This handoff records the Task 29 GitHub repository and CI/CD verification state. It is an operational handoff, not a production deployment approval.

## Repository State

- Repository: `https://github.com/blankhoney/reno_news`.
- Visibility: public.
- Default branch: `main`.
- Local remote: `origin` points to `https://github.com/blankhoney/reno_news.git`.
- Current local note: during this review, local `main` was ahead of `origin/main`; re-run the verification commands after every push.

## Branch And Environment Protection

Observed `main` branch protection:

- required status checks are strict;
- required checks: `JavaScript lint, test, build`, `Python worker tests`, `PostgreSQL integration tests`, and `Docker Compose config`;
- pull request review is required;
- stale reviews are dismissed;
- conversation resolution is required;
- force pushes and branch deletion are blocked.

Observed `production` environment protection:

- required reviewer: `blankhoney`;
- deployment branch policy accepts protected branches only;
- repository secrets count: `0`;
- production environment secrets count: `0`.

## Workflows

Observed active workflows:

- `CI`;
- `Deploy`;
- `Publish Images`.

The latest observed remote `CI` and `Publish Images` runs before the local V2 push were successful on `main` for commit `e7b195537f4a242cffe1c75f37ab81002298ed28`.

`Deploy` is manual-only and had no observed runs during this handoff. That is expected until deployment secrets and a server command are configured.

## Secrets And Packages

No repository-level or `production` environment secrets were configured during this review. A real deployment remains blocked until `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, and `DEPLOY_COMMAND` are configured in GitHub.

GHCR package version listing could not be verified through the local `gh` token because the token lacks `read:packages`. Image publishing is therefore verified through the successful `Publish Images` workflow history and workflow contract, not through the package versions API.

## Release Handoff Steps

Before a real release handoff:

1. Push the local branch and wait for `CI` and `Publish Images` on the pushed commit.
2. Confirm all required branch-protection checks pass on `main`.
3. Configure deployment secrets only in GitHub repository or environment settings.
4. Trigger `Deploy` manually from GitHub only after a VPS layout, domain/TLS endpoint, server env, object-store backup target, rollback owner, and incident owner exist.
5. Re-run the final production gate review before claiming production launch readiness.

## Remaining Gaps

- No deployment secrets are configured.
- No production deploy run has been observed.
- No GHCR package version API verification is available with the current token scope.
- No production VPS, domain, remote monitoring, alert delivery, object-store backup, off-host restore drill, live MiniMax smoke, or incident owner has been verified.

## Verification

Local handoff contract:

```bash
pnpm release:handoff:check
```

Remote verification commands used for this handoff:

```bash
gh repo view blankhoney/reno_news --json nameWithOwner,visibility,isPrivate,defaultBranchRef,url,viewerPermission
gh workflow list --repo blankhoney/reno_news
gh run list --repo blankhoney/reno_news --limit 10
gh api repos/blankhoney/reno_news/branches/main/protection
gh api repos/blankhoney/reno_news/environments
gh api repos/blankhoney/reno_news/environments/production
gh api repos/blankhoney/reno_news/actions/secrets --jq '.total_count'
gh api repos/blankhoney/reno_news/environments/production/secrets --jq '.total_count'
```
