import { test } from "node:test";
import assert from "node:assert/strict";
import type { SourceRepository, SourceRecord } from "@reno-news/db";
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
    createSource: async () => sourceRecord,
    updateSource: async () => sourceRecord,
    listEnabledSourcePolicies: async () => [sourceRecord],
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
