import { test } from "node:test";
import assert from "node:assert/strict";
import type {
  AuditEventRecord,
  AuditRepository,
  FailureQueueRecord,
  FailureQueueRepository,
  FeedbackRecord,
  FeedbackRepository,
  PersonalStateRepository,
  RawEntryRecord,
  RawEntryRepository,
  ReaderBoard,
  ReaderItemDetail,
  ReaderItemCard,
  ReaderRepository,
  SourceRepository,
  SourceRecord
} from "@reno-news/db";
import { buildApp } from "./app";
import type { AuthService } from "./auth";

const sourceRecord: SourceRecord = {
  id: 1,
  boardId: 1,
  boardSlug: "ai",
  sourceType: "rss",
  title: "OpenAI News",
  url: "https://openai.com/news/rss.xml",
  enabled: true,
  policy: {
    id: 1,
    sourceId: 1,
    crawlEnabled: true,
    fetchIntervalMinutes: 60,
    maxRequestsPerHour: 12,
    saveLevel: "metadata_only",
    rightsPolicy: "metadata_only",
    translationPolicy: "none",
    riskLevel: "medium"
  }
};

const adminSessionHeaders = {
  cookie: "reno_news_session=admin-session-token"
};

const readerSessionHeaders = {
  cookie: "reno_news_session=reader-session-token"
};

function fakeRepository(overrides: Partial<SourceRepository> = {}): SourceRepository {
  return {
    listSources: async () => [sourceRecord],
    getSource: async () => sourceRecord,
    createSource: async () => sourceRecord,
    updateSource: async () => sourceRecord,
    listEnabledSourcePolicies: async () => [sourceRecord],
    ...overrides
  };
}

function authServiceForCurrentUser(
  user: { id: number; email: string; role: "reader" | "admin" } | null
): AuthService {
  return {
    login: async () => ({ ok: false, error: "invalid_credentials" }),
    currentUser: async (sessionToken) => (sessionToken ? user : null),
    logout: async () => undefined
  };
}

function adminAuthService(): AuthService {
  return authServiceForCurrentUser({
    id: 1,
    email: "admin@example.com",
    role: "admin"
  });
}

function readerAuthService(): AuthService {
  return authServiceForCurrentUser({
    id: 2,
    email: "reader@example.com",
    role: "reader"
  });
}

function withAdminAuth<T extends object>(dependencies: T): T & { authService: AuthService } {
  return {
    authService: adminAuthService(),
    ...dependencies
  };
}

const adminRouteCases = [
  { method: "GET", url: "/sources" },
  { method: "GET", url: "/sources/1" },
  {
    method: "POST",
    url: "/sources",
    payload: {
      boardSlug: "ai",
      sourceType: "rss",
      title: "OpenAI News",
      url: "https://openai.com/news/rss.xml"
    }
  },
  { method: "PATCH", url: "/sources/1", payload: { enabled: false } },
  { method: "GET", url: "/raw-entries" },
  { method: "GET", url: "/raw-entries/1" },
  { method: "PATCH", url: "/raw-entries/1", payload: { action: "hide" } },
  { method: "GET", url: "/admin/failures" },
  { method: "GET", url: "/admin/audit-events" },
  { method: "GET", url: "/admin/feedback" },
  { method: "PATCH", url: "/admin/feedback/20", payload: { reviewStatus: "reviewed" } }
] as const;

const rawEntryRecord: RawEntryRecord = {
  id: 1,
  sourceId: 1,
  sourceTitle: "OpenAI News",
  title: "Sample AI item",
  url: "https://example.invalid/ai/sample-ai-001",
  lifecycleStatus: "new",
  processingStage: "metadata_ingested",
  rightsStatus: "metadata_only",
  failureType: null,
  createdAt: "2026-05-20T00:00:00.000Z"
};

function fakeRawEntryRepository(
  overrides: Partial<RawEntryRepository> = {}
): RawEntryRepository {
  return {
    listRawEntries: async () => [rawEntryRecord],
    getRawEntry: async () => rawEntryRecord,
    updateRawEntryLifecycle: async () => ({
      ...rawEntryRecord,
      lifecycleStatus: "hidden"
    }),
    close: async () => undefined,
    ...overrides
  };
}

const failureRecord: FailureQueueRecord = {
  id: 10,
  failureStage: "source_ingest",
  status: "failure",
  failureType: "network",
  errorCode: null,
  message: "Feed unavailable",
  sourceId: 1,
  sourceTitle: "OpenAI News",
  rawEntryId: null,
  rawEntryTitle: null,
  purpose: null,
  createdAt: "2026-05-20T00:00:00.000Z"
};

const auditEventRecord: AuditEventRecord = {
  id: 99,
  actorUserId: 1,
  actorRole: "admin",
  action: "source.update",
  objectType: "source",
  objectId: "1",
  requestId: "request-1",
  metadata: {
    fields: ["enabled"]
  },
  createdAt: "2026-05-20T00:00:00.000Z"
};

function fakeAuditRepository(overrides: Partial<AuditRepository> = {}): AuditRepository {
  return {
    recordAuditEvent: async () => undefined,
    listAuditEvents: async () => [auditEventRecord],
    close: async () => undefined,
    ...overrides
  };
}

function recordedRequestId(events: unknown[], index = 0): string {
  return events[index] ? (events[index] as { requestId: string }).requestId : "";
}

const feedbackRecord: FeedbackRecord = {
  id: 20,
  rawEntryId: 1,
  rawEntryTitle: "Sample AI item",
  boardSlug: "ai",
  boardName: "AI",
  sourceTitle: "OpenAI News",
  feedbackType: "quality_issue",
  message: "Summary is too vague.",
  reviewStatus: "open",
  reviewNote: null,
  reviewedAt: null,
  createdAt: "2026-05-20T00:00:00.000Z"
};

function fakeFailureQueueRepository(
  overrides: Partial<FailureQueueRepository> = {}
): FailureQueueRepository {
  return {
    listFailures: async () => [failureRecord],
    close: async () => undefined,
    ...overrides
  };
}

