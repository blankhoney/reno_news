import { test } from "node:test";
import assert from "node:assert/strict";
import { GET } from "./route";

test("GET /healthz reports the web service as healthy", async () => {
  const response = await GET();
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    status: "ok",
    service: "web"
  });
});
