# Health API

Milestone 0 exposes health endpoints only. These endpoints prove that each runtime service starts and can answer HTTP requests.

## Web

`GET /healthz`

Response:

```json
{
  "status": "ok",
  "service": "web"
}
```

## API

`GET /healthz`

Response:

```json
{
  "status": "ok",
  "service": "api"
}
```

## Worker

`GET /healthz`

Response:

```json
{
  "status": "ok",
  "service": "worker"
}
```

## Boundary

Health endpoints must not connect to external APIs, run RSS ingest, call AI models, start migrations, or validate future business workflows during Milestone 0.
