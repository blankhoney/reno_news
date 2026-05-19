export type SourceRecord = {
  id: number;
  boardSlug: string;
  sourceType: string;
  title: string;
  url: string;
  enabled: boolean;
  policy: {
    crawlEnabled: boolean;
    fetchIntervalMinutes: number;
    maxRequestsPerHour: number;
    saveLevel: string;
    rightsPolicy: string;
    translationPolicy: string;
    riskLevel: string;
  };
};

export type RawEntryRecord = {
  id: number;
  sourceId: number;
  sourceTitle: string;
  title: string;
  url: string;
  lifecycleStatus: string;
  processingStage: string;
  rightsStatus: string;
  failureType: string | null;
  createdAt: string;
};

export function joinServiceUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

export function apiUrl(path: string): string {
  return joinServiceUrl(process.env.API_BASE_URL ?? "http://localhost:3001", path);
}

export function workerUrl(path: string): string {
  return joinServiceUrl(process.env.WORKER_BASE_URL ?? "http://localhost:3002", path);
}

export async function getSources(): Promise<SourceRecord[]> {
  const response = await fetch(apiUrl("/sources"), { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load sources: ${response.status}`);
  }
  const payload = (await response.json()) as { sources: SourceRecord[] };
  return payload.sources;
}

export async function getSource(id: string): Promise<SourceRecord> {
  const response = await fetch(apiUrl(`/sources/${id}`), { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load source ${id}: ${response.status}`);
  }
  return (await response.json()) as SourceRecord;
}

export async function setSourceEnabled(id: string, enabled: boolean): Promise<void> {
  const response = await fetch(apiUrl(`/sources/${id}`), {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ enabled })
  });
  if (!response.ok) {
    throw new Error(`Failed to update source ${id}: ${response.status}`);
  }
}

export async function triggerSourceIngest(id: string): Promise<void> {
  const response = await fetch(workerUrl(`/ingest/source/${id}`), { method: "POST" });
  if (!response.ok) {
    throw new Error(`Failed to trigger ingest for source ${id}: ${response.status}`);
  }
}

export async function getRawEntries(): Promise<RawEntryRecord[]> {
  const response = await fetch(apiUrl("/raw-entries"), { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load raw entries: ${response.status}`);
  }
  const payload = (await response.json()) as { rawEntries: RawEntryRecord[] };
  return payload.rawEntries;
}

export async function getRawEntry(id: string): Promise<RawEntryRecord> {
  const response = await fetch(apiUrl(`/raw-entries/${id}`), { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load raw entry ${id}: ${response.status}`);
  }
  return (await response.json()) as RawEntryRecord;
}
