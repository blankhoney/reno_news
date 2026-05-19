import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultServicePorts } from "./index";

test("default service ports are stable for local compose", () => {
  assert.deepEqual(defaultServicePorts, {
    web: 3000,
    api: 3001,
    worker: 3002
  });
});
