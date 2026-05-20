import { test } from "node:test";
import assert from "node:assert/strict";
import {
  feedbackReviewUpdateFromFormData,
  getCurrentUser,
  getFeedback,
  getFailures,
  joinServiceUrl,
  rawEntryLifecycleActionFromFormData,
  sourcePolicyUpdateFromFormData,
  updateFeedbackReview,
  updateRawEntryLifecycle,
  updateSourcePolicy,
  type FeedbackReviewUpdate,
  type RawEntryLifecycleUpdate,
  type SourcePolicyUpdate
} from "./api";

test("joinServiceUrl handles trailing and leading slashes", () => {
  assert.equal(
    joinServiceUrl("http://localhost:3001/", "/sources"),
    "http://localhost:3001/sources"
  );
  assert.equal(
    joinServiceUrl("http://localhost:3001", "sources/1"),
    "http://localhost:3001/sources/1"
  );
});

test("getCurrentUser forwards the admin session cookie to the auth API", async () => {
  const previousFetch = globalThis.fetch;
  let requestUrl = "";
  let requestInit: RequestInit | undefined;

  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(url);
    requestInit = init;
    return Response.json({
      user: {
        id: 1,
        email: "admin@example.com",
        role: "admin"
      }
    });
  }) as typeof fetch;
  test.after(() => {
    globalThis.fetch = previousFetch;
  });

  const user = await getCurrentUser({ cookieHeader: "reno_news_session=abc123" });

  assert.equal(requestUrl, "http://localhost:3001/auth/me");
  assert.deepEqual(requestInit, {
    cache: "no-store",
    headers: { cookie: "reno_news_session=abc123" }
  });
  assert.deepEqual(user, {
    id: 1,
    email: "admin@example.com",
    role: "admin"
  });
});

test("sourcePolicyUpdateFromFormData builds a constrained policy payload", () => {
  const formData = new FormData();
  formData.set("crawlEnabled", "false");
  formData.set("fetchIntervalMinutes", "45");
  formData.set("maxRequestsPerHour", "9");
  formData.set("saveLevel", "excerpt");
  formData.set("rightsPolicy", "public_excerpt_allowed");
  formData.set("translationPolicy", "private_only");
  formData.set("riskLevel", "high");

  assert.deepEqual(sourcePolicyUpdateFromFormData(formData), {
    crawlEnabled: false,
    fetchIntervalMinutes: 45,
    maxRequestsPerHour: 9,
    saveLevel: "excerpt",
    rightsPolicy: "public_excerpt_allowed",
    translationPolicy: "private_only",
    riskLevel: "high"
  });
});

test("sourcePolicyUpdateFromFormData rejects non-positive numeric policy values", () => {
  const formData = new FormData();
  formData.set("crawlEnabled", "true");
  formData.set("fetchIntervalMinutes", "0");
  formData.set("maxRequestsPerHour", "9");
  formData.set("saveLevel", "metadata_only");
  formData.set("rightsPolicy", "metadata_only");
  formData.set("translationPolicy", "none");
  formData.set("riskLevel", "low");

  assert.throws(
    () => sourcePolicyUpdateFromFormData(formData),
    /fetchIntervalMinutes must be a positive integer/
  );
});

test("updateSourcePolicy sends nested policy payload to the source API", async () => {
  const previousFetch = globalThis.fetch;
  const policy: SourcePolicyUpdate = {
    crawlEnabled: true,
    fetchIntervalMinutes: 30,
    maxRequestsPerHour: 6,
    saveLevel: "snapshot",
    rightsPolicy: "private_allowed",
    translationPolicy: "public_excerpt",
    riskLevel: "medium"
  };
  let requestUrl = "";
  let requestInit: RequestInit | undefined;

  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(url);
    requestInit = init;
    return new Response("{}", { status: 200 });
  }) as typeof fetch;
  test.after(() => {
    globalThis.fetch = previousFetch;
  });

  await updateSourcePolicy("7", policy);

  assert.equal(requestUrl, "http://localhost:3001/sources/7");
  assert.equal(requestInit?.method, "PATCH");
  assert.deepEqual(requestInit?.headers, { "content-type": "application/json" });
  assert.equal(requestInit?.body, JSON.stringify({ policy }));
});

test("updateSourcePolicy forwards the admin session cookie with JSON headers", async () => {
  const previousFetch = globalThis.fetch;
  const policy: SourcePolicyUpdate = {
    crawlEnabled: true,
    fetchIntervalMinutes: 30,
    maxRequestsPerHour: 6,
    saveLevel: "snapshot",
    rightsPolicy: "private_allowed",
    translationPolicy: "public_excerpt",
    riskLevel: "medium"
  };
  let requestInit: RequestInit | undefined;

  globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
    requestInit = init;
    return new Response("{}", { status: 200 });
  }) as typeof fetch;
  test.after(() => {
    globalThis.fetch = previousFetch;
  });

  await updateSourcePolicy("7", policy, { cookieHeader: "reno_news_session=abc123" });

  assert.deepEqual(requestInit?.headers, {
    "content-type": "application/json",
    cookie: "reno_news_session=abc123"
  });
});

test("rawEntryLifecycleActionFromFormData builds a constrained action payload", () => {
  const formData = new FormData();
  formData.set("action", "restore");

  assert.deepEqual(rawEntryLifecycleActionFromFormData(formData), {
    action: "restore"
  });
});

