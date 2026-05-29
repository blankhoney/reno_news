# Public Repo CI/CD Release Handoff

This handoff records the Task 29 GitHub repository and CI/CD verification state. It is an operational handoff, not a production deployment approval.

## Repository State

- Repository: `https://github.com/blankhoney/reno_news`.
- Visibility: public.
- Default branch: `main`.
- Local remote: `origin` points to `https://github.com/blankhoney/reno_news.git`.
- Current local note: re-run the verification commands after every push and before every manual production deploy.

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
- production environment secrets are configured for `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, and `DEPLOY_COMMAND`; secret values are not recorded in this repository.

## Workflows

Observed active workflows:

- `CI`;
- `Deploy`;
- `Publish Images`.

Goal 11 observed successful `CI` and `Publish Images` runs before the hardened production deploy. `Deploy` is manual-only and has been used for protected production deploys and operational evidence runs.

Important observed deploy runs:

- `26529386088`: hardened ingress deploy for image tag `sha-cd632d9`;
- `26529984489`: production source import;
- `26530231824`: production ingest report;
- `26530509036`: server-local backup/restore drill;
- `26530833133`: controlled rollback drill.

## Secrets And Packages

Production environment deploy secrets are configured in GitHub. They must stay in GitHub settings only and must not be copied into source control, docs, logs, screenshots, or chat.

GHCR image access was verified operationally by production deploy and rollback pulls. Package version listing through the local `gh` token may still require `read:packages`, so package inventory should be verified from GitHub Packages UI or a token with that scope when needed.

## Release Handoff Steps

Before a production release handoff:

1. Push the local branch and wait for `CI` and `Publish Images` on the pushed commit.
2. Confirm all required branch-protection checks pass on `main`.
3. Confirm `DEPLOY_COMMAND` is the normal edge deploy command, not a temporary operational command from a prior evidence run.
4. Trigger `Deploy` manually from GitHub with an image tag such as `sha-<commit>`.
5. Re-run the final production gate review before claiming full production launch readiness.

## Remaining Gaps

- Local retained backup timer artifacts exist for server-local dumps, but off-host object-store backup and off-host restore drill are not configured.
- Resend alert delivery is blocked because `send.blankhoney.xyz` is not verified in Resend.
- No remote monitoring, Alertmanager receiver, paging channel, live MiniMax smoke, security hardening review, or incident owner has been verified.
- GHCR package version API verification may require a token with `read:packages`; production pulls have been verified by deploy runs.

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
