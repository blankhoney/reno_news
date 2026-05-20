export const personalStateStorageKey = "reno-news:personal-state:v1";
export const personalStateMigrationStorageKey = "reno-news:personal-state:migrated:v1";

export type BackendPersonalStateItem = {
  itemId: number;
  createdAt: string;
};

export type BackendReadStatusItem = {
  itemId: number;
  status: "unread" | "read";
  updatedAt: string;
};

export type BackendPersonalState = {
  saved: BackendPersonalStateItem[];
  readLater: BackendPersonalStateItem[];
  readStatus: BackendReadStatusItem[];
};

export type PersonalItemSnapshot = {
  id: number;
  boardSlug: string;
  boardName: string;
  sourceTitle: string;
  title: string;
  summary: string;
  publishedAt: string | null;
  createdAt: string;
};

export type PersonalState = {
  saved: PersonalItemSnapshot[];
  readLater: PersonalItemSnapshot[];
};

type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>;

export type PersonalStateApiOptions = {
  baseUrl?: string;
  fetch?: FetchLike;
};

export type PersonalStateMutationClient = {
  setSavedItem(itemId: number, active: boolean): Promise<unknown>;
  setReadLaterItem(itemId: number, active: boolean): Promise<unknown>;
};

export function emptyPersonalState(): PersonalState {
  return {
    saved: [],
    readLater: []
  };
}

export function readPersonalState(storage: StorageLike): PersonalState {
  const raw = storage.getItem(personalStateStorageKey);
  if (!raw) {
    return emptyPersonalState();
  }

  try {
    return normalizePersonalState(JSON.parse(raw));
  } catch {
    return emptyPersonalState();
  }
}

export function writePersonalState(storage: StorageLike, state: PersonalState): void {
  storage.setItem(personalStateStorageKey, JSON.stringify(normalizePersonalState(state)));
}

