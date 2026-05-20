import { test } from "node:test";
import assert from "node:assert/strict";
import type {
  FailureQueueRecord,
  FailureQueueRepository,
  FeedbackRecord,
  FeedbackRepository,
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

test("POST /auth/login rejects invalid credentials without setting a session cookie", async () => {
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
    method: "POST",
    url: "/auth/login",
    payload: {
      email: "reader@example.com",
      password: "wrong-password"
    }
  });

  assert.equal(response.statusCode, 401);
  assert.deepEqual(response.json(), { error: "invalid_credentials" });
  assert.equal(response.headers["set-cookie"], undefined);
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
  const app = buildApp({ logger: false }, { sourceRepository: fakeRepository() });
  test.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "GET",
    url: "/sources"
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { sources: [sourceRecord] });
});

test("GET /sources/:id returns source detail", async () => {
  const app = buildApp({ logger: false }, { sourceRepository: fakeRepository() });
  test.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "GET",
    url: "/sources/1"
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), sourceRecord);
});

test("POST /sources creates a source with policy", async () => {
  let receivedBody: unknown;
  const app = buildApp(
    { logger: false },
    {
      sourceRepository: fakeRepository({
        createSource: async (input) => {
          receivedBody = input;
          return sourceRecord;
        }
      })
    }
  );
  test.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "POST",
    url: "/sources",
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
});

test("POST /sources rejects invalid source policy values", async () => {
  const app = buildApp({ logger: false }, { sourceRepository: fakeRepository() });
  test.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "POST",
    url: "/sources",
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
    {
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
    }
  );
  test.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "PATCH",
    url: "/sources/1",
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

test("PATCH /sources/:id returns 404 for missing sources", async () => {
  const app = buildApp(
    { logger: false },
    {
      sourceRepository: fakeRepository({
        updateSource: async () => null
      })
    }
  );
  test.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "PATCH",
    url: "/sources/999",
    payload: {
      enabled: false
    }
  });

  assert.equal(response.statusCode, 404);
});

test("GET /raw-entries lists raw entries", async () => {
  const app = buildApp(
    { logger: false },
    {
      sourceRepository: fakeRepository(),
      rawEntryRepository: fakeRawEntryRepository()
    }
  );
  test.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "GET",
    url: "/raw-entries"
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { rawEntries: [rawEntryRecord] });
});

test("GET /raw-entries/:id returns raw entry detail", async () => {
  const app = buildApp(
    { logger: false },
    {
      sourceRepository: fakeRepository(),
      rawEntryRepository: fakeRawEntryRepository()
    }
  );
  test.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "GET",
    url: "/raw-entries/1"
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), rawEntryRecord);
});

test("GET /raw-entries/:id returns 404 for missing raw entries", async () => {
  const app = buildApp(
    { logger: false },
    {
      sourceRepository: fakeRepository(),
      rawEntryRepository: fakeRawEntryRepository({
        getRawEntry: async () => null
      })
    }
  );
  test.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "GET",
    url: "/raw-entries/999"
  });

  assert.equal(response.statusCode, 404);
});

test("PATCH /raw-entries/:id applies a lifecycle action", async () => {
  let receivedId: number | undefined;
  let receivedInput: unknown;
  const app = buildApp(
    { logger: false },
    {
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
      })
    }
  );
  test.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "PATCH",
    url: "/raw-entries/1",
    payload: {
      action: "hide"
    }
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.json().lifecycleStatus, "hidden");
  assert.equal(receivedId, 1);
  assert.deepEqual(receivedInput, { action: "hide" });
});

test("PATCH /raw-entries/:id rejects unsupported lifecycle actions", async () => {
  const app = buildApp(
    { logger: false },
    {
      sourceRepository: fakeRepository(),
      rawEntryRepository: fakeRawEntryRepository()
    }
  );
  test.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "PATCH",
    url: "/raw-entries/1",
    payload: {
      action: "delete"
    }
  });

  assert.equal(response.statusCode, 400);
});

test("PATCH /raw-entries/:id returns 404 for missing raw entries", async () => {
  const app = buildApp(
    { logger: false },
    {
      sourceRepository: fakeRepository(),
      rawEntryRepository: fakeRawEntryRepository({
        updateRawEntryLifecycle: async () => null
      })
    }
  );
  test.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "PATCH",
    url: "/raw-entries/999",
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
    {
      sourceRepository: fakeRepository(),
      rawEntryRepository: fakeRawEntryRepository(),
      failureQueueRepository: fakeFailureQueueRepository({
        listFailures: async (options) => {
          receivedLimit = options?.limit;
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
    url: "/admin/failures?limit=5"
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { failures: [failureRecord] });
  assert.equal(receivedLimit, 5);
});

test("GET /admin/failures rejects invalid limit", async () => {
  const app = buildApp(
    { logger: false },
    {
      sourceRepository: fakeRepository(),
      rawEntryRepository: fakeRawEntryRepository(),
      failureQueueRepository: fakeFailureQueueRepository()
    }
  );
  test.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "GET",
    url: "/admin/failures?limit=0"
  });

  assert.equal(response.statusCode, 400);
});

test("GET /admin/feedback lists recent feedback with optional limit", async () => {
  let receivedLimit: number | undefined;
  const app = buildApp(
    { logger: false },
    {
      feedbackRepository: fakeFeedbackRepository({
        listFeedback: async (options) => {
          receivedLimit = options?.limit;
          return [feedbackRecord];
        }
      })
    }
  );
  test.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "GET",
    url: "/admin/feedback?limit=5"
  });

  assert.equal(response.statusCode, 200);
  assert.equal(receivedLimit, 5);
  assert.deepEqual(response.json(), { feedback: [feedbackRecord] });
});

test("PATCH /admin/feedback/:id updates feedback review state", async () => {
  let receivedId: number | undefined;
  let receivedInput: unknown;
  const reviewedFeedback: FeedbackRecord = {
    ...feedbackRecord,
    reviewStatus: "dismissed",
    reviewNote: "Invalid duplicate report.",
    reviewedAt: "2026-05-20T01:00:00.000Z"
  };
  const app = buildApp(
    { logger: false },
    {
      feedbackRepository: fakeFeedbackRepository({
        updateFeedbackReview: async (id, input) => {
          receivedId = id;
          receivedInput = input;
          return reviewedFeedback;
        }
      })
    }
  );
  test.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "PATCH",
    url: "/admin/feedback/20",
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
});

test("PATCH /admin/feedback/:id returns 404 for missing feedback", async () => {
  const app = buildApp(
    { logger: false },
    {
      feedbackRepository: fakeFeedbackRepository({
        updateFeedbackReview: async () => null
      })
    }
  );
  test.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "PATCH",
    url: "/admin/feedback/999",
    payload: {
      reviewStatus: "dismissed"
    }
  });

  assert.equal(response.statusCode, 404);
});

test("PATCH /admin/feedback/:id rejects invalid review payloads", async () => {
  const app = buildApp({ logger: false }, { feedbackRepository: fakeFeedbackRepository() });
  test.after(async () => {
    await app.close();
  });

  const unsupported = await app.inject({
    method: "PATCH",
    url: "/admin/feedback/20",
    payload: {
      reviewStatus: "moderated"
    }
  });
  const oversized = await app.inject({
    method: "PATCH",
    url: "/admin/feedback/20",
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
