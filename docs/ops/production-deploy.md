# Production Deploy

This runbook defines the deploy contract for the single-VPS Compose path. It is a contract and operator checklist, not proof that a real VPS or domain is configured.

## GitHub Secrets

The manual deploy workflow requires these repository or `production` environment secrets:

- `DEPLOY_HOST`
- `DEPLOY_USER`
- `DEPLOY_SSH_KEY`
- `DEPLOY_COMMAND`

`DEPLOY_COMMAND` should call the repo script on the server without embedding private values in source control:

```bash
cd <repo-on-server> && scripts/deploy-production.sh "$RENO_NEWS_IMAGE_TAG"
```

## Server Environment

The server must provide production env values before `DEPLOY_COMMAND` runs:

- `DATABASE_URL`
- `POSTGRES_PASSWORD`
- `RENO_NEWS_SITE_ADDRESS`
- `RENO_NEWS_HEALTH_BASE_URL`

Optional env:

- `RENO_NEWS_DEPLOY_STATE_DIR`
- `RENO_NEWS_INGRESS_MODE`: `dedicated` by default, or `edge` when an existing host-level Caddy owns public ports.
- `RENO_NEWS_EDGE_NETWORK`: external Docker network name for edge-managed ingress; defaults to `myrss-app`.
- `RENO_NEWS_HEALTH_RETRIES`
- `RENO_NEWS_HEALTH_SLEEP_SECONDS`
- `CADDY_HTTP_PORT`
- `CADDY_HTTPS_PORT`

Do not commit real env files, passwords, API keys, hostnames, SSH keys, or tokens.

## Deploy Flow

`scripts/deploy-production.sh` performs the low-downtime Compose deploy:

1. Reads the requested `RENO_NEWS_IMAGE_TAG`.
2. Renders `infra/compose/compose.yml` with `infra/compose/compose.production.yml`.
3. In `dedicated` ingress mode, starts the project Caddy service as the only public port owner.
4. In `edge` ingress mode, also renders `infra/compose/compose.edge.yml`, connects web/API/worker to the configured external edge network, and removes the project Caddy service from this Compose project.
5. Pulls GHCR images for web, API, worker, scheduler, PostgreSQL, Redis, and Caddy when the selected ingress mode uses it.
6. Runs database migrations through the API image with `pnpm db:migrate`.
7. Starts selected services with `docker compose up -d --remove-orphans`.
8. Runs health check probes against:
   - `$RENO_NEWS_HEALTH_BASE_URL/healthz`
   - `$RENO_NEWS_HEALTH_BASE_URL/api/healthz`
   - `$RENO_NEWS_HEALTH_BASE_URL/worker/healthz`
9. Records the current and previous image tags in the deploy state directory after health checks pass.

## Edge-Managed Ingress

Use `RENO_NEWS_INGRESS_MODE=edge` when another Caddy instance already owns host ports 80/443. The server operator must:

1. Ensure the external Docker network named by `RENO_NEWS_EDGE_NETWORK` exists.
2. Copy `infra/compose/Caddyfile.edge-news` into the host edge Caddy import directory.
3. Validate and reload the edge Caddy after the Reno News containers are attached to the edge network.

The edge Caddy snippet preserves the same routing semantics as `infra/compose/Caddyfile.production`: `/api/*` goes to API, `/worker/*` goes to worker, and all other paths go to web.

## Rollback

If the post-deploy health check fails, the script attempts rollback to `.deploy/previous-image-tag` by pulling the previous web/API/worker image tag and running Compose again.

Rollback is image-level only. It does not roll back database migrations, so production migrations must stay additive unless a later ADR and restore plan explicitly approve a destructive change.

## Local Verification

From the repository root:

```bash
pnpm compose:production:check
pnpm deploy:contract:check
```

These commands verify the production public boundary and deploy contract without requiring real secrets.

## Limitations

- This runbook does not create a VPS, DNS record, TLS account, remote backup target, or incident owner.
- This runbook does not configure GitHub environment secrets automatically.
- A production launch remains blocked until real server env, off-host backup, monitoring, alerting, and incident-response ownership are configured.
