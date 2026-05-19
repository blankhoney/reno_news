import { test } from "node:test";
import assert from "node:assert/strict";
import type { HealthStatus } from "./index";

test("HealthStatus names the Milestone 0 runtime services", () => {
  const services: HealthStatus["service"][] = ["web", "api", "worker"];
  assert.deepEqual(services, ["web", "api", "worker"]);
});
