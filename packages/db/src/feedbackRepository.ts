import { Pool, type QueryResult } from "pg";

export type FeedbackType =
  | "correction"
  | "quality_issue"
  | "duplicate"
  | "broken_link"
  | "rights_concern";

export type CreateFeedbackInput = {
  rawEntryId: number;
  feedbackType: FeedbackType;
  message?: string | null;
};

export type FeedbackRecord = {
  id: number;
  rawEntryId: number;
  rawEntryTitle: string;
  boardSlug: string;
  boardName: string;
  sourceTitle: string;
  feedbackType: FeedbackType;
  message: string | null;
  createdAt: string;
};

export type ListFeedbackOptions = {
  limit?: number;
};

export type FeedbackRepository = {
  createFeedback(input: CreateFeedbackInput): Promise<FeedbackRecord | null>;
  listFeedback(options?: ListFeedbackOptions): Promise<FeedbackRecord[]>;
  close(): Promise<void>;
};

type Queryable = {
  query<T extends object = Record<string, unknown>>(
    text: string,
    values?: readonly unknown[]
  ): Promise<QueryResult<T>>;
};

type FeedbackRow = Omit<FeedbackRecord, "createdAt"> & {
  createdAt: Date | string;
};

export function createFeedbackRepository(databaseUrl: string): FeedbackRepository {
  const pool = new Pool({ connectionString: databaseUrl, allowExitOnIdle: true });

  return {
    createFeedback: async (input) => createFeedback(pool, input),
    listFeedback: async (options) => listFeedback(pool, options),
    close: async () => {
      await pool.end();
    }
  };
}

async function createFeedback(
  queryable: Queryable,
  input: CreateFeedbackInput
): Promise<FeedbackRecord | null> {
  const result = await queryable.query<FeedbackRow>(
    `
    with visible_item as (
      select re.id
      from raw_entries re
      join sources s on s.id = re.source_id
      where re.id = $1
        and s.enabled = true
        and re.lifecycle_status != 'hidden'
        and re.rights_status != 'blocked'
    ),
    inserted as (
      insert into reader_feedback (raw_entry_id, feedback_type, message)
      select id, $2, nullif(trim($3::text), '')
      from visible_item
      returning *
    )
    ${feedbackSelect}
    from inserted rf
    join raw_entries re on re.id = rf.raw_entry_id
    join sources s on s.id = re.source_id
    join boards b on b.id = s.board_id
    `,
    [input.rawEntryId, input.feedbackType, input.message ?? null]
  );

  const row = result.rows[0];
  return row ? mapFeedbackRow(row) : null;
}

async function listFeedback(
  queryable: Queryable,
  options: ListFeedbackOptions = {}
): Promise<FeedbackRecord[]> {
  const limit = options.limit ?? 100;
  const result = await queryable.query<FeedbackRow>(
    `
    ${feedbackSelect}
    from reader_feedback rf
    join raw_entries re on re.id = rf.raw_entry_id
    join sources s on s.id = re.source_id
    join boards b on b.id = s.board_id
    order by rf.created_at desc, rf.id desc
    limit $1
    `,
    [limit]
  );

  return result.rows.map(mapFeedbackRow);
}

const feedbackSelect = `
    select
      rf.id::int as "id",
      re.id::int as "rawEntryId",
      re.title as "rawEntryTitle",
      b.slug as "boardSlug",
      b.name as "boardName",
      s.title as "sourceTitle",
      rf.feedback_type as "feedbackType",
      rf.message as "message",
      rf.created_at as "createdAt"
`;

function mapFeedbackRow(row: FeedbackRow): FeedbackRecord {
  return {
    ...row,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt
  };
}
