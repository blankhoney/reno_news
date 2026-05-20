import { test } from "node:test";
import assert from "node:assert/strict";
import { authLoginFailureReasons, authRoles, personalStateKinds, readStatusValues } from "./index";
import type {
  AuthRole,
  HealthStatus,
  PersonalStateKind,
  PersonalStateMutationRequest,
  PersonalStateResponse,
  ReadStatusValue
} from "./index";

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

test("personal state contract exposes account-backed state and read status vocabulary", () => {
  const stateKinds: PersonalStateKind[] = [...personalStateKinds];
  const readStatuses: ReadStatusValue[] = [...readStatusValues];
  const mutation: PersonalStateMutationRequest = {
    itemId: 42,
    active: true
  };
  const response: PersonalStateResponse = {
    saved: [{ itemId: 42, createdAt: "2026-05-21T00:00:00.000Z" }],
    readLater: [],
    readStatus: [{ itemId: 42, status: "read", updatedAt: "2026-05-21T00:00:00.000Z" }]
  };

  assert.deepEqual(stateKinds, ["saved", "read_later"]);
  assert.deepEqual(readStatuses, ["unread", "read"]);
  assert.equal(mutation.itemId, 42);
  assert.equal(response.readStatus[0]?.status, "read");
});
