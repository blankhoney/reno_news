# Release Health Audit

This runbook covers the MVP local Release Health Audit. It is a Release Gate over current repository checks, worker checks, Compose service state, health probes, and backup/restore readiness.

It is local and non-deploying. It is not a production deploy, image push, GitHub release, remote monitoring integration, alerting system, approval workflow, or production backup scheduler.

## Prerequisites

- Run from the repository root.
- `pnpm`, `uv`, Docker, and Docker Compose are available.
- Docker Compose services are already running from `infra/compose/compose.yml`.
- The `postgres`, `redis`, `web`, `api`, and `worker` services are healthy.

## Run Audit

```bash
pnpm release:audit:local
```

The audit runs:

- `pnpm install --frozen-lockfile`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- worker unit tests through `uv`
- worker `uv lock --check`
- `docker compose ps --format json`
- direct health probes for web, API, and worker
- Caddy health probes for web, API, and worker
- backup/restore readiness checks for the Issue 022 scripts and runbook

## Expected Evidence

Successful output ends with:

```text
Release Health Audit OK
```

The audit should fail before that line if any command, Compose service state, health endpoint, or backup/restore readiness check is missing.

## Failure Handling

- If package checks fail, fix the reported test, type, lint, or build error first.
- If worker checks fail, inspect `services/worker` tests and lockfile consistency.
- If Compose status fails, inspect `docker compose -f infra/compose/compose.yml ps`.
- If a health probe fails, inspect the matching service logs before retrying.
- If backup/restore readiness fails, restore the Issue 022 scripts or `docs/ops/backup-restore.md`.

Rollback references:

- Use `docs/ops/backup-restore.md` before risky database work.
- Revert only the local release audit files if the audit command itself is broken.
- Leave the primary database and running Compose stack unchanged unless a later issue explicitly scopes runtime changes.

## Limitations

- The audit does not start or update Docker Compose services.
- The audit does not create a new Backup Snapshot or run a Restore Drill.
- The audit does not publish images, create releases, update CI permissions, call remote monitors, send alerts, or deploy to production.
- The audit does not replace code review, security review, incident response, or a future production release process.
