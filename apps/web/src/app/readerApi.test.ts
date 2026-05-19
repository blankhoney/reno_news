import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getReaderBoards,
  getReaderItemDetail,
  getReaderItems,
  joinServiceUrl,
  readerItemPath
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