function fakeFeedbackRepository(
  overrides: Partial<FeedbackRepository> = {}
): FeedbackRepository {
  return {
    createFeedback: async () => feedbackRecord,
    listFeedback: async () => [feedbackRecord],
    updateFeedbackReview: async () => feedbackRecord,
    close: async () => undefined,
    ...overrides
  };
}

const readerBoard: ReaderBoard = {
  slug: "ai",
  name: "AI",
  description: "Artificial intelligence research, products, and policy."
};

const readerItem: ReaderItemCard = {
  id: 1,
  boardSlug: "ai",
  boardName: "AI",
  sourceTitle: "OpenAI News",
  title: "Sample AI item",
  url: "https://example.invalid/ai/sample-ai-001",
  summary: "Development seed item for the AI board.",
  publishedAt: "2026-05-20T00:00:00.000Z",
  createdAt: "2026-05-20T00:00:00.000Z"
};

const readerItemDetail: ReaderItemDetail = {
  ...readerItem,
  detailSummary: "Detailed reader item summary.",
  whyItMatters: "Why this item matters.",
  sourceNote: "Source note.",
  chinaRelevance: "China relevance.",
  relatedTopics: ["AI"],
  originalTitle: "Sample AI item Original",
  originalText: "",
  originalTextMode: "none",
  chineseTitle: "Sample AI item",
  chineseText: "Detailed reader item summary.",
  chineseTextMode: "summary_only"
};

function fakeReaderRepository(overrides: Partial<ReaderRepository> = {}): ReaderRepository {
  return {
    listReaderBoards: async () => [readerBoard],
    listReaderItems: async () => [readerItem],
    searchReaderItems: async () => [readerItem],
    listRelatedReaderItems: async () => [readerItem],
    listReaderDigestItems: async () => [readerItem],
    getReaderItemDetail: async () => readerItemDetail,
    close: async () => undefined,
    ...overrides
  };
}

const personalStateResponse = {
  saved: [{ itemId: 1, createdAt: "2026-05-21T00:00:00.000Z" }],
  readLater: [],
  readStatus: []
};

function fakePersonalStateRepository(
  overrides: Partial<PersonalStateRepository> = {}
): PersonalStateRepository {
  return {
    getPersonalState: async () => personalStateResponse,
    setSavedItem: async () => personalStateResponse,
    setReadLaterItem: async () => personalStateResponse,
    setReadStatus: async () => personalStateResponse,
    close: async () => undefined,
    ...overrides
  };
}

test("GET /healthz reports the API service as healthy", async () => {
  const app = buildApp({ logger: false });
  test.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "GET",
    url: "/healthz"
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    status: "ok",
    service: "api"
  });
});

test("GET /healthz returns request id and writes safe structured request logs", async () => {
  const logLines: string[] = [];
  const app = buildApp({
    logger: {
      level: "info",
      stream: {
        write: (line: string) => {
          logLines.push(line);
        }
      }
    }
  });
  test.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "GET",
    url: "/healthz",
    headers: {
      "x-request-id": "api-trace-1",
      authorization: "Bearer secret-token"
    }
  });
  const logs = logLines.join("");

  assert.equal(response.statusCode, 200);
  assert.equal(response.headers["x-request-id"], "api-trace-1");
  assert.match(logs, /"event":"request.start"/);
  assert.match(logs, /"requestId":"api-trace-1"/);
  assert.match(logs, /"path":"\/healthz"/);
  assert.doesNotMatch(logs, /secret-token|authorization|password|DATABASE_URL/i);
});

test("GET /metrics exposes Prometheus service and failure queue metrics", async () => {
  const app = buildApp(
    { logger: false },
    {
      failureQueueRepository: fakeFailureQueueRepository({
        listFailures: async () => [
          failureRecord,
          {
            ...failureRecord,
            id: 11,
            failureStage: "extraction",
            failureType: "parse"
          },
          {
            ...failureRecord,
            id: 12,
            failureStage: "model_call",
            purpose: "translation",
            errorCode: "adapter_error"
          }
        ]
      })
    }
  );
  test.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "GET",
    url: "/metrics"
  });
  const body = response.body;

  assert.equal(response.statusCode, 200);
  assert.match(response.headers["content-type"] as string, /^text\/plain/);
  assert.match(body, /# TYPE reno_news_api_up gauge/);
  assert.match(body, /reno_news_api_up 1/);
  assert.match(body, /reno_news_api_failure_queue_backlog 3/);
  assert.match(body, /reno_news_api_failure_queue_backlog\{stage="source_ingest"\} 1/);
  assert.match(body, /reno_news_api_failure_queue_backlog\{stage="extraction"\} 1/);
  assert.match(body, /reno_news_api_failure_queue_backlog\{stage="model_call"\} 1/);
  assert.match(body, /reno_news_api_ingest_failures 1/);
  assert.match(body, /reno_news_api_model_failures 1/);
  assert.match(body, /reno_news_api_backup_offhost_contract_configured 1/);
  assert.doesNotMatch(body, /admin-session-token|password|secret|DATABASE_URL/i);
});

test("POST /auth/login rejects invalid credentials without setting a session cookie", async () => {
  const recordedEvents: unknown[] = [];
  const app = buildApp(
    { logger: false },
    {
      authService: {
        login: async () => ({ ok: false, error: "invalid_credentials" }),
        currentUser: async () => null,
        logout: async () => undefined
      },
      auditRepository: fakeAuditRepository({
        recordAuditEvent: async (input) => {
          recordedEvents.push(input);
        }
      })
    }
  );
  test.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "POST",
    url: "/auth/login",
    headers: {
      "x-request-id": "auth-trace-1"
    },
    payload: {
      email: "reader@example.com",
      password: "wrong-password"
    }
  });

  assert.equal(response.statusCode, 401);
  assert.equal(response.headers["x-request-id"], "auth-trace-1");
  assert.deepEqual(response.json(), { error: "invalid_credentials" });
  assert.equal(response.headers["set-cookie"], undefined);
  assert.deepEqual(recordedEvents, [
    {
      actorUserId: null,
      actorRole: null,
      action: "auth.login_failed",
      objectType: "auth",
      objectId: null,
      requestId: "auth-trace-1",
      metadata: { failureReason: "invalid_credentials" }
    }
  ]);
});

