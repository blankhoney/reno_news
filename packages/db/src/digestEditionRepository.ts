import { Pool, type QueryResult } from "pg";
import type { ReaderItemCard } from "./readerRepository";
import { BoardNotFoundError } from "./sourceRepository";

export type DigestEditionStatus = "draft" | "reviewed" | "archived";

export type DigestEditionItemSnapshot = {
  id: number;
  boardSlug: string;
  boardName: string;
  sourceTitle: string;
  title: string;
  summary: string;
  isDevelopmentSeed: boolean;
  publishedAt: string | null;
  createdAt: string;
};

export type DigestEditionItem = {
  itemId: number;
  position: number;
  snapshot: DigestEditionItemSnapshot;
};

export type DigestEdition = {
  id: number;
  editionKey: string;
  editionDate: string;
  boardSlug: string | null;
  status: DigestEditionStatus;
  windowStartAt: string;
  windowEndAt: string;
  generatedAt: string;
  reviewedAt: string | null;
  reviewNote: string | null;
  items: DigestEditionItem[];
};

export type DigestEditionSummary = {
  id: number;
  editionKey: string;
  editionDate: string;
  boardSlug: string | null;
  status: DigestEditionStatus;
  itemCount: number;
  generatedAt: string;
  reviewedAt: string | null;
};

export type CreateDigestEditionInput = {
  editionDate: string;
  boardSlug?: string;
  windowStartAt: string;
  windowEndAt: string;
  generatedByUserId: number;
  items: ReaderItemCard[];
};

export type DigestEditionRepository = {
  createDigestEdition(input: CreateDigestEditionInput): Promise<DigestEdition>;
  listDigestEditions(): Promise<DigestEditionSummary[]>;
  getDigestEditionById(id: number): Promise<DigestEdition | null>;
  getDigestEditionByKey(editionKey: string): Promise<DigestEdition | null>;
  close(): Promise<void>;
};

type Queryable = {
  query<T extends object = Record<string, unknown>>(
    text: string,
    values?: readonly unknown[]
  ): Promise<QueryResult<T>>;
};

type DigestEditionRow = {
  id: number;
  editionKey: string;
  editionDate: Date | string;
  boardSlug: string | null;
  status: DigestEditionStatus;
  windowStartAt: Date | string;
  windowEndAt: Date | string;
  generatedAt: Date | string;
  reviewedAt: Date | string | null;
  reviewNote: string | null;
};

type DigestEditionItemRow = {
  itemId: number;
  position: number;
  snapshot: unknown;
};

type DigestEditionSummaryRow = DigestEditionRow & {
  itemCount: number | string;
};

export function createDigestEditionRepository(databaseUrl: string): DigestEditionRepository {
  const pool = new Pool({ connectionString: databaseUrl, allowExitOnIdle: true });

  return {
    createDigestEdition: async (input) => createDigestEdition(pool, input),
    listDigestEditions: async () => listDigestEditions(pool),
    getDigestEditionById: async (id) => getDigestEditionById(pool, id),
    getDigestEditionByKey: async (editionKey) => getDigestEditionByKey(pool, editionKey),
    close: async () => {
      await pool.end();
    }
  };
}

