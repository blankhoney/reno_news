# Milestone 0 Plan

## Goal

Milestone 0 establishes the infrastructure-only foundation for the MVP: monorepo layout, local development commands, Docker Compose skeleton, Caddy placeholder, health endpoints, CI skeleton, and README.

## Scope

In scope:
- `pnpm` workspace for JavaScript and TypeScript packages.
- `uv` project config for the Python worker.
- `apps/web` as a minimal Next.js App Router app.
- `apps/api` as a minimal TypeScript Fastify API service.
- `services/worker` as a minimal Python worker health service.
- Placeholder shared packages: `packages/contracts`, `packages/ui`, and `packages/config`.
- `infra/compose` with Compose and Caddy config.
- CI that runs install, lint, tests, and build without external API keys.

Out of scope:
- RSS ingest.
- Crawling, extraction, AI, search, reader UI, admin workflows, migrations, and production deploy automation.

## Technical Choices

- **pnpm workspace**: selected because the master plan needs a TypeScript monorepo with shared packages. A root `pnpm-workspace.yaml` defines workspace packages.
- **Next.js web app**: selected by the research report and ADR-0001. Milestone 0 only adds a home page and `/healthz` route handler.
- **Fastify API**: selected as the smallest useful TypeScript HTTP API foundation with built-in `inject()` support for behavior tests.
- **uv worker config**: selected for the Python worker dependency manager while keeping the initial health service standard-library-only.
- **Docker Compose**: selected for the local multi-service skeleton and dependency health checks.
- **Caddy**: selected as a placeholder reverse proxy with routes to web and API services.

## Interfaces

- Web health: `GET /healthz` returns `200` JSON.
- API health: `GET /healthz` returns `200` JSON.
- Worker health: `GET /healthz` returns `200` JSON.

The exact response shape is documented in `docs/api/health.md`.

## TDD Plan

1. Add a web route-handler test for `GET /healthz`, then implement the route.
2. Add an API public-interface test for `GET /healthz` using Fastify injection, then implement the API app and server.
3. Add a worker HTTP behavior test for `GET /healthz`, then implement the Python health server.
4. Add package and build scripts, then run the full local command set.
5. Add Compose/Caddy and smoke-test container startup if image/network access is available.

## Review Notes

- Keep service code minimal and isolated; no database, RSS, AI, or crawling logic belongs in Issue 001.
- Do not add a shared framework abstraction until a later issue proves repetition.
- Prefer public health endpoints and package scripts as verification points over testing private helpers.

## Research References

- Next.js Route Handlers: https://nextjs.org/docs/app/getting-started/route-handlers
- Fastify Testing: https://fastify.dev/docs/v5.7.x/Guides/Testing/
- uv CLI: https://docs.astral.sh/uv/reference/cli/
- Docker Compose startup order: https://docs.docker.com/compose/how-tos/startup-order/
- Caddy `reverse_proxy`: https://caddy.guide/docs/caddyfile/directives/reverse_proxy
- GitHub Actions Node CI: https://docs.github.com/en/actions/how-tos/writing-workflows/building-and-testing/building-and-testing-nodejs
