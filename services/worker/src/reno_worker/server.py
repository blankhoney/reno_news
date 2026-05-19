import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Callable
from urllib.parse import urlparse

from reno_worker.rss_ingest import IngestResult, ingest_source


IngestSource = Callable[[str, int], IngestResult]


def create_handler(ingest: IngestSource, database_url: str | None) -> type[BaseHTTPRequestHandler]:
    class WorkerHandler(BaseHTTPRequestHandler):
        def do_GET(self) -> None:
            if self.path != "/healthz":
                self.send_error(404)
                return

            write_json(self, 200, {"status": "ok", "service": "worker"})

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


def write_json(handler: BaseHTTPRequestHandler, status: int, payload: object) -> None:
    body = json.dumps(payload).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


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