test("POST /auth/login records successful login audit metadata", async () => {
  const recordedEvents: unknown[] = [];
  const app = buildApp(
    { logger: false },
    {
      authService: {
        login: async () => ({
          ok: true,
          user: {
            id: 42,
            email: "reader@example.com",
            role: "reader"
          },
          sessionToken: "raw-session-token",
          expiresAt: new Date("2026-05-21T12:00:00.000Z")
        }),
        currentUser: async () => null,
        logout: async () => undefined
      },
      auditRepository: fakeAuditRepository({
        recordAuditEvent: async (input) => {
          recordedEvents.push(input);
        }
      })
    }
  );
  test.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: {
      email: "reader@example.com",
      password: "correct-password"
    }
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(recordedEvents, [
    {
      actorUserId: 42,
      actorRole: "reader",
      action: "auth.login",
      objectType: "user",
      objectId: "42",
      requestId: recordedEvents[0]
        ? (recordedEvents[0] as { requestId: string }).requestId
        : "",
      metadata: { outcome: "success" }
    }
  ]);
  assert.match((recordedEvents[0] as { requestId: string }).requestId, /\S/);
});

test("POST /auth/logout records logout audit metadata for a current user", async () => {
  const recordedEvents: unknown[] = [];
  const app = buildApp(
    { logger: false },
    {
      authService: {
        login: async () => ({ ok: false, error: "invalid_credentials" }),
        currentUser: async () => ({
          id: 42,
          email: "reader@example.com",
          role: "reader"
        }),
        logout: async () => undefined
      },
      auditRepository: fakeAuditRepository({
        recordAuditEvent: async (input) => {
          recordedEvents.push(input);
        }
      })
    }
  );
  test.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "POST",
    url: "/auth/logout",
    headers: {
      cookie: "reno_news_session=raw-session-token"
    }
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(recordedEvents, [
    {
      actorUserId: 42,
      actorRole: "reader",
      action: "auth.logout",
      objectType: "user",
      objectId: "42",
      requestId: recordedEvents[0]
        ? (recordedEvents[0] as { requestId: string }).requestId
        : "",
      metadata: { outcome: "success" }
    }
  ]);
  assert.match((recordedEvents[0] as { requestId: string }).requestId, /\S/);
});

test("POST /auth/login rejects malformed email before auth service work", async () => {
  let loginCalled = false;
  const app = buildApp(
    { logger: false },
    {
      authService: {
        login: async () => {
          loginCalled = true;
          return { ok: false, error: "invalid_credentials" };
        },
        currentUser: async () => null,
        logout: async () => undefined
      }
    }
  );
  test.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: {
      email: "not-an-email",
      password: "wrong-password"
    }
  });

  assert.equal(response.statusCode, 400);
  assert.equal(loginCalled, false);
  assert.equal(response.headers["set-cookie"], undefined);
});

test("POST /auth/login returns a user and sets the session cookie on success", async () => {
  const app = buildApp(
    { logger: false },
    {
      authService: {
        login: async () => ({
          ok: true,
          user: {
            id: 42,
            email: "reader@example.com",
            role: "reader"
          },
          sessionToken: "raw-session-token",
          expiresAt: new Date("2026-05-21T12:00:00.000Z")
        }),
        currentUser: async () => null,
        logout: async () => undefined
      }
    }
  );
  test.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: {
      email: "reader@example.com",
      password: "correct-password"
    }
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    user: {
      id: 42,
      email: "reader@example.com",
      role: "reader"
    }
  });
  assert.match(String(response.headers["set-cookie"]), /reno_news_session=raw-session-token/);
  assert.match(String(response.headers["set-cookie"]), /HttpOnly/);
  assert.match(String(response.headers["set-cookie"]), /SameSite=Lax/);
});

test("GET /auth/me returns null for anonymous requests", async () => {
  const app = buildApp(
    { logger: false },
    {
      authService: {
        login: async () => ({ ok: false, error: "invalid_credentials" }),
        currentUser: async () => null,
        logout: async () => undefined
      }
    }
  );
  test.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "GET",
    url: "/auth/me"
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { user: null });
});

test("GET /auth/me returns the current user for a valid session cookie", async () => {
  let seenSessionToken: string | undefined;
  const app = buildApp(
    { logger: false },
    {
      authService: {
        login: async () => ({ ok: false, error: "invalid_credentials" }),
        currentUser: async (sessionToken) => {
          seenSessionToken = sessionToken;
          return {
            id: 42,
            email: "reader@example.com",
            role: "reader"
          };
        },
        logout: async () => undefined
      }
    }
  );
  test.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "GET",
    url: "/auth/me",
    headers: {
      cookie: "reno_news_session=raw-session-token"
    }
  });

  assert.equal(response.statusCode, 200);
  assert.equal(seenSessionToken, "raw-session-token");
  assert.deepEqual(response.json(), {
    user: {
      id: 42,
      email: "reader@example.com",
      role: "reader"
    }
  });
});

test("GET /auth/me clears the session cookie when the session is invalid", async () => {
  const app = buildApp(
    { logger: false },
    {
      authService: {
        login: async () => ({ ok: false, error: "invalid_credentials" }),
        currentUser: async () => null,
        logout: async () => undefined
      }
    }
  );
  test.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "GET",
    url: "/auth/me",
    headers: {
      cookie: "reno_news_session=expired-session-token"
    }
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { user: null });
  assert.match(String(response.headers["set-cookie"]), /reno_news_session=/);
  assert.match(String(response.headers["set-cookie"]), /Max-Age=0/);
});

test("POST /auth/logout revokes the current session and clears the cookie", async () => {
  let revokedSessionToken: string | undefined;
  const app = buildApp(
    { logger: false },
    {
      authService: {
        login: async () => ({ ok: false, error: "invalid_credentials" }),
        currentUser: async () => null,
        logout: async (sessionToken) => {
          revokedSessionToken = sessionToken;
        }
      }
    }
  );
  test.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "POST",
    url: "/auth/logout",
    headers: {
      cookie: "reno_news_session=raw-session-token"
    }
  });

  assert.equal(response.statusCode, 200);
  assert.equal(revokedSessionToken, "raw-session-token");
  assert.deepEqual(response.json(), { status: "ok" });
  assert.match(String(response.headers["set-cookie"]), /reno_news_session=/);
  assert.match(String(response.headers["set-cookie"]), /Max-Age=0/);
});

