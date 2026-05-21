import { test } from "node:test";
import assert from "node:assert/strict";
import { POST as postLogin } from "./login/route";
import { GET as getCurrentUser } from "./me/route";
import { POST as postLogout } from "./logout/route";

test("GET /api/auth/me proxies the session cookie to the API service", async () => {
  const request = new Request("http://localhost/api/auth/me", {
    headers: { cookie: "reno_news_session=abc123" }
  });
  const response = await withMockedFetch(
    async (input, init) => {
      assert.equal(String(input), "http://api.test/auth/me");
      assert.equal(init?.method, "GET");
      assert.deepEqual(init?.headers, { cookie: "reno_news_session=abc123" });
      return Response.json({
        user: { id: 1, email: "admin@example.invalid", role: "admin" }
      });
    },
    () => getCurrentUser(request)
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    user: { id: 1, email: "admin@example.invalid", role: "admin" }
  });
});

test("POST /api/auth/login forwards JSON credentials and preserves set-cookie", async () => {
  const credentials = {
    email: "admin@example.invalid",
    password: "reno-news-dev-password"
  };
  const request = new Request("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(credentials)
  });
  const response = await withMockedFetch(
    async (input, init) => {
      assert.equal(String(input), "http://api.test/auth/login");
      assert.equal(init?.method, "POST");
      assert.deepEqual(init?.headers, { "content-type": "application/json" });
      assert.equal(init?.body, JSON.stringify(credentials));
      return Response.json(
        { user: { id: 1, email: "admin@example.invalid", role: "admin" } },
        {
          headers: {
            "set-cookie": "reno_news_session=raw-token; Path=/; HttpOnly; SameSite=Lax"
          }
        }
      );
    },
    () => postLogin(request)
  );

  assert.equal(response.status, 200);
  assert.equal(
    response.headers.get("set-cookie"),
    "reno_news_session=raw-token; Path=/; HttpOnly; SameSite=Lax"
  );
  assert.deepEqual(await response.json(), {
    user: { id: 1, email: "admin@example.invalid", role: "admin" }
  });
});

test("POST /api/auth/login redirects successful form login to a safe next path", async () => {
  const request = new Request("http://localhost/api/auth/login?next=/admin", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      email: "admin@example.invalid",
      password: "reno-news-dev-password"
    })
  });
  const response = await withMockedFetch(
    async (input, init) => {
      assert.equal(String(input), "http://api.test/auth/login");
      assert.equal(init?.method, "POST");
      assert.deepEqual(init?.headers, { "content-type": "application/json" });
      assert.deepEqual(JSON.parse(String(init?.body)), {
        email: "admin@example.invalid",
        password: "reno-news-dev-password"
      });
      return Response.json(
        { user: { id: 1, email: "admin@example.invalid", role: "admin" } },
        {
          headers: {
            "set-cookie": "reno_news_session=raw-token; Path=/; HttpOnly; SameSite=Lax"
          }
        }
      );
    },
    () => postLogin(request)
  );

  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), "/admin");
  assert.equal(
    response.headers.get("set-cookie"),
    "reno_news_session=raw-token; Path=/; HttpOnly; SameSite=Lax"
  );
});

test("POST /api/auth/login redirects failed form login back with an error", async () => {
  const request = new Request("http://localhost/api/auth/login?next=/admin", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      email: "admin@example.invalid",
      password: "wrong-password"
    })
  });
  const response = await withMockedFetch(
    async () => Response.json({ error: "invalid_credentials" }, { status: 401 }),
    () => postLogin(request)
  );

  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), "/login?error=invalid_credentials&next=%2Fadmin");
});

test("POST /api/auth/login rejects unsafe next redirects", async () => {
  const request = new Request("http://localhost/api/auth/login?next=https://evil.invalid/admin", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      email: "admin@example.invalid",
      password: "reno-news-dev-password"
    })
  });
  const response = await withMockedFetch(
    async () => Response.json({ user: { id: 1, email: "admin@example.invalid", role: "admin" } }),
    () => postLogin(request)
  );

  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), "/admin");
});

test("POST /api/auth/logout forwards cookies and redirects with cleared session cookie", async () => {
  const request = new Request("http://localhost/api/auth/logout?next=/", {
    method: "POST",
    headers: { cookie: "reno_news_session=abc123" }
  });
  const response = await withMockedFetch(
    async (input, init) => {
      assert.equal(String(input), "http://api.test/auth/logout");
      assert.equal(init?.method, "POST");
      assert.deepEqual(init?.headers, { cookie: "reno_news_session=abc123" });
      return Response.json(
        { status: "ok" },
        {
          headers: {
            "set-cookie": "reno_news_session=; Path=/; Max-Age=0; HttpOnly"
          }
        }
      );
    },
    () => postLogout(request)
  );

  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), "/");
  assert.equal(response.headers.get("set-cookie"), "reno_news_session=; Path=/; Max-Age=0; HttpOnly");
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
