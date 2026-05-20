import json
import os
import re
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Callable
from urllib.parse import urlparse

from reno_worker.rss_ingest import IngestResult, ingest_source


IngestSource = Callable[[str, int], IngestResult]
LogEvent = Callable[[dict[str, object]], None]
REQUEST_ID_PATTERN = re.compile(r"^[A-Za-z0-9._:-]{1,128}$")


def create_handler(
    ingest: IngestSource,
    database_url: str | None,
    log_event: LogEvent,
) -> type[BaseHTTPRequestHandler]:
    metrics = {
        "manual_ingest_requests_total": 0,
        "manual_ingest_failures_total": 0,
        "last_manual_ingest_status": "none",
    }

    class WorkerHandler(BaseHTTPRequestHandler):
        def do_GET(self) -> None:
            path = urlparse(self.path).path
            request_id = request_id_from_headers(self.headers)
            if path == "/healthz":
                write_json(
                    self,
                    200,
                    {"status": "ok", "service": "worker"},
                    headers={"X-Request-Id": request_id},
                )
                log_worker_request(
                    log_event,
                    request_id=request_id,
                    method="GET",
                    path=path,
                    status_code=200,
                )
                return

            if path == "/metrics":
                write_text(
                    self,
                    200,
                    render_worker_metrics(metrics),
                    headers={"X-Request-Id": request_id},
                )
                log_worker_request(
                    log_event,
                    request_id=request_id,
                    method="GET",
                    path=path,
                    status_code=200,
                )
                return

            self.send_error(404)

        def do_POST(self) -> None:
            prefix = "/ingest/source/"
            path = urlparse(self.path).path
            request_id = request_id_from_headers(self.headers)

            if not path.startswith(prefix):
                self.send_error(404)
                return

            if not database_url:
                write_json(
                    self,
                    503,
                    {"error": "DATABASE_URL is required"},
                    headers={"X-Request-Id": request_id},
                )
                log_worker_request(
                    log_event,
                    request_id=request_id,
                    method="POST",
                    path=path,
                    status_code=503,
                )
                return

            try:
                source_id = int(path.removeprefix(prefix))
            except ValueError:
                write_json(
                    self,
                    400,
                    {"error": "Invalid source id"},
                    headers={"X-Request-Id": request_id},
                )
                log_worker_request(
                    log_event,
                    request_id=request_id,
                    method="POST",
                    path=path,
                    status_code=400,
                )
                return

            if source_id < 1:
                write_json(
                    self,
                    400,
                    {"error": "Invalid source id"},
                    headers={"X-Request-Id": request_id},
                )
                log_worker_request(
                    log_event,
                    request_id=request_id,
                    method="POST",
                    path=path,
                    status_code=400,
                )
                return

            result = ingest(database_url, source_id)
            metrics["manual_ingest_requests_total"] += 1
            metrics["last_manual_ingest_status"] = result.status
            if result.status == "failure":
                metrics["manual_ingest_failures_total"] += 1
            write_json(
                self,
                202,
                {
                    "sourceId": result.source_id,
                    "status": result.status,
                    "entriesSeen": result.entries_seen,
                    "entriesInserted": result.entries_inserted,
                    "failureType": result.failure_type,
                    "message": result.message,
                },
                headers={"X-Request-Id": request_id},
            )
            log_worker_request(
                log_event,
                request_id=request_id,
                method="POST",
                path=path,
                status_code=202,
                source_id=source_id,
                ingest_status=result.status,
            )

        def log_message(self, format: str, *args: object) -> None:
            return

    return WorkerHandler


def default_log_event(event: dict[str, object]) -> None:
    print(json.dumps(event, sort_keys=True), flush=True)


def request_id_from_headers(headers: object) -> str:
    header_value = getattr(headers, "get", lambda _name: None)("X-Request-Id")
    if isinstance(header_value, str) and REQUEST_ID_PATTERN.fullmatch(header_value):
        return header_value
    return str(uuid.uuid4())


def log_worker_request(
    log_event: LogEvent,
    *,
    request_id: str,
    method: str,
    path: str,
    status_code: int,
    source_id: int | None = None,
    ingest_status: str | None = None,
) -> None:
    event: dict[str, object] = {
        "event": "worker.request",
        "requestId": request_id,
        "method": method,
        "path": path,
        "statusCode": status_code,
    }
    if source_id is not None:
        event["sourceId"] = source_id
    if ingest_status is not None:
        event["ingestStatus"] = ingest_status
    log_event(event)


def render_worker_metrics(metrics: dict[str, int | str]) -> str:
    last_status = str(metrics["last_manual_ingest_status"])
    lines = [
        "# HELP reno_news_worker_up Worker service health as seen by the metrics endpoint.",
        "# TYPE reno_news_worker_up gauge",
        "reno_news_worker_up 1",
        "# HELP reno_news_worker_manual_ingest_requests_total Manual ingest requests handled by this worker process.",
        "# TYPE reno_news_worker_manual_ingest_requests_total counter",
        f"reno_news_worker_manual_ingest_requests_total {metrics['manual_ingest_requests_total']}",
        "# HELP reno_news_worker_manual_ingest_failures_total Manual ingest requests that returned failure status.",
        "# TYPE reno_news_worker_manual_ingest_failures_total counter",
        f"reno_news_worker_manual_ingest_failures_total {metrics['manual_ingest_failures_total']}",
        "# HELP reno_news_worker_last_manual_ingest_status Last manual ingest status by status label.",
        "# TYPE reno_news_worker_last_manual_ingest_status gauge",
    ]
    for status in ("none", "success", "skipped", "failure"):
        value = 1 if last_status == status else 0
        lines.append(f'reno_news_worker_last_manual_ingest_status{{status="{status}"}} {value}')
    return "\n".join(lines) + "\n"


def write_json(
    handler: BaseHTTPRequestHandler,
    status: int,
    payload: object,
    headers: dict[str, str] | None = None,
) -> None:
    body = json.dumps(payload).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json")
    for name, value in (headers or {}).items():
        handler.send_header(name, value)
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


def write_text(
    handler: BaseHTTPRequestHandler,
    status: int,
    body: str,
    headers: dict[str, str] | None = None,
) -> None:
    encoded_body = body.encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
    for name, value in (headers or {}).items():
        handler.send_header(name, value)
    handler.send_header("Content-Length", str(len(encoded_body)))
    handler.end_headers()
    handler.wfile.write(encoded_body)


def create_server(
    host: str,
    port: int,
    *,
    ingest: IngestSource = ingest_source,
    database_url: str | None = None,
    log_event: LogEvent = default_log_event,
) -> ThreadingHTTPServer:
    return ThreadingHTTPServer((host, port), create_handler(ingest, database_url, log_event))


def main() -> None:
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "3002"))
    server = create_server(host, port, database_url=os.environ.get("DATABASE_URL"))
    server.serve_forever()
