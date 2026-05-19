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

export function readerItemPath(id: number, view?: ReaderLanguageView): string {
  if (!view) {
    return `/items/${id}`;
  }
  return `/items/${id}?${new URLSearchParams({ view }).toString()}`;
}
