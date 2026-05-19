# Reno News

Reno News is a Chinese-first public intelligence reading system. The current implementation covers infrastructure, SQL migrations, Source Registry, Source Policy, RSS/Atom metadata ingest, extraction, AI draft foundations, admin/debug views with source policy editing, failure inspection, raw-entry hide/restore, reader feedback inspection, reader home/board listings, reader item detail pages, PostgreSQL reader search, item-scoped feedback capture, and local saved/read-later state.

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

## Database

With the Compose PostgreSQL service running:

```bash
DATABASE_URL=postgres://reno_news:reno_news@localhost:5432/reno_news pnpm db:migrate
DATABASE_URL=postgres://reno_news:reno_news@localhost:5432/reno_news pnpm db:seed
```

Local API and worker processes use the same variable:

```bash
DATABASE_URL=postgres://reno_news:reno_news@localhost:5432/reno_news
```

## Local Services

```bash
docker compose -f infra/compose/compose.yml up --build
```

Health endpoints:

- Web: `http://localhost:3000/healthz`
- API: `http://localhost:3001/healthz`
- Worker: `http://localhost:3002/healthz`
- Caddy web proxy: `http://localhost:8080/healthz`
- Caddy API proxy: `http://localhost:8080/api/healthz`
- Caddy worker proxy: `http://localhost:8080/worker/healthz`

Admin/debug endpoints:

- Web admin: `http://localhost:3000/admin`
- Web source detail and policy form: `http://localhost:3000/admin/sources/1`
- Web raw entry detail and hide/restore form: `http://localhost:3000/admin/raw-entries/1`
- Web failure queue: `http://localhost:3000/admin/failures`
- Web feedback queue: `http://localhost:3000/admin/feedback`
- API sources: `http://localhost:3001/sources`
- API raw entries: `http://localhost:3001/raw-entries`
- API raw entry hide/restore: `PATCH http://localhost:3001/raw-entries/:id`
- API failure queue: `http://localhost:3001/admin/failures`
- API feedback queue: `http://localhost:3001/admin/feedback`
- Worker manual ingest: `POST http://localhost:3002/ingest/source/:id`

Reader endpoints:

- Web reader home: `http://localhost:3000/`
- Web reader board: `http://localhost:3000/boards/ai`
- Web reader search: `http://localhost:3000/search?q=Sample`
- Web reader item detail: `http://localhost:3000/items/1`
- Web reader personal space: `http://localhost:3000/personal`
- API reader boards: `http://localhost:3001/reader/boards`
- API reader items: `http://localhost:3001/reader/items`
- API reader search: `http://localhost:3001/reader/search?q=Sample`
- API reader item detail: `http://localhost:3001/reader/items/1`
- API reader item feedback: `POST http://localhost:3001/reader/items/1/feedback`

## Scope Boundary

Admin policy edits mutate the current Source Policy only. Raw-entry hide/restore mutates the current raw-entry lifecycle only and does not add moderation history. The failure queue is a read-only projection over existing attempt and model-call logs; there is no retry, acknowledgement, resolution workflow, policy history table, approval workflow, or auth/RBAC yet. Saved/read-later state is local to the browser and is not synced to a server. Reader feedback is stored as append-only item-scoped events and does not mutate lifecycle, ranking, search order, digest inclusion, moderation state, or personal saved/read-later state. Reader search is PostgreSQL-only over reader-safe metadata and summary fields. The current reader surface does not implement auth, backend personal-state APIs, digest generation, public publishing workflow, browser automation, semantic/vector search, external search services, search extension deployment, or non-RSS adapters. Translation drafts are not public reader copy. Those remain gated by `docs/CODEX_MASTER_PLAN.md`.
