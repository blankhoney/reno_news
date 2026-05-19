import json
import threading
import unittest
from http.client import HTTPConnection

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


if __name__ == "__main__":
    unittest.main()
