import { test } from "node:test";
import assert from "node:assert/strict";
import { authLoginFailureReasons, authRoles } from "./index";
import type { AuthRole, HealthStatus } from "./index";

test("HealthStatus names the Milestone 0 runtime services", () => {
  const services: HealthStatus["service"][] = ["web", "api", "worker"];
  assert.deepEqual(services, ["web", "api", "worker"]);
});

test("auth contract exposes the second-version role and login failure vocabulary", () => {
  const roles: AuthRole[] = [...authRoles];

  assert.deepEqual(roles, ["reader", "admin"]);
  assert.deepEqual(authLoginFailureReasons, [
    "invalid_credentials",
    "invite_required",
    "user_disabled",
    "session_expired",
    "rate_limited"
  ]);
});
