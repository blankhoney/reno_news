# Metrics

Reno News exposes a minimal Prometheus-compatible text endpoint on the API and worker services.

## Endpoints

- API: `GET /metrics`
- Worker: `GET /metrics`

Behind Caddy, these are reachable as `GET /api/metrics` and `GET /worker/metrics` because the reverse proxy strips the service prefix.

Both endpoints are read-only and must not include credentials, request cookies, database URLs, API keys, or raw model payloads.

## API Metrics

- `reno_news_api_up`: API service is serving the metrics endpoint.
- `reno_news_api_failure_queue_backlog`: current failure backlog across source ingest, extraction, and model call failures.
- `reno_news_api_failure_queue_backlog{stage="source_ingest"}`: current source ingest failure backlog.
- `reno_news_api_failure_queue_backlog{stage="extraction"}`: current extraction failure backlog.
- `reno_news_api_failure_queue_backlog{stage="model_call"}`: current model failure backlog.
- `reno_news_api_ingest_failures`: current source ingest failures in the failure queue.
- `reno_news_api_model_failures`: current model call failures in the failure queue.
- `reno_news_api_backup_offhost_contract_configured`: off-host backup contract exists in this build.
- `reno_news_api_disk_usage_guard_configured`: disk usage guard contract exists in this build.

## Worker Metrics

- `reno_news_worker_up`: worker service is serving the metrics endpoint.
- `reno_news_worker_manual_ingest_requests_total`: manual ingest requests handled by this worker process.
- `reno_news_worker_manual_ingest_failures_total`: manual ingest requests that returned failure status.
- `reno_news_worker_last_manual_ingest_status{status="none|success|skipped|failure"}`: last manual ingest status.

## Limitations

- API failure metrics are derived from the existing failure queue read model and are current backlog gauges, not all-time counters.
- Worker counters are in-process and reset when the worker process restarts.
- Static backup and disk metrics only prove local guard contracts are present; they do not prove that off-host backup uploads, object-store lifecycle rules, or host disk checks succeeded.
- Alert rules and incident runbooks are tracked separately in the next observability task.
