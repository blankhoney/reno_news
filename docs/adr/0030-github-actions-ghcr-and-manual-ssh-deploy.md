# GitHub Actions uses GHCR and manual SSH deploy

The project will use GitHub Actions as the repository CI/CD control plane. Pull requests and pushes to `main` run lint, tests, builds, worker tests, PostgreSQL integration tests, and Docker Compose config validation. Pushes to `main`, version tags, or manual dispatches publish `web`, `api`, and `worker` images to GHCR.

Deployment starts as a manual GitHub Actions workflow using the `production` environment and explicit deployment secrets. The workflow must not hard-code any server, domain, SSH key, or remote command. A production operator must configure `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, and `DEPLOY_COMMAND` before the deploy workflow can mutate a host.

This keeps the repository ready for GitHub-hosted CI, reproducible image publishing, and a controlled deployment handoff without inventing a VPS layout or production credential policy inside source code. Branch protection, production environment protection, remote backup, monitoring, alerting, auth/RBAC, Admin identity, audit logs, and incident response remain separate operational decisions.
