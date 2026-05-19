export const personalStateStorageKey = "reno-news:personal-state:v1";

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

function normalizeItemArray(value: unknown): PersonalItemSnapshot[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) => (isPersonalItemSnapshot(item) ? [toPersonalItemSnapshot(item)] : []));
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
