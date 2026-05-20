# Alerts

This runbook defines the first Prometheus alert contract for Reno News. It assumes Prometheus can scrape the API and worker metrics endpoints described in `docs/ops/metrics.md`, and that host disk metrics are provided by a node-exporter-compatible source.

These rules are local configuration artifacts. They do not create a Prometheus server, Alertmanager receiver, paging channel, or production deployment.

## RenoNewsApiDown

Diagnosis:
Check whether Prometheus can scrape the API target, then run `pnpm release:audit:local` and inspect the API container logs for startup or database errors.

Mitigation:
Restart the API service through the production Compose runbook if the target is unhealthy. If the database is unavailable, restore database connectivity before restarting API loops.

Escalation:
Escalate when API remains down after restart or when health checks fail during a deploy rollback.

## RenoNewsWorkerDown

Diagnosis:
Check worker target scrape status, `GET /worker/healthz` through Caddy, and worker container logs.

Mitigation:
Restart the worker service. If failures follow deployment, roll back the image tag with the production deploy script.

Escalation:
Escalate when worker health remains down and ingest tasks cannot run.

## RenoNewsFailureQueueBacklogHigh

Diagnosis:
Open the admin failure queue and group failures by stage. Compare with `reno_news_api_failure_queue_backlog{stage="source_ingest"}`, `reno_news_api_failure_queue_backlog{stage="extraction"}`, and `reno_news_api_failure_queue_backlog{stage="model_call"}`.

Mitigation:
Prioritize source/network failures first, then extraction failures, then model failures. Pause noisy sources if they dominate the backlog.

Escalation:
Escalate when backlog keeps growing for more than one ingest cycle or blocks reader freshness.

## RenoNewsIngestFailuresHigh

Diagnosis:
Inspect recent source ingest failures, source URLs, rate-limit responses, and feed parse errors.

Mitigation:
Disable or slow noisy sources, verify source policy, and rerun a small manual ingest after the source is healthy.

Escalation:
Escalate if multiple important sources fail and manual ingest reproduces network or parser errors.

## RenoNewsModelFailuresPresent

Diagnosis:
Inspect `model_call` failures in the admin failure queue and check provider status, timeout, budget, and schema-gate errors.

Mitigation:
Switch to fallback provider or fake adapter only if the production runbook explicitly allows it. Quarantine invalid structured output rather than writing it to formal tables.

Escalation:
Escalate when model failures affect publishing quality or repeat across providers.

## RenoNewsBackupSignalMissing

Diagnosis:
Run `pnpm backup:offhost:check` locally and confirm the API exposes `reno_news_api_backup_offhost_contract_configured 1`. Review `docs/ops/offhost-backup.md`.

Mitigation:
Restore the off-host backup contract files if they are missing. If a real off-host dump exists, download it and run `pnpm db:restore:drill`.

Escalation:
Escalate before any production launch if no real object-store bucket, backup schedule, or off-host restore drill exists.

## RenoNewsDiskRisk

Diagnosis:
Run `pnpm disk:check:local`, inspect Docker disk usage, and check backup artifact size under `backups/`.

Mitigation:
Use the disk usage runbook for manual cleanup. Do not run destructive prune commands until the operator confirms what can be deleted.

Escalation:
Escalate if free disk remains below the alert threshold after safe cleanup, or if PostgreSQL volume growth is unexplained.

## Limitations

- Alert expressions are a repo contract only until Prometheus and Alertmanager are installed in the target environment.
- `RenoNewsBackupSignalMissing` checks the backup contract signal, not a real backup success timestamp.
- `RenoNewsDiskRisk` depends on node-exporter-compatible filesystem metrics that are not deployed by this repository.
- Alert routing, receiver credentials, paging policy, and incident ownership remain external production setup.