export async function fetchBackendPersonalState(
  options: PersonalStateApiOptions = {}
): Promise<BackendPersonalState | null> {
  const response = await personalStateFetch(options, "/reader/personal-state", {
    method: "GET",
    cache: "no-store"
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to load personal state: ${response.status}`);
  }

  return normalizeBackendPersonalState(await response.json());
}

export function setBackendSavedItem(
  itemId: number,
  active: boolean,
  options: PersonalStateApiOptions = {}
): Promise<BackendPersonalState | null> {
  return mutateBackendPersonalState(options, "/reader/personal-state/saved", {
    itemId,
    active
  });
}

export function setBackendReadLaterItem(
  itemId: number,
  active: boolean,
  options: PersonalStateApiOptions = {}
): Promise<BackendPersonalState | null> {
  return mutateBackendPersonalState(options, "/reader/personal-state/read-later", {
    itemId,
    active
  });
}

export function setBackendReadStatus(
  itemId: number,
  status: "unread" | "read",
  options: PersonalStateApiOptions = {}
): Promise<BackendPersonalState | null> {
  return mutateBackendPersonalState(options, "/reader/personal-state/read-status", {
    itemId,
    status
  });
}

export async function migrateLocalPersonalStateToBackend(
  storage: StorageLike,
  client: PersonalStateMutationClient
): Promise<boolean> {
  const state = readPersonalState(storage);
  const signature = localPersonalStateMigrationSignature(state);

  if (storage.getItem(personalStateMigrationStorageKey) === signature) {
    return false;
  }

  for (const item of state.saved) {
    const result = await client.setSavedItem(item.id, true);
    if (result === null) {
      return false;
    }
  }
  for (const item of state.readLater) {
    const result = await client.setReadLaterItem(item.id, true);
    if (result === null) {
      return false;
    }
  }

  storage.setItem(personalStateMigrationStorageKey, signature);
  return true;
}

export function personalStateFromBackendSnapshots(
  backend: BackendPersonalState,
  snapshots: PersonalItemSnapshot[]
): PersonalState {
  const snapshotsById = new Map<number, PersonalItemSnapshot>();
  for (const snapshot of snapshots) {
    if (!snapshotsById.has(snapshot.id)) {
      snapshotsById.set(snapshot.id, toPersonalItemSnapshot(snapshot));
    }
  }

  return {
    saved: backend.saved.flatMap((item) => {
      const snapshot = snapshotsById.get(item.itemId);
      return snapshot ? [snapshot] : [];
    }),
    readLater: backend.readLater.flatMap((item) => {
      const snapshot = snapshotsById.get(item.itemId);
      return snapshot ? [snapshot] : [];
    })
  };
}

export async function hydratePersonalStateFromBackend(
  backend: BackendPersonalState,
  knownSnapshots: PersonalItemSnapshot[],
  options: PersonalStateApiOptions = {}
): Promise<PersonalState> {
  const snapshots = [...knownSnapshots.map(toPersonalItemSnapshot)];
  const knownIds = new Set(snapshots.map((snapshot) => snapshot.id));

  for (const itemId of backendPersonalStateItemIds(backend)) {
    if (knownIds.has(itemId)) {
      continue;
    }
    const snapshot = await fetchPersonalItemSnapshot(itemId, options);
    if (snapshot) {
      snapshots.push(snapshot);
      knownIds.add(snapshot.id);
    }
  }

  return personalStateFromBackendSnapshots(backend, snapshots);
}

export async function syncPersonalStateFromBackend(
  storage: StorageLike,
  knownSnapshots: PersonalItemSnapshot[] = [],
  options: PersonalStateApiOptions = {}
): Promise<PersonalState> {
  const localState = readPersonalState(storage);
  await migrateLocalPersonalStateToBackend(storage, {
    setSavedItem: (itemId, active) => setBackendSavedItem(itemId, active, options),
    setReadLaterItem: (itemId, active) => setBackendReadLaterItem(itemId, active, options)
  });

  const backendState = await fetchBackendPersonalState(options);
  if (!backendState) {
    return localState;
  }

  const nextState = await hydratePersonalStateFromBackend(
    backendState,
    personalStateKnownSnapshots(localState, knownSnapshots),
    options
  );
  writePersonalState(storage, nextState);
  return nextState;
}

export function toggleSaved(state: PersonalState, item: PersonalItemSnapshot): PersonalState {
  return isSaved(state, item.id)
    ? removeSaved(state, item.id)
    : {
        ...state,
        saved: addNewest(state.saved, toPersonalItemSnapshot(item))
      };
}

export function toggleReadLater(state: PersonalState, item: PersonalItemSnapshot): PersonalState {
  return isReadLater(state, item.id)
    ? removeReadLater(state, item.id)
    : {
        ...state,
        readLater: addNewest(state.readLater, toPersonalItemSnapshot(item))
      };
}

export function removeSaved(state: PersonalState, id: number): PersonalState {
  return {
    ...state,
    saved: state.saved.filter((item) => item.id !== id)
  };
}

export function removeReadLater(state: PersonalState, id: number): PersonalState {
  return {
    ...state,
    readLater: state.readLater.filter((item) => item.id !== id)
  };
}

export function isSaved(state: PersonalState, id: number): boolean {
  return state.saved.some((item) => item.id === id);
}

export function isReadLater(state: PersonalState, id: number): boolean {
  return state.readLater.some((item) => item.id === id);
}

export function toPersonalItemSnapshot(item: PersonalItemSnapshot): PersonalItemSnapshot {
  return {
    id: item.id,
    boardSlug: item.boardSlug,
    boardName: item.boardName,
    sourceTitle: item.sourceTitle,
    title: item.title,
    summary: item.summary,
    publishedAt: item.publishedAt,
    createdAt: item.createdAt
  };
}

function addNewest(
  items: PersonalItemSnapshot[],
  item: PersonalItemSnapshot
): PersonalItemSnapshot[] {
  return [item, ...items.filter((candidate) => candidate.id !== item.id)];
}

function normalizePersonalState(value: unknown): PersonalState {
  if (!isRecord(value)) {
    return emptyPersonalState();
  }

  return {
    saved: normalizeItemArray(value.saved),
    readLater: normalizeItemArray(value.readLater)
  };
}

function normalizeBackendPersonalState(value: unknown): BackendPersonalState {
  if (!isRecord(value)) {
    return {
      saved: [],
      readLater: [],
      readStatus: []
    };
  }

  return {
    saved: normalizeBackendItemArray(value.saved),
    readLater: normalizeBackendItemArray(value.readLater),
    readStatus: normalizeBackendReadStatusArray(value.readStatus)
  };
}

function normalizeItemArray(value: unknown): PersonalItemSnapshot[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) => (isPersonalItemSnapshot(item) ? [toPersonalItemSnapshot(item)] : []));
}

function localPersonalStateMigrationSignature(state: PersonalState): string {
  return JSON.stringify({
    saved: sortedUniqueIds(state.saved),
    readLater: sortedUniqueIds(state.readLater)
  });
}

function sortedUniqueIds(items: PersonalItemSnapshot[]): number[] {
  return [...new Set(items.map((item) => item.id))].sort((left, right) => left - right);
}

function personalStateKnownSnapshots(
  state: PersonalState,
  extraSnapshots: PersonalItemSnapshot[]
): PersonalItemSnapshot[] {
  const snapshots: PersonalItemSnapshot[] = [];
  const seenIds = new Set<number>();

  for (const snapshot of [...extraSnapshots, ...state.saved, ...state.readLater]) {
    if (!seenIds.has(snapshot.id)) {
      snapshots.push(toPersonalItemSnapshot(snapshot));
      seenIds.add(snapshot.id);
    }
  }

  return snapshots;
}

function backendPersonalStateItemIds(backend: BackendPersonalState): number[] {
  return [
    ...new Set([
      ...backend.saved.map((item) => item.itemId),
      ...backend.readLater.map((item) => item.itemId)
    ])
  ];
}

async function fetchPersonalItemSnapshot(
  itemId: number,
  options: PersonalStateApiOptions
): Promise<PersonalItemSnapshot | null> {
  const response = await personalStateFetch(options, `/reader/items/${itemId}`, {
    method: "GET",
    cache: "no-store"
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to load reader item ${itemId}: ${response.status}`);
  }

  const payload = await response.json();
  if (!isRecord(payload) || !isPersonalItemSnapshot(payload.item)) {
    throw new Error(`Reader item ${itemId} response is malformed`);
  }

  return toPersonalItemSnapshot(payload.item);
}

