import { Pool, type QueryResult } from "pg";

export type SourceType = "rss" | "atom" | "github" | "arxiv";
export type SaveLevel = "metadata_only" | "excerpt" | "snapshot" | "full_text";
export type RightsPolicy =
  | "blocked"
  | "metadata_only"
  | "private_allowed"
  | "public_excerpt_allowed"
  | "public_fulltext_allowed";
export type TranslationPolicy = "none" | "private_only" | "public_excerpt" | "public_fulltext";
export type RiskLevel = "low" | "medium" | "high";

export type SourcePolicy = {
  id: number;
  sourceId: number;
  crawlEnabled: boolean;
  fetchIntervalMinutes: number;
  maxRequestsPerHour: number;
  saveLevel: SaveLevel;
  rightsPolicy: RightsPolicy;
  translationPolicy: TranslationPolicy;
  riskLevel: RiskLevel;
};

export type SourceRecord = {
  id: number;
  boardId: number;
  boardSlug: string;
  sourceType: SourceType;
  title: string;
  url: string;
  enabled: boolean;
  policy: SourcePolicy;
};

export type SourcePolicyInput = Omit<SourcePolicy, "id" | "sourceId">;

export type CreateSourceInput = {
  boardSlug: string;
  sourceType: SourceType;
  title: string;
  url: string;
  enabled?: boolean;
  policy?: Partial<SourcePolicyInput>;
};

export type UpdateSourceInput = Partial<Omit<CreateSourceInput, "policy">> & {
  policy?: Partial<SourcePolicyInput>;
};

export type SourceRepository = {
  listSources(): Promise<SourceRecord[]>;
  getSource(id: number): Promise<SourceRecord | null>;
  createSource(input: CreateSourceInput): Promise<SourceRecord>;
  updateSource(id: number, input: UpdateSourceInput): Promise<SourceRecord | null>;
  listEnabledSourcePolicies(): Promise<SourceRecord[]>;
};

export type ClosableSourceRepository = SourceRepository & {
  close(): Promise<void>;
};

type Queryable = {
  query<T extends object = Record<string, unknown>>(
    text: string,
    values?: readonly unknown[]
  ): Promise<QueryResult<T>>;
};

type SourceRow = {
  id: number;
  boardId: number;
  boardSlug: string;
  sourceType: SourceType;
  title: string;
  url: string;
  enabled: boolean;
  policyId: number;
  policySourceId: number;
  crawlEnabled: boolean;
  fetchIntervalMinutes: number;
  maxRequestsPerHour: number;
  saveLevel: SaveLevel;
  rightsPolicy: RightsPolicy;
  translationPolicy: TranslationPolicy;
  riskLevel: RiskLevel;
};

const sourceSelect = `
  select
    s.id::int as "id",
    s.board_id::int as "boardId",
    b.slug as "boardSlug",
    s.source_type as "sourceType",
    s.title as "title",
    s.url as "url",
    s.enabled as "enabled",
    sp.id::int as "policyId",
    sp.source_id::int as "policySourceId",
    sp.crawl_enabled as "crawlEnabled",
    sp.fetch_interval_minutes as "fetchIntervalMinutes",
    sp.max_requests_per_hour as "maxRequestsPerHour",
    sp.save_level as "saveLevel",
    sp.rights_policy as "rightsPolicy",
    sp.translation_policy as "translationPolicy",
    sp.risk_level as "riskLevel"
  from sources s
  join boards b on b.id = s.board_id
  join source_policies sp on sp.source_id = s.id
`;

const defaultPolicy: SourcePolicyInput = {
  crawlEnabled: true,
  fetchIntervalMinutes: 60,
  maxRequestsPerHour: 12,
  saveLevel: "metadata_only",
  rightsPolicy: "metadata_only",
  translationPolicy: "none",
  riskLevel: "medium"
};

export class BoardNotFoundError extends Error {
  constructor(boardSlug: string) {
    super(`Board not found: ${boardSlug}`);
    this.name = "BoardNotFoundError";
  }
}

export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "23505"
  );
}

export function createSourceRepository(databaseUrl: string): ClosableSourceRepository {
  const pool = new Pool({ connectionString: databaseUrl, allowExitOnIdle: true });

  return {
    listSources: async () => listSources(pool),
    getSource: async (id) => getSourceById(pool, id),
    createSource: async (input) => createSource(pool, input),
    updateSource: async (id, input) => updateSource(pool, id, input),
    listEnabledSourcePolicies: async () => listEnabledSourcePolicies(pool),
    close: async () => {
      await pool.end();
    }
  };
}

async function listSources(queryable: Queryable): Promise<SourceRecord[]> {
  const result = await queryable.query<SourceRow>(`${sourceSelect} order by s.id`);
  return result.rows.map(mapSourceRow);
}

async function listEnabledSourcePolicies(queryable: Queryable): Promise<SourceRecord[]> {
  const result = await queryable.query<SourceRow>(
    `${sourceSelect} where s.enabled = true and sp.crawl_enabled = true order by s.id`
  );
  return result.rows.map(mapSourceRow);
}