test("GET /sources lists source registry records", async () => {
  const app = buildApp({ logger: false }, withAdminAuth({ sourceRepository: fakeRepository() }));
  test.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "GET",
    url: "/sources",
    headers: adminSessionHeaders
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { sources: [sourceRecord] });
});

test("GET /sources/:id returns source detail", async () => {
  const app = buildApp({ logger: false }, withAdminAuth({ sourceRepository: fakeRepository() }));
  test.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "GET",
    url: "/sources/1",
    headers: adminSessionHeaders
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), sourceRecord);
});

test("POST /sources creates a source with policy", async () => {
  let receivedBody: unknown;
  const recordedEvents: unknown[] = [];
  const app = buildApp(
    { logger: false },
    withAdminAuth({
      sourceRepository: fakeRepository({
        createSource: async (input) => {
          receivedBody = input;
          return sourceRecord;
        }
      }),
      auditRepository: fakeAuditRepository({
        recordAuditEvent: async (input) => {
          recordedEvents.push(input);
        }
      })
    })
  );
  test.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "POST",
    url: "/sources",
    headers: adminSessionHeaders,
    payload: {
      boardSlug: "ai",
      sourceType: "rss",
      title: "OpenAI News",
      url: "https://openai.com/news/rss.xml",
      policy: {
        crawlEnabled: true,
        fetchIntervalMinutes: 60,
        maxRequestsPerHour: 12,
        saveLevel: "metadata_only",
        rightsPolicy: "metadata_only",
        translationPolicy: "none",
        riskLevel: "medium"
      }
    }
  });

  assert.equal(response.statusCode, 201);
  assert.deepEqual(response.json(), sourceRecord);
  assert.deepEqual(receivedBody, {
    boardSlug: "ai",
    sourceType: "rss",
    title: "OpenAI News",
    url: "https://openai.com/news/rss.xml",
    policy: {
      crawlEnabled: true,
      fetchIntervalMinutes: 60,
      maxRequestsPerHour: 12,
      saveLevel: "metadata_only",
      rightsPolicy: "metadata_only",
      translationPolicy: "none",
      riskLevel: "medium"
    }
  });
  assert.deepEqual(recordedEvents, [
    {
      actorUserId: 1,
      actorRole: "admin",
      action: "source.create",
      objectType: "source",
      objectId: "1",
      requestId: recordedRequestId(recordedEvents),
      metadata: {
        boardSlug: "ai",
        sourceType: "rss"
      }
    }
  ]);
  assert.match(recordedRequestId(recordedEvents), /\S/);
});

test("POST /sources rejects invalid source policy values", async () => {
  const app = buildApp({ logger: false }, withAdminAuth({ sourceRepository: fakeRepository() }));
  test.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "POST",
    url: "/sources",
    headers: adminSessionHeaders,
    payload: {
      boardSlug: "ai",
      sourceType: "rss",
      title: "Invalid Policy",
      url: "https://example.invalid/feed.xml",
      policy: {
        crawlEnabled: true,
        fetchIntervalMinutes: 0,
        maxRequestsPerHour: 12,
        saveLevel: "everything",
        rightsPolicy: "metadata_only",
        translationPolicy: "none",
        riskLevel: "medium"
      }
    }
  });

  assert.equal(response.statusCode, 400);
});

test("PATCH /sources/:id updates enablement and policy fields", async () => {
  let receivedId: number | undefined;
  let receivedBody: unknown;
  const app = buildApp(
    { logger: false },
    withAdminAuth({
      sourceRepository: fakeRepository({
        updateSource: async (id, input) => {
          receivedId = id;
          receivedBody = input;
          return {
            ...sourceRecord,
            enabled: false,
            policy: {
              ...sourceRecord.policy,
              crawlEnabled: false,
              riskLevel: "high"
            }
          };
        }
      })
    })
  );
  test.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "PATCH",
    url: "/sources/1",
    headers: adminSessionHeaders,
    payload: {
      enabled: false,
      policy: {
        crawlEnabled: false,
        riskLevel: "high"
      }
    }
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.json().enabled, false);
  assert.equal(response.json().policy.crawlEnabled, false);
  assert.equal(response.json().policy.riskLevel, "high");
  assert.equal(receivedId, 1);
  assert.deepEqual(receivedBody, {
    enabled: false,
    policy: {
      crawlEnabled: false,
      riskLevel: "high"
    }
  });
});

test("PATCH /sources/:id records an audit event visible through the admin audit API", async () => {
  const recordedEvents: unknown[] = [];
  const app = buildApp(
    { logger: false },
    withAdminAuth({
      sourceRepository: fakeRepository({
        updateSource: async () => ({
          ...sourceRecord,
          enabled: false
        })
      }),
      auditRepository: fakeAuditRepository({
        recordAuditEvent: async (input) => {
          recordedEvents.push(input);
        },
        listAuditEvents: async () => [auditEventRecord]
      })
    })
  );
  test.after(async () => {
    await app.close();
  });

  const patchResponse = await app.inject({
    method: "PATCH",
    url: "/sources/1",
    headers: adminSessionHeaders,
    payload: {
      enabled: false
    }
  });
  const auditResponse = await app.inject({
    method: "GET",
    url: "/admin/audit-events",
    headers: adminSessionHeaders
  });

  assert.equal(patchResponse.statusCode, 200);
  assert.deepEqual(recordedEvents, [
    {
      actorUserId: 1,
      actorRole: "admin",
      action: "source.update",
      objectType: "source",
      objectId: "1",
      requestId: recordedEvents[0]
        ? (recordedEvents[0] as { requestId: string }).requestId
        : "",
      metadata: { fields: ["enabled"] }
    }
  ]);
  assert.match((recordedEvents[0] as { requestId: string }).requestId, /\S/);
  assert.equal(auditResponse.statusCode, 200);
  assert.deepEqual(auditResponse.json(), { auditEvents: [auditEventRecord] });
});

