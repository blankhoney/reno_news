import { test } from "node:test";
import assert from "node:assert/strict";
import {
  emptyPersonalState,
  isReadLater,
  isSaved,
  personalStateStorageKey,
  readPersonalState,
  removeReadLater,
  removeSaved,
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

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}
