import { test } from "node:test";
import assert from "node:assert/strict";
import { GET } from "./route";

test("GET /api/reader/items/:id proxies reader item detail to the API service", async () => {
  const request = new Request("http://localhost/api/reader/items/42", {
    headers: { cookie: "reno_news_session=abc123" }
  });
  const item = {
    id: 42,
    boardSlug: "ai",
    boardName: "AI",
    sourceTitle: "Source",
    title: "Hydrated item",
    url: "https://example.invalid/item",
    summary: "Clean summary",
    publishedAt: null,
    createdAt: "2026-05-21T00:00:00.000Z"
  };
  const response = await withMockedFetch(
    async (input, init) => {
      assert.equal(String(input), "http://api.test/reader/items/42");
      assert.equal(init?.method, "GET");
      assert.deepEqual(init?.headers, { cookie: "reno_news_session=abc123" });
      return Response.json({ item });
    },
    () => GET(request, { params: Promise.resolve({ id: "42" }) })
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { item });
});

test("GET /api/reader/items/:id preserves missing item responses", async () => {
  const request = new Request("http://localhost/api/reader/items/999");
  const response = await withMockedFetch(
    async (input, init) => {
      assert.equal(String(input), "http://api.test/reader/items/999");
      assert.equal(init?.method, "GET");
      assert.equal(init?.headers, undefined);
      return Response.json({ error: "Reader item not found" }, { status: 404 });
    },
    () => GET(request, { params: Promise.resolve({ id: "999" }) })
  );

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: "Reader item not found" });
});

async function withMockedFetch(
  fetcher: typeof fetch,
  action: () => Promise<Response>
): Promise<Response> {
  const previousFetch = globalThis.fetch;
  const previousApiBaseUrl = process.env.API_BASE_URL;
  globalThis.fetch = fetcher;
  process.env.API_BASE_URL = "http://api.test";

  try {
    return await action();
  } finally {
    globalThis.fetch = previousFetch;
    if (previousApiBaseUrl === undefined) {
      delete process.env.API_BASE_URL;
    } else {
      process.env.API_BASE_URL = previousApiBaseUrl;
    }
  }
}