async function createSource(pool: Pool, input: CreateSourceInput): Promise<SourceRecord> {
  const client = await pool.connect();

  try {
    await client.query("begin");
    const boardId = await findBoardId(client, input.boardSlug);
    const sourceResult = await client.query<{ id: number }>(
      `
        insert into sources (board_id, source_type, title, url, enabled)
        values ($1, $2, $3, $4, $5)
        returning id::int as "id"
      `,
      [boardId, input.sourceType, input.title, input.url, input.enabled ?? true]
    );
    const sourceId = sourceResult.rows[0].id;

    await upsertPolicy(client, sourceId, mergePolicy(input.policy));
    const created = await getSourceById(client, sourceId);

    if (!created) {
      throw new Error("Created source could not be read");
    }

    await client.query("commit");
    return created;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

async function updateSource(
  pool: Pool,
  sourceId: number,
  input: UpdateSourceInput
): Promise<SourceRecord | null> {
  const client = await pool.connect();

  try {
    await client.query("begin");
    const current = await getSourceById(client, sourceId);

    if (!current) {
      await client.query("rollback");
      return null;
    }

    const boardId = input.boardSlug ? await findBoardId(client, input.boardSlug) : current.boardId;
    const sourceType = input.sourceType ?? current.sourceType;
    const title = input.title ?? current.title;
    const url = input.url ?? current.url;
    const enabled = input.enabled ?? current.enabled;

    await client.query(
      `
        update sources
        set
          board_id = $2,
          source_type = $3,
          title = $4,
          url = $5,
          enabled = $6,
          updated_at = now()
        where id = $1
      `,
      [sourceId, boardId, sourceType, title, url, enabled]
    );
    await upsertPolicy(client, sourceId, mergePolicy(input.policy, current.policy));

    const updated = await getSourceById(client, sourceId);
    await client.query("commit");
    return updated;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

async function findBoardId(queryable: Queryable, boardSlug: string): Promise<number> {
  const result = await queryable.query<{ id: number }>(
    "select id::int as id from boards where slug = $1",
    [boardSlug]
  );

  if (!result.rows[0]) {
    throw new BoardNotFoundError(boardSlug);
  }

  return result.rows[0].id;
}

async function getSourceById(queryable: Queryable, sourceId: number): Promise<SourceRecord | null> {
  const result = await queryable.query<SourceRow>(`${sourceSelect} where s.id = $1`, [sourceId]);
  const row = result.rows[0];
  return row ? mapSourceRow(row) : null;
}

async function upsertPolicy(
  queryable: Queryable,
  sourceId: number,
  policy: SourcePolicyInput
): Promise<void> {
  await queryable.query(
    `
      insert into source_policies (
        source_id,
        crawl_enabled,
        fetch_interval_minutes,
        max_requests_per_hour,
        save_level,
        rights_policy,
        translation_policy,
        risk_level
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8)
      on conflict (source_id) do update
      set
        crawl_enabled = excluded.crawl_enabled,
        fetch_interval_minutes = excluded.fetch_interval_minutes,
        max_requests_per_hour = excluded.max_requests_per_hour,
        save_level = excluded.save_level,
        rights_policy = excluded.rights_policy,
        translation_policy = excluded.translation_policy,
        risk_level = excluded.risk_level,
        updated_at = now()
    `,
    [
      sourceId,
      policy.crawlEnabled,
      policy.fetchIntervalMinutes,
      policy.maxRequestsPerHour,
      policy.saveLevel,
      policy.rightsPolicy,
      policy.translationPolicy,
      policy.riskLevel
    ]
  );
}

function mergePolicy(
  input: Partial<SourcePolicyInput> | undefined,
  current: SourcePolicy | SourcePolicyInput = defaultPolicy
): SourcePolicyInput {
  return {
    crawlEnabled: input?.crawlEnabled ?? current.crawlEnabled,
    fetchIntervalMinutes: input?.fetchIntervalMinutes ?? current.fetchIntervalMinutes,
    maxRequestsPerHour: input?.maxRequestsPerHour ?? current.maxRequestsPerHour,
    saveLevel: input?.saveLevel ?? current.saveLevel,
    rightsPolicy: input?.rightsPolicy ?? current.rightsPolicy,
    translationPolicy: input?.translationPolicy ?? current.translationPolicy,
    riskLevel: input?.riskLevel ?? current.riskLevel
  };
}

function mapSourceRow(row: SourceRow): SourceRecord {
  return {
    id: row.id,
    boardId: row.boardId,
    boardSlug: row.boardSlug,
    sourceType: row.sourceType,
    title: row.title,
    url: row.url,
    enabled: row.enabled,
    policy: {
      id: row.policyId,
      sourceId: row.policySourceId,
      crawlEnabled: row.crawlEnabled,
      fetchIntervalMinutes: row.fetchIntervalMinutes,
      maxRequestsPerHour: row.maxRequestsPerHour,
      saveLevel: row.saveLevel,
      rightsPolicy: row.rightsPolicy,
      translationPolicy: row.translationPolicy,
      riskLevel: row.riskLevel
    }
  };
}
