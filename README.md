# Reno News

[中文说明](./README.zh-CN.md)

Reno News is a Chinese-first public intelligence reading system. The current implementation covers infrastructure, SQL migrations, Source Registry, Source Policy, RSS/Atom metadata ingest, extraction, AI draft foundations, API-owned auth sessions and role guards, Web login/logout BFF routes, audit events, admin/debug views with source policy editing, failure inspection, raw-entry hide/restore, feedback review, reader home/board listings with pagination, reader item detail pages with related items, source/board-diverse digest preview, persisted digest editions, PostgreSQL reader search, item-scoped feedback capture, backend personal state for authenticated users, local anonymous saved/read-later state, Web BFF proxy routes for reader personal-state hydration, and reader-visible development seed marking.

## Requirements

- Node.js 22+
- pnpm 11+
- uv 0.11+
- Docker 29+ with Docker Compose

## Install

```bash
pnpm install
```

## Local Checks

```bash
pnpm lint
pnpm test
pnpm build
cd services/worker
uv run python -m unittest discover -s tests
```

## GitHub CI/CD

GitHub Actions now covers the repository quality gate, container image publishing, and a manual production deployment handoff.

- CI: `.github/workflows/ci.yml` runs JavaScript lint/tests/build, Python worker tests, PostgreSQL integration tests, and Docker Compose config validation on pull requests and pushes to `main`.
- Image publishing: `.github/workflows/docker-publish.yml` builds and publishes `web`, `api`, and `worker` images to GHCR on pushes to `main`, version tags, or manual dispatch.
- Deploy: `.github/workflows/deploy.yml` is manual-only, uses the `production` environment, and requires `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, and `DEPLOY_COMMAND`.

See `docs/ops/github-cicd.md`.

## Database

With the Compose PostgreSQL service running:

```bash
DATABASE_URL=postgres://reno_news:reno_news@localhost:5432/reno_news pnpm db:migrate
DATABASE_URL=postgres://reno_news:reno_news@localhost:5432/reno_news pnpm db:seed
```

The local dev seed creates development-only login accounts for manual testing:

- `admin@example.invalid`
- `reader@example.invalid`
- Password: `reno-news-dev-password`

These accounts are local seed data only and must not be treated as production credentials or copied into production configuration.

Local API and worker processes use the same variable:

```bash
DATABASE_URL=postgres://reno_news:reno_news@localhost:5432/reno_news
```

Manual local backup and restore drill:

```bash
pnpm db:backup:local
pnpm db:restore:drill backups/<dump-file>.dump
```

The backup script writes PostgreSQL custom-format dumps to ignored `backups/`. The restore drill uses a disposable database target and drops it on exit. See `docs/ops/backup-restore.md`.

Manual local release health audit:

```bash
pnpm release:audit:local
```

The release audit runs existing repo checks, worker checks, Compose status, direct/Caddy health probes, and backup/restore readiness checks without deploying or publishing anything. See `docs/ops/release-health-audit.md`.

Manual local disk usage guard:

```bash
pnpm disk:check:local
```

The disk usage guard reports Docker disk usage and local backup artifact size without pruning or deleting anything. Compose services also define bounded local log retention. See `docs/ops/disk-usage.md`.

Manual local production audit report:

```bash
pnpm release:audit:local
pnpm disk:check:local
```

The production audit report gathers current readiness evidence and residual production gaps without approving launch or adding deployment behavior. See `docs/ops/production-audit.md`.

## Local Services

```bash
docker compose -f infra/compose/compose.yml up --build
```

The local Compose stack mounts current `apps/`, `packages/`, and worker source files into the long-running development containers. After code changes, this lets a local operator refresh web/API/worker/scheduler without rebuilding images:

```bash
docker compose -f infra/compose/compose.yml up -d --no-build --force-recreate web api worker scheduler caddy
```

Health endpoints:

- Web: `http://localhost:3000/healthz`
- API: `http://localhost:3001/healthz`
- Worker: `http://localhost:3002/healthz`
- Caddy web proxy: `http://localhost:8080/healthz`
- Caddy API proxy: `http://localhost:8080/api/healthz`
- Caddy worker proxy: `http://localhost:8080/worker/healthz`

Admin/debug endpoints:

- Web login: `http://localhost:3000/login?next=/admin`
- Web admin: `http://localhost:3000/admin`
- Web source detail and policy form: `http://localhost:3000/admin/sources/1`
- Web raw entry detail and hide/restore form: `http://localhost:3000/admin/raw-entries/1`
- Web failure queue: `http://localhost:3000/admin/failures`
- Web feedback queue: `http://localhost:3000/admin/feedback`
- API auth login: `POST http://localhost:3001/auth/login`
- API current user: `http://localhost:3001/auth/me`
- Web BFF auth login: `POST http://localhost:3000/api/auth/login`
- Web BFF auth logout: `POST http://localhost:3000/api/auth/logout`
- Web BFF current user: `http://localhost:3000/api/auth/me`
- API sources: `http://localhost:3001/sources`
- API raw entries: `http://localhost:3001/raw-entries`
- API raw entry hide/restore: `PATCH http://localhost:3001/raw-entries/:id`
- API failure queue: `http://localhost:3001/admin/failures`
- API feedback queue: `http://localhost:3001/admin/feedback`
- API feedback review: `PATCH http://localhost:3001/admin/feedback/:id`
- Worker manual ingest: `POST http://localhost:3002/ingest/source/:id`

Reader endpoints:

- Web reader home: `http://localhost:3000/`
- Web reader board: `http://localhost:3000/boards/ai`
- Web reader search: `http://localhost:3000/search?q=Sample`
- Web reader digest: `http://localhost:3000/digest`
- Web reader item detail: `http://localhost:3000/items/1`
- Web reader personal space: `http://localhost:3000/personal`
- API reader boards: `http://localhost:3001/reader/boards`
- API reader items: `http://localhost:3001/reader/items?limit=25&offset=0`
- API reader search: `http://localhost:3001/reader/search?q=Sample&limit=25&offset=0`
- API reader digest: `http://localhost:3001/reader/digest`
- API reader item detail: `http://localhost:3001/reader/items/1`
- API reader related items: `http://localhost:3001/reader/items/1/related`
- API reader item feedback: `POST http://localhost:3001/reader/items/1/feedback`
- API reader personal state: `http://localhost:3001/reader/personal-state`
- API digest editions: `http://localhost:3001/admin/digest-editions`
- Web BFF personal state: `http://localhost:3000/api/reader/personal-state`
- Web BFF item hydration: `http://localhost:3000/api/reader/items/1`

## Scope Boundary

Admin policy edits mutate the current Source Policy only. Raw-entry hide/restore mutates the current raw-entry lifecycle only and does not add moderation history. The failure queue is a read-only projection over existing attempt and model-call logs; there is no retry, acknowledgement, resolution workflow, policy history table, or approval workflow. API-owned auth sessions, role guards, Web login/logout entrypoints, and audit events exist, but there is no public signup, OAuth provider, password reset flow, or full production Admin identity workflow.

Authenticated reader personal state is stored through API routes and proxied by the Web app; anonymous saved/read-later state remains browser-local. Personal state does not affect ranking, digest inclusion, moderation, or public popularity. Reader feedback is stored as append-only item-scoped events; Digest preview consumes eligible feedback only as a bounded ordering penalty. Admin feedback review can mark one feedback event as `open`, `reviewed`, `dismissed`, or `resolved`; only `dismissed` changes penalty eligibility, and review does not hide, restore, delete, moderate, personalize, change search order, or mutate raw-entry lifecycle.

Reader list and search pagination use bounded `limit` and `offset` over PostgreSQL reader-safe metadata and summary fields. Reader item cards/details expose `isDevelopmentSeed` so local seed samples can be marked as `Development sample`; the marker does not hide, filter, rank, or promote seed data. Related items, search, and digest preview do not expose extracted full text, translation draft full text, private model payloads, feedback events, or admin diagnostics. Digest preview uses best-effort source and board diversity, while Digest Editions are persisted replay snapshots; neither adds email delivery, scheduler-driven digest generation, editorial publishing workflow, or personalized recommendations.

Local backup/restore support is a manual PostgreSQL dump and disposable restore drill only; it does not add production scheduling, remote storage, monitoring, alerting, WAL archiving, or point-in-time recovery. GitHub CI/CD provides quality gates, GHCR image publishing, and a manual SSH deployment handoff, but no server, domain, production secrets, monitoring, alerting, backup schedule, or launch approval is encoded in the repo. Local release health audit and disk usage guard support remain local readiness tools. The current reader surface still does not implement public publishing workflow, browser automation, semantic/vector search, external search services, search extension deployment, moderation workflow, trust weighting, reader reply workflow, or non-RSS adapters. Translation drafts are not public reader copy. Those remain gated by `docs/CODEX_MASTER_PLAN.md`.
