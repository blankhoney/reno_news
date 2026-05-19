import { Pool, type QueryResult } from "pg";

export type FailureStage = "source_ingest" | "extraction" | "model_call";

export type FailureQueueRecord = {
  id: number;
  failureStage: FailureStage;
  status: "failure";
  failureType: string | null;
  errorCode: string | null;
  message: string | null;
  sourceId: number | null;
  sourceTitle: string | null;
  rawEntryId: number | null;
  rawEntryTitle: string | null;
  purpose: string | null;
  createdAt: string;
};

export type FailureQueueOptions = {
  limit?: number;
};

export type FailureQueueRepository = {
  listFailures(options?: FailureQueueOptions): Promise<FailureQueueRecord[]>;
  close(): Promise<void>;
};

export type ClosableFailureQueueRepository = FailureQueueRepository;

type Queryable = {
  query<T extends object = Record<string, unknown>>(
    text: string,
    values?: readonly unknown[]
  ): Promise<QueryResult<T>>;
};

type FailureQueueRow = Omit<FailureQueueRecord, "createdAt"> & {
  createdAt: Date | string;
};

export function createFailureQueueRepository(databaseUrl: string): ClosableFailureQueueRepository {
  const pool = new Pool({ connectionString: databaseUrl, allowExitOnIdle: true });

  return {
    listFailures: async (options) => listFailures(pool, options),
    close: async () => {
      await pool.end();
    }
  };
}

async function listFailures(
  queryable: Queryable,
  options: FailureQueueOptions = {}
): Promise<FailureQueueRecord[]> {
  const limit = options.limit ?? 100;
  const result = await queryable.query<FailureQueueRow>(
    `
      select *
      from (
        select
          sia.id::int as "id",
          'source_ingest' as "failureStage",
          sia.status as "status",
          sia.failure_type as "failureType",
          null::text as "errorCode",
          sia.message as "message",
          s.id::int as "sourceId",
          s.title as "sourceTitle",
          null::int as "rawEntryId",
          null::text as "rawEntryTitle",
          null::text as "purpose",
          sia.created_at as "createdAt"
        from source_ingest_attempts sia
        join sources s on s.id = sia.source_id
        where sia.status = 'failure'

        union all

        select
          rea.id::int as "id",
          'extraction' as "failureStage",
          rea.status as "status",
          rea.failure_type as "failureType",
          null::text as "errorCode",
          rea.message as "message",
          s.id::int as "sourceId",
          s.title as "sourceTitle",
          re.id::int as "rawEntryId",
          re.title as "rawEntryTitle",
          null::text as "purpose",
          coalesce(rea.completed_at, rea.started_at) as "createdAt"
        from raw_entry_extraction_attempts rea
        join raw_entries re on re.id = rea.raw_entry_id
        join sources s on s.id = re.source_id
        where rea.status = 'failure'

        union all

        select
          mc.id::int as "id",
          'model_call' as "failureStage",
          mc.status as "status",
          null::text as "failureType",
          mc.error_code as "errorCode",
          coalesce(
            mc.response_redacted_json ->> 'error',
            mc.response_redacted_json ->> 'message'
          ) as "message",
          s.id::int as "sourceId",
          s.title as "sourceTitle",
          re.id::int as "rawEntryId",
          re.title as "rawEntryTitle",
          mc.purpose as "purpose",
          mc.created_at as "createdAt"
        from model_calls mc
        left join raw_entries re on re.id = case
          when mc.request_redacted_json ->> 'rawEntryId' ~ '^[0-9]+$'
          then (mc.request_redacted_json ->> 'rawEntryId')::bigint
          else null
        end
        left join sources s on s.id = re.source_id
        where mc.status = 'failure'
      ) failures
      order by "createdAt" desc, "id" desc
      limit $1
    `,
    [limit]
  );

  return result.rows.map(mapFailureQueueRow);
}

function mapFailureQueueRow(row: FailureQueueRow): FailureQueueRecord {
  return {
    ...row,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt
  };
}
