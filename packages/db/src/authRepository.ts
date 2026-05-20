import { Pool, type QueryResult } from "pg";

export type AuthRole = "reader" | "admin";
export type LoginFailureReason =
  | "invalid_credentials"
  | "invite_required"
  | "user_disabled"
  | "session_expired"
  | "rate_limited";

export type AuthUserWithPasswordRecord = {
  id: number;
  email: string;
  role: AuthRole;
  passwordHash: string;
  disabledAt: string | null;
};

export type AuthUserRecord = {
  id: number;
  email: string;
  role: AuthRole;
};

export type CreateSessionInput = {
  userId: number;
  sessionTokenHash: string;
  expiresAt: Date;
  userAgent?: string;
  ipAddress?: string;
};

export type LoginAttemptInput =
  | {
      userId?: number;
      email: string;
      outcome: "success";
      failureReason?: undefined;
      userAgent?: string;
      ipAddress?: string;
    }
  | {
      userId?: number;
      email: string;
      outcome: "failure";
      failureReason: LoginFailureReason;
      userAgent?: string;
      ipAddress?: string;
    };

export type AuthRepository = {
  findUserByEmail(email: string): Promise<AuthUserWithPasswordRecord | null>;
  hasPendingInvite(email: string): Promise<boolean>;
  createSession(input: CreateSessionInput): Promise<void>;
  findUserBySessionTokenHash(sessionTokenHash: string): Promise<AuthUserRecord | null>;
  revokeSession(sessionTokenHash: string): Promise<void>;
  recordLoginAttempt(input: LoginAttemptInput): Promise<void>;
  close(): Promise<void>;
};

type Queryable = {
  query<T extends object = Record<string, unknown>>(
    text: string,
    values?: readonly unknown[]
  ): Promise<QueryResult<T>>;
};

type AuthUserRow = {
  id: number;
  email: string;
  role: AuthRole;
  passwordHash: string;
  disabledAt: string | null;
};

export function createAuthRepository(databaseUrl: string): AuthRepository {
  const pool = new Pool({ connectionString: databaseUrl, allowExitOnIdle: true });

  return {
    findUserByEmail: async (email) => findUserByEmail(pool, email),
    hasPendingInvite: async (email) => hasPendingInvite(pool, email),
    createSession: async (input) => createSession(pool, input),
    findUserBySessionTokenHash: async (sessionTokenHash) =>
      findUserBySessionTokenHash(pool, sessionTokenHash),
    revokeSession: async (sessionTokenHash) => revokeSession(pool, sessionTokenHash),
    recordLoginAttempt: async (input) => recordLoginAttempt(pool, input),
    close: async () => {
      await pool.end();
    }
  };
}

async function findUserByEmail(
  queryable: Queryable,
  email: string
): Promise<AuthUserWithPasswordRecord | null> {
  const result = await queryable.query<AuthUserRow>(
    `
      select
        id::int as "id",
        email,
        role,
        password_hash as "passwordHash",
        disabled_at::text as "disabledAt"
      from users
      where email = $1
    `,
    [email]
  );

  return result.rows[0] ?? null;
}

async function hasPendingInvite(queryable: Queryable, email: string): Promise<boolean> {
  const result = await queryable.query<{ exists: boolean }>(
    `
      select exists (
        select 1
        from user_invites
        where email = $1
          and accepted_at is null
          and revoked_at is null
          and expires_at > now()
      ) as "exists"
    `,
    [email]
  );

  return result.rows[0]?.exists ?? false;
}

async function createSession(queryable: Queryable, input: CreateSessionInput): Promise<void> {
  await queryable.query(
    `
      insert into user_sessions (
        user_id,
        session_token_hash,
        expires_at,
        user_agent,
        ip_address
      )
      values ($1, $2, $3, $4, $5)
    `,
    [
      input.userId,
      input.sessionTokenHash,
      input.expiresAt,
      input.userAgent ?? null,
      input.ipAddress ?? null
    ]
  );
}

async function findUserBySessionTokenHash(
  queryable: Queryable,
  sessionTokenHash: string
): Promise<AuthUserRecord | null> {
  const result = await queryable.query<AuthUserRecord>(
    `
      select
        u.id::int as "id",
        u.email,
        u.role
      from user_sessions us
      join users u on u.id = us.user_id
      where us.session_token_hash = $1
        and us.revoked_at is null
        and us.expires_at > now()
        and u.disabled_at is null
    `,
    [sessionTokenHash]
  );

  return result.rows[0] ?? null;
}

async function revokeSession(queryable: Queryable, sessionTokenHash: string): Promise<void> {
  await queryable.query(
    `
      update user_sessions
      set revoked_at = now()
      where session_token_hash = $1
        and revoked_at is null
    `,
    [sessionTokenHash]
  );
}

async function recordLoginAttempt(queryable: Queryable, input: LoginAttemptInput): Promise<void> {
  await queryable.query(
    `
      insert into auth_login_attempts (
        user_id,
        email,
        outcome,
        failure_reason,
        user_agent,
        ip_address
      )
      values ($1, $2, $3, $4, $5, $6)
    `,
    [
      input.userId ?? null,
      input.email,
      input.outcome,
      input.outcome === "failure" ? input.failureReason : null,
      input.userAgent ?? null,
      input.ipAddress ?? null
    ]
  );
}