test("PATCH /sources/:id returns 404 for missing sources", async () => {
  const app = buildApp(
    { logger: false },
    withAdminAuth({
      sourceRepository: fakeRepository({
        updateSource: async () => null
      })
    })
  );
  test.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "PATCH",
    url: "/sources/999",
    headers: adminSessionHeaders,
    payload: {
      enabled: false
    }
  });

  assert.equal(response.statusCode, 404);
});

test("GET /raw-entries lists raw entries", async () => {
  const app = buildApp(
    { logger: false },
    withAdminAuth({
      sourceRepository: fakeRepository(),
      rawEntryRepository: fakeRawEntryRepository()
    })
  );
  test.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "GET",
    url: "/raw-entries",
    headers: adminSessionHeaders
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { rawEntries: [rawEntryRecord] });
});

test("GET /raw-entries/:id returns raw entry detail", async () => {
  const app = buildApp(
    { logger: false },
    withAdminAuth({
      sourceRepository: fakeRepository(),
      rawEntryRepository: fakeRawEntryRepository()
    })
  );
  test.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "GET",
    url: "/raw-entries/1",
    headers: adminSessionHeaders
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), rawEntryRecord);
});

test("GET /raw-entries/:id returns 404 for missing raw entries", async () => {
  const app = buildApp(
    { logger: false },
    withAdminAuth({
      sourceRepository: fakeRepository(),
      rawEntryRepository: fakeRawEntryRepository({
        getRawEntry: async () => null
      })
    })
  );
  test.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "GET",
    url: "/raw-entries/999",
    headers: adminSessionHeaders
  });

  assert.equal(response.statusCode, 404);
});

test("PATCH /raw-entries/:id applies a lifecycle action", async () => {
  let receivedId: number | undefined;
  let receivedInput: unknown;
  const recordedEvents: unknown[] = [];
  const app = buildApp(
    { logger: false },
    withAdminAuth({
      sourceRepository: fakeRepository(),
      rawEntryRepository: fakeRawEntryRepository({
        updateRawEntryLifecycle: async (id, input) => {
          receivedId = id;
          receivedInput = input;
          return {
            ...rawEntryRecord,
            lifecycleStatus: "hidden"
          };
        }
      }),
      auditRepository: fakeAuditRepository({
        recordAuditEvent: async (input) => {
          recordedEvents.push(input);
        }
      })
    })
  );
  test.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "PATCH",
    url: "/raw-entries/1",
    headers: adminSessionHeaders,
    payload: {
      action: "hide"
    }
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.json().lifecycleStatus, "hidden");
  assert.equal(receivedId, 1);
  assert.deepEqual(receivedInput, { action: "hide" });
  assert.deepEqual(recordedEvents, [
    {
      actorUserId: 1,
      actorRole: "admin",
      action: "raw_entry.hide",
      objectType: "raw_entry",
      objectId: "1",
      requestId: recordedRequestId(recordedEvents),
      metadata: { action: "hide" }
    }
  ]);
  assert.match(recordedRequestId(recordedEvents), /\S/);
});

test("PATCH /raw-entries/:id records restore audit events", async () => {
  const recordedEvents: unknown[] = [];
  const app = buildApp(
    { logger: false },
    withAdminAuth({
      sourceRepository: fakeRepository(),
      rawEntryRepository: fakeRawEntryRepository({
        updateRawEntryLifecycle: async () => ({
          ...rawEntryRecord,
          lifecycleStatus: "candidate"
        })
      }),
      auditRepository: fakeAuditRepository({
        recordAuditEvent: async (input) => {
          recordedEvents.push(input);
        }
      })
    })
  );
  test.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "PATCH",
    url: "/raw-entries/1",
    headers: adminSessionHeaders,
    payload: {
      action: "restore"
    }
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.json().lifecycleStatus, "candidate");
  assert.deepEqual(recordedEvents, [
    {
      actorUserId: 1,
      actorRole: "admin",
      action: "raw_entry.restore",
      objectType: "raw_entry",
      objectId: "1",
      requestId: recordedRequestId(recordedEvents),
      metadata: { action: "restore" }
    }
  ]);
  assert.match(recordedRequestId(recordedEvents), /\S/);
});

test("PATCH /raw-entries/:id rejects unsupported lifecycle actions", async () => {
  const app = buildApp(
    { logger: false },
    withAdminAuth({
      sourceRepository: fakeRepository(),
      rawEntryRepository: fakeRawEntryRepository()
    })
  );
  test.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "PATCH",
    url: "/raw-entries/1",
    headers: adminSessionHeaders,
    payload: {
      action: "delete"
    }
  });

  assert.equal(response.statusCode, 400);
});

test("PATCH /raw-entries/:id returns 404 for missing raw entries", async () => {
  const app = buildApp(
    { logger: false },
    withAdminAuth({
      sourceRepository: fakeRepository(),
      rawEntryRepository: fakeRawEntryRepository({
        updateRawEntryLifecycle: async () => null
      })
    })
  );
  test.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "PATCH",
    url: "/raw-entries/999",
    headers: adminSessionHeaders,
    payload: {
      action: "hide"
    }
  });

  assert.equal(response.statusCode, 404);
});

test("GET /admin/failures lists failure queue records with optional limit", async () => {
  let receivedLimit: number | undefined;
  const app = buildApp(
    { logger: false },
    withAdminAuth({
      sourceRepository: fakeRepository(),
      rawEntryRepository: fakeRawEntryRepository(),
      failureQueueRepository: fakeFailureQueueRepository({
        listFailures: async (options) => {
          receivedLimit = options?.limit;
          return [failureRecord];
        }
      })
    })
  );
  test.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "GET",
    url: "/admin/failures?limit=5",
    headers: adminSessionHeaders
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { failures: [failureRecord] });
  assert.equal(receivedLimit, 5);
});

