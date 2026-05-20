import { test } from "node:test";
import assert from "node:assert/strict";
import {
  emptyPersonalState,
  fetchBackendPersonalState,
  hydratePersonalStateFromBackend,
  isReadLater,
  isSaved,
  migrateLocalPersonalStateToBackend,
  personalStateMigrationStorageKey,
  personalStateStorageKey,
  personalStateFromBackendSnapshots,
  readPersonalState,
  removeReadLater,
  removeSaved,
  setBackendSavedItem,
  setBackendReadStatus,
  syncPersonalStateFromBackend,
  toPersonalItemSnapshot,
  toggleReadLater,
  toggleSaved,
  writePersonalState,
  type PersonalItemSnapshot
} from "./personalState";

const itemA: PersonalItemSnapshot = {
  id: 1,
  boardSlug: "ai",
  boardName: "AI",
  sourceTitle: "OpenAI News",
  title: "Sample AI item",
  summary: "Summary A",
  publishedAt: "2026-05-20T00:00:00.000Z",
  createdAt: "2026-05-20T00:00:00.000Z"
};

const itemB: PersonalItemSnapshot = {
  ...itemA,
  id: 2,
  title: "Sample software item",
  summary: "Summary B"
};

test("readPersonalState returns empty state when storage is empty", () => {
  const storage = new MemoryStorage();

  assert.deepEqual(readPersonalState(storage), emptyPersonalState());
});

test("toggleSaved adds newest snapshots first and removes existing item", () => {
  const withA = toggleSaved(emptyPersonalState(), itemA);
  const withB = toggleSaved(withA, itemB);
  const withoutA = toggleSaved(withB, itemA);

  assert.deepEqual(
    withB.saved.map((item) => item.id),
    [2, 1]
  );
  assert.equal(isSaved(withB, 1), true);
  assert.equal(isSaved(withoutA, 1), false);
});

test("read later state is independent from saved state", () => {
  const saved = toggleSaved(emptyPersonalState(), itemA);
  const readLater = toggleReadLater(saved, itemA);
  const removedReadLater = removeReadLater(readLater, itemA.id);

  assert.equal(isSaved(readLater, itemA.id), true);
  assert.equal(isReadLater(readLater, itemA.id), true);
  assert.equal(isSaved(removedReadLater, itemA.id), true);
  assert.equal(isReadLater(removedReadLater, itemA.id), false);
});

test("removeSaved removes only saved state", () => {
  const state = toggleReadLater(toggleSaved(emptyPersonalState(), itemA), itemA);
  const removedSaved = removeSaved(state, itemA.id);

  assert.equal(isSaved(removedSaved, itemA.id), false);
  assert.equal(isReadLater(removedSaved, itemA.id), true);
});

test("writePersonalState persists a readable local state payload", () => {
  const storage = new MemoryStorage();
  const state = toggleReadLater(toggleSaved(emptyPersonalState(), itemA), itemB);

  writePersonalState(storage, state);

  assert.deepEqual(readPersonalState(storage), state);
});

test("corrupted local state recovers to empty state", () => {
  const storage = new MemoryStorage();
  storage.setItem(personalStateStorageKey, "not json");

  assert.deepEqual(readPersonalState(storage), emptyPersonalState());
});

test("toPersonalItemSnapshot strips detail-only fields", () => {
  const detailItem = {
    ...itemA,
    originalText: "Hidden original body",
    chineseText: "Hidden detail text"
  };
  const snapshot = toPersonalItemSnapshot(detailItem);

  assert.deepEqual(snapshot, itemA);
  assert.equal("originalText" in snapshot, false);
  assert.equal("chineseText" in snapshot, false);
});

test("fetchBackendPersonalState returns null for anonymous responses and includes credentials", async () => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  const state = await fetchBackendPersonalState({
    baseUrl: "/api",
    fetch: async (input, init) => {
      requestUrl = String(input);
      requestInit = init;
      return new Response(JSON.stringify({ error: "authentication_required" }), {
        status: 401,
        headers: { "content-type": "application/json" }
      });
    }
  });

  assert.equal(state, null);
  assert.equal(requestUrl, "/api/reader/personal-state");
  assert.equal(requestInit?.credentials, "include");
});

test("migrateLocalPersonalStateToBackend uploads local ids once per state signature", async () => {
  const storage = new MemoryStorage();
  writePersonalState(storage, {
    saved: [itemA],
    readLater: [itemB]
  });
  const calls: string[] = [];
  const client = {
    setSavedItem: async (itemId: number, active: boolean) => {
      calls.push(`saved:${itemId}:${active}`);
    },
    setReadLaterItem: async (itemId: number, active: boolean) => {
      calls.push(`readLater:${itemId}:${active}`);
    }
  };

  await migrateLocalPersonalStateToBackend(storage, client);
  await migrateLocalPersonalStateToBackend(storage, client);

  assert.deepEqual(calls, ["saved:1:true", "readLater:2:true"]);
});

test("migrateLocalPersonalStateToBackend keeps migration pending for anonymous users", async () => {
  const storage = new MemoryStorage();
  writePersonalState(storage, {
    saved: [itemA],
    readLater: []
  });

  const migrated = await migrateLocalPersonalStateToBackend(storage, {
    setSavedItem: async () => null,
    setReadLaterItem: async () => null
  });

  assert.equal(migrated, false);
  assert.equal(storage.getItem(personalStateMigrationStorageKey), null);
});

