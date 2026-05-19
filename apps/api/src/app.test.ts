import { test } from "node:test";
import assert from "node:assert/strict";
import type {
  RawEntryRecord,
  RawEntryRepository,
  ReaderBoard,
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

function fakeReaderRepository(overrides: Partial<ReaderRepository> = {}): ReaderRepository {
  return {
    listReaderBoards: async () => [readerBoard],
    listReaderItems: async () => [readerItem],
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
