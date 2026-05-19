# Issue 005 Plan: Admin Debug Views

## Goal

Issue 005 adds a functional admin/debug surface for operating the Source Registry and inspecting raw feed entries without direct database access.

## Scope

In scope:
- Admin route shell in the web app.
- Source list and source detail pages.
- Raw entry list and raw entry detail pages.
- Enable/disable source action.
- Manual RSS ingest trigger for one source.
- Basic API endpoints for source detail and raw entry inspection.
- Basic error display.

Out of scope:
- Reader UI, full-text extraction, AI processing, search, polished admin workflows, authentication, and non-RSS adapters.

## Design

The web app uses Next.js App Router server components for admin/debug pages and server actions for mutations. Server actions call the API for source enable/disable and call the worker manual ingest endpoint for RSS ingest.

The API remains the database-facing service for Source Registry and raw entry inspection. The worker owns actual RSS ingest.

## Implemented Surface

- Web:
  - `GET /admin`
  - `GET /admin/sources/[id]`
  - `GET /admin/raw-entries`
  - `GET /admin/raw-entries/[id]`
- API:
  - `GET /sources/:id`
  - `GET /raw-entries`
  - `GET /raw-entries/:id`
- Worker:
  - `POST /ingest/source/:id`

## TDD Plan

1. Add API tests for source detail, raw entry list/detail, and 404 handling. Done.
2. Add worker server test for manual ingest trigger routing. Done.
3. Add focused web tests for admin data URL construction. Done.
4. Implement API endpoints, worker manual trigger, and web admin pages. Done.
5. Verify local tests, build, worker tests, and smoke the admin pages with a running web/API/worker stack. Done.

## Verification

- `pnpm install --frozen-lockfile`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `pnpm --filter @reno-news/db test:integration`
- `uv run python -m unittest discover -s tests`
- `DATABASE_URL=postgres://reno_news:reno_news@localhost:5432/reno_news_issue004_test uv run python -m unittest tests/test_rss_ingest.py tests/test_scheduler.py`
- Local smoke against running web/API/worker processes:
  - `/admin`
  - `/admin/sources/1`
  - `/admin/raw-entries`
  - `/admin/raw-entries/983`
  - `GET /sources/1`
  - `GET /raw-entries/983`
  - `GET /healthz` on worker
  - `POST /ingest/source/14`

## Research References

- Next.js App Router server components and dynamic route params: https://github.com/vercel/next.js
- Next.js server actions with `revalidatePath` and `redirect`: https://github.com/vercel/next.js
