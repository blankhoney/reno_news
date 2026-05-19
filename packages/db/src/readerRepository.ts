import { Pool, type QueryResult } from "pg";

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

export type ListReaderItemsInput = {
  boardSlug?: string;
};

export type ReaderRepository = {
  listReaderBoards(): Promise<ReaderBoard[]>;
  listReaderItems(input?: ListReaderItemsInput): Promise<ReaderItemCard[]>;
  close(): Promise<void>;
};

type Queryable = {
  query<T extends object = Record<string, unknown>>(
    text: string,
    values?: readonly unknown[]
  ): Promise<QueryResult<T>>;
};

type ReaderItemRow = {
  id: number;
  boardSlug: string;
  boardName: string;
  sourceTitle: string;
  title: string;
  url: string;
  summary: string | null;
  publishedAt: Date | string | null;
  createdAt: Date | string;
};

export function createReaderRepository(databaseUrl: string): ReaderRepository {
  const pool = new Pool({ connectionString: databaseUrl, allowExitOnIdle: true });

  return {
    listReaderBoards: async () => listReaderBoards(pool),
    listReaderItems: async (input) => listReaderItems(pool, input),
    close: async () => {
      await pool.end();
    }
  };
}

async function listReaderBoards(queryable: Queryable): Promise<ReaderBoard[]> {
  const result = await queryable.query<ReaderBoard>(
    "select slug, name, description from boards order by id"
  );
  return result.rows;
}

async function listReaderItems(
  queryable: Queryable,
  input: ListReaderItemsInput = {}
): Promise<ReaderItemCard[]> {
  const values: string[] = [];
  const filters = ["s.enabled = true", "re.rights_status != 'blocked'"];

  if (input.boardSlug) {
    values.push(input.boardSlug);
    filters.push(`b.slug = $${values.length}`);
  }

  const result = await queryable.query<ReaderItemRow>(
    `
    select
      re.id::int as "id",
      b.slug as "boardSlug",
      b.name as "boardName",
      s.title as "sourceTitle",
      re.title as "title",
      re.url as "url",
      coalesce(sb.one_sentence, nullif(re.summary_raw, ''), '') as "summary",
      re.published_at as "publishedAt",
      re.created_at as "createdAt"
    from raw_entries re
    join sources s on s.id = re.source_id
    join boards b on b.id = s.board_id
    left join lateral (
      select one_sentence
      from summary_blocks
      where raw_entry_id = re.id
      order by id desc
      limit 1
    ) sb on true
    where ${filters.join(" and ")}
    order by coalesce(re.published_at, re.created_at) desc, re.id desc
    limit 100
    `,
    values
  );
  return result.rows.map(mapReaderItemRow);
}

function mapReaderItemRow(row: ReaderItemRow): ReaderItemCard {
  return {
    id: row.id,
    boardSlug: row.boardSlug,
    boardName: row.boardName,
    sourceTitle: row.sourceTitle,
    title: row.title,
    url: row.url,
    summary: row.summary ?? "",
    publishedAt: formatNullableDate(row.publishedAt),
    createdAt: formatDate(row.createdAt)
  };
}

function formatDate(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function formatNullableDate(value: Date | string | null): string | null {
  if (value === null) {
    return null;
  }
  return formatDate(value);
}
