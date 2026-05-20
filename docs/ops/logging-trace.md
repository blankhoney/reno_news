# Logging And Trace IDs

Reno News uses `x-request-id` as the shared request trace header for the API and worker services.

## API

- Incoming `x-request-id` is accepted when it is 1-128 characters and contains only letters, digits, `.`, `_`, `:`, or `-`.
- If the header is missing or invalid, the API generates a new request id.
- Every API response includes `x-request-id`.
- Audit events use the same request id through Fastify `request.id`.
- API request logs include safe structured fields: `event`, `requestId`, `method`, and `path`.

## Worker

- Worker HTTP responses include `X-Request-Id`.
- Manual ingest logs include safe structured fields: `event`, `requestId`, `method`, `path`, `statusCode`, `sourceId`, and `ingestStatus`.
- Worker logs are emitted as JSON lines to stdout in normal server mode.

## Safety Rules

Logs must not include request cookies, authorization headers, passwords, database URLs, provider keys, raw model prompts, raw model responses, or production secrets. When more context is needed, log stable ids and bounded status fields instead of raw payloads.

## Limitations

- This is trace id propagation and safe structured logging only.
- It is not distributed tracing, OpenTelemetry export, log shipping, retention, or alerting.
- Cross-service traces depend on callers forwarding `x-request-id`; web/API/worker automatic propagation beyond the covered HTTP paths is handled in later observability work.
