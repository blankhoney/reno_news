import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getReaderBoards,
  getReaderDigestEdition,
  getReaderDigestItems,
  getReaderItemDetail,
  getReaderItems,
  getReaderRelatedItems,
  getReaderSearchItems,
  joinServiceUrl,
  readerLoadMorePath,
  readerPaginationFromSearchParams,
  readerWebPageSize,
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

test("getReaderItems serializes board and pagination query", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    assert.equal(
      String(input),
      "http://localhost:3001/reader/items?board=ai&limit=25&offset=25"
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
            title: "Sample AI item",
            url: "https://example.invalid/ai/sample-ai-001",
            summary: "Summary",
            publishedAt: "2026-05-20T00:00:00.000Z",
            createdAt: "2026-05-20T00:00:00.000Z"
          }
        ],
        pagination: {
          limit: 25,
          offset: 25,
          hasMore: true,
          nextOffset: 50
        }
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  }) as typeof fetch;

  try {
    const page = await getReaderItems({ boardSlug: "ai", limit: 25, offset: 25 });
    assert.equal(page.items[0].boardSlug, "ai");
    assert.deepEqual(page.pagination, {
      limit: 25,
      offset: 25,
      hasMore: true,
      nextOffset: 50
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getReaderSearchItems serializes query, board, and pagination", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    assert.equal(
      String(input),
      "http://localhost:3001/reader/search?q=quantum+ai&board=ai&limit=25&offset=25"
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
        ],
        pagination: {
          limit: 25,
          offset: 25,
          hasMore: true,
          nextOffset: 50
        }
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  }) as typeof fetch;

  try {
    const page = await getReaderSearchItems({
      query: "quantum ai",
      boardSlug: "ai",
      limit: 25,
      offset: 25
    });
    assert.equal(page.items[0].title, "Quantum AI item");
    assert.deepEqual(page.pagination, {
      limit: 25,
      offset: 25,
      hasMore: true,
      nextOffset: 50
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("readerLoadMorePath preserves filters and appends the next page", () => {
  assert.equal(
    readerLoadMorePath(
      "/search",
      { q: "Kubernetes", board: "open-source" },
      {
        limit: 25,
        offset: 25,
        hasMore: true,
        nextOffset: 50
      }
    ),
    "/search?q=Kubernetes&board=open-source&limit=25&offset=50"
  );
  assert.equal(
    readerLoadMorePath(
      "/boards/ai",
      {},
      {
        limit: 25,
        offset: 0,
        hasMore: false,
        nextOffset: null
      }
    ),
    null
  );
});

test("readerPaginationFromSearchParams reads URL pagination with web defaults", () => {
  assert.deepEqual(readerPaginationFromSearchParams({}), {
    limit: readerWebPageSize,
    offset: 0
  });
  assert.deepEqual(readerPaginationFromSearchParams({ limit: "10", offset: "30" }), {
    limit: 10,
    offset: 30
  });
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

test("getReaderDigestItems fetches digest items with optional filters", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    assert.equal(String(input), "http://localhost:3001/reader/digest?board=ai&limit=5");
    assert.equal(init?.cache, "no-store");
    return new Response(
      JSON.stringify({
        items: [
          {
            id: 3,
            boardSlug: "ai",
            boardName: "AI",
            sourceTitle: "OpenAI News",
            title: "Digest AI item",
            url: "https://example.invalid/ai/digest-ai-001",
            summary: "Digest summary",
            publishedAt: "2026-05-20T00:00:00.000Z",
            createdAt: "2026-05-20T00:00:00.000Z"
          }
        ]
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  }) as typeof fetch;

  try {
    const items = await getReaderDigestItems({ boardSlug: "ai", limit: 5 });
    assert.equal(items[0].id, 3);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getReaderDigestEdition fetches a replay edition by encoded key", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    assert.equal(
      String(input),
      "http://localhost:3001/reader/digest-editions/board%3Aai%3A2026-05-21"
    );
    assert.equal(init?.cache, "no-store");
    return new Response(
      JSON.stringify({
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
              itemId: 3,
              position: 1,
              snapshot: {
                id: 3,
                boardSlug: "ai",
                boardName: "AI",
                sourceTitle: "OpenAI News",
                title: "Digest AI item",
                summary: "Stored digest summary",
                publishedAt: "2026-05-20T00:00:00.000Z",
                createdAt: "2026-05-20T00:00:00.000Z"
              }
            }
          ]
        }
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  }) as typeof fetch;

  try {
    const edition = await getReaderDigestEdition("board:ai:2026-05-21");
    assert.ok(edition);
    assert.equal(edition.items[0].snapshot.title, "Digest AI item");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getReaderDigestEdition returns null for missing editions", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response("{}", { status: 404 })) as typeof fetch;

  try {
    assert.equal(await getReaderDigestEdition("missing:edition"), null);
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
