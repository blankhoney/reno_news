import { test } from "node:test";
import assert from "node:assert/strict";
import { getReaderBoards, getReaderItems, joinServiceUrl } from "./readerApi";

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