async function createDigestEdition(
  pool: Pool,
  input: CreateDigestEditionInput
): Promise<DigestEdition> {
  const client = await pool.connect();
  const editionKey = buildDigestEditionKey(input);

  try {
    await client.query("begin");
    const boardId = input.boardSlug ? await findBoardId(client, input.boardSlug) : null;
    const insertResult = await client.query<{ id: number }>(
      `
      insert into digest_editions (
        edition_key,
        edition_date,
        board_id,
        window_start_at,
        window_end_at,
        generation_metadata_json
      )
      values ($1, $2, $3, $4, $5, $6::jsonb)
      on conflict (edition_key) do nothing
      returning id::int as "id"
      `,
      [
        editionKey,
        input.editionDate,
        boardId,
        input.windowStartAt,
        input.windowEndAt,
        JSON.stringify({
          generatedByUserId: input.generatedByUserId,
          itemCount: input.items.length
        })
      ]
    );

    const insertedId = insertResult.rows[0]?.id;

    if (insertedId) {
      for (const [index, item] of input.items.entries()) {
        await client.query(
          `
          insert into digest_edition_items (
            digest_edition_id,
            raw_entry_id,
            item_position,
            item_snapshot_json,
            selection_metadata_json
          )
          values ($1, $2, $3, $4::jsonb, '{}'::jsonb)
          `,
          [
            insertedId,
            item.id,
            index + 1,
            JSON.stringify(toDigestEditionItemSnapshot(item))
          ]
        );
      }
    }

    const edition = await getDigestEditionByKey(client, editionKey);
    if (!edition) {
      throw new Error("Digest edition could not be read");
    }

    await client.query("commit");
    return edition;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

async function listDigestEditions(queryable: Queryable): Promise<DigestEditionSummary[]> {
  const result = await queryable.query<DigestEditionSummaryRow>(
    `
    select
      de.id::int as "id",
      de.edition_key as "editionKey",
      de.edition_date::text as "editionDate",
      b.slug as "boardSlug",
      de.status as "status",
      de.window_start_at as "windowStartAt",
      de.window_end_at as "windowEndAt",
      de.created_at as "generatedAt",
      de.reviewed_at as "reviewedAt",
      de.review_note as "reviewNote",
      count(dei.raw_entry_id)::int as "itemCount"
    from digest_editions de
    left join boards b on b.id = de.board_id
    left join digest_edition_items dei on dei.digest_edition_id = de.id
    group by de.id, b.slug
    order by de.edition_date desc, de.created_at desc, de.id desc
    limit 100
    `
  );

  return result.rows.map((row) => ({
    id: row.id,
    editionKey: row.editionKey,
    editionDate: formatDateOnly(row.editionDate),
    boardSlug: row.boardSlug,
    status: row.status,
    itemCount: Number(row.itemCount),
    generatedAt: formatTimestamp(row.generatedAt),
    reviewedAt: formatNullableTimestamp(row.reviewedAt)
  }));
}

async function getDigestEditionById(
  queryable: Queryable,
  id: number
): Promise<DigestEdition | null> {
  const result = await queryable.query<DigestEditionRow>(
    `${digestEditionSelect} where de.id = $1`,
    [id]
  );
  return hydrateDigestEdition(queryable, result.rows[0]);
}

async function getDigestEditionByKey(
  queryable: Queryable,
  editionKey: string
): Promise<DigestEdition | null> {
  const result = await queryable.query<DigestEditionRow>(
    `${digestEditionSelect} where de.edition_key = $1`,
    [editionKey]
  );
  return hydrateDigestEdition(queryable, result.rows[0]);
}

const digestEditionSelect = `
  select
    de.id::int as "id",
    de.edition_key as "editionKey",
    de.edition_date::text as "editionDate",
    b.slug as "boardSlug",
    de.status as "status",
    de.window_start_at as "windowStartAt",
    de.window_end_at as "windowEndAt",
    de.created_at as "generatedAt",
    de.reviewed_at as "reviewedAt",
    de.review_note as "reviewNote"
  from digest_editions de
  left join boards b on b.id = de.board_id
`;

async function hydrateDigestEdition(
  queryable: Queryable,
  row: DigestEditionRow | undefined
): Promise<DigestEdition | null> {
  if (!row) {
    return null;
  }

  const itemResult = await queryable.query<DigestEditionItemRow>(
    `
    select
      raw_entry_id::int as "itemId",
      item_position::int as "position",
      item_snapshot_json as "snapshot"
    from digest_edition_items
    where digest_edition_id = $1
    order by item_position asc
    `,
    [row.id]
  );

  return {
    id: row.id,
    editionKey: row.editionKey,
    editionDate: formatDateOnly(row.editionDate),
    boardSlug: row.boardSlug,
    status: row.status,
    windowStartAt: formatTimestamp(row.windowStartAt),
    windowEndAt: formatTimestamp(row.windowEndAt),
    generatedAt: formatTimestamp(row.generatedAt),
    reviewedAt: formatNullableTimestamp(row.reviewedAt),
    reviewNote: row.reviewNote,
    items: itemResult.rows.map((item) => ({
      itemId: item.itemId,
      position: item.position,
      snapshot: normalizeDigestEditionItemSnapshot(item.snapshot)
    }))
  };
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

function buildDigestEditionKey(input: Pick<CreateDigestEditionInput, "editionDate" | "boardSlug">) {
  return input.boardSlug
    ? `board:${input.boardSlug}:${input.editionDate}`
    : `global:${input.editionDate}`;
}

function toDigestEditionItemSnapshot(item: ReaderItemCard): DigestEditionItemSnapshot {
  return {
    id: item.id,
    boardSlug: item.boardSlug,
    boardName: item.boardName,
    sourceTitle: item.sourceTitle,
    title: item.title,
    summary: item.summary,
    isDevelopmentSeed: item.isDevelopmentSeed,
    publishedAt: item.publishedAt,
    createdAt: item.createdAt
  };
}

function normalizeDigestEditionItemSnapshot(snapshot: unknown): DigestEditionItemSnapshot {
  const item = snapshot as Omit<DigestEditionItemSnapshot, "isDevelopmentSeed"> & {
    isDevelopmentSeed?: unknown;
  };

  return {
    ...item,
    isDevelopmentSeed: item.isDevelopmentSeed === true
  };
}

function formatDateOnly(value: Date | string): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return value.slice(0, 10);
}

function formatTimestamp(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function formatNullableTimestamp(value: Date | string | null): string | null {
  return value ? formatTimestamp(value) : null;
}