test("GET /admin/failures rejects anonymous sessions before repository work", async () => {
  let repositoryCalled = false;
  const app = buildApp(
    { logger: false },
    {
      failureQueueRepository: fakeFailureQueueRepository({
        listFailures: async () => {
          repositoryCalled = true;
          return [failureRecord];
        }
      })
    }
  );
  test.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "GET",
    url: "/admin/failures"
  });

  assert.equal(response.statusCode, 401);
  assert.deepEqual(response.json(), { error: "authentication_required" });
  assert.equal(repositoryCalled, false);
});

test("admin workflow routes reject anonymous sessions", async () => {
  const app = buildApp(
    { logger: false },
    {
      authService: authServiceForCurrentUser(null)
    }
  );
  test.after(async () => {
    await app.close();
  });

  for (const routeCase of adminRouteCases) {
    const response = await app.inject(routeCase);
    assert.equal(response.statusCode, 401, `${routeCase.method} ${routeCase.url}`);
    assert.deepEqual(
      response.json(),
      { error: "authentication_required" },
      `${routeCase.method} ${routeCase.url}`
    );
  }
});

test("admin workflow routes reject reader sessions", async () => {
  const app = buildApp(
    { logger: false },
    {
      authService: readerAuthService()
    }
  );
  test.after(async () => {
    await app.close();
  });

  for (const routeCase of adminRouteCases) {
    const response = await app.inject({
      ...routeCase,
      headers: adminSessionHeaders
    });
    assert.equal(response.statusCode, 403, `${routeCase.method} ${routeCase.url}`);
    assert.deepEqual(
      response.json(),
      { error: "admin_required" },
      `${routeCase.method} ${routeCase.url}`
    );
  }
});

test("GET /admin/failures rejects invalid limit", async () => {
  const app = buildApp(
    { logger: false },
    withAdminAuth({
      sourceRepository: fakeRepository(),
      rawEntryRepository: fakeRawEntryRepository(),
      failureQueueRepository: fakeFailureQueueRepository()
    })
  );
  test.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "GET",
    url: "/admin/failures?limit=0",
    headers: adminSessionHeaders
  });

  assert.equal(response.statusCode, 400);
});

test("GET /admin/audit-events lists audit records with optional limit", async () => {
  let receivedLimit: number | undefined;
  const app = buildApp(
    { logger: false },
    withAdminAuth({
      auditRepository: fakeAuditRepository({
        listAuditEvents: async (options) => {
          receivedLimit = options?.limit;
          return [auditEventRecord];
        }
      })
    })
  );
  test.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "GET",
    url: "/admin/audit-events?limit=5",
    headers: adminSessionHeaders
  });

  assert.equal(response.statusCode, 200);
  assert.equal(receivedLimit, 5);
  assert.deepEqual(response.json(), { auditEvents: [auditEventRecord] });
});

test("GET /admin/feedback lists recent feedback with optional limit", async () => {
  let receivedLimit: number | undefined;
  const app = buildApp(
    { logger: false },
    withAdminAuth({
      feedbackRepository: fakeFeedbackRepository({
        listFeedback: async (options) => {
          receivedLimit = options?.limit;
          return [feedbackRecord];
        }
      })
    })
  );
  test.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "GET",
    url: "/admin/feedback?limit=5",
    headers: adminSessionHeaders
  });

  assert.equal(response.statusCode, 200);
  assert.equal(receivedLimit, 5);
  assert.deepEqual(response.json(), { feedback: [feedbackRecord] });
});

test("PATCH /admin/feedback/:id updates feedback review state", async () => {
  let receivedId: number | undefined;
  let receivedInput: unknown;
  const recordedEvents: unknown[] = [];
  const reviewedFeedback: FeedbackRecord = {
    ...feedbackRecord,
    reviewStatus: "dismissed",
    reviewNote: "Invalid duplicate report.",
    reviewedAt: "2026-05-20T01:00:00.000Z"
  };
  const app = buildApp(
    { logger: false },
    withAdminAuth({
      feedbackRepository: fakeFeedbackRepository({
        updateFeedbackReview: async (id, input) => {
          receivedId = id;
          receivedInput = input;
          return reviewedFeedback;
        }
      }),
      auditRepository: fakeAuditRepository({
        recordAuditEvent: async (input) => {
          recordedEvents.push(input);
        }
      })
    })
  );
  test.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "PATCH",
    url: "/admin/feedback/20",
    headers: adminSessionHeaders,
    payload: {
      reviewStatus: "dismissed",
      reviewNote: "Invalid duplicate report."
    }
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(receivedInput, {
    reviewStatus: "dismissed",
    reviewNote: "Invalid duplicate report."
  });
  assert.equal(receivedId, 20);
  assert.deepEqual(response.json(), { feedback: reviewedFeedback });
  assert.deepEqual(recordedEvents, [
    {
      actorUserId: 1,
      actorRole: "admin",
      action: "feedback.review",
      objectType: "reader_feedback",
      objectId: "20",
      requestId: recordedRequestId(recordedEvents),
      metadata: { reviewStatus: "dismissed" }
    }
  ]);
  assert.match(recordedRequestId(recordedEvents), /\S/);
});

test("PATCH /admin/feedback/:id returns 404 for missing feedback", async () => {
  const app = buildApp(
    { logger: false },
    withAdminAuth({
      feedbackRepository: fakeFeedbackRepository({
        updateFeedbackReview: async () => null
      })
    })
  );
  test.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "PATCH",
    url: "/admin/feedback/999",
    headers: adminSessionHeaders,
    payload: {
      reviewStatus: "dismissed"
    }
  });

  assert.equal(response.statusCode, 404);
});

test("PATCH /admin/feedback/:id rejects invalid review payloads", async () => {
  const app = buildApp(
    { logger: false },
    withAdminAuth({ feedbackRepository: fakeFeedbackRepository() })
  );
  test.after(async () => {
    await app.close();
  });

  const unsupported = await app.inject({
    method: "PATCH",
    url: "/admin/feedback/20",
    headers: adminSessionHeaders,
    payload: {
      reviewStatus: "moderated"
    }
  });
  const oversized = await app.inject({
    method: "PATCH",
    url: "/admin/feedback/20",
    headers: adminSessionHeaders,
    payload: {
      reviewStatus: "reviewed",
      reviewNote: "x".repeat(2001)
    }
  });

  assert.equal(unsupported.statusCode, 400);
  assert.equal(oversized.statusCode, 400);
});

