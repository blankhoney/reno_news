import { Pool, type QueryResult } from "pg";

export type AuditActorRole = "reader" | "admin";

export type AuditEventRecord = {
  id: number;
  actorUserId: number | null;
  actorRole: AuditActorRole | null;
  action: string;
  objectType: string;
  objectId: string | null;
  requestId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type RecordAuditEventInput = {
  actorUserId?: number | null;
  actorRole?: AuditActorRole | null;
  action: string;
  objectType: string;
  objectId?: string | null;
  requestId: string;
  metadata?: Record<string, unknown>;
};

export type ListAuditEventsOptions = {
  limit?: number;
};

export type AuditRepository = {
  recordAuditEvent(input: RecordAuditEventInput): Promise<void>;
  listAuditEvents(options?: ListAuditEventsOptions): Promise<AuditEventRecord[]>;
  close(): Promise<void>;
};

type Queryable = {
  query<T extends object = Record<string, unknown>>(
    text: string,
    values?: readonly unknown[]
  ): Promise<QueryResult<T>>;
};

type AuditEventRow = {
  id: number;
  actorUserId: number | null;
  actorRole: AuditActorRole | null;
  action: string;
  objectType: string;
  objectId: string | null;
  requestId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export function createAuditRepository(databaseUrl: string): AuditRepository {
  const pool = new Pool({ connectionString: databaseUrl, allowExitOnIdle: true });

  return {
    recordAuditEvent: async (input) => recordAuditEvent(pool, input),
    listAuditEvents: async (options) => listAuditEvents(pool, options),
    close: async () => {
      await pool.end();
    }
  };
}

async function recordAuditEvent(
  queryable: Queryable,
  input: RecordAuditEventInput
): Promise<void> {
  await queryable.query(
    `
      insert into audit_events (
        actor_user_id,
        actor_role,
        action,
        object_type,
        object_id,
        request_id,
        metadata_json
      )
      values ($1, $2, $3, $4, $5, $6, $7::jsonb)
    `,
    [
      input.actorUserId ?? null,
      input.actorRole ?? null,
      input.action,
      input.objectType,
      input.objectId ?? null,
      input.requestId,
      JSON.stringify(input.metadata ?? {})
    ]
  );
}

async function listAuditEvents(
  queryable: Queryable,
  options: ListAuditEventsOptions = {}
): Promise<AuditEventRecord[]> {
  const result = await queryable.query<AuditEventRow>(
    `
      select
        id::int as "id",
        actor_user_id::int as "actorUserId",
        actor_role as "actorRole",
        action,
        object_type as "objectType",
        object_id as "objectId",
        request_id as "requestId",
        metadata_json as "metadata",
        created_at::text as "createdAt"
      from audit_events
      order by created_at desc, id desc
      limit $1
    `,
    [options.limit ?? 50]
  );

  return result.rows.map((row) => ({
    ...row,
    createdAt: new Date(row.createdAt).toISOString()
  }));
}
