import { Pool, type QueryResult } from "pg";

export type PersonalStateItem = {
  itemId: number;
  createdAt: string;
};

export type ReadStatusItem = {
  itemId: number;
  status: "unread" | "read";
  updatedAt: string;
};

export type PersonalStateResponse = {
  saved: PersonalStateItem[];
  readLater: PersonalStateItem[];
  readStatus: ReadStatusItem[];
};

export type PersonalStateUserInput = {
  userId: number;
};

export type SetPersonalStateItemInput = PersonalStateUserInput & {
  itemId: number;
  active: boolean;
};

export type SetReadStatusInput = PersonalStateUserInput & {
  itemId: number;
  status: "unread" | "read";
};

export type PersonalStateRepository = {
  getPersonalState(input: PersonalStateUserInput): Promise<PersonalStateResponse>;
  setSavedItem(input: SetPersonalStateItemInput): Promise<PersonalStateResponse>;
  setReadLaterItem(input: SetPersonalStateItemInput): Promise<PersonalStateResponse>;
  setReadStatus(input: SetReadStatusInput): Promise<PersonalStateResponse>;
  close(): Promise<void>;
};

export function createPersonalStateRepository(databaseUrl: string): PersonalStateRepository {
  const pool = new Pool({ connectionString: databaseUrl, allowExitOnIdle: true });

  return {
    getPersonalState: async (input) => getPersonalState(pool, input),
    setSavedItem: async (input) => setPersonalStateItem(pool, "user_saved_items", input),
    setReadLaterItem: async (input) =>
      setPersonalStateItem(pool, "user_read_later_items", input),
    setReadStatus: async (input) => setReadStatus(pool, input),
    close: async () => {
      await pool.end();
    }
  };
}

type Queryable = {
  query<T extends object = Record<string, unknown>>(
    text: string,
    values?: readonly unknown[]
  ): Promise<QueryResult<T>>;
};

type PersonalStateRow = {
  itemId: number;
  createdAt: Date | string;
};

type ReadStatusRow = {
  itemId: number;
  status: "unread" | "read";
  updatedAt: Date | string;
};

type PersonalStateTable = "user_saved_items" | "user_read_later_items";

async function getPersonalState(
  queryable: Queryable,
  input: PersonalStateUserInput
): Promise<PersonalStateResponse> {
  const [saved, readLater, readStatus] = await Promise.all([
    listPersonalStateItems(queryable, "user_saved_items", input.userId),
    listPersonalStateItems(queryable, "user_read_later_items", input.userId),
    listReadStatus(queryable, input.userId)
  ]);

  return {
    saved,
    readLater,
    readStatus
  };
}

async function setPersonalStateItem(
  queryable: Queryable,
  tableName: PersonalStateTable,
  input: SetPersonalStateItemInput
): Promise<PersonalStateResponse> {
  if (input.active) {
    await queryable.query(
      `
      insert into ${tableName} (user_id, raw_entry_id)
      values ($1, $2)
      on conflict (user_id, raw_entry_id) do nothing
      `,
      [input.userId, input.itemId]
    );
  } else {
    await queryable.query(
      `
      delete from ${tableName}
      where user_id = $1 and raw_entry_id = $2
      `,
      [input.userId, input.itemId]
    );
  }

  return getPersonalState(queryable, input);
}

async function setReadStatus(
  queryable: Queryable,
  input: SetReadStatusInput
): Promise<PersonalStateResponse> {
  await queryable.query(
    `
    insert into user_read_status (user_id, raw_entry_id, read_status, read_at, updated_at)
    values ($1, $2, $3, case when $3 = 'read' then now() else null end, now())
    on conflict (user_id, raw_entry_id) do update
      set read_status = excluded.read_status,
          read_at = excluded.read_at,
          updated_at = now()
    `,
    [input.userId, input.itemId, input.status]
  );

  return getPersonalState(queryable, input);
}

async function listPersonalStateItems(
  queryable: Queryable,
  tableName: PersonalStateTable,
  userId: number
): Promise<PersonalStateItem[]> {
  const result = await queryable.query<PersonalStateRow>(
    `
    select raw_entry_id::int as "itemId", created_at as "createdAt"
    from ${tableName}
    where user_id = $1
    order by created_at desc, raw_entry_id desc
    `,
    [userId]
  );

  return result.rows.map((row) => ({
    itemId: row.itemId,
    createdAt: formatDate(row.createdAt)
  }));
}

async function listReadStatus(
  queryable: Queryable,
  userId: number
): Promise<ReadStatusItem[]> {
  const result = await queryable.query<ReadStatusRow>(
    `
    select raw_entry_id::int as "itemId", read_status as "status", updated_at as "updatedAt"
    from user_read_status
    where user_id = $1
    order by updated_at desc, raw_entry_id desc
    `,
    [userId]
  );

  return result.rows.map((row) => ({
    itemId: row.itemId,
    status: row.status,
    updatedAt: formatDate(row.updatedAt)
  }));
}

function formatDate(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}