test("GET /reader/boards lists reader boards", async () => {
  const app = buildApp({ logger: false }, { readerRepository: fakeReaderRepository() });
  test.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "GET",
    url: "/reader/boards"
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { boards: [readerBoard] });
});

test("GET /reader/personal-state rejects anonymous sessions before repository work", async () => {
  let repositoryCalled = false;
  const app = buildApp(
    { logger: false },
    {
      authService: authServiceForCurrentUser(null),
      personalStateRepository: fakePersonalStateRepository({
        getPersonalState: async () => {
          repositoryCalled = true;
          return personalStateResponse;
        }
      })
    }
  );
  test.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "GET",
    url: "/reader/personal-state"
  });

  assert.equal(response.statusCode, 401);
  assert.deepEqual(response.json(), { error: "authentication_required" });
  assert.equal(repositoryCalled, false);
});

test("GET /reader/personal-state returns the current user's state", async () => {
  let receivedUserId: number | undefined;
  const app = buildApp(
    { logger: false },
    {
      authService: readerAuthService(),
      personalStateRepository: fakePersonalStateRepository({
        getPersonalState: async (input) => {
          receivedUserId = input.userId;
          return personalStateResponse;
        }
      })
    }
  );
  test.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "GET",
    url: "/reader/personal-state",
    headers: readerSessionHeaders
  });

  assert.equal(response.statusCode, 200);
  assert.equal(receivedUserId, 2);
  assert.deepEqual(response.json(), personalStateResponse);
});

test("PUT /reader/personal-state/saved sets saved state for the current user", async () => {
  let receivedInput: unknown;
  const updatedState = {
    saved: [{ itemId: 42, createdAt: "2026-05-21T01:00:00.000Z" }],
    readLater: [],
    readStatus: []
  };
  const app = buildApp(
    { logger: false },
    {
      authService: readerAuthService(),
      personalStateRepository: fakePersonalStateRepository({
        setSavedItem: async (input) => {
          receivedInput = input;
          return updatedState;
        }
      })
    }
  );
  test.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "PUT",
    url: "/reader/personal-state/saved",
    headers: readerSessionHeaders,
    payload: {
      itemId: 42,
      active: true
    }
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(receivedInput, { userId: 2, itemId: 42, active: true });
  assert.deepEqual(response.json(), updatedState);
});

test("PUT /reader/personal-state/read-later sets read-later state for the current user", async () => {
  let receivedInput: unknown;
  const updatedState = {
    saved: [],
    readLater: [{ itemId: 42, createdAt: "2026-05-21T01:00:00.000Z" }],
    readStatus: []
  };
  const app = buildApp(
    { logger: false },
    {
      authService: readerAuthService(),
      personalStateRepository: fakePersonalStateRepository({
        setReadLaterItem: async (input) => {
          receivedInput = input;
          return updatedState;
        }
      })
    }
  );
  test.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "PUT",
    url: "/reader/personal-state/read-later",
    headers: readerSessionHeaders,
    payload: {
      itemId: 42,
      active: true
    }
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(receivedInput, { userId: 2, itemId: 42, active: true });
  assert.deepEqual(response.json(), updatedState);
});

test("PUT /reader/personal-state/read-status sets read status for the current user", async () => {
  let receivedInput: unknown;
  const updatedState = {
    saved: [],
    readLater: [],
    readStatus: [
      {
        itemId: 42,
        status: "read" as const,
        updatedAt: "2026-05-21T01:00:00.000Z"
      }
    ]
  };
  const app = buildApp(
    { logger: false },
    {
      authService: readerAuthService(),
      personalStateRepository: fakePersonalStateRepository({
        setReadStatus: async (input) => {
          receivedInput = input;
          return updatedState;
        }
      })
    }
  );
  test.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "PUT",
    url: "/reader/personal-state/read-status",
    headers: readerSessionHeaders,
    payload: {
      itemId: 42,
      status: "read"
    }
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(receivedInput, { userId: 2, itemId: 42, status: "read" });
  assert.deepEqual(response.json(), updatedState);
});

test("personal state mutations reject anonymous writes and client-supplied user ids", async () => {
  let anonymousRepositoryCalled = false;
  const anonymousApp = buildApp(
    { logger: false },
    {
      authService: authServiceForCurrentUser(null),
      personalStateRepository: fakePersonalStateRepository({
        setSavedItem: async () => {
          anonymousRepositoryCalled = true;
          return personalStateResponse;
        }
      })
    }
  );
  test.after(async () => {
    await anonymousApp.close();
  });

  const anonymousResponse = await anonymousApp.inject({
    method: "PUT",
    url: "/reader/personal-state/saved",
    payload: {
      itemId: 42,
      active: true
    }
  });

  assert.equal(anonymousResponse.statusCode, 401);
  assert.deepEqual(anonymousResponse.json(), { error: "authentication_required" });
  assert.equal(anonymousRepositoryCalled, false);

  let injectedUserIdRepositoryCalled = false;
  const injectedUserIdApp = buildApp(
    { logger: false },
    {
      authService: readerAuthService(),
      personalStateRepository: fakePersonalStateRepository({
        setSavedItem: async () => {
          injectedUserIdRepositoryCalled = true;
          return personalStateResponse;
        }
      })
    }
  );
  test.after(async () => {
    await injectedUserIdApp.close();
  });

  const injectedUserIdResponse = await injectedUserIdApp.inject({
    method: "PUT",
    url: "/reader/personal-state/saved",
    headers: readerSessionHeaders,
    payload: {
      userId: 999,
      itemId: 42,
      active: true
    }
  });

  assert.equal(injectedUserIdResponse.statusCode, 400);
  assert.equal(injectedUserIdRepositoryCalled, false);
});

