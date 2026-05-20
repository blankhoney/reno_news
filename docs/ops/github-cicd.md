# GitHub CI/CD

This runbook covers the GitHub repository and CI/CD flow for Reno News.

## Repository

Canonical repository:

```text
https://github.com/blankhoney/reno_news
```

The repository should use `main` as the default branch. Keep it private until production access, source licensing, and publication policy are explicitly reviewed.

## Workflows

### CI

File: `.github/workflows/ci.yml`

Triggers:

- pull requests
- pushes to `main`

Checks:

- JavaScript install, lint, tests, and build
- Python worker lock verification and tests
- PostgreSQL migration, seed, and integration tests
- Docker Compose config rendering

Recommended branch protection for `main`:

- require pull request before merge
- require branch to be up to date before merge
- require these status checks:
  - `JavaScript lint, test, build`
  - `Python worker tests`
  - `PostgreSQL integration tests`
  - `Docker Compose config`
- block force pushes and branch deletion

### Image Publishing

File: `.github/workflows/docker-publish.yml`

Triggers:

- pushes to `main`
- tags matching `v*`
- manual workflow dispatch

Published images:

- `ghcr.io/blankhoney/reno-news-web`
- `ghcr.io/blankhoney/reno-news-api`
- `ghcr.io/blankhoney/reno-news-worker`

Tags include:

- `latest` on the default branch
- `sha-<commit>`
- branch name
- version tag

### Production Deploy

File: `.github/workflows/deploy.yml`

Trigger:

- manual workflow dispatch only

Environment:

- `production`

Required repository or environment secrets:

- `DEPLOY_HOST`
- `DEPLOY_USER`
- `DEPLOY_SSH_KEY`
- `DEPLOY_COMMAND`

The workflow passes the selected image tag to the remote command as:

```text
RENO_NEWS_IMAGE_TAG
```

Example remote command shape:

```bash
cd /srv/reno_news && ./deploy.sh "$RENO_NEWS_IMAGE_TAG"
```

Keep the real command in GitHub secrets or environment secrets, not in the repository.

## Initial GitHub Setup

From the repository root:

```bash
gh repo create blankhoney/reno_news --private --source=. --remote=origin --push
```

After creation:

```bash
gh repo edit blankhoney/reno_news --enable-issues=true --enable-wiki=false
```

Then configure branch protection and the `production` environment in GitHub repository settings.

## Verification

After pushing to GitHub:

```bash
gh run list --repo blankhoney/reno_news --limit 10
gh run watch --repo blankhoney/reno_news
```

Expected behavior:

- CI runs for pushes and pull requests.
- Image publishing runs after pushes to `main` and publishes all three GHCR images.
- Deploy is available manually but fails early until all required deployment secrets are configured.

## Limitations

- This flow does not create a production server.
- This flow does not configure production secrets automatically.
- This flow does not create remote monitoring, alerting, production backups, auth/RBAC, Admin identity, or audit logs.
- A real deployment remains blocked until a server layout, domain, TLS entrypoint, environment variables, backup target, rollback command, and incident owner are explicitly configured.