test("rawEntryLifecycleActionFromFormData rejects unsupported lifecycle actions", () => {
  const formData = new FormData();
  formData.set("action", "delete");

  assert.throws(
    () => rawEntryLifecycleActionFromFormData(formData),
    /action has an unsupported value/
  );
});

test("updateRawEntryLifecycle sends constrained lifecycle action to the raw entry API", async () => {
  const previousFetch = globalThis.fetch;
  const update: RawEntryLifecycleUpdate = {
    action: "hide"
  };
  let requestUrl = "";
  let requestInit: RequestInit | undefined;

  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(url);
    requestInit = init;
    return new Response("{}", { status: 200 });
  }) as typeof fetch;
  test.after(() => {
    globalThis.fetch = previousFetch;
  });

  await updateRawEntryLifecycle("9", update);

  assert.equal(requestUrl, "http://localhost:3001/raw-entries/9");
  assert.equal(requestInit?.method, "PATCH");
  assert.deepEqual(requestInit?.headers, { "content-type": "application/json" });
  assert.equal(requestInit?.body, JSON.stringify(update));
});

test("feedbackReviewUpdateFromFormData builds a constrained review payload", () => {
  const formData = new FormData();
  formData.set("reviewStatus", "dismissed");
  formData.set("reviewNote", "Invalid duplicate report.");

  assert.deepEqual(feedbackReviewUpdateFromFormData(formData), {
    reviewStatus: "dismissed",
    reviewNote: "Invalid duplicate report."
  });
});

test("feedbackReviewUpdateFromFormData omits blank review notes", () => {
  const formData = new FormData();
  formData.set("reviewStatus", "open");
  formData.set("reviewNote", "   ");

  assert.deepEqual(feedbackReviewUpdateFromFormData(formData), {
    reviewStatus: "open"
  });
});

test("feedbackReviewUpdateFromFormData rejects unsupported review statuses", () => {
  const formData = new FormData();
  formData.set("reviewStatus", "moderated");

  assert.throws(
    () => feedbackReviewUpdateFromFormData(formData),
    /reviewStatus has an unsupported value/
  );
});

test("feedbackReviewUpdateFromFormData rejects oversized review notes", () => {
  const formData = new FormData();
  formData.set("reviewStatus", "reviewed");
  formData.set("reviewNote", "x".repeat(2001));

  assert.throws(
    () => feedbackReviewUpdateFromFormData(formData),
    /reviewNote must be at most 2000 characters/
  );
});

test("updateFeedbackReview sends constrained review payload to the feedback API", async () => {
  const previousFetch = globalThis.fetch;
  const update: FeedbackReviewUpdate = {
    reviewStatus: "dismissed",
    reviewNote: "Invalid duplicate report."
  };
  let requestUrl = "";
  let requestInit: RequestInit | undefined;

  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(url);
    requestInit = init;
    return new Response("{}", { status: 200 });
  }) as typeof fetch;
  test.after(() => {
    globalThis.fetch = previousFetch;
  });

  await updateFeedbackReview("20", update);

  assert.equal(requestUrl, "http://localhost:3001/admin/feedback/20");
  assert.equal(requestInit?.method, "PATCH");
  assert.deepEqual(requestInit?.headers, { "content-type": "application/json" });
  assert.equal(requestInit?.body, JSON.stringify(update));
});

test("getFailures fetches admin failure queue without caching", async () => {
  const previousFetch = globalThis.fetch;
  let requestUrl = "";
  let requestInit: RequestInit | undefined;

  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(url);
    requestInit = init;
    return Response.json({
      failures: [
        {
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
        }
      ]
    });
  }) as typeof fetch;
  test.after(() => {
    globalThis.fetch = previousFetch;
  });

  const failures = await getFailures();

  assert.equal(requestUrl, "http://localhost:3001/admin/failures");
  assert.deepEqual(requestInit, { cache: "no-store" });
  assert.equal(failures[0].failureStage, "source_ingest");
  assert.equal(failures[0].sourceTitle, "OpenAI News");
});

test("getFailures forwards the admin session cookie", async () => {
  const previousFetch = globalThis.fetch;
  let requestInit: RequestInit | undefined;

  globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
    requestInit = init;
    return Response.json({ failures: [] });
  }) as typeof fetch;
  test.after(() => {
    globalThis.fetch = previousFetch;
  });

  await getFailures({ cookieHeader: "reno_news_session=abc123" });

  assert.deepEqual(requestInit, {
    cache: "no-store",
    headers: { cookie: "reno_news_session=abc123" }
  });
});

test("getFeedback fetches admin feedback without caching", async () => {
  const previousFetch = globalThis.fetch;
  let requestUrl = "";
  let requestInit: RequestInit | undefined;

  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(url);
    requestInit = init;
    return Response.json({
      feedback: [
        {
          id: 20,
          rawEntryId: 1,
          rawEntryTitle: "Sample AI item",
          boardSlug: "ai",
          boardName: "AI",
          sourceTitle: "OpenAI News",
          feedbackType: "quality_issue",
          message: "Summary is too vague.",
          createdAt: "2026-05-20T00:00:00.000Z"
        }
      ]
    });
  }) as typeof fetch;
  test.after(() => {
    globalThis.fetch = previousFetch;
  });

  const feedback = await getFeedback();

  assert.equal(requestUrl, "http://localhost:3001/admin/feedback");
  assert.deepEqual(requestInit, { cache: "no-store" });
  assert.equal(feedback[0].feedbackType, "quality_issue");
  assert.equal(feedback[0].rawEntryTitle, "Sample AI item");
});
