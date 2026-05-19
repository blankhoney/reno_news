export const SAVE_LEVEL_OPTIONS = ["metadata_only", "excerpt", "snapshot", "full_text"] as const;
export const RIGHTS_POLICY_OPTIONS = [
  "blocked",
  "metadata_only",
  "private_allowed",
  "public_excerpt_allowed",
  "public_fulltext_allowed"
] as const;
export const TRANSLATION_POLICY_OPTIONS = [
  "none",
  "private_only",
  "public_excerpt",
  "public_fulltext"
] as const;
export const RISK_LEVEL_OPTIONS = ["low", "medium", "high"] as const;

export type SaveLevel = (typeof SAVE_LEVEL_OPTIONS)[number];
export type RightsPolicy = (typeof RIGHTS_POLICY_OPTIONS)[number];
export type TranslationPolicy = (typeof TRANSLATION_POLICY_OPTIONS)[number];
export type RiskLevel = (typeof RISK_LEVEL_OPTIONS)[number];

export type SourcePolicyRecord = {
  crawlEnabled: boolean;
  fetchIntervalMinutes: number;
  maxRequestsPerHour: number;
  saveLevel: SaveLevel;
  rightsPolicy: RightsPolicy;
  translationPolicy: TranslationPolicy;
  riskLevel: RiskLevel;
};

export type SourcePolicyUpdate = SourcePolicyRecord;

export type SourceRecord = {
  id: number;
  boardSlug: string;
  sourceType: string;
  title: string;
  url: string;
  enabled: boolean;
  policy: SourcePolicyRecord;
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

export async function updateSourcePolicy(id: string, policy: SourcePolicyUpdate): Promise<void> {
  const response = await fetch(apiUrl(`/sources/${id}`), {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ policy })
  });
  if (!response.ok) {
    throw new Error(`Failed to update source policy ${id}: ${response.status}`);
  }
}

export function sourcePolicyUpdateFromFormData(formData: Pick<FormData, "get">): SourcePolicyUpdate {
  return {
    crawlEnabled: readBooleanField(formData, "crawlEnabled"),
    fetchIntervalMinutes: readPositiveIntegerField(formData, "fetchIntervalMinutes"),
    maxRequestsPerHour: readPositiveIntegerField(formData, "maxRequestsPerHour"),
    saveLevel: readOptionField(formData, "saveLevel", SAVE_LEVEL_OPTIONS),
    rightsPolicy: readOptionField(formData, "rightsPolicy", RIGHTS_POLICY_OPTIONS),
    translationPolicy: readOptionField(formData, "translationPolicy", TRANSLATION_POLICY_OPTIONS),
    riskLevel: readOptionField(formData, "riskLevel", RISK_LEVEL_OPTIONS)
  };
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

function readBooleanField(formData: Pick<FormData, "get">, name: string): boolean {
  const value = readStringField(formData, name);

  if (value === "true" || value === "on") {
    return true;
  }
  if (value === "false") {
    return false;
  }

  throw new Error(`${name} must be true or false`);
}

function readPositiveIntegerField(formData: Pick<FormData, "get">, name: string): number {
  const value = Number(readStringField(formData, name));

  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive integer`);
  }

  return value;
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
