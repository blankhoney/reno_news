import json
import threading
import unittest
from http.client import HTTPConnection

from reno_worker.rss_ingest import IngestResult
from reno_worker.server import create_server


class WorkerHealthTest(unittest.TestCase):
    def test_health_endpoint_reports_worker_service_as_healthy(self) -> None:
        server = create_server("127.0.0.1", 0, log_event=lambda _event: None)
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

    def test_metrics_endpoint_reports_worker_service_and_ingest_counters(self) -> None:
        def ingest(database_url: str, source_id: int) -> IngestResult:
            return IngestResult(
                source_id=source_id,
                status="failure",
                entries_seen=0,
                entries_inserted=0,
                failure_type="network",
            )

        server = create_server(
            "127.0.0.1",
            0,
            ingest=ingest,
            database_url="postgres://example",
            log_event=lambda _event: None,
        )
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()

        try:
            host, port = server.server_address
            connection = HTTPConnection(host, port, timeout=2)
            connection.request("POST", "/ingest/source/42")
            ingest_response = connection.getresponse()
            ingest_response.read()

            connection.request("GET", "/metrics")
            response = connection.getresponse()
            body = response.read().decode("utf-8")
        finally:
            server.shutdown()
            server.server_close()
            thread.join(timeout=2)

        self.assertEqual(response.status, 200)
        self.assertIn("# TYPE reno_news_worker_up gauge", body)
        self.assertIn("reno_news_worker_up 1", body)
        self.assertIn("reno_news_worker_manual_ingest_requests_total 1", body)
        self.assertIn("reno_news_worker_manual_ingest_failures_total 1", body)
        self.assertIn('reno_news_worker_last_manual_ingest_status{status="failure"} 1', body)

    def test_manual_ingest_response_and_logs_carry_request_id(self) -> None:
        log_events: list[dict[str, object]] = []

        def ingest(database_url: str, source_id: int) -> IngestResult:
            return IngestResult(
                source_id=source_id,
                status="success",
                entries_seen=2,
                entries_inserted=1,
            )

        server = create_server(
            "127.0.0.1",
            0,
            ingest=ingest,
            database_url="postgres://example",
            log_event=log_events.append,
        )
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()

        try:
            host, port = server.server_address
            connection = HTTPConnection(host, port, timeout=2)
            connection.request(
                "POST",
                "/ingest/source/42",
                headers={"X-Request-Id": "worker-trace-1", "Authorization": "Bearer secret-token"},
            )
            response = connection.getresponse()
            response.read()
        finally:
            server.shutdown()
            server.server_close()
            thread.join(timeout=2)

        self.assertEqual(response.status, 202)
        self.assertEqual(response.getheader("X-Request-Id"), "worker-trace-1")
        self.assertEqual(
            log_events[-1],
            {
                "event": "worker.request",
                "requestId": "worker-trace-1",
                "method": "POST",
                "path": "/ingest/source/42",
                "statusCode": 202,
                "sourceId": 42,
                "ingestStatus": "success",
            },
        )
        self.assertNotIn("secret-token", json.dumps(log_events))

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

        server = create_server(
            "127.0.0.1",
            0,
            ingest=ingest,
            database_url="postgres://example",
            log_event=lambda _event: None,
        )
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