test("GET /reader/items passes optional board filter", async () => {
  let receivedBoardSlug: string | undefined;
  const app = buildApp(
    { logger: false },
    {
      readerRepository: fakeReaderRepository({
        listReaderItems: async (input) => {
          receivedBoardSlug = input?.boardSlug;
          return [readerItem];
        }
      })
    }
  );
  test.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "GET",
    url: "/reader/items?board=ai"
  });

  assert.equal(response.statusCode, 200);
  assert.equal(receivedBoardSlug, "ai");
  assert.deepEqual(response.json(), { items: [readerItem] });
});

test("GET /reader/search passes query and optional board filter", async () => {
  let receivedInput: unknown;
  const app = buildApp(
    { logger: false },
    {
      readerRepository: fakeReaderRepository({
        searchReaderItems: async (input) => {
          receivedInput = input;
          return [readerItem];
        }
      })
    }
  );
  test.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "GET",
    url: "/reader/search?q=Sample&board=ai"
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(receivedInput, { query: "Sample", boardSlug: "ai" });
  assert.deepEqual(response.json(), { items: [readerItem] });
});

test("GET /reader/search rejects missing query", async () => {
  const app = buildApp({ logger: false }, { readerRepository: fakeReaderRepository() });
  test.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "GET",
    url: "/reader/search?board=ai"
  });

  assert.equal(response.statusCode, 400);
});

test("GET /reader/search rejects empty query", async () => {
  const app = buildApp({ logger: false }, { readerRepository: fakeReaderRepository() });
  test.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "GET",
    url: "/reader/search?q=%20"
  });

  assert.equal(response.statusCode, 400);
});

test("GET /reader/digest returns digest item cards with optional filters", async () => {
  let receivedInput: unknown;
  const app = buildApp(
    { logger: false },
    {
      readerRepository: fakeReaderRepository({
        listReaderDigestItems: async (input) => {
          receivedInput = input;
          return [readerItem];
        }
      })
    }
  );
  test.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "GET",
    url: "/reader/digest?board=ai&limit=5"
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(receivedInput, { boardSlug: "ai", limit: 5 });
  assert.deepEqual(response.json(), { items: [readerItem] });
});

test("GET /reader/digest rejects invalid limits", async () => {
  const app = buildApp({ logger: false }, { readerRepository: fakeReaderRepository() });
  test.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "GET",
    url: "/reader/digest?limit=0"
  });

  assert.equal(response.statusCode, 400);
});

test("GET /reader/items/:id/related returns related item cards with optional limit", async () => {
  let receivedInput: unknown;
  const app = buildApp(
    { logger: false },
    {
      readerRepository: fakeReaderRepository({
        listRelatedReaderItems: async (input) => {
          receivedInput = input;
          return [readerItem];
        }
      })
    }
  );
  test.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "GET",
    url: "/reader/items/1/related?limit=3"
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(receivedInput, { id: 1, limit: 3 });
  assert.deepEqual(response.json(), { items: [readerItem] });
});

test("GET /reader/items/:id/related returns 404 for missing reader items", async () => {
  const app = buildApp(
    { logger: false },
    {
      readerRepository: fakeReaderRepository({
        listRelatedReaderItems: async () => null
      })
    }
  );
  test.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "GET",
    url: "/reader/items/999/related"
  });

  assert.equal(response.statusCode, 404);
});

test("GET /reader/items/:id/related rejects invalid limits", async () => {
  const app = buildApp({ logger: false }, { readerRepository: fakeReaderRepository() });
  test.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "GET",
    url: "/reader/items/1/related?limit=0"
  });

  assert.equal(response.statusCode, 400);
});

test("POST /reader/items/:id/feedback stores constrained feedback", async () => {
  let receivedInput: unknown;
  const app = buildApp(
    { logger: false },
    {
      feedbackRepository: fakeFeedbackRepository({
        createFeedback: async (input) => {
          receivedInput = input;
          return feedbackRecord;
        }
      })
    }
  );
  test.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "POST",
    url: "/reader/items/1/feedback",
    payload: {
      feedbackType: "quality_issue",
      message: "Summary is too vague."
    }
  });

  assert.equal(response.statusCode, 201);
  assert.deepEqual(receivedInput, {
    rawEntryId: 1,
    feedbackType: "quality_issue",
    message: "Summary is too vague."
  });
  assert.deepEqual(response.json(), { feedback: feedbackRecord });
});

test("POST /reader/items/:id/feedback returns 404 for invisible items", async () => {
  const app = buildApp(
    { logger: false },
    {
      feedbackRepository: fakeFeedbackRepository({
        createFeedback: async () => null
      })
    }
  );
  test.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "POST",
    url: "/reader/items/999/feedback",
    payload: {
      feedbackType: "correction"
    }
  });

  assert.equal(response.statusCode, 404);
});

test("POST /reader/items/:id/feedback rejects invalid payloads", async () => {
  const app = buildApp({ logger: false }, { feedbackRepository: fakeFeedbackRepository() });
  test.after(async () => {
    await app.close();
  });

  const unsupported = await app.inject({
    method: "POST",
    url: "/reader/items/1/feedback",
    payload: {
      feedbackType: "like"
    }
  });
  const oversized = await app.inject({
    method: "POST",
    url: "/reader/items/1/feedback",
    payload: {
      feedbackType: "correction",
      message: "x".repeat(2001)
    }
  });

  assert.equal(unsupported.statusCode, 400);
  assert.equal(oversized.statusCode, 400);
});

test("GET /reader/items/:id returns reader item detail", async () => {
  let receivedId: number | undefined;
  const app = buildApp(
    { logger: false },
    {
      readerRepository: fakeReaderRepository({
        getReaderItemDetail: async (id) => {
          receivedId = id;
          return readerItemDetail;
        }
      })
    }
  );
  test.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "GET",
    url: "/reader/items/1"
  });

  assert.equal(response.statusCode, 200);
  assert.equal(receivedId, 1);
  assert.deepEqual(response.json(), { item: readerItemDetail });
});

test("GET /reader/items/:id returns 404 for missing reader item detail", async () => {
  const app = buildApp(
    { logger: false },
    {
      readerRepository: fakeReaderRepository({
        getReaderItemDetail: async () => null
      })
    }
  );
  test.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "GET",
    url: "/reader/items/999"
  });

  assert.equal(response.statusCode, 404);
});