test("setBackendSavedItem sends an authenticated saved mutation", async () => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  const state = await setBackendSavedItem(42, true, {
    baseUrl: "/api",
    fetch: async (input, init) => {
      requestUrl = String(input);
      requestInit = init;
      return new Response(
        JSON.stringify({
          saved: [{ itemId: 42, createdAt: "2026-05-21T00:00:00.000Z" }],
          readLater: [],
          readStatus: []
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }
  });

  assert.equal(requestUrl, "/api/reader/personal-state/saved");
  assert.equal(requestInit?.method, "PUT");
  assert.equal(requestInit?.credentials, "include");
  assert.deepEqual(requestInit?.headers, { "content-type": "application/json" });
  assert.equal(requestInit?.body, JSON.stringify({ itemId: 42, active: true }));
  assert.deepEqual(state?.saved.map((item) => item.itemId), [42]);
});

test("setBackendReadStatus sends an authenticated read-status mutation", async () => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  const state = await setBackendReadStatus(42, "read", {
    baseUrl: "/api",
    fetch: async (input, init) => {
      requestUrl = String(input);
      requestInit = init;
      return new Response(
        JSON.stringify({
          saved: [],
          readLater: [],
          readStatus: [
            {
              itemId: 42,
              status: "read",
              updatedAt: "2026-05-21T00:00:00.000Z"
            }
          ]
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }
  });

  assert.equal(requestUrl, "/api/reader/personal-state/read-status");
  assert.equal(requestInit?.method, "PUT");
  assert.equal(requestInit?.credentials, "include");
  assert.equal(requestInit?.body, JSON.stringify({ itemId: 42, status: "read" }));
  assert.deepEqual(state?.readStatus.map((item) => item.status), ["read"]);
});

test("personalStateFromBackendSnapshots uses backend membership and known snapshots", () => {
  const state = personalStateFromBackendSnapshots(
    {
      saved: [
        { itemId: 2, createdAt: "2026-05-21T02:00:00.000Z" },
        { itemId: 1, createdAt: "2026-05-21T01:00:00.000Z" }
      ],
      readLater: [
        { itemId: 1, createdAt: "2026-05-21T01:00:00.000Z" },
        { itemId: 999, createdAt: "2026-05-21T00:00:00.000Z" }
      ],
      readStatus: []
    },
    [itemA, itemB]
  );

  assert.deepEqual(
    state.saved.map((item) => item.id),
    [2, 1]
  );
  assert.deepEqual(
    state.readLater.map((item) => item.id),
    [1]
  );
});

test("hydratePersonalStateFromBackend fetches missing backend snapshots", async () => {
  const requestedUrls: string[] = [];
  const state = await hydratePersonalStateFromBackend(
    {
      saved: [
        { itemId: 1, createdAt: "2026-05-21T01:00:00.000Z" },
        { itemId: 2, createdAt: "2026-05-21T02:00:00.000Z" }
      ],
      readLater: [{ itemId: 3, createdAt: "2026-05-21T03:00:00.000Z" }],
      readStatus: []
    },
    [itemA],
    {
      baseUrl: "/api",
      fetch: async (input, init) => {
        requestedUrls.push(String(input));
        assert.equal(init?.credentials, "include");
        const id = Number(String(input).split("/").pop());
        const item = id === 2 ? itemB : { ...itemA, id: 3, title: "Fetched item" };
        return new Response(JSON.stringify({ item }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }
    }
  );

  assert.deepEqual(requestedUrls, ["/api/reader/items/2", "/api/reader/items/3"]);
  assert.deepEqual(
    state.saved.map((item) => item.id),
    [1, 2]
  );
  assert.deepEqual(
    state.readLater.map((item) => item.id),
    [3]
  );
});

test("syncPersonalStateFromBackend migrates local state and stores backend state", async () => {
  const storage = new MemoryStorage();
  writePersonalState(storage, {
    saved: [itemA],
    readLater: []
  });
  const requestedUrls: string[] = [];

  const state = await syncPersonalStateFromBackend(storage, [], {
    baseUrl: "/api",
    fetch: async (input, init) => {
      const url = String(input);
      requestedUrls.push(`${init?.method ?? "GET"} ${url}`);

      if (url === "/api/reader/personal-state/saved") {
        assert.equal(init?.body, JSON.stringify({ itemId: 1, active: true }));
        return new Response(JSON.stringify({ saved: [], readLater: [], readStatus: [] }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }

      if (url === "/api/reader/personal-state") {
        return new Response(
          JSON.stringify({
            saved: [
              { itemId: 1, createdAt: "2026-05-21T01:00:00.000Z" },
              { itemId: 2, createdAt: "2026-05-21T02:00:00.000Z" }
            ],
            readLater: [],
            readStatus: []
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }

      return new Response(JSON.stringify({ item: itemB }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }
  });

  assert.deepEqual(requestedUrls, [
    "PUT /api/reader/personal-state/saved",
    "GET /api/reader/personal-state",
    "GET /api/reader/items/2"
  ]);
  assert.deepEqual(
    state.saved.map((item) => item.id),
    [1, 2]
  );
  assert.deepEqual(readPersonalState(storage), state);
});

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}
