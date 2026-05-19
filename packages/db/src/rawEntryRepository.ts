import { Pool, type QueryResult } from "pg";

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

export type RawEntryRepository = {
  listRawEntries(): Promise<RawEntryRecord[]>;
  getRawEntry(id: number): Promise<RawEntryRecord | null>;
  close(): Promise<void>;
};

type Queryable = {
  query<T extends object = Record<string, unknown>>(
    text: string,
    values?: readonly unknown[]
  ): Promise<QueryResult<T>>;
};

type RawEntryRow = {
  id: number;
  sourceId: number;
  sourceTitle: string;
  title: string;
  url: string;
  lifecycleStatus: string;
  processingStage: string;
  rightsStatus: string;
  failureType: string | null;
  createdAt: Date | string;
};

const rawEntrySelect = `
  select
    re.id::int as "id",
    re.source_id::int as "sourceId",
    s.title as "sourceTitle",
    re.title as "title",
    re.url as "url",
    re.lifecycle_status as "lifecycleStatus",
    re.processing_stage as "processingStage",
    re.rights_status as "rightsStatus",
    re.failure_type as "failureType",
    re.created_at as "createdAt"
  from raw_entries re
  join sources s on s.id = re.source_id
`;

export function createRawEntryRepository(databaseUrl: string): RawEntryRepository {
  const pool = new Pool({ connectionString: databaseUrl, allowExitOnIdle: true });

  return {
    listRawEntries: async () => listRawEntries(pool),
    getRawEntry: async (id) => getRawEntry(pool, id),
    close: async () => {
      await pool.end();
    }
  };
}

async function listRawEntries(queryable: Queryable): Promise<RawEntryRecord[]> {
  const result = await queryable.query<RawEntryRow>(
    `${rawEntrySelect} order by re.created_at desc, re.id desc limit 100`
  );
  return result.rows.map(mapRawEntryRow);
}

async function getRawEntry(queryable: Queryable, id: number): Promise<RawEntryRecord | null> {
  const result = await queryable.query<RawEntryRow>(`${rawEntrySelect} where re.id = $1`, [id]);
  const row = result.rows[0];
  return row ? mapRawEntryRow(row) : null;
}

function mapRawEntryRow(row: RawEntryRow): RawEntryRecord {
  return {
    id: row.id,
    sourceId: row.sourceId,
    sourceTitle: row.sourceTitle,
    title: row.title,
    url: row.url,
    lifecycleStatus: row.lifecycleStatus,
    processingStage: row.processingStage,
    rightsStatus: row.rightsStatus,
    failureType: row.failureType,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt
  };
}
