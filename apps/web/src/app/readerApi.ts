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
