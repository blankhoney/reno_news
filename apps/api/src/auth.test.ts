import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createAuthService,
  hashPassword,
  hashSessionToken,
  verifyPassword
} from "./auth";
import type { AuthRepository } from "@reno-news/db";

test("hashPassword creates argon2id hashes and verifyPassword checks them", async () => {
  const passwordHash = await hashPassword("correct-password");

  assert.match(passwordHash, /^\$argon2id\$/);
  assert.equal(await verifyPassword(passwordHash, "correct-password"), true);
  assert.equal(await verifyPassword(passwordHash, "wrong-password"), false);
});

test("auth service logs in an active account user and creates a server session", async () => {
  const passwordHash = await hashPassword("correct-password");
  const calls: string[] = [];
  let createdSessionTokenHash = "";
  const repository: AuthRepository = {
    findUserByEmail: async () => ({
      id: 42,
      email: "reader@example.com",
      role: "reader",
      passwordHash,
      disabledAt: null
    }),
    hasPendingInvite: async () => false,
    createSession: async (input) => {
      calls.push("createSession");
      createdSessionTokenHash = input.sessionTokenHash;
    },
    findUserBySessionTokenHash: async () => null,
    revokeSession: async () => undefined,
    recordLoginAttempt: async (input) => {
      calls.push(`record:${input.outcome}`);
    },
    close: async () => undefined
  };
  const service = createAuthService(repository, {
    now: () => new Date("2026-05-21T00:00:00.000Z"),
    generateSessionToken: () => "raw-session-token"
  });

  const result = await service.login({
    email: " Reader@Example.com ",
    password: "correct-password"
  });

  assert.deepEqual(result, {
    ok: true,
    user: {
      id: 42,
      email: "reader@example.com",
      role: "reader"
    },
    sessionToken: "raw-session-token",
    expiresAt: new Date("2026-06-20T00:00:00.000Z")
  });
  assert.equal(createdSessionTokenHash, hashSessionToken("raw-session-token"));
  assert.deepEqual(calls, ["createSession", "record:success"]);
});

test("auth service records failed password attempts without creating a session", async () => {
  const passwordHash = await hashPassword("correct-password");
  const calls: string[] = [];
  const repository: AuthRepository = {
    findUserByEmail: async () => ({
      id: 42,
      email: "reader@example.com",
      role: "reader",
      passwordHash,
      disabledAt: null
    }),
    hasPendingInvite: async () => false,
    createSession: async () => {
      calls.push("createSession");
    },
    findUserBySessionTokenHash: async () => null,
    revokeSession: async () => undefined,
    recordLoginAttempt: async (input) => {
      calls.push(`record:${input.outcome}:${input.outcome === "failure" ? input.failureReason : ""}`);
    },
    close: async () => undefined
  };
  const service = createAuthService(repository);

  const result = await service.login({
    email: "reader@example.com",
    password: "wrong-password"
  });

  assert.deepEqual(result, { ok: false, error: "invalid_credentials" });
  assert.deepEqual(calls, ["record:failure:invalid_credentials"]);
});

test("auth service hashes session tokens for current user lookup and logout", async () => {
  const calls: string[] = [];
  const repository: AuthRepository = {
    findUserByEmail: async () => null,
    hasPendingInvite: async () => false,
    createSession: async () => undefined,
    findUserBySessionTokenHash: async (sessionTokenHash) => {
      calls.push(`find:${sessionTokenHash}`);
      return {
        id: 42,
        email: "reader@example.com",
        role: "reader"
      };
    },
    revokeSession: async (sessionTokenHash) => {
      calls.push(`revoke:${sessionTokenHash}`);
    },
    recordLoginAttempt: async () => undefined,
    close: async () => undefined
  };
  const service = createAuthService(repository);
  const expectedHash = hashSessionToken("raw-session-token");

  assert.deepEqual(await service.currentUser("raw-session-token"), {
    id: 42,
    email: "reader@example.com",
    role: "reader"
  });
  await service.logout("raw-session-token");

  assert.deepEqual(calls, [`find:${expectedHash}`, `revoke:${expectedHash}`]);
});
