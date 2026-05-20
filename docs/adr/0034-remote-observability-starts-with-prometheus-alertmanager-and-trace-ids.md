# Remote Observability Starts With Prometheus Alertmanager And Trace IDs

Second-version observability starts with service `/metrics`, Prometheus scraping, Alertmanager routing, safe structured logs, and a trace id carried through representative API and worker paths.

The minimum alert surface covers service down, queue backlog, high ingest failure rate, model failure rate, disk risk, and backup failure. Each alert must point to an ops runbook that explains diagnosis, mitigation, and escalation.

Logs must be structured and must not include secrets, raw credentials, API keys, or full private request payloads. Trace ids are correlation identifiers, not proof of distributed tracing completeness.

For this VPS, self-hosted Sentry is deferred. The project can later add a managed error tracking provider, but the first production gate should remain lightweight and inspectable with the existing service footprint.