function normalizeBackendItemArray(value: unknown): BackendPersonalStateItem[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) =>
    isRecord(item) && typeof item.itemId === "number" && typeof item.createdAt === "string"
      ? [{ itemId: item.itemId, createdAt: item.createdAt }]
      : []
  );
}

function normalizeBackendReadStatusArray(value: unknown): BackendReadStatusItem[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) =>
    isRecord(item) &&
    typeof item.itemId === "number" &&
    (item.status === "unread" || item.status === "read") &&
    typeof item.updatedAt === "string"
      ? [{ itemId: item.itemId, status: item.status, updatedAt: item.updatedAt }]
      : []
  );
}

function isPersonalItemSnapshot(value: unknown): value is PersonalItemSnapshot {
  return (
    isRecord(value) &&
    typeof value.id === "number" &&
    typeof value.boardSlug === "string" &&
    typeof value.boardName === "string" &&
    typeof value.sourceTitle === "string" &&
    typeof value.title === "string" &&
    typeof value.summary === "string" &&
    (typeof value.publishedAt === "string" || value.publishedAt === null) &&
    typeof value.createdAt === "string"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function personalStateFetch(
  options: PersonalStateApiOptions,
  path: string,
  init: RequestInit
): Promise<Response> {
  const fetcher = options.fetch ?? fetch;
  return fetcher(personalStateApiUrl(path, options.baseUrl), {
    ...init,
    credentials: "include"
  });
}

async function mutateBackendPersonalState(
  options: PersonalStateApiOptions,
  path: string,
  payload: Record<string, unknown>
): Promise<BackendPersonalState | null> {
  const response = await personalStateFetch(options, path, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to update personal state: ${response.status}`);
  }

  return normalizeBackendPersonalState(await response.json());
}

function personalStateApiUrl(path: string, baseUrl = defaultPersonalStateApiBaseUrl()): string {
  return `${baseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

function defaultPersonalStateApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";
}
