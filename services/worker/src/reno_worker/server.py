import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Callable
from urllib.parse import urlparse

from reno_worker.rss_ingest import IngestResult, ingest_source


IngestSource = Callable[[str, int], IngestResult]


def create_handler(ingest: IngestSource, database_url: str | None) -> type[BaseHTTPRequestHandler]:
    metrics = {
        "manual_ingest_requests_total": 0,
        "manual_ingest_failures_total": 0,
        "last_manual_ingest_status": "none",
    }

    class WorkerHandler(BaseHTTPRequestHandler):
        def do_GET(self) -> None:
            path = urlparse(self.path).path
            if path == "/healthz":
                write_json(self, 200, {"status": "ok", "service": "worker"})
                return

            if path == "/metrics":
                write_text(self, 200, render_worker_metrics(metrics))
                return

            self.send_error(404)

        def do_POST(self) -> None:
            prefix = "/ingest/source/"
            path = urlparse(self.path).path

            if not path.startswith(prefix):
                self.send_error(404)
                return

            if not database_url:
                write_json(self, 503, {"error": "DATABASE_URL is required"})
                return

            try:
                source_id = int(path.removeprefix(prefix))
            except ValueError:
                write_json(self, 400, {"error": "Invalid source id"})
                return

            if source_id < 1:
                write_json(self, 400, {"error": "Invalid source id"})
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
            )

        def log_message(self, format: str, *args: object) -> None:
            return

    return WorkerHandler


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


def write_json(handler: BaseHTTPRequestHandler, status: int, payload: object) -> None:
    body = json.dumps(payload).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


def write_text(handler: BaseHTTPRequestHandler, status: int, body: str) -> None:
    encoded_body = body.encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
    handler.send_header("Content-Length", str(len(encoded_body)))
    handler.end_headers()
    handler.wfile.write(encoded_body)


def create_server(
    host: str,
    port: int,
    *,
    ingest: IngestSource = ingest_source,
    database_url: str | None = None,
) -> ThreadingHTTPServer:
    return ThreadingHTTPServer((host, port), create_handler(ingest, database_url))


def main() -> None:
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "3002"))
    server = create_server(host, port, database_url=os.environ.get("DATABASE_URL"))
    server.serve_forever()
