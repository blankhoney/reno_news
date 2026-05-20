import { test } from "node:test";
import assert from "node:assert/strict";
import {
  authLoginFailureReasons,
  authRoles,
  digestEditionStatuses,
  personalStateKinds,
  readStatusValues
} from "./index";
import type {
  AuthRole,
  DigestEditionGenerateRequest,
  DigestEditionListResponse,
  DigestEditionResponse,
  DigestEditionStatus,
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

test("digest edition contract exposes persisted edition request and response shapes", () => {
  const statuses: DigestEditionStatus[] = [...digestEditionStatuses];
  const request: DigestEditionGenerateRequest = {
    editionDate: "2026-05-21",
    boardSlug: "ai",
    limit: 12
  };
  const response: DigestEditionResponse = {
    edition: {
      id: 7,
      editionKey: "board:ai:2026-05-21",
      editionDate: "2026-05-21",
      boardSlug: "ai",
      status: "draft",
      windowStartAt: "2026-05-20T00:00:00.000Z",
      windowEndAt: "2026-05-21T00:00:00.000Z",
      generatedAt: "2026-05-21T00:01:00.000Z",
      reviewedAt: null,
      reviewNote: null,
      items: [
        {
          itemId: 42,
          position: 1,
          snapshot: {
            id: 42,
            boardSlug: "ai",
            boardName: "AI",
            sourceTitle: "OpenAI News",
            title: "Digest item",
            summary: "Digest summary",
            publishedAt: "2026-05-20T00:00:00.000Z",
            createdAt: "2026-05-20T00:00:00.000Z"
          }
        }
      ]
    }
  };
  const list: DigestEditionListResponse = {
    editions: [
      {
        id: 7,
        editionKey: "board:ai:2026-05-21",
        editionDate: "2026-05-21",
        boardSlug: "ai",
        status: "draft",
        itemCount: 1,
        generatedAt: "2026-05-21T00:01:00.000Z",
        reviewedAt: null
      }
    ]
  };

  assert.deepEqual(statuses, ["draft", "reviewed", "archived"]);
  assert.equal(request.limit, 12);
  assert.equal(response.edition.items[0]?.snapshot.id, 42);
  assert.equal(list.editions[0]?.itemCount, 1);
});
