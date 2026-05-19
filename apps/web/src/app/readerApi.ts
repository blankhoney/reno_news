export type ReaderBoard = {
  slug: string;
  name: string;
  description: string;
};

export type ReaderItemCard = {
  id: number;
  boardSlug: string;
  boardName: string;
  sourceTitle: string;
  title: string;
  url: string;
  summary: string;
  publishedAt: string | null;
  createdAt: string;
};

export type ReaderOriginalTextMode = "none" | "excerpt" | "full";
export type ReaderChineseTextMode = "summary_only";
export type ReaderLanguageView = "zh" | "original";
export const READER_FEEDBACK_TYPE_OPTIONS = [
  "correction",
  "quality_issue",
  "duplicate",
  "broken_link",
  "rights_concern"
] as const;
export type ReaderFeedbackType = (typeof READER_FEEDBACK_TYPE_OPTIONS)[number];

export type ReaderFeedbackInput = {
  feedbackType: ReaderFeedbackType;
  message?: string;
};

export type ReaderItemDetail = ReaderItemCard & {
  detailSummary: string;
  whyItMatters: string;
  sourceNote: string;
  chinaRelevance: string;
  relatedTopics: string[];
  originalTitle: string;
  originalText: string;
  originalTextMode: ReaderOriginalTextMode;
  chineseTitle: string;
  chineseText: string;
  chineseTextMode: ReaderChineseTextMode;
};

export function joinServiceUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

export function apiUrl(path: string): string {
  return joinServiceUrl(process.env.API_BASE_URL ?? "http://localhost:3001", path);
}

export async function getReaderBoards(): Promise<ReaderBoard[]> {
  const response = await fetch(apiUrl("/reader/boards"), { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load reader boards: ${response.status}`);
  }
  const payload = (await response.json()) as { boards: ReaderBoard[] };
  return payload.boards;
}

export async function getReaderItems(boardSlug?: string): Promise<ReaderItemCard[]> {
  const path = boardSlug
    ? `/reader/items?${new URLSearchParams({ board: boardSlug }).toString()}`
    : "/reader/items";
  const response = await fetch(apiUrl(path), { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load reader items: ${response.status}`);
  }
  const payload = (await response.json()) as { items: ReaderItemCard[] };
  return payload.items;
}

export async function getReaderDigestItems(input: {
  boardSlug?: string;
  limit?: number;
} = {}): Promise<ReaderItemCard[]> {
  const params = new URLSearchParams();
  if (input.boardSlug) {
    params.set("board", input.boardSlug);
  }
  if (input.limit) {
    params.set("limit", String(input.limit));
  }
  const query = params.toString();
  const response = await fetch(apiUrl(`/reader/digest${query ? `?${query}` : ""}`), {
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error(`Failed to load reader digest: ${response.status}`);
  }
  const payload = (await response.json()) as { items: ReaderItemCard[] };
  return payload.items;
}

export async function getReaderSearchItems(
  query: string,
  boardSlug?: string
): Promise<ReaderItemCard[]> {
  const params = new URLSearchParams({ q: query });
  if (boardSlug) {
    params.set("board", boardSlug);
  }

  const response = await fetch(apiUrl(`/reader/search?${params.toString()}`), {
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error(`Failed to search reader items: ${response.status}`);
  }
  const payload = (await response.json()) as { items: ReaderItemCard[] };
  return payload.items;
}

export async function getReaderRelatedItems(
  id: number,
  limit?: number
): Promise<ReaderItemCard[] | null> {
  const params = new URLSearchParams();
  if (limit) {
    params.set("limit", String(limit));
  }
  const query = params.toString();
  const path = `/reader/items/${id}/related${query ? `?${query}` : ""}`;
  const response = await fetch(apiUrl(path), { cache: "no-store" });
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Failed to load related reader items for item ${id}: ${response.status}`);
  }
  const payload = (await response.json()) as { items: ReaderItemCard[] };
  return payload.items;
}

export async function getReaderItemDetail(id: number): Promise<ReaderItemDetail | null> {
  const response = await fetch(apiUrl(`/reader/items/${id}`), { cache: "no-store" });
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Failed to load reader item detail: ${response.status}`);
  }
  const payload = (await response.json()) as { item: ReaderItemDetail };
  return payload.item;
}

export async function submitReaderFeedback(
  id: number | string,
  feedback: ReaderFeedbackInput
): Promise<void> {
  const response = await fetch(apiUrl(`/reader/items/${id}/feedback`), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(feedback)
  });
  if (!response.ok) {
    throw new Error(`Failed to submit reader feedback for item ${id}: ${response.status}`);
  }
}

export function readerFeedbackFromFormData(
  formData: Pick<FormData, "get">
): ReaderFeedbackInput {
  const feedbackType = readOptionField(
    formData,
    "feedbackType",
    READER_FEEDBACK_TYPE_OPTIONS
  );
  const message = readOptionalStringField(formData, "message");

  if (message && message.length > 2000) {
    throw new Error("message must be 2000 characters or fewer");
  }

  return message ? { feedbackType, message } : { feedbackType };
}

export function readerItemPath(id: number, view?: ReaderLanguageView): string {
  if (!view) {
    return `/items/${id}`;
  }
  return `/items/${id}?${new URLSearchParams({ view }).toString()}`;
}

function readOptionField<const T extends readonly string[]>(
  formData: Pick<FormData, "get">,
  name: string,
  options: T
): T[number] {
  const value = readStringField(formData, name);

  if (options.includes(value)) {
    return value;
  }

  throw new Error(`${name} has an unsupported value`);
}

function readStringField(formData: Pick<FormData, "get">, name: string): string {
  const value = formData.get(name);

  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${name} is required`);
  }

  return value;
}

function readOptionalStringField(formData: Pick<FormData, "get">, name: string): string | undefined {
  const value = formData.get(name);

  if (typeof value !== "string") {
    return undefined;
  }

  return value.trim() || undefined;
}
