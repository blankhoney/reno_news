import { test } from "node:test";
import assert from "node:assert/strict";
import { GET } from "./route";
import { PUT as putReadLater } from "./read-later/route";
import { PUT as putReadStatus } from "./read-status/route";
import { PUT as putSaved } from "./saved/route";

test("GET /api/reader/personal-state proxies the cookie to the API service", async () => {
  const request = new Request("http://localhost/api/reader/personal-state", {
    headers: { cookie: "reno_news_session=abc123" }
  });
  const response = await withMockedFetch(
    async (input, init) => {
      assert.equal(String(input), "http://api.test/reader/personal-state");
      assert.equal(init?.method, "GET");
      assert.deepEqual(init?.headers, { cookie: "reno_news_session=abc123" });
      return Response.json({ error: "authentication_required" }, { status: 401 });
    },
    () => GET(request)
  );

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "authentication_required" });
});

test("PUT personal-state proxy routes forward JSON mutations to the API service", async () => {
  const cases = [
    {
      route: putSaved,
      localPath: "/api/reader/personal-state/saved",
      apiPath: "/reader/personal-state/saved",
      body: { itemId: 42, active: true }
    },
    {
      route: putReadLater,
      localPath: "/api/reader/personal-state/read-later",
      apiPath: "/reader/personal-state/read-later",
      body: { itemId: 42, active: false }
    },
    {
      route: putReadStatus,
      localPath: "/api/reader/personal-state/read-status",
      apiPath: "/reader/personal-state/read-status",
      body: { itemId: 42, status: "read" }
    }
  ];

  for (const testCase of cases) {
    const request = new Request(`http://localhost${testCase.localPath}`, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        cookie: "reno_news_session=abc123"
      },
      body: JSON.stringify(testCase.body)
    });
    const response = await withMockedFetch(
      async (input, init) => {
        assert.equal(String(input), `http://api.test${testCase.apiPath}`);
        assert.equal(init?.method, "PUT");
        assert.deepEqual(init?.headers, {
          "content-type": "application/json",
          cookie: "reno_news_session=abc123"
        });
        assert.equal(init?.body, JSON.stringify(testCase.body));
        return Response.json({ saved: [], readLater: [], readStatus: [] });
      },
      () => testCase.route(request)
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { saved: [], readLater: [], readStatus: [] });
  }
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
