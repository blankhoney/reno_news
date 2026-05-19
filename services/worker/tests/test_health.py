import json
import threading
import unittest
from http.client import HTTPConnection

from reno_worker.rss_ingest import IngestResult
from reno_worker.server import create_server


class WorkerHealthTest(unittest.TestCase):
    def test_health_endpoint_reports_worker_service_as_healthy(self) -> None:
        server = create_server("127.0.0.1", 0)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()

        try:
            host, port = server.server_address
            connection = HTTPConnection(host, port, timeout=2)
            connection.request("GET", "/healthz")
            response = connection.getresponse()
            payload = json.loads(response.read().decode("utf-8"))
        finally:
            server.shutdown()
            server.server_close()
            thread.join(timeout=2)

        self.assertEqual(response.status, 200)
        self.assertEqual(payload, {"status": "ok", "service": "worker"})

    def test_manual_ingest_trigger_calls_ingest_source(self) -> None:
        calls: list[tuple[str, int]] = []

        def ingest(database_url: str, source_id: int) -> IngestResult:
            calls.append((database_url, source_id))
            return IngestResult(
                source_id=source_id,
                status="success",
                entries_seen=2,
                entries_inserted=1,
            )

        server = create_server("127.0.0.1", 0, ingest=ingest, database_url="postgres://example")
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()

        try:
            host, port = server.server_address
            connection = HTTPConnection(host, port, timeout=2)
            connection.request("POST", "/ingest/source/42?reason=manual")
            response = connection.getresponse()
            payload = json.loads(response.read().decode("utf-8"))
        finally:
            server.shutdown()
            server.server_close()
            thread.join(timeout=2)

        self.assertEqual(response.status, 202)
        self.assertEqual(calls, [("postgres://example", 42)])
        self.assertEqual(
            payload,
            {
                "sourceId": 42,
                "status": "success",
                "entriesSeen": 2,
                "entriesInserted": 1,
                "failureType": None,
                "message": None,
            },
        )


if __name__ == "__main__":
    unittest.main()
