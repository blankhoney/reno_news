import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getReaderBoards,
  getReaderItemDetail,
  getReaderItems,
  getReaderRelatedItems,
  getReaderSearchItems,
  joinServiceUrl,
  readerFeedbackFromFormData,
  readerItemPath,
  submitReaderFeedback
} from "./readerApi";

test("joinServiceUrl handles reader paths", () => {
  assert.equal(
    joinServiceUrl("http://localhost:3001/", "/reader/boards"),
    "http://localhost:3001/reader/boards"
  );
});

test("getReaderBoards fetches reader board payloads without caching", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    assert.equal(String(input), "http://localhost:3001/reader/boards");
    assert.equal(init?.cache, "no-store");
    return new Response(
      JSON.stringify({
        boards: [{ slug: "ai", name: "AI", description: "AI board" }]
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  }) as typeof fetch;

  try {
    const boards = await getReaderBoards();
    assert.equal(boards[0].slug, "ai");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getReaderItems appends board query when provided", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    assert.equal(String(input), "http://localhost:3001/reader/items?board=ai");
    assert.equal(init?.cache, "no-store");
    return new Response(
      JSON.stringify({
        items: [
          {
            id: 1,
            boardSlug: "ai",
            boardName: "AI",
            sourceTitle: "OpenAI News",
            title: "Sample AI item",
            url: "https://example.invalid/ai/sample-ai-001",
            summary: "Summary",
            publishedAt: "2026-05-20T00:00:00.000Z",
            createdAt: "2026-05-20T00:00:00.000Z"
          }
        ]
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  }) as typeof fetch;

  try {
    const items = await getReaderItems("ai");
    assert.equal(items[0].boardSlug, "ai");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getReaderSearchItems appends query and optional board filter", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    assert.equal(
      String(input),
      "http://localhost:3001/reader/search?q=quantum+ai&board=ai"
    );
    assert.equal(init?.cache, "no-store");
    return new Response(
      JSON.stringify({
        items: [
          {
            id: 1,
            boardSlug: "ai",
            boardName: "AI",
            sourceTitle: "OpenAI News",
            title: "Quantum AI item",
            url: "https://example.invalid/ai/quantum-ai-001",
            summary: "Summary",
            publishedAt: "2026-05-20T00:00:00.000Z",
            createdAt: "2026-05-20T00:00:00.000Z"
          }
        ]
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  }) as typeof fetch;

  try {
    const items = await getReaderSearchItems("quantum ai", "ai");
    assert.equal(items[0].title, "Quantum AI item");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getReaderRelatedItems fetches related items with optional limit", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    assert.equal(String(input), "http://localhost:3001/reader/items/1/related?limit=3");
    assert.equal(init?.cache, "no-store");
    return new Response(
      JSON.stringify({
        items: [
          {
            id: 2,
            boardSlug: "ai",
            boardName: "AI",
            sourceTitle: "OpenAI News",
            title: "Related AI item",
            url: "https://example.invalid/ai/related-ai-001",
            summary: "Related summary",
            publishedAt: "2026-05-20T00:00:00.000Z",
            createdAt: "2026-05-20T00:00:00.000Z"
          }
        ]
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  }) as typeof fetch;

  try {
    const items = await getReaderRelatedItems(1, 3);
    assert.ok(items);
    assert.equal(items[0].id, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("readerFeedbackFromFormData builds a constrained feedback payload", () => {
  const formData = new FormData();
  formData.set("feedbackType", "quality_issue");
  formData.set("message", " Summary is too vague. ");

  assert.deepEqual(readerFeedbackFromFormData(formData), {
    feedbackType: "quality_issue",
    message: "Summary is too vague."
  });

  formData.set("message", " ");
  assert.deepEqual(readerFeedbackFromFormData(formData), {
    feedbackType: "quality_issue"
  });
});

test("readerFeedbackFromFormData rejects unsupported type and oversized message", () => {
  const unsupported = new FormData();
  unsupported.set("feedbackType", "like");
  assert.throws(
    () => readerFeedbackFromFormData(unsupported),
    /feedbackType has an unsupported value/
  );

  const oversized = new FormData();
  oversized.set("feedbackType", "correction");
  oversized.set("message", "x".repeat(2001));
  assert.throws(
    () => readerFeedbackFromFormData(oversized),
    /message must be 2000 characters or fewer/
  );
});

test("submitReaderFeedback sends constrained feedback to the item API", async () => {
  const originalFetch = globalThis.fetch;
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return new Response("{}", { status: 201 });
  }) as typeof fetch;

  try {
    await submitReaderFeedback(7, {
      feedbackType: "rights_concern",
      message: "Rights issue."
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(requestUrl, "http://localhost:3001/reader/items/7/feedback");
  assert.equal(requestInit?.method, "POST");
  assert.deepEqual(requestInit?.headers, { "content-type": "application/json" });
  assert.equal(
    requestInit?.body,
    JSON.stringify({
      feedbackType: "rights_concern",
      message: "Rights issue."
    })
  );
});

test("readerItemPath appends language view query when provided", () => {
  assert.equal(readerItemPath(7), "/items/7");
  assert.equal(readerItemPath(7, "zh"), "/items/7?view=zh");
  assert.equal(readerItemPath(7, "original"), "/items/7?view=original");
});

test("getReaderItemDetail fetches reader item detail without caching", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    assert.equal(String(input), "http://localhost:3001/reader/items/1");
    assert.equal(init?.cache, "no-store");
    return new Response(
      JSON.stringify({
        item: {
          id: 1,
          boardSlug: "ai",
          boardName: "AI",
          sourceTitle: "OpenAI News",
          title: "Sample AI item",
          url: "https://example.invalid/ai/sample-ai-001",
          summary: "Summary",
          detailSummary: "Detailed summary",
          whyItMatters: "Why it matters",
          sourceNote: "Source note",
          chinaRelevance: "China relevance",
          relatedTopics: ["AI"],
          originalTitle: "Sample AI item Original",
          originalText: "",
          originalTextMode: "none",
          chineseTitle: "Sample AI item",
          chineseText: "Detailed summary",
          chineseTextMode: "summary_only",
          publishedAt: "2026-05-20T00:00:00.000Z",
          createdAt: "2026-05-20T00:00:00.000Z"
        }
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  }) as typeof fetch;

  try {
    const item = await getReaderItemDetail(1);
    assert.ok(item);
    assert.equal(item.id, 1);
    assert.equal(item.chineseTextMode, "summary_only");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
