import { test } from "node:test";
import assert from "node:assert/strict";
import { Pool } from "pg";
import { runMigrations, runSeed } from "./runner";
import { createAuditRepository } from "./auditRepository";
import { createAuthRepository } from "./authRepository";
import { createDigestEditionRepository } from "./digestEditionRepository";
import { createFeedbackRepository } from "./feedbackRepository";
import { createFailureQueueRepository } from "./failureQueueRepository";
import { createPersonalStateRepository } from "./personalStateRepository";
import { createRawEntryRepository } from "./rawEntryRepository";
import { createReaderRepository } from "./readerRepository";
import { createSourceRepository } from "./sourceRepository";

const databaseUrl =
  process.env.DATABASE_URL ?? "postgres://reno_news:reno_news@localhost:5432/reno_news";

test("migrations and dev seed can be applied repeatedly", async () => {
  await runMigrations({ databaseUrl });
  await runSeed({ databaseUrl });
  await runSeed({ databaseUrl });

  const pool = new Pool({ connectionString: databaseUrl, allowExitOnIdle: true });

  try {
    const boards = await pool.query<{ count: string }>("select count(*) from boards");
    const sources = await pool.query<{ count: string }>(
      "select count(*) from sources where url in ('https://openai.com/news/rss.xml', 'https://github.blog/engineering.atom', 'https://semiengineering.com/feed/', 'https://www.bls.gov/feed/empsit.rss', 'https://github.blog/feed/')"
    );
    const sourcePolicies = await pool.query<{ count: string }>(
      "select count(*) from source_policies sp join sources s on s.id = sp.source_id where s.url in ('https://openai.com/news/rss.xml', 'https://github.blog/engineering.atom', 'https://semiengineering.com/feed/', 'https://www.bls.gov/feed/empsit.rss', 'https://github.blog/feed/')"
    );
    const rawEntries = await pool.query<{ count: string }>(
      "select count(*) from raw_entries where raw_payload_json @> '{\"seed\": true}'::jsonb"
    );
    const devUsers = await pool.query<{ email: string; role: string; password_hash: string }>(
      "select email, role, password_hash from users where email in ('admin@example.invalid', 'reader@example.invalid') order by email"
    );
    const extractionTables = await pool.query<{ count: string }>(
      "select count(*) from information_schema.tables where table_schema = 'public' and table_name in ('raw_entry_extraction_attempts', 'raw_entry_extractions')"
    );
    const aiTables = await pool.query<{ count: string }>(
      "select count(*) from information_schema.tables where table_schema = 'public' and table_name in ('model_calls', 'ai_evaluations')"
    );
    const translationTables = await pool.query<{ count: string }>(
      "select count(*) from information_schema.tables where table_schema = 'public' and table_name = 'translations'"
    );
    const summaryBlockTables = await pool.query<{ count: string }>(
      "select count(*) from information_schema.tables where table_schema = 'public' and table_name = 'summary_blocks'"
    );

    assert.equal(Number(boards.rows[0].count), 5);
    assert.equal(Number(sources.rows[0].count), 5);
    assert.equal(Number(sourcePolicies.rows[0].count), 5);
    assert.equal(Number(rawEntries.rows[0].count), 5);
    assert.deepEqual(
      devUsers.rows.map((row) => ({
        email: row.email,
        role: row.role,
        hasArgon2idPassword: row.password_hash.startsWith("$argon2id$")
      })),
      [
        { email: "admin@example.invalid", role: "admin", hasArgon2idPassword: true },
        { email: "reader@example.invalid", role: "reader", hasArgon2idPassword: true }
      ]
    );
    assert.equal(Number(extractionTables.rows[0].count), 2);
    assert.equal(Number(aiTables.rows[0].count), 2);
    assert.equal(Number(translationTables.rows[0].count), 1);
    assert.equal(Number(summaryBlockTables.rows[0].count), 1);

    await assert.rejects(
      pool.query(
        "insert into raw_entries (source_id, external_id, url, title, lifecycle_status, canonical_hash) select id, 'bad-status', 'https://example.invalid/bad-status', 'Bad status', 'invalid', 'bad-status' from sources limit 1"
      )
    );
    await assert.rejects(
      pool.query("update raw_entries set processing_stage = 'invalid' where external_id = 'sample-ai-001'")
    );
    await assert.rejects(
      pool.query("update raw_entries set rights_status = 'invalid' where external_id = 'sample-ai-001'")
    );
    await assert.rejects(
      pool.query("update raw_entries set failure_type = 'invalid' where external_id = 'sample-ai-001'")
    );
    await assert.rejects(
      pool.query(
        "update source_policies set rights_policy = 'invalid' where source_id = (select id from sources where url = 'https://openai.com/news/rss.xml')"
      )
    );
    await assert.rejects(
      pool.query(
        "insert into raw_entry_extraction_attempts (raw_entry_id, status) select id, 'invalid' from raw_entries limit 1"
      )
    );
    await assert.rejects(
      pool.query(
        "insert into raw_entry_extractions (raw_entry_id, extractor_name, extractor_version, final_url, extracted_text, text_length, extraction_confidence) select id, 'test', '0', url, 'text', 4, 1.5 from raw_entries limit 1"
      )
    );
    await assert.rejects(
      pool.query(
        "insert into model_calls (provider, model, purpose, schema_version, status) values ('test', 'test', 'ai_evaluation', 'v1', 'invalid')"
      )
    );
    await assert.rejects(
      pool.query(
        "with mc as (insert into model_calls (provider, model, purpose, schema_version, status) values ('test', 'test', 'translation', 'v1', 'success') returning id) insert into translations (raw_entry_id, model_call_id, target_language, schema_version, status, translated_text, segments_json, quality_flags_json) select re.id, mc.id, 'fr', 'v1', 'draft', 'text', '[]'::jsonb, '[]'::jsonb from raw_entries re cross join mc limit 1"
      )
    );
    await assert.rejects(
      pool.query(
        "with mc as (insert into model_calls (provider, model, purpose, schema_version, status) values ('test', 'test', 'translation', 'v1', 'success') returning id) insert into translations (raw_entry_id, model_call_id, target_language, schema_version, status, translated_text, segments_json, quality_flags_json) select re.id, mc.id, 'zh-Hans', 'v1', 'published', 'text', '[]'::jsonb, '[]'::jsonb from raw_entries re cross join mc limit 1"
      )
    );
    await assert.rejects(
      pool.query(
        "with re as (select id from raw_entries limit 1), eval_mc as (insert into model_calls (provider, model, purpose, schema_version, status) values ('test', 'test', 'ai_evaluation', 'v1', 'success') returning id), eval as (insert into ai_evaluations (raw_entry_id, model_call_id, schema_version, scores_json, rationale_json, evidence_json, summary_json) select re.id, eval_mc.id, 'v1', '{}'::jsonb, '{}'::jsonb, '[]'::jsonb, '{}'::jsonb from re cross join eval_mc returning id, raw_entry_id), summary_mc as (insert into model_calls (provider, model, purpose, schema_version, status) values ('test', 'test', 'summary_blocks', 'v1', 'success') returning id) insert into summary_blocks (raw_entry_id, ai_evaluation_id, model_call_id, schema_version, status, one_sentence, detailed_summary, why_it_matters, source_note, china_relevance, related_topics_json) select eval.raw_entry_id, eval.id, summary_mc.id, 'v1', 'published', 'one', 'details', 'why', 'source', 'china', '[]'::jsonb from eval cross join summary_mc"
      )
    );
  } finally {
    await pool.end();
  }
});

test("similarity and dedup schema adds pg_trgm indexes without relaxing canonical hash uniqueness", async () => {
  await runMigrations({ databaseUrl });

  const unique = Date.now().toString(36);
  const sourceUrl = `https://example.invalid/similarity-dedup-${unique}.xml`;
  const firstHash = `similarity-dedup-canonical-${unique}`;
  const secondHash = `similarity-dedup-secondary-${unique}`;
  const groupKey = `title-url-trgm:${unique}`;
  const pool = new Pool({ connectionString: databaseUrl, allowExitOnIdle: true });

  try {
    await cleanupSimilarityDedupFixture(pool, sourceUrl, groupKey);

    const extension = await pool.query<{ count: string }>(
      "select count(*) from pg_extension where extname = 'pg_trgm'"
    );
    assert.equal(Number(extension.rows[0].count), 1);

    const indexes = await pool.query<{ indexname: string; indexdef: string }>(
      `
        select indexname, indexdef
        from pg_indexes
        where schemaname = 'public'
          and indexname in ('raw_entries_title_trgm_idx', 'raw_entries_url_trgm_idx')
        order by indexname
      `
    );
    assert.deepEqual(
      indexes.rows.map((row) => row.indexname),
      ["raw_entries_title_trgm_idx", "raw_entries_url_trgm_idx"]
    );
    for (const index of indexes.rows) {
      assert.match(index.indexdef, /USING gin/);
      assert.match(index.indexdef, /gin_trgm_ops/);
    }

    const source = await pool.query<{ id: number }>(
      `
        insert into sources (board_id, source_type, title, url)
        values ((select id from boards where slug = 'ai'), 'rss', $1, $2)
        returning id::int
      `,
      [`Similarity Dedup ${unique}`, sourceUrl]
    );

    const first = await pool.query<{ id: number }>(
      `
        insert into raw_entries (source_id, external_id, url, title, canonical_hash)
        values ($1, $2, $3, 'Similarity Duplicate Primary', $4)
        returning id::int
      `,
      [source.rows[0].id, `similarity-dedup-first-${unique}`, `${sourceUrl}#first`, firstHash]
    );

    await assert.rejects(
      pool.query(
        `
          insert into raw_entries (source_id, external_id, url, title, canonical_hash)
          values ($1, $2, $3, 'Similarity Duplicate Exact', $4)
        `,
        [
          source.rows[0].id,
          `similarity-dedup-exact-${unique}`,
          `${sourceUrl}#exact`,
          firstHash
        ]
      )
    );

    const second = await pool.query<{ id: number }>(
      `
        insert into raw_entries (source_id, external_id, url, title, canonical_hash)
        values ($1, $2, $3, 'Similarity Duplicate Secondary', $4)
        returning id::int
      `,
      [source.rows[0].id, `similarity-dedup-second-${unique}`, `${sourceUrl}#second`, secondHash]
    );
    const group = await pool.query<{ id: number }>(
      `
        insert into raw_entry_duplicate_groups (group_kind, group_key, representative_raw_entry_id)
        values ('title_url_trgm', $1, $2)
        returning id::int
      `,
      [groupKey, first.rows[0].id]
    );
    await pool.query("update raw_entries set duplicate_group_id = $1 where id = any($2::bigint[])", [
      group.rows[0].id,
      [first.rows[0].id, second.rows[0].id]
    ]);
    await pool.query(
      `
        insert into raw_entry_similarity_signals (
          raw_entry_id,
          similar_raw_entry_id,
          signal_type,
          score
        )
        values ($1, $2, 'title_trgm', 0.8123)
      `,
      [first.rows[0].id, second.rows[0].id]
    );

    await assert.rejects(
      pool.query(
        `
          insert into raw_entry_similarity_signals (
            raw_entry_id,
            similar_raw_entry_id,
            signal_type,
            score
          )
          values ($1, $1, 'title_trgm', 0.5000)
        `,
        [first.rows[0].id]
      )
    );
    await assert.rejects(
      pool.query(
        `
          insert into raw_entry_similarity_signals (
            raw_entry_id,
            similar_raw_entry_id,
            signal_type,
            score
          )
          values ($1, $2, 'url_trgm', 1.5000)
        `,
        [first.rows[0].id, second.rows[0].id]
      )
    );

    const grouped = await pool.query<{ count: string }>(
      "select count(*) from raw_entries where duplicate_group_id = $1",
      [group.rows[0].id]
    );
    assert.equal(Number(grouped.rows[0].count), 2);
  } finally {
    await cleanupSimilarityDedupFixture(pool, sourceUrl, groupKey);
    await pool.end();
  }
});

test("auth identity schema enforces roles, invites, sessions, and login attempts", async () => {
  await runMigrations({ databaseUrl });

  const unique = Date.now().toString(36);
  const email = `auth-contract-${unique}@example.invalid`;
  const invitedEmail = `auth-contract-invite-${unique}@example.invalid`;
  const argon2idHash = "$argon2id$v=19$m=65536,t=3,p=4$c2FsdA$aGFzaA";
  const pool = new Pool({ connectionString: databaseUrl, allowExitOnIdle: true });

  await cleanupAuthFixture(pool, [email, invitedEmail]);

  try {
    const userResult = await pool.query<{ id: number; role: string }>(
      `
        insert into users (email, password_hash, role)
        values ($1, $2, 'admin')
        returning id::int, role
      `,
      [email, argon2idHash]
    );
    const userId = userResult.rows[0].id;

    assert.equal(userResult.rows[0].role, "admin");

    await assert.rejects(
      pool.query(
        "insert into users (email, password_hash, role) values ($1, $2, 'reader')",
        [email, argon2idHash]
      )
    );
    await assert.rejects(
      pool.query(
        "insert into users (email, password_hash, role) values ($1, $2, 'owner')",
        [`auth-contract-owner-${unique}@example.invalid`, argon2idHash]
      )
    );
    await assert.rejects(
      pool.query(
        "insert into users (email, password_hash, role) values ($1, 'not-argon2', 'reader')",
        [`auth-contract-password-${unique}@example.invalid`]
      )
    );
    await assert.rejects(
      pool.query(
        "insert into users (email, password_hash, role) values ($1, $2, 'reader')",
        [email.toUpperCase(), argon2idHash]
      )
    );

    await pool.query(
      `
        insert into user_invites (email, role, token_hash, invited_by_user_id, expires_at)
        values ($1, 'reader', $2, $3, now() + interval '1 day')
      `,
      [invitedEmail, `invite-token-${unique}`, userId]
    );
    await assert.rejects(
      pool.query(
        `
          insert into user_invites (email, role, token_hash, invited_by_user_id, expires_at)
          values ($1, 'reader', $2, $3, now() + interval '1 day')
        `,
        [`auth-contract-duplicate-token-${unique}@example.invalid`, `invite-token-${unique}`, userId]
      )
    );
    await assert.rejects(
      pool.query(
        `
          insert into user_invites (email, role, token_hash, invited_by_user_id, expires_at)
          values ($1, 'owner', $2, $3, now() + interval '1 day')
        `,
        [`auth-contract-bad-invite-role-${unique}@example.invalid`, `bad-role-token-${unique}`, userId]
      )
    );
    await assert.rejects(
      pool.query(
        `
          insert into user_invites (email, role, token_hash, invited_by_user_id, expires_at)
          values ($1, 'reader', $2, $3, now() - interval '1 day')
        `,
        [`auth-contract-expired-invite-${unique}@example.invalid`, `expired-token-${unique}`, userId]
      )
    );

    const sessionTokenHash = `session-token-${unique}-00000000000000000000000000000000`;
    await pool.query(
      `
        insert into user_sessions (user_id, session_token_hash, expires_at)
        values ($1, $2, now() + interval '1 day')
      `,
      [userId, sessionTokenHash]
    );
    await assert.rejects(
      pool.query(
        `
          insert into user_sessions (user_id, session_token_hash, expires_at)
          values ($1, $2, now() + interval '1 day')
        `,
        [userId, sessionTokenHash]
      )
    );
    await assert.rejects(
      pool.query(
        `
          insert into user_sessions (user_id, session_token_hash, expires_at)
          values ($1, 'short-token', now() + interval '1 day')
        `,
        [userId]
      )
    );
    await assert.rejects(
      pool.query(
        `
          insert into user_sessions (user_id, session_token_hash, expires_at)
          values ($1, $2, now() - interval '1 day')
        `,
        [userId, `expired-session-${unique}-000000000000000000000000`]
      )
    );

    await pool.query(
      `
        insert into auth_login_attempts (user_id, email, outcome)
        values ($1, $2, 'success')
      `,
      [userId, email]
    );
    await pool.query(
      `
        insert into auth_login_attempts (email, outcome, failure_reason)
        values ($1, 'failure', 'invalid_credentials')
      `,
      [invitedEmail]
    );
    await assert.rejects(
      pool.query(
        `
          insert into auth_login_attempts (email, outcome, failure_reason)
          values ($1, 'success', 'invalid_credentials')
        `,
        [email]
      )
    );
    await assert.rejects(
      pool.query(
        `
          insert into auth_login_attempts (email, outcome)
          values ($1, 'failure')
        `,
        [invitedEmail]
      )
    );
    await assert.rejects(
      pool.query(
        `
          insert into auth_login_attempts (email, outcome, failure_reason)
          values ($1, 'failure', 'unknown')
        `,
        [invitedEmail]
      )
    );
  } finally {
    await cleanupAuthFixture(pool, [email, invitedEmail]);
    await pool.end();
  }
});

test("auth repository reads users, manages sessions, and records login attempts", async () => {
  await runMigrations({ databaseUrl });

  const unique = Date.now().toString(36);
  const email = `auth-repository-${unique}@example.invalid`;
  const invitedEmail = `auth-repository-invite-${unique}@example.invalid`;
  const argon2idHash = "$argon2id$v=19$m=65536,t=3,p=4$c2FsdA$aGFzaA";
  const sessionTokenHash = `session-token-${unique}-00000000000000000000000000000000`;
  const pool = new Pool({ connectionString: databaseUrl, allowExitOnIdle: true });

  await cleanupAuthFixture(pool, [email, invitedEmail]);

  try {
    const userResult = await pool.query<{ id: number }>(
      `
        insert into users (email, password_hash, role)
        values ($1, $2, 'reader')
        returning id::int
      `,
      [email, argon2idHash]
    );
    const userId = userResult.rows[0].id;
    await pool.query(
      `
        insert into user_invites (email, role, token_hash, invited_by_user_id, expires_at)
        values ($1, 'reader', $2, $3, now() + interval '1 day')
      `,
      [invitedEmail, `auth-repository-invite-token-${unique}`, userId]
    );

    const repository = createAuthRepository(databaseUrl);

    try {
      const user = await repository.findUserByEmail(email);
      assert.equal(user?.id, userId);
      assert.equal(user?.passwordHash, argon2idHash);
      assert.equal(await repository.hasPendingInvite(invitedEmail), true);

      await repository.createSession({
        userId,
        sessionTokenHash,
        expiresAt: new Date(Date.now() + 60_000)
      });
      assert.deepEqual(await repository.findUserBySessionTokenHash(sessionTokenHash), {
        id: userId,
        email,
        role: "reader"
      });

      await repository.recordLoginAttempt({
        userId,
        email,
        outcome: "success"
      });
      await repository.recordLoginAttempt({
        email: invitedEmail,
        outcome: "failure",
        failureReason: "invite_required"
      });

      await repository.revokeSession(sessionTokenHash);
      assert.equal(await repository.findUserBySessionTokenHash(sessionTokenHash), null);
    } finally {
      await repository.close();
    }
  } finally {
    await cleanupAuthFixture(pool, [email, invitedEmail]);
    await pool.end();
  }
});

test("audit repository records and lists actor-scoped events", async () => {
  await runMigrations({ databaseUrl });

  const unique = Date.now().toString(36);
  const email = `audit-repository-${unique}@example.invalid`;
  const requestId = `audit-request-${unique}`;
  const argon2idHash = "$argon2id$v=19$m=65536,t=3,p=4$c2FsdA$aGFzaA";
  const pool = new Pool({ connectionString: databaseUrl, allowExitOnIdle: true });

  await cleanupAuthFixture(pool, [email]);
  await pool.query("delete from audit_events where request_id = $1", [requestId]);

  try {
    const userResult = await pool.query<{ id: number }>(
      `
        insert into users (email, password_hash, role)
        values ($1, $2, 'admin')
        returning id::int
      `,
      [email, argon2idHash]
    );
    const userId = userResult.rows[0].id;
    const repository = createAuditRepository(databaseUrl);

    try {
      await repository.recordAuditEvent({
        actorUserId: userId,
        actorRole: "admin",
        action: "source.update",
        objectType: "source",
        objectId: "1",
        requestId,
        metadata: { fields: ["enabled"] }
      });

      const events = await repository.listAuditEvents({ limit: 10 });
      const event = events.find((candidate) => candidate.requestId === requestId);

      assert.ok(event);
      assert.equal(event.actorUserId, userId);
      assert.equal(event.actorRole, "admin");
      assert.equal(event.action, "source.update");
      assert.equal(event.objectType, "source");
      assert.equal(event.objectId, "1");
      assert.deepEqual(event.metadata, { fields: ["enabled"] });
      assert.match(event.createdAt, /^\d{4}-\d{2}-\d{2}T/);
    } finally {
      await repository.close();
    }
  } finally {
    await pool.query("delete from audit_events where request_id = $1", [requestId]);
    await cleanupAuthFixture(pool, [email]);
    await pool.end();
  }
});

test("personal state repository stores idempotent state per user", async () => {
  await runMigrations({ databaseUrl });
  await runSeed({ databaseUrl });

  const unique = Date.now().toString(36);
  const firstEmail = `personal-state-a-${unique}@example.invalid`;
  const secondEmail = `personal-state-b-${unique}@example.invalid`;
  const argon2idHash = "$argon2id$v=19$m=65536,t=3,p=4$c2FsdA$aGFzaA";
  const pool = new Pool({ connectionString: databaseUrl, allowExitOnIdle: true });

  await cleanupAuthFixture(pool, [firstEmail, secondEmail]);

  try {
    const firstUser = await pool.query<{ id: number }>(
      `
        insert into users (email, password_hash, role)
        values ($1, $2, 'reader')
        returning id::int
      `,
      [firstEmail, argon2idHash]
    );
    const secondUser = await pool.query<{ id: number }>(
      `
        insert into users (email, password_hash, role)
        values ($1, $2, 'reader')
        returning id::int
      `,
      [secondEmail, argon2idHash]
    );
    const rawEntry = await pool.query<{ id: number }>(
      "select id::int from raw_entries where external_id = 'sample-ai-001'"
    );
    const firstUserId = firstUser.rows[0].id;
    const secondUserId = secondUser.rows[0].id;
    const itemId = rawEntry.rows[0].id;
    const repository = createPersonalStateRepository(databaseUrl);

    try {
      assert.deepEqual(await repository.getPersonalState({ userId: firstUserId }), {
        saved: [],
        readLater: [],
        readStatus: []
      });

      await repository.setSavedItem({ userId: firstUserId, itemId, active: true });
      await repository.setSavedItem({ userId: firstUserId, itemId, active: true });
      await repository.setReadLaterItem({ userId: firstUserId, itemId, active: true });
      const afterRead = await repository.setReadStatus({
        userId: firstUserId,
        itemId,
        status: "read"
      });

      assert.deepEqual(
        afterRead.saved.map((item) => item.itemId),
        [itemId]
      );
      assert.deepEqual(
        afterRead.readLater.map((item) => item.itemId),
        [itemId]
      );
      assert.deepEqual(afterRead.readStatus.map((item) => [item.itemId, item.status]), [
        [itemId, "read"]
      ]);
      assert.deepEqual(await repository.getPersonalState({ userId: secondUserId }), {
        saved: [],
        readLater: [],
        readStatus: []
      });

      const savedCount = await pool.query<{ count: string }>(
        "select count(*) from user_saved_items where user_id = $1 and raw_entry_id = $2",
        [firstUserId, itemId]
      );
      assert.equal(Number(savedCount.rows[0].count), 1);

      const afterRemove = await repository.setSavedItem({
        userId: firstUserId,
        itemId,
        active: false
      });
      assert.deepEqual(afterRemove.saved, []);
      assert.deepEqual(
        afterRemove.readLater.map((item) => item.itemId),
        [itemId]
      );
    } finally {
      await repository.close();
    }
  } finally {
    await cleanupAuthFixture(pool, [firstEmail, secondEmail]);
    await pool.end();
  }
});

async function cleanupAuthFixture(pool: Pool, emails: string[]) {
  await pool.query(
    "delete from audit_events where actor_user_id in (select id from users where email = any($1::text[]))",
    [emails]
  );
  await pool.query("delete from auth_login_attempts where email = any($1::text[])", [emails]);
  await pool.query("delete from user_invites where email = any($1::text[])", [emails]);
  await pool.query("delete from users where email = any($1::text[])", [emails]);
}

test("source repository can create, update, and list worker-readable policies", async () => {
  await runMigrations({ databaseUrl });
  await runSeed({ databaseUrl });

  const testUrl = "https://example.invalid/source-registry-test.xml";
  const cleanupPool = new Pool({ connectionString: databaseUrl, allowExitOnIdle: true });
  await cleanupPool.query("delete from sources where url = $1", [testUrl]);
  await cleanupPool.end();

  const repository = createSourceRepository(databaseUrl);

  try {
    const created = await repository.createSource({
      boardSlug: "ai",
      sourceType: "rss",
      title: "Source Registry Test",
      url: testUrl,
      enabled: true,
      policy: {
        crawlEnabled: true,
        fetchIntervalMinutes: 30,
        maxRequestsPerHour: 6,
        saveLevel: "metadata_only",
        rightsPolicy: "metadata_only",
        translationPolicy: "none",
        riskLevel: "low"
      }
    });

    assert.equal(created.boardSlug, "ai");
    assert.equal(created.sourceType, "rss");
    assert.equal(created.policy.fetchIntervalMinutes, 30);

    const updated = await repository.updateSource(created.id, {
      enabled: false,
      policy: {
        crawlEnabled: false,
        riskLevel: "high"
      }
    });

    assert.ok(updated);
    assert.equal(updated.enabled, false);
    assert.equal(updated.policy.crawlEnabled, false);
    assert.equal(updated.policy.riskLevel, "high");

    const workerPolicies = await repository.listEnabledSourcePolicies();

    assert.ok(workerPolicies.every((source) => source.enabled));
    assert.ok(workerPolicies.every((source) => source.policy.crawlEnabled));
    assert.ok(workerPolicies.some((source) => source.url === "https://openai.com/news/rss.xml"));
  } finally {
    await repository.close();
    const finalCleanupPool = new Pool({ connectionString: databaseUrl, allowExitOnIdle: true });
    await finalCleanupPool.query("delete from sources where url = $1", [testUrl]);
    await finalCleanupPool.end();
  }
});

test("failure queue repository normalizes recent failures", async () => {
  await runMigrations({ databaseUrl });
  await runSeed({ databaseUrl });

  const testUrl = "https://example.invalid/failure-queue-test.xml";
  const pool = new Pool({ connectionString: databaseUrl, allowExitOnIdle: true });
  await cleanupFailureQueueFixture(pool, testUrl);

  const sourceResult = await pool.query<{ id: number }>(
    `
      insert into sources (board_id, source_type, title, url, enabled)
      select id, 'rss', 'Failure Queue Test', $1, true
      from boards
      where slug = 'ai'
      returning id::int
    `,
    [testUrl]
  );
  const sourceId = sourceResult.rows[0].id;
  await pool.query("insert into source_policies (source_id) values ($1)", [sourceId]);
  const rawEntryResult = await pool.query<{ id: number }>(
    `
      insert into raw_entries (
        source_id,
        external_id,
        url,
        title,
        lifecycle_status,
        processing_stage,
        rights_status,
        failure_type,
        canonical_hash
      )
      values (
        $1,
        'failure-queue-entry',
        'https://example.invalid/failure-queue-entry',
        'Failure Queue Entry',
        'new',
        'metadata_ingested',
        'metadata_only',
        'network',
        'failure-queue-entry'
      )
      returning id::int
    `,
    [sourceId]
  );
  const rawEntryId = rawEntryResult.rows[0].id;

  await pool.query(
    `
      insert into source_ingest_attempts (source_id, status, failure_type, message, created_at)
      values ($1, 'failure', 'network', 'Feed unavailable', now() - interval '3 minutes')
    `,
    [sourceId]
  );
  await pool.query(
    `
      insert into raw_entry_extraction_attempts (
        raw_entry_id,
        status,
        failure_type,
        message,
        started_at,
        completed_at
      )
      values (
        $1,
        'failure',
        'parse',
        'No readable text',
        now() - interval '2 minutes',
        now() - interval '2 minutes'
      )
    `,
    [rawEntryId]
  );
  await pool.query(
    `
      insert into model_calls (
        provider,
        model,
        purpose,
        schema_version,
        status,
        error_code,
        request_redacted_json,
        created_at
      )
      values (
        'fixture',
        'fixture',
        'ai_evaluation',
        'v1',
        'failure',
        'adapter_error_issue014',
        $1::jsonb,
        now() - interval '1 minute'
      )
    `,
    [JSON.stringify({ rawEntryId })]
  );

  const repository = createFailureQueueRepository(databaseUrl);

  try {
    const failures = await repository.listFailures({ limit: 20 });
    const scopedFailures = failures.filter(
      (failure) =>
        failure.sourceId === sourceId ||
        failure.rawEntryId === rawEntryId ||
        failure.errorCode === "adapter_error_issue014"
    );

    assert.deepEqual(
      scopedFailures.map((failure) => failure.failureStage),
      ["model_call", "extraction", "source_ingest"]
    );
    assert.equal(scopedFailures[0].rawEntryId, rawEntryId);
    assert.equal(scopedFailures[0].rawEntryTitle, "Failure Queue Entry");
    assert.equal(scopedFailures[0].sourceTitle, "Failure Queue Test");
    assert.equal(scopedFailures[0].purpose, "ai_evaluation");
    assert.equal(scopedFailures[0].errorCode, "adapter_error_issue014");
    assert.equal(scopedFailures[1].failureType, "parse");
    assert.equal(scopedFailures[1].message, "No readable text");
    assert.equal(scopedFailures[2].failureType, "network");
    assert.equal(scopedFailures[2].message, "Feed unavailable");
  } finally {
    await repository.close();
    await cleanupFailureQueueFixture(pool, testUrl);
    await pool.end();
  }
});

test("reader repository lists boards and policy-filtered item cards", async () => {
  await runMigrations({ databaseUrl });
  await runSeed({ databaseUrl });

  const repository = createReaderRepository(databaseUrl);

  try {
    const boards = await repository.listReaderBoards();
    const items = await repository.listReaderItems();
    const aiItems = await repository.listReaderItems({ boardSlug: "ai" });

    assert.equal(boards.length, 5);
    assert.deepEqual(
      boards.map((board) => board.slug),
      ["ai", "software-engineering", "semiconductor", "employment-trends", "open-source"]
    );
    const sampleAiItem = aiItems.find((item) => item.title === "Sample AI item");

    assert.ok(items.length >= 5);
    assert.ok(aiItems.length >= 1);
    assert.ok(aiItems.every((item) => item.boardSlug === "ai"));
    assert.equal(sampleAiItem?.summary, "Development seed item for the AI board.");
    assert.equal(sampleAiItem ? "extractedText" in sampleAiItem : true, false);
    assert.equal(sampleAiItem ? "translatedText" in sampleAiItem : true, false);
  } finally {
    await repository.close();
  }
});

test("reader repository exposes development seed provenance across reader projections", async () => {
  await runMigrations({ databaseUrl });
  await runSeed({ databaseUrl });

  const pool = new Pool({ connectionString: databaseUrl, allowExitOnIdle: true });
  const repository = createReaderRepository(databaseUrl);

  try {
    await cleanupReaderDetailFixtures(pool);

    const nonSeedId = await createReaderDetailFixture(pool, {
      externalId: "reader-detail-provenance-non-seed",
      title: "Reader Provenance Graph Target",
      rawSummary: "Reader provenance graph target summary.",
      sourceUrl: "https://example.invalid/reader-detail-provenance-non-seed.xml",
      publishedAt: "2099-07-01T00:02:00Z",
      rightsStatus: "metadata_only",
      sourceEnabled: true
    });
    const seedId = await createReaderDetailFixture(pool, {
      externalId: "reader-detail-provenance-seed",
      title: "Reader Provenance Graph Seed Sample",
      rawSummary: "Reader provenance graph seed summary.",
      sourceUrl: "https://example.invalid/reader-detail-provenance-seed.xml",
      rawPayloadJson: '{"readerDetailFixture": true, "seed": true}',
      publishedAt: "2099-07-01T00:01:00Z",
      rightsStatus: "metadata_only",
      sourceEnabled: true
    });

    const listItems = await repository.listReaderItems({ boardSlug: "ai" });
    const searchItems = await repository.searchReaderItems({
      query: "Reader Provenance Graph",
      boardSlug: "ai"
    });
    const digestItems = await repository.listReaderDigestItems({ boardSlug: "ai", limit: 20 });
    const seedDetail = await repository.getReaderItemDetail(seedId);
    const nonSeedDetail = await repository.getReaderItemDetail(nonSeedId);
    const relatedItems = await repository.listRelatedReaderItems({ id: nonSeedId, limit: 10 });

    assert.equal(listItems.find((item) => item.id === seedId)?.isDevelopmentSeed, true);
    assert.equal(listItems.find((item) => item.id === nonSeedId)?.isDevelopmentSeed, false);
    assert.equal(searchItems.find((item) => item.id === seedId)?.isDevelopmentSeed, true);
    assert.equal(searchItems.find((item) => item.id === nonSeedId)?.isDevelopmentSeed, false);
    assert.equal(digestItems.find((item) => item.id === seedId)?.isDevelopmentSeed, true);
    assert.equal(digestItems.find((item) => item.id === nonSeedId)?.isDevelopmentSeed, false);
    assert.equal(seedDetail?.isDevelopmentSeed, true);
    assert.equal(nonSeedDetail?.isDevelopmentSeed, false);
    assert.equal(relatedItems?.find((item) => item.id === seedId)?.isDevelopmentSeed, true);
  } finally {
    await repository.close();
    await cleanupReaderDetailFixtures(pool);
    await pool.end();
  }
});

test("reader repository pages board item cards with stable pagination metadata", async () => {
  await runMigrations({ databaseUrl });
  await runSeed({ databaseUrl });

  const pool = new Pool({ connectionString: databaseUrl, allowExitOnIdle: true });
  const repository = createReaderRepository(databaseUrl);

  try {
    await cleanupReaderDetailFixtures(pool);
    await pool.query("delete from boards where slug = 'reader-pagination'");
    await pool.query(
      "insert into boards (slug, name, description) values ('reader-pagination', 'Reader Pagination', 'Temporary reader pagination test board')"
    );

    const newestId = await createReaderDetailFixture(pool, {
      externalId: "reader-detail-pagination-newest",
      title: "Reader Pagination Newest",
      boardSlug: "reader-pagination",
      sourceUrl: "https://example.invalid/reader-detail-pagination-newest.xml",
      publishedAt: "2099-06-01T00:03:00Z",
      rightsStatus: "metadata_only",
      sourceEnabled: true
    });
    const middleId = await createReaderDetailFixture(pool, {
      externalId: "reader-detail-pagination-middle",
      title: "Reader Pagination Middle",
      boardSlug: "reader-pagination",
      sourceUrl: "https://example.invalid/reader-detail-pagination-middle.xml",
      publishedAt: "2099-06-01T00:02:00Z",
      rightsStatus: "metadata_only",
      sourceEnabled: true
    });
    const oldestId = await createReaderDetailFixture(pool, {
      externalId: "reader-detail-pagination-oldest",
      title: "Reader Pagination Oldest",
      boardSlug: "reader-pagination",
      sourceUrl: "https://example.invalid/reader-detail-pagination-oldest.xml",
      publishedAt: "2099-06-01T00:01:00Z",
      rightsStatus: "metadata_only",
      sourceEnabled: true
    });

    const firstPage = await repository.listReaderItemsPage({
      boardSlug: "reader-pagination",
      limit: 2
    });
    const secondPage = await repository.listReaderItemsPage({
      boardSlug: "reader-pagination",
      limit: 2,
      offset: 2
    });

    assert.deepEqual(
      firstPage.items.map((item) => item.id),
      [newestId, middleId]
    );
    assert.deepEqual(firstPage.pagination, {
      limit: 2,
      offset: 0,
      hasMore: true,
      nextOffset: 2
    });
    assert.deepEqual(
      secondPage.items.map((item) => item.id),
      [oldestId]
    );
    assert.deepEqual(secondPage.pagination, {
      limit: 2,
      offset: 2,
      hasMore: false,
      nextOffset: null
    });
  } finally {
    await repository.close();
    await cleanupReaderDetailFixtures(pool);
    await pool.query("delete from boards where slug = 'reader-pagination'");
    await pool.end();
  }
});

async function cleanupFailureQueueFixture(pool: Pool, sourceUrl: string): Promise<void> {
  await pool.query("delete from model_calls where error_code = 'adapter_error_issue014'");
  await pool.query(
    "delete from raw_entries where source_id in (select id from sources where url = $1)",
    [sourceUrl]
  );
  await pool.query("delete from sources where url = $1", [sourceUrl]);
}

test("reader repository returns rights-filtered item detail", async () => {
  await runMigrations({ databaseUrl });
  await runSeed({ databaseUrl });

  const pool = new Pool({ connectionString: databaseUrl, allowExitOnIdle: true });
  const repository = createReaderRepository(databaseUrl);

  try {
    await cleanupReaderDetailFixtures(pool);

    const fullText =
      "This original text is allowed for public full-text reader display.";
    const excerptText = `${"Public excerpt text. ".repeat(80)}Tail text that should be hidden.`;
    const hiddenTranslation = "Hidden translation draft full text.";
    const fullTextId = await createReaderDetailFixture(pool, {
      externalId: "reader-detail-full",
      title: "Reader detail full item",
      sourceUrl: "https://example.invalid/reader-detail-full.xml",
      rightsStatus: "public_fulltext_allowed",
      sourceEnabled: true,
      extractedText: fullText,
      translatedTitle: "中文详情标题",
      translatedText: hiddenTranslation
    });
    const excerptId = await createReaderDetailFixture(pool, {
      externalId: "reader-detail-excerpt",
      title: "Reader detail excerpt item",
      sourceUrl: "https://example.invalid/reader-detail-excerpt.xml",
      rightsStatus: "public_excerpt_allowed",
      sourceEnabled: true,
      extractedText: excerptText
    });
    const blockedId = await createReaderDetailFixture(pool, {
      externalId: "reader-detail-blocked",
      title: "Reader detail blocked item",
      sourceUrl: "https://example.invalid/reader-detail-blocked.xml",
      rightsStatus: "blocked",
      sourceEnabled: true
    });
    const disabledId = await createReaderDetailFixture(pool, {
      externalId: "reader-detail-disabled",
      title: "Reader detail disabled source item",
      sourceUrl: "https://example.invalid/reader-detail-disabled.xml",
      rightsStatus: "metadata_only",
      sourceEnabled: false
    });

    const fullDetail = await repository.getReaderItemDetail(fullTextId);
    const excerptDetail = await repository.getReaderItemDetail(excerptId);

    assert.ok(fullDetail);
    assert.equal(fullDetail.originalTextMode, "full");
    assert.equal(fullDetail.originalText, fullText);
    assert.equal(fullDetail.chineseTitle, "中文详情标题");
    assert.equal(fullDetail.chineseText, "Detailed reader detail summary.");
    assert.equal(fullDetail.chineseTextMode, "summary_only");
    assert.notEqual(fullDetail.chineseText, hiddenTranslation);
    assert.equal("translatedText" in fullDetail, false);
    assert.deepEqual(fullDetail.relatedTopics, ["AI", "Policy"]);

    assert.ok(excerptDetail);
    assert.equal(excerptDetail.originalTextMode, "excerpt");
    assert.ok(excerptDetail.originalText.length <= 803);
    assert.notEqual(excerptDetail.originalText, excerptText);

    assert.equal(await repository.getReaderItemDetail(blockedId), null);
    assert.equal(await repository.getReaderItemDetail(disabledId), null);
  } finally {
    await repository.close();
    await cleanupReaderDetailFixtures(pool);
    await pool.end();
  }
});

test("raw entry repository hides and restores reader-visible entries", async () => {
  await runMigrations({ databaseUrl });
  await runSeed({ databaseUrl });

  const pool = new Pool({ connectionString: databaseUrl, allowExitOnIdle: true });
  const rawEntryRepository = createRawEntryRepository(databaseUrl);
  const readerRepository = createReaderRepository(databaseUrl);

  try {
    await cleanupReaderDetailFixtures(pool);

    const rawEntryId = await createReaderDetailFixture(pool, {
      externalId: "reader-detail-manual-hide",
      title: "Reader detail manual hide item",
      sourceUrl: "https://example.invalid/reader-detail-manual-hide.xml",
      rightsStatus: "metadata_only",
      sourceEnabled: true,
      lifecycleStatus: "ready"
    });

    assert.ok(await readerRepository.getReaderItemDetail(rawEntryId));

    const hidden = await rawEntryRepository.updateRawEntryLifecycle(rawEntryId, {
      action: "hide"
    });
    assert.equal(hidden?.lifecycleStatus, "hidden");
    assert.equal(await readerRepository.getReaderItemDetail(rawEntryId), null);

    const hiddenList = await readerRepository.listReaderItems({ boardSlug: "ai" });
    assert.equal(hiddenList.some((item) => item.id === rawEntryId), false);

    const restored = await rawEntryRepository.updateRawEntryLifecycle(rawEntryId, {
      action: "restore"
    });
    assert.equal(restored?.lifecycleStatus, "candidate");
    assert.ok(await readerRepository.getReaderItemDetail(rawEntryId));

    assert.equal(
      await rawEntryRepository.updateRawEntryLifecycle(999_999_999, { action: "hide" }),
      null
    );
  } finally {
    await rawEntryRepository.close();
    await readerRepository.close();
    await cleanupReaderDetailFixtures(pool);
    await pool.end();
  }
});

test("reader repository searches reader-safe visible item fields", async () => {
  await runMigrations({ databaseUrl });
  await runSeed({ databaseUrl });

  const pool = new Pool({ connectionString: databaseUrl, allowExitOnIdle: true });
  const repository = createReaderRepository(databaseUrl);

  try {
    await cleanupReaderDetailFixtures(pool);

    const titleId = await createReaderDetailFixture(pool, {
      externalId: "reader-detail-search-title",
      title: "Quantum Search Needle",
      sourceUrl: "https://example.invalid/reader-detail-search-title.xml",
      rightsStatus: "metadata_only",
      sourceEnabled: true
    });
    const sourceId = await createReaderDetailFixture(pool, {
      externalId: "reader-detail-search-source",
      title: "Ordinary source search item",
      sourceTitle: "Distinct Search Source",
      sourceUrl: "https://example.invalid/reader-detail-search-source.xml",
      rightsStatus: "metadata_only",
      sourceEnabled: true
    });
    const summaryId = await createReaderDetailFixture(pool, {
      externalId: "reader-detail-search-summary",
      title: "Ordinary summary search item",
      summaryOneSentence: "Summary marker alpha result",
      sourceUrl: "https://example.invalid/reader-detail-search-summary.xml",
      rightsStatus: "metadata_only",
      sourceEnabled: true
    });
    const aiBoardId = await createReaderDetailFixture(pool, {
      externalId: "reader-detail-search-board-ai",
      title: "Board Filter Needle",
      sourceUrl: "https://example.invalid/reader-detail-search-board-ai.xml",
      rightsStatus: "metadata_only",
      sourceEnabled: true
    });
    const softwareBoardId = await createReaderDetailFixture(pool, {
      externalId: "reader-detail-search-board-software",
      title: "Board Filter Needle",
      boardSlug: "software-engineering",
      sourceUrl: "https://example.invalid/reader-detail-search-board-software.xml",
      rightsStatus: "metadata_only",
      sourceEnabled: true
    });
    const visibleId = await createReaderDetailFixture(pool, {
      externalId: "reader-detail-search-visible",
      title: "Visible Visibility Needle",
      sourceUrl: "https://example.invalid/reader-detail-search-visible.xml",
      rightsStatus: "metadata_only",
      sourceEnabled: true
    });
    const hiddenId = await createReaderDetailFixture(pool, {
      externalId: "reader-detail-search-hidden",
      title: "Hidden Visibility Needle",
      sourceUrl: "https://example.invalid/reader-detail-search-hidden.xml",
      rightsStatus: "metadata_only",
      sourceEnabled: true,
      lifecycleStatus: "hidden"
    });
    const blockedId = await createReaderDetailFixture(pool, {
      externalId: "reader-detail-search-blocked",
      title: "Blocked Visibility Needle",
      sourceUrl: "https://example.invalid/reader-detail-search-blocked.xml",
      rightsStatus: "blocked",
      sourceEnabled: true
    });
    const disabledId = await createReaderDetailFixture(pool, {
      externalId: "reader-detail-search-disabled",
      title: "Disabled Visibility Needle",
      sourceUrl: "https://example.invalid/reader-detail-search-disabled.xml",
      rightsStatus: "metadata_only",
      sourceEnabled: false
    });

    const titleResults = await repository.searchReaderItems({ query: "Quantum Needle" });
    const sourceResults = await repository.searchReaderItems({ query: "Distinct Source" });
    const summaryResults = await repository.searchReaderItems({ query: "summary marker alpha" });
    const softwareResults = await repository.searchReaderItems({
      query: "Board Filter Needle",
      boardSlug: "software-engineering"
    });
    const visibilityResults = await repository.searchReaderItems({ query: "Visibility Needle" });
    const noResults = await repository.searchReaderItems({ query: "no such search result" });

    assert.ok(titleResults.some((item) => item.id === titleId));
    assert.ok(sourceResults.some((item) => item.id === sourceId));
    assert.ok(summaryResults.some((item) => item.id === summaryId));
    assert.equal(softwareResults.some((item) => item.id === softwareBoardId), true);
    assert.equal(softwareResults.some((item) => item.id === aiBoardId), false);
    assert.equal(visibilityResults.some((item) => item.id === visibleId), true);
    assert.equal(visibilityResults.some((item) => item.id === hiddenId), false);
    assert.equal(visibilityResults.some((item) => item.id === blockedId), false);
    assert.equal(visibilityResults.some((item) => item.id === disabledId), false);
    assert.deepEqual(noResults, []);
  } finally {
    await repository.close();
    await cleanupReaderDetailFixtures(pool);
    await pool.end();
  }
});

test("reader repository pages search results with board filter", async () => {
  await runMigrations({ databaseUrl });
  await runSeed({ databaseUrl });

  const pool = new Pool({ connectionString: databaseUrl, allowExitOnIdle: true });
  const repository = createReaderRepository(databaseUrl);

  try {
    await cleanupReaderDetailFixtures(pool);
    await pool.query("delete from boards where slug = 'search-pagination'");
    await pool.query(
      "insert into boards (slug, name, description) values ('search-pagination', 'Search Pagination', 'Temporary reader search pagination test board')"
    );

    const newestId = await createReaderDetailFixture(pool, {
      externalId: "reader-detail-search-pagination-newest",
      title: "Pageable Needle Newest",
      boardSlug: "search-pagination",
      sourceUrl: "https://example.invalid/reader-detail-search-pagination-newest.xml",
      publishedAt: "2099-06-02T00:03:00Z",
      rightsStatus: "metadata_only",
      sourceEnabled: true
    });
    const middleId = await createReaderDetailFixture(pool, {
      externalId: "reader-detail-search-pagination-middle",
      title: "Pageable Needle Middle",
      boardSlug: "search-pagination",
      sourceUrl: "https://example.invalid/reader-detail-search-pagination-middle.xml",
      publishedAt: "2099-06-02T00:02:00Z",
      rightsStatus: "metadata_only",
      sourceEnabled: true
    });
    const oldestId = await createReaderDetailFixture(pool, {
      externalId: "reader-detail-search-pagination-oldest",
      title: "Pageable Needle Oldest",
      boardSlug: "search-pagination",
      sourceUrl: "https://example.invalid/reader-detail-search-pagination-oldest.xml",
      publishedAt: "2099-06-02T00:01:00Z",
      rightsStatus: "metadata_only",
      sourceEnabled: true
    });

    const firstPage = await repository.searchReaderItemsPage({
      query: "Pageable Needle",
      boardSlug: "search-pagination",
      limit: 2
    });
    const secondPage = await repository.searchReaderItemsPage({
      query: "Pageable Needle",
      boardSlug: "search-pagination",
      limit: 2,
      offset: 2
    });

    assert.deepEqual(
      firstPage.items.map((item) => item.id),
      [newestId, middleId]
    );
    assert.deepEqual(firstPage.pagination, {
      limit: 2,
      offset: 0,
      hasMore: true,
      nextOffset: 2
    });
    assert.deepEqual(
      secondPage.items.map((item) => item.id),
      [oldestId]
    );
    assert.deepEqual(secondPage.pagination, {
      limit: 2,
      offset: 2,
      hasMore: false,
      nextOffset: null
    });
  } finally {
    await repository.close();
    await cleanupReaderDetailFixtures(pool);
    await pool.query("delete from boards where slug = 'search-pagination'");
    await pool.end();
  }
});

test("reader repository exposes only cleaned display text for raw summary fallback", async () => {
  await runMigrations({ databaseUrl });
  await runSeed({ databaseUrl });

  const pool = new Pool({ connectionString: databaseUrl, allowExitOnIdle: true });
  const repository = createReaderRepository(databaseUrl);

  try {
    await cleanupReaderDetailFixtures(pool);

    const rawSummary = [
      "<p>Cloudflare <strong>Workers</strong> &amp; AI</p>",
      "![hero](https://example.invalid/hero.png)",
      "[Launch notes](https://example.invalid/launch)",
      "### Release Notes",
      "- item one",
      `<script>alert("hidden")</script>`,
      "x".repeat(360)
    ].join("\n");
    const rawSummaryId = await createReaderDetailFixture(pool, {
      externalId: "reader-detail-raw-summary-display",
      title: "Raw Summary Display Needle",
      sourceUrl: "https://example.invalid/reader-detail-raw-summary-display.xml",
      rawSummary,
      createSummaryBlock: false,
      rightsStatus: "metadata_only",
      sourceEnabled: true
    });

    const listItem = (await repository.listReaderItems({ boardSlug: "ai" })).find(
      (item) => item.id === rawSummaryId
    );
    const searchItem = (await repository.searchReaderItems({ query: "Release Notes" })).find(
      (item) => item.id === rawSummaryId
    );
    const digestItem = (await repository.listReaderDigestItems({ limit: 50 })).find(
      (item) => item.id === rawSummaryId
    );
    const detail = await repository.getReaderItemDetail(rawSummaryId);

    assert.ok(listItem);
    assert.ok(searchItem);
    assert.ok(digestItem);
    assert.ok(detail);
    for (const summary of [
      listItem.summary,
      searchItem.summary,
      digestItem.summary,
      detail.summary,
      detail.chineseText
    ]) {
      assert.equal(summary.includes("<"), false);
      assert.equal(summary.includes(">"), false);
      assert.equal(summary.includes("]("), false);
      assert.equal(summary.includes("![hero]"), false);
      assert.equal(summary.includes("alert"), false);
      assert.equal(summary.length <= 320, true);
      assert.match(summary, /^Cloudflare Workers & AI Launch notes Release Notes item one/);
    }
  } finally {
    await repository.close();
    await cleanupReaderDetailFixtures(pool);
    await pool.end();
  }
});

test("reader repository lists related items from the reader-safe visible pool", async () => {
  await runMigrations({ databaseUrl });
  await runSeed({ databaseUrl });

  const pool = new Pool({ connectionString: databaseUrl, allowExitOnIdle: true });
  const repository = createReaderRepository(databaseUrl);

  try {
    await cleanupReaderDetailFixtures(pool);
    await pool.query("delete from boards where slug = 'related-empty'");
    await pool.query(
      "insert into boards (slug, name, description) values ('related-empty', 'Related Empty', 'Temporary related-items test board')"
    );

    const targetId = await createReaderDetailFixture(pool, {
      externalId: "reader-detail-related-target",
      title: "Related Graph Target",
      summaryOneSentence: "Shared related graph marker",
      sourceUrl: "https://example.invalid/reader-detail-related-target.xml",
      rightsStatus: "metadata_only",
      sourceEnabled: true
    });
    const sameBoardId = await createReaderDetailFixture(pool, {
      externalId: "reader-detail-related-same-board",
      title: "Related Graph Same Board",
      summaryOneSentence: "Shared related graph follow-up",
      sourceUrl: "https://example.invalid/reader-detail-related-same-board.xml",
      rightsStatus: "metadata_only",
      sourceEnabled: true
    });
    const otherBoardId = await createReaderDetailFixture(pool, {
      externalId: "reader-detail-related-other-board",
      title: "Related Graph Target Other Board",
      boardSlug: "software-engineering",
      summaryOneSentence: "Shared related graph marker software angle",
      sourceUrl: "https://example.invalid/reader-detail-related-other-board.xml",
      rightsStatus: "metadata_only",
      sourceEnabled: true
    });
    const similarityRepresentativeId = await createReaderDetailFixture(pool, {
      externalId: "reader-detail-related-similarity-representative",
      title: "Distant Signal Representative",
      boardSlug: "semiconductor",
      summaryOneSentence: "Independent text without the graph marker",
      sourceUrl: "https://example.invalid/reader-detail-related-similarity-representative.xml",
      rightsStatus: "metadata_only",
      sourceEnabled: true
    });
    const similarityShadowId = await createReaderDetailFixture(pool, {
      externalId: "reader-detail-related-similarity-shadow",
      title: "Distant Signal Shadow",
      boardSlug: "semiconductor",
      summaryOneSentence: "Independent text without the graph marker",
      sourceUrl: "https://example.invalid/reader-detail-related-similarity-shadow.xml",
      rightsStatus: "metadata_only",
      sourceEnabled: true
    });
    const trigramCandidateId = await createReaderDetailFixture(pool, {
      externalId: "reader-detail-related-trigram-candidate",
      title: "Related Grahp Target",
      boardSlug: "semiconductor",
      summaryOneSentence: "Independent text without the graph marker",
      sourceUrl: "https://example.invalid/reader-detail-related-trigram-candidate.xml",
      rightsStatus: "metadata_only",
      sourceEnabled: true
    });
    const similarityGroup = await pool.query<{ id: number }>(
      `
        insert into raw_entry_duplicate_groups (group_kind, group_key, representative_raw_entry_id)
        values ('title_url_trgm', 'reader-detail-related-similarity-group', $1)
        returning id::int
      `,
      [similarityRepresentativeId]
    );
    await pool.query("update raw_entries set duplicate_group_id = $1 where id = any($2::bigint[])", [
      similarityGroup.rows[0].id,
      [similarityRepresentativeId, similarityShadowId]
    ]);
    await pool.query(
      `
        insert into raw_entry_similarity_signals (
          raw_entry_id,
          similar_raw_entry_id,
          signal_type,
          score
        )
        values
          ($1, $2, 'title_trgm', 0.9700),
          ($1, $3, 'title_trgm', 0.9600)
      `,
      [targetId, similarityRepresentativeId, similarityShadowId]
    );
    const hiddenId = await createReaderDetailFixture(pool, {
      externalId: "reader-detail-related-hidden",
      title: "Related Graph Hidden",
      summaryOneSentence: "Shared related graph hidden",
      sourceUrl: "https://example.invalid/reader-detail-related-hidden.xml",
      rightsStatus: "metadata_only",
      sourceEnabled: true,
      lifecycleStatus: "hidden"
    });
    const blockedId = await createReaderDetailFixture(pool, {
      externalId: "reader-detail-related-blocked",
      title: "Related Graph Blocked",
      summaryOneSentence: "Shared related graph blocked",
      sourceUrl: "https://example.invalid/reader-detail-related-blocked.xml",
      rightsStatus: "blocked",
      sourceEnabled: true
    });
    const disabledId = await createReaderDetailFixture(pool, {
      externalId: "reader-detail-related-disabled",
      title: "Related Graph Disabled",
      summaryOneSentence: "Shared related graph disabled",
      sourceUrl: "https://example.invalid/reader-detail-related-disabled.xml",
      rightsStatus: "metadata_only",
      sourceEnabled: false
    });
    const isolatedId = await createReaderDetailFixture(pool, {
      externalId: "reader-detail-related-isolated",
      title: "Isolated Unmatched Zyxwvu",
      boardSlug: "related-empty",
      summaryOneSentence: "No shared related signal qxjz",
      sourceUrl: "https://example.invalid/reader-detail-related-isolated.xml",
      rightsStatus: "metadata_only",
      sourceEnabled: true
    });

    const related = await repository.listRelatedReaderItems({ id: targetId, limit: 10 });
    const limited = await repository.listRelatedReaderItems({ id: targetId, limit: 1 });
    const isolated = await repository.listRelatedReaderItems({ id: isolatedId, limit: 10 });

    assert.ok(related);
    assert.equal(related[0].id, similarityRepresentativeId);
    assert.equal(limited?.length, 1);
    assert.equal(limited?.[0].id, similarityRepresentativeId);
    assert.equal(related.some((item) => item.id === targetId), false);
    assert.equal(related.some((item) => item.id === sameBoardId), true);
    assert.equal(related.some((item) => item.id === otherBoardId), true);
    assert.equal(related.some((item) => item.id === similarityRepresentativeId), true);
    assert.equal(related.some((item) => item.id === similarityShadowId), false);
    assert.equal(related.some((item) => item.id === trigramCandidateId), true);
    assert.ok(
      related.findIndex((item) => item.id === similarityRepresentativeId) <
        related.findIndex((item) => item.id === trigramCandidateId)
    );
    assert.ok(
      related.findIndex((item) => item.id === trigramCandidateId) <
        related.findIndex((item) => item.id === sameBoardId)
    );
    assert.equal(related.some((item) => item.id === hiddenId), false);
    assert.equal(related.some((item) => item.id === blockedId), false);
    assert.equal(related.some((item) => item.id === disabledId), false);
    assert.deepEqual(isolated, []);
    assert.equal(await repository.listRelatedReaderItems({ id: 999_999_999 }), null);
  } finally {
    await repository.close();
    await cleanupReaderDetailFixtures(pool);
    await pool.query("delete from raw_entry_duplicate_groups where group_key = 'reader-detail-related-similarity-group'");
    await pool.query("delete from boards where slug = 'related-empty'");
    await pool.end();
  }
});

test("reader repository lists digest items from the reader-safe visible pool", async () => {
  await runMigrations({ databaseUrl });
  await runSeed({ databaseUrl });

  const pool = new Pool({ connectionString: databaseUrl, allowExitOnIdle: true });
  const repository = createReaderRepository(databaseUrl);

  try {
    await cleanupReaderDetailFixtures(pool);
    await pool.query("delete from boards where slug = 'digest-empty'");
    await pool.query(
      "insert into boards (slug, name, description) values ('digest-empty', 'Digest Empty', 'Temporary digest test board')"
    );
    const digestFixturePublishedAt = "2099-05-20T00:00:00Z";

    const aiId = await createReaderDetailFixture(pool, {
      externalId: "reader-detail-digest-ai",
      title: "Digest AI Item",
      summaryOneSentence: "Digest AI summary",
      sourceUrl: "https://example.invalid/reader-detail-digest-ai.xml",
      publishedAt: digestFixturePublishedAt,
      rightsStatus: "metadata_only",
      sourceEnabled: true
    });
    const softwareId = await createReaderDetailFixture(pool, {
      externalId: "reader-detail-digest-software",
      title: "Digest Software Item",
      boardSlug: "software-engineering",
      summaryOneSentence: "Digest software summary",
      sourceUrl: "https://example.invalid/reader-detail-digest-software.xml",
      publishedAt: digestFixturePublishedAt,
      rightsStatus: "metadata_only",
      sourceEnabled: true
    });
    const hiddenId = await createReaderDetailFixture(pool, {
      externalId: "reader-detail-digest-hidden",
      title: "Digest Hidden Item",
      summaryOneSentence: "Digest hidden summary",
      sourceUrl: "https://example.invalid/reader-detail-digest-hidden.xml",
      publishedAt: digestFixturePublishedAt,
      rightsStatus: "metadata_only",
      sourceEnabled: true,
      lifecycleStatus: "hidden"
    });
    const blockedId = await createReaderDetailFixture(pool, {
      externalId: "reader-detail-digest-blocked",
      title: "Digest Blocked Item",
      summaryOneSentence: "Digest blocked summary",
      sourceUrl: "https://example.invalid/reader-detail-digest-blocked.xml",
      publishedAt: digestFixturePublishedAt,
      rightsStatus: "blocked",
      sourceEnabled: true
    });
    const disabledId = await createReaderDetailFixture(pool, {
      externalId: "reader-detail-digest-disabled",
      title: "Digest Disabled Item",
      summaryOneSentence: "Digest disabled summary",
      sourceUrl: "https://example.invalid/reader-detail-digest-disabled.xml",
      publishedAt: digestFixturePublishedAt,
      rightsStatus: "metadata_only",
      sourceEnabled: false
    });

    const allDigestItems = await repository.listReaderDigestItems({ limit: 20 });
    const aiDigestItems = await repository.listReaderDigestItems({
      boardSlug: "ai",
      limit: 20
    });
    const limitedDigestItems = await repository.listReaderDigestItems({ limit: 1 });
    const emptyDigestItems = await repository.listReaderDigestItems({
      boardSlug: "digest-empty",
      limit: 20
    });

    assert.equal(allDigestItems.some((item) => item.id === aiId), true);
    assert.equal(allDigestItems.some((item) => item.id === softwareId), true);
    assert.equal(allDigestItems.some((item) => item.id === hiddenId), false);
    assert.equal(allDigestItems.some((item) => item.id === blockedId), false);
    assert.equal(allDigestItems.some((item) => item.id === disabledId), false);
    assert.equal(aiDigestItems.some((item) => item.id === aiId), true);
    assert.equal(aiDigestItems.some((item) => item.id === softwareId), false);
    assert.equal(limitedDigestItems.length, 1);
    assert.deepEqual(emptyDigestItems, []);
  } finally {
    await repository.close();
    await cleanupReaderDetailFixtures(pool);
    await pool.query("delete from boards where slug = 'digest-empty'");
    await pool.end();
  }
});

test("reader repository diversifies board digest across sources", async () => {
  await runMigrations({ databaseUrl });
  await runSeed({ databaseUrl });

  const pool = new Pool({ connectionString: databaseUrl, allowExitOnIdle: true });
  const repository = createReaderRepository(databaseUrl);

  try {
    await cleanupDigestDiversityFixtures(pool);

    const dominantSourceId = await createDigestDiversitySource(pool, {
      boardSlug: "ai",
      sourceTitle: "Digest Dominant AI Source",
      sourceUrl: "https://example.invalid/digest-diversity-dominant-ai.xml"
    });
    const alternateSourceId = await createDigestDiversitySource(pool, {
      boardSlug: "ai",
      sourceTitle: "Digest Alternate AI Source",
      sourceUrl: "https://example.invalid/digest-diversity-alternate-ai.xml"
    });
    const dominantIds = [
      await createDigestDiversityEntry(pool, {
        sourceId: dominantSourceId,
        externalId: "digest-diversity-dominant-ai-1",
        title: "Dominant AI Digest Item 1",
        publishedAt: "2099-05-23T00:03:00Z"
      }),
      await createDigestDiversityEntry(pool, {
        sourceId: dominantSourceId,
        externalId: "digest-diversity-dominant-ai-2",
        title: "Dominant AI Digest Item 2",
        publishedAt: "2099-05-23T00:02:00Z"
      }),
      await createDigestDiversityEntry(pool, {
        sourceId: dominantSourceId,
        externalId: "digest-diversity-dominant-ai-3",
        title: "Dominant AI Digest Item 3",
        publishedAt: "2099-05-23T00:01:00Z"
      })
    ];
    const alternateId = await createDigestDiversityEntry(pool, {
      sourceId: alternateSourceId,
      externalId: "digest-diversity-alternate-ai-1",
      title: "Alternate AI Digest Item",
      publishedAt: "2099-05-23T00:00:00Z"
    });

    const digestItems = await repository.listReaderDigestItems({
      boardSlug: "ai",
      limit: 3
    });
    const digestIds = digestItems.map((item) => item.id);
    const dominantCount = digestIds.filter((id) => dominantIds.includes(id)).length;

    assert.equal(digestItems.length, 3);
    assert.equal(digestIds.includes(alternateId), true);
    assert.ok(dominantCount <= 2);
  } finally {
    await repository.close();
    await cleanupDigestDiversityFixtures(pool);
    await pool.end();
  }
});

test("reader repository diversifies global digest across boards", async () => {
  await runMigrations({ databaseUrl });
  await runSeed({ databaseUrl });

  const pool = new Pool({ connectionString: databaseUrl, allowExitOnIdle: true });
  const repository = createReaderRepository(databaseUrl);

  try {
    await cleanupDigestDiversityFixtures(pool);

    const dominantSourceId = await createDigestDiversitySource(pool, {
      boardSlug: "ai",
      sourceTitle: "Digest Dominant Global Source",
      sourceUrl: "https://example.invalid/digest-diversity-dominant-global.xml"
    });
    const alternateBoardSourceId = await createDigestDiversitySource(pool, {
      boardSlug: "software-engineering",
      sourceTitle: "Digest Alternate Board Source",
      sourceUrl: "https://example.invalid/digest-diversity-alternate-board.xml"
    });
    const dominantIds = [
      await createDigestDiversityEntry(pool, {
        sourceId: dominantSourceId,
        externalId: "digest-diversity-dominant-global-1",
        title: "Dominant Global Digest Item 1",
        publishedAt: "2099-05-24T00:03:00Z"
      }),
      await createDigestDiversityEntry(pool, {
        sourceId: dominantSourceId,
        externalId: "digest-diversity-dominant-global-2",
        title: "Dominant Global Digest Item 2",
        publishedAt: "2099-05-24T00:02:00Z"
      }),
      await createDigestDiversityEntry(pool, {
        sourceId: dominantSourceId,
        externalId: "digest-diversity-dominant-global-3",
        title: "Dominant Global Digest Item 3",
        publishedAt: "2099-05-24T00:01:00Z"
      })
    ];
    const alternateBoardId = await createDigestDiversityEntry(pool, {
      sourceId: alternateBoardSourceId,
      externalId: "digest-diversity-alternate-board-1",
      title: "Alternate Board Digest Item",
      publishedAt: "2099-05-24T00:00:00Z"
    });

    const digestItems = await repository.listReaderDigestItems({ limit: 3 });
    const digestIds = digestItems.map((item) => item.id);
    const dominantCount = digestIds.filter((id) => dominantIds.includes(id)).length;

    assert.equal(digestItems.length, 3);
    assert.equal(digestIds.includes(alternateBoardId), true);
    assert.ok(dominantCount <= 2);
  } finally {
    await repository.close();
    await cleanupDigestDiversityFixtures(pool);
    await pool.end();
  }
});

test("reader repository fills digest limit when only one source has candidates", async () => {
  await runMigrations({ databaseUrl });
  await runSeed({ databaseUrl });

  const pool = new Pool({ connectionString: databaseUrl, allowExitOnIdle: true });
  const repository = createReaderRepository(databaseUrl);

  try {
    await cleanupDigestDiversityFixtures(pool);
    await pool.query("delete from boards where slug = 'digest-single-source'");
    await pool.query(
      "insert into boards (slug, name, description) values ('digest-single-source', 'Digest Single Source', 'Temporary digest diversity test board')"
    );

    const sourceId = await createDigestDiversitySource(pool, {
      boardSlug: "digest-single-source",
      sourceTitle: "Digest Single Source",
      sourceUrl: "https://example.invalid/digest-diversity-single-source.xml"
    });
    const entryIds = [
      await createDigestDiversityEntry(pool, {
        sourceId,
        externalId: "digest-diversity-single-source-1",
        title: "Single Source Digest Item 1",
        publishedAt: "2099-05-25T00:03:00Z"
      }),
      await createDigestDiversityEntry(pool, {
        sourceId,
        externalId: "digest-diversity-single-source-2",
        title: "Single Source Digest Item 2",
        publishedAt: "2099-05-25T00:02:00Z"
      }),
      await createDigestDiversityEntry(pool, {
        sourceId,
        externalId: "digest-diversity-single-source-3",
        title: "Single Source Digest Item 3",
        publishedAt: "2099-05-25T00:01:00Z"
      })
    ];

    const digestItems = await repository.listReaderDigestItems({
      boardSlug: "digest-single-source",
      limit: 3
    });
    const digestIds = digestItems.map((item) => item.id);

    assert.equal(digestItems.length, 3);
    assert.deepEqual(digestIds, entryIds);
  } finally {
    await repository.close();
    await cleanupDigestDiversityFixtures(pool);
    await pool.query("delete from boards where slug = 'digest-single-source'");
    await pool.end();
  }
});

test("digest edition repository replays stored snapshots after source items change", async () => {
  await runMigrations({ databaseUrl });
  await runSeed({ databaseUrl });

  const pool = new Pool({ connectionString: databaseUrl, allowExitOnIdle: true });
  const readerRepository = createReaderRepository(databaseUrl);
  const digestEditionRepository = createDigestEditionRepository(databaseUrl);
  const editionDate = "2026-05-22";
  const editionKey = `board:ai:${editionDate}`;

  try {
    await pool.query("delete from digest_editions where edition_key = $1", [editionKey]);
    await cleanupReaderDetailFixtures(pool);

    const stableItemId = await createReaderDetailFixture(pool, {
      externalId: "reader-detail-digest-edition-stable",
      title: "Digest Edition Stable Original",
      summaryOneSentence: "Digest edition stable summary",
      sourceUrl: "https://example.invalid/reader-detail-digest-edition-stable.xml",
      rawPayloadJson: '{"readerDetailFixture": true, "seed": true}',
      publishedAt: "2099-05-20T00:00:00Z",
      rightsStatus: "metadata_only",
      sourceEnabled: true
    });
    const digestItems = await readerRepository.listReaderDigestItems({
      boardSlug: "ai",
      limit: 20
    });
    const stableItem = digestItems.find((item) => item.id === stableItemId);

    assert.ok(stableItem);

    const created = await digestEditionRepository.createDigestEdition({
      editionDate,
      boardSlug: "ai",
      windowStartAt: "2026-05-21T00:00:00.000Z",
      windowEndAt: "2026-05-22T00:00:00.000Z",
      generatedByUserId: 1,
      items: [stableItem]
    });

    await pool.query(
      "update raw_entries set title = 'Digest Edition Changed Title', summary_raw = 'Changed summary' where id = $1",
      [stableItemId]
    );

    const replayed = await digestEditionRepository.getDigestEditionByKey(editionKey);
    const listed = await digestEditionRepository.listDigestEditions();

    assert.equal(created.editionKey, editionKey);
    assert.equal(created.editionDate, editionDate);
    assert.equal(created.items[0].snapshot.isDevelopmentSeed, true);
    assert.ok(replayed);
    assert.equal(replayed.editionDate, editionDate);
    assert.equal(replayed.items[0].snapshot.title, "Digest Edition Stable Original");
    assert.equal(replayed.items[0].snapshot.summary, "Digest edition stable summary");
    assert.equal(replayed.items[0].snapshot.isDevelopmentSeed, true);
    assert.equal("url" in replayed.items[0].snapshot, false);
    assert.equal(
      listed.some((edition) => edition.editionKey === editionKey && edition.itemCount === 1),
      true
    );
  } finally {
    await pool.query("delete from digest_editions where edition_key = $1", [editionKey]);
    await digestEditionRepository.close();
    await readerRepository.close();
    await cleanupReaderDetailFixtures(pool);
    await pool.end();
  }
});

test("digest edition repository normalizes legacy snapshots without development seed provenance", async () => {
  await runMigrations({ databaseUrl });
  await runSeed({ databaseUrl });

  const pool = new Pool({ connectionString: databaseUrl, allowExitOnIdle: true });
  const digestEditionRepository = createDigestEditionRepository(databaseUrl);
  const editionDate = "2026-05-23";
  const editionKey = `global:${editionDate}`;

  try {
    await pool.query("delete from digest_editions where edition_key = $1", [editionKey]);
    const edition = await pool.query<{ id: number }>(
      `
      insert into digest_editions (
        edition_key,
        edition_date,
        window_start_at,
        window_end_at
      )
      values ($1, $2, '2026-05-22T00:00:00.000Z', '2026-05-23T00:00:00.000Z')
      returning id::int
      `,
      [editionKey, editionDate]
    );
    await pool.query(
      `
      insert into digest_edition_items (
        digest_edition_id,
        raw_entry_id,
        item_position,
        item_snapshot_json
      )
      values (
        $1,
        (select id from raw_entries where external_id = 'sample-ai-001'),
        1,
        '{"id": 1, "boardSlug": "ai", "boardName": "AI", "sourceTitle": "OpenAI News", "title": "Legacy snapshot", "summary": "Legacy summary", "publishedAt": null, "createdAt": "2026-05-20T00:00:00.000Z"}'::jsonb
      )
      `,
      [edition.rows[0].id]
    );

    const replayed = await digestEditionRepository.getDigestEditionByKey(editionKey);

    assert.equal(replayed?.items[0].snapshot.isDevelopmentSeed, false);
  } finally {
    await pool.query("delete from digest_editions where edition_key = $1", [editionKey]);
    await digestEditionRepository.close();
    await pool.end();
  }
});

test("reader repository applies bounded feedback quality penalty to digest ordering", async () => {
  await runMigrations({ databaseUrl });
  await runSeed({ databaseUrl });

  const pool = new Pool({ connectionString: databaseUrl, allowExitOnIdle: true });
  const repository = createReaderRepository(databaseUrl);

  try {
    await cleanupReaderDetailFixtures(pool);
    const digestFixturePublishedAt = "2099-05-20T00:00:00Z";

    const cleanId = await createReaderDetailFixture(pool, {
      externalId: "reader-detail-digest-feedback-clean",
      title: "Digest Feedback Clean Item",
      summaryOneSentence: "Digest feedback clean summary",
      sourceUrl: "https://example.invalid/reader-detail-digest-feedback-clean.xml",
      publishedAt: digestFixturePublishedAt,
      rightsStatus: "metadata_only",
      sourceEnabled: true
    });
    const allTypePenaltyId = await createReaderDetailFixture(pool, {
      externalId: "reader-detail-digest-feedback-all-types",
      title: "Digest Feedback All Types Item",
      summaryOneSentence: "Digest feedback all types summary",
      sourceUrl: "https://example.invalid/reader-detail-digest-feedback-all-types.xml",
      publishedAt: digestFixturePublishedAt,
      rightsStatus: "metadata_only",
      sourceEnabled: true
    });
    const cappedOlderId = await createReaderDetailFixture(pool, {
      externalId: "reader-detail-digest-feedback-capped-older",
      title: "Digest Feedback Capped Older Item",
      summaryOneSentence: "Digest feedback capped older summary",
      sourceUrl: "https://example.invalid/reader-detail-digest-feedback-capped-older.xml",
      publishedAt: digestFixturePublishedAt,
      rightsStatus: "metadata_only",
      sourceEnabled: true
    });
    const cappedNewerId = await createReaderDetailFixture(pool, {
      externalId: "reader-detail-digest-feedback-capped-newer",
      title: "Digest Feedback Capped Newer Item",
      summaryOneSentence: "Digest feedback capped newer summary",
      sourceUrl: "https://example.invalid/reader-detail-digest-feedback-capped-newer.xml",
      publishedAt: digestFixturePublishedAt,
      rightsStatus: "metadata_only",
      sourceEnabled: true
    });

    await addFeedbackFixture(pool, allTypePenaltyId, [
      "rights_concern",
      "correction",
      "quality_issue",
      "duplicate",
      "broken_link"
    ]);
    await addFeedbackFixture(pool, cappedOlderId, ["rights_concern", "rights_concern"]);
    await addFeedbackFixture(pool, cappedNewerId, [
      "rights_concern",
      "rights_concern",
      "rights_concern"
    ]);

    const digestItems = await repository.listReaderDigestItems({
      boardSlug: "ai",
      limit: 1000
    });
    const digestIds = digestItems.map((item) => item.id);

    assert.ok(digestIds.indexOf(cleanId) < digestIds.indexOf(allTypePenaltyId));
    assert.ok(digestIds.indexOf(cleanId) < digestIds.indexOf(cappedOlderId));
    assert.ok(digestIds.indexOf(cleanId) < digestIds.indexOf(cappedNewerId));
    assert.ok(digestIds.indexOf(cappedNewerId) < digestIds.indexOf(cappedOlderId));
  } finally {
    await repository.close();
    await cleanupReaderDetailFixtures(pool);
    await pool.end();
  }
});

test("feedback repository reviews feedback and digest ignores dismissed feedback penalty", async () => {
  await runMigrations({ databaseUrl });
  await runSeed({ databaseUrl });

  const pool = new Pool({ connectionString: databaseUrl, allowExitOnIdle: true });
  const feedbackRepository = createFeedbackRepository(databaseUrl);
  const readerRepository = createReaderRepository(databaseUrl);

  try {
    await cleanupReaderDetailFixtures(pool);
    const digestFixturePublishedAt = "2099-05-20T00:00:00Z";

    const dismissedItemId = await createReaderDetailFixture(pool, {
      externalId: "reader-detail-feedback-review-dismissed",
      title: "Feedback Review Dismissed Item",
      summaryOneSentence: "Feedback review dismissed summary",
      sourceUrl: "https://example.invalid/reader-detail-feedback-review-dismissed.xml",
      publishedAt: digestFixturePublishedAt,
      rightsStatus: "metadata_only",
      sourceEnabled: true
    });
    const activePenaltyItemId = await createReaderDetailFixture(pool, {
      externalId: "reader-detail-feedback-review-active",
      title: "Feedback Review Active Item",
      summaryOneSentence: "Feedback review active summary",
      sourceUrl: "https://example.invalid/reader-detail-feedback-review-active.xml",
      publishedAt: digestFixturePublishedAt,
      rightsStatus: "metadata_only",
      sourceEnabled: true
    });

    const dismissedFeedback = await feedbackRepository.createFeedback({
      rawEntryId: dismissedItemId,
      feedbackType: "quality_issue",
      message: "Invalid feedback signal."
    });
    const activeFeedback = await feedbackRepository.createFeedback({
      rawEntryId: activePenaltyItemId,
      feedbackType: "quality_issue",
      message: "Still eligible."
    });

    assert.ok(dismissedFeedback);
    assert.equal(dismissedFeedback.reviewStatus, "open");
    assert.equal(dismissedFeedback.reviewNote, null);
    assert.equal(dismissedFeedback.reviewedAt, null);
    assert.ok(activeFeedback);

    for (const reviewStatus of ["reviewed", "resolved", "open"] as const) {
      const updated = await feedbackRepository.updateFeedbackReview(dismissedFeedback.id, {
        reviewStatus
      });

      assert.ok(updated);
      assert.equal(updated.reviewStatus, reviewStatus);
      assert.ok(updated.reviewedAt);
    }

    const dismissed = await feedbackRepository.updateFeedbackReview(dismissedFeedback.id, {
      reviewStatus: "dismissed",
      reviewNote: "Invalid duplicate report."
    });

    assert.ok(dismissed);
    assert.equal(dismissed.reviewStatus, "dismissed");
    assert.equal(dismissed.reviewNote, "Invalid duplicate report.");
    assert.ok(dismissed.reviewedAt);
    assert.equal(
      await feedbackRepository.updateFeedbackReview(999_999_999, {
        reviewStatus: "dismissed"
      }),
      null
    );

    await assert.rejects(
      pool.query("update reader_feedback set review_status = 'invalid' where id = $1", [
        dismissedFeedback.id
      ])
    );
    await assert.rejects(
      pool.query("update reader_feedback set review_note = $1 where id = $2", [
        "x".repeat(2001),
        dismissedFeedback.id
      ])
    );

    const digestItems = await readerRepository.listReaderDigestItems({
      boardSlug: "ai",
      limit: 1000
    });
    const digestIds = digestItems.map((item) => item.id);

    assert.ok(digestIds.indexOf(dismissedItemId) < digestIds.indexOf(activePenaltyItemId));
  } finally {
    await feedbackRepository.close();
    await readerRepository.close();
    await cleanupReaderDetailFixtures(pool);
    await pool.end();
  }
});

test("feedback repository stores feedback only for visible reader items", async () => {
  await runMigrations({ databaseUrl });
  await runSeed({ databaseUrl });

  const pool = new Pool({ connectionString: databaseUrl, allowExitOnIdle: true });
  const repository = createFeedbackRepository(databaseUrl);

  try {
    await cleanupReaderDetailFixtures(pool);

    const visibleId = await createReaderDetailFixture(pool, {
      externalId: "reader-detail-feedback-visible",
      title: "Feedback Visible Item",
      sourceUrl: "https://example.invalid/reader-detail-feedback-visible.xml",
      rightsStatus: "metadata_only",
      sourceEnabled: true
    });
    const hiddenId = await createReaderDetailFixture(pool, {
      externalId: "reader-detail-feedback-hidden",
      title: "Feedback Hidden Item",
      sourceUrl: "https://example.invalid/reader-detail-feedback-hidden.xml",
      rightsStatus: "metadata_only",
      sourceEnabled: true,
      lifecycleStatus: "hidden"
    });
    const blockedId = await createReaderDetailFixture(pool, {
      externalId: "reader-detail-feedback-blocked",
      title: "Feedback Blocked Item",
      sourceUrl: "https://example.invalid/reader-detail-feedback-blocked.xml",
      rightsStatus: "blocked",
      sourceEnabled: true
    });
    const disabledId = await createReaderDetailFixture(pool, {
      externalId: "reader-detail-feedback-disabled",
      title: "Feedback Disabled Item",
      sourceUrl: "https://example.invalid/reader-detail-feedback-disabled.xml",
      rightsStatus: "metadata_only",
      sourceEnabled: false
    });

    const created = await repository.createFeedback({
      rawEntryId: visibleId,
      feedbackType: "quality_issue",
      message: "Summary is too vague."
    });
    const noMessage = await repository.createFeedback({
      rawEntryId: visibleId,
      feedbackType: "broken_link"
    });

    assert.ok(created);
    assert.equal(created.rawEntryId, visibleId);
    assert.equal(created.rawEntryTitle, "Feedback Visible Item");
    assert.equal(created.boardSlug, "ai");
    assert.equal(created.feedbackType, "quality_issue");
    assert.equal(created.message, "Summary is too vague.");
    assert.ok(noMessage);
    assert.equal(noMessage.message, null);

    assert.equal(
      await repository.createFeedback({
        rawEntryId: 999_999_999,
        feedbackType: "correction"
      }),
      null
    );
    assert.equal(
      await repository.createFeedback({
        rawEntryId: hiddenId,
        feedbackType: "correction"
      }),
      null
    );
    assert.equal(
      await repository.createFeedback({
        rawEntryId: blockedId,
        feedbackType: "correction"
      }),
      null
    );
    assert.equal(
      await repository.createFeedback({
        rawEntryId: disabledId,
        feedbackType: "correction"
      }),
      null
    );

    const feedback = await repository.listFeedback({ limit: 10 });
    assert.equal(feedback.some((record) => record.id === created.id), true);
    assert.equal(feedback.some((record) => record.id === noMessage.id), true);
  } finally {
    await repository.close();
    await cleanupReaderDetailFixtures(pool);
    await pool.end();
  }
});

type ReaderDetailFixtureInput = {
  externalId: string;
  title: string;
  sourceTitle?: string;
  boardSlug?: string;
  sourceUrl: string;
  rawSummary?: string;
  summaryOneSentence?: string;
  createSummaryBlock?: boolean;
  publishedAt?: string;
  rightsStatus: string;
  sourceEnabled: boolean;
  lifecycleStatus?: string;
  extractedText?: string;
  translatedTitle?: string;
  translatedText?: string;
  rawPayloadJson?: string;
};

async function createReaderDetailFixture(
  pool: Pool,
  input: ReaderDetailFixtureInput
): Promise<number> {
  const source = await pool.query<{ id: number }>(
    `
    insert into sources (board_id, source_type, title, url, enabled)
    values (
      (select id from boards where slug = $4),
      'rss',
      $1,
      $2,
      $3
    )
    returning id::int
    `,
    [
      input.sourceTitle ?? `Source for ${input.title}`,
      input.sourceUrl,
      input.sourceEnabled,
      input.boardSlug ?? "ai"
    ]
  );
  const rawEntry = await pool.query<{ id: number }>(
    `
    insert into raw_entries (
      source_id,
      external_id,
      url,
      title,
      summary_raw,
      published_at,
      raw_payload_json,
      canonical_hash,
      lifecycle_status,
      processing_stage,
      rights_status
    )
    values ($1, $2, $3, $4, $5, $8, $9::jsonb, $2, $7, 'extracted', $6)
    returning id::int
    `,
    [
      source.rows[0].id,
      input.externalId,
      `https://example.invalid/items/${input.externalId}`,
      input.title,
      input.rawSummary ?? "Raw reader detail summary.",
      input.rightsStatus,
      input.lifecycleStatus ?? "ready",
      input.publishedAt ?? "2026-05-20T00:00:00Z",
      input.rawPayloadJson ?? '{"readerDetailFixture": true}'
    ]
  );
  const rawEntryId = rawEntry.rows[0].id;
  let extractionId: number | null = null;

  if (input.extractedText) {
    const attempt = await pool.query<{ id: number }>(
      "insert into raw_entry_extraction_attempts (raw_entry_id, status, completed_at) values ($1, 'success', now()) returning id::int",
      [rawEntryId]
    );
    const extraction = await pool.query<{ id: number }>(
      `
      insert into raw_entry_extractions (
        raw_entry_id,
        attempt_id,
        extractor_name,
        extractor_version,
        final_url,
        title,
        language,
        extracted_text,
        text_length,
        extraction_confidence
      )
      values ($1, $2, 'fixture', '1', $3, $4, 'en', $5, $6, 0.9000)
      returning id::int
      `,
      [
        rawEntryId,
        attempt.rows[0].id,
        `https://example.invalid/items/${input.externalId}`,
        `${input.title} Original`,
        input.extractedText,
        input.extractedText.length
      ]
    );
    extractionId = extraction.rows[0].id;
  }

  const evaluationModelCall = await pool.query<{ id: number }>(
    "insert into model_calls (provider, model, purpose, schema_version, status) values ('fixture', 'fixture', 'ai_evaluation', 'v1', 'success') returning id::int"
  );
  const evaluation = await pool.query<{ id: number }>(
    `
    insert into ai_evaluations (
      raw_entry_id,
      extraction_id,
      model_call_id,
      schema_version,
      scores_json,
      rationale_json,
      evidence_json,
      summary_json
    )
    values ($1, $2, $3, 'v1', '{}'::jsonb, '{}'::jsonb, '[]'::jsonb, '{}'::jsonb)
    returning id::int
    `,
    [rawEntryId, extractionId, evaluationModelCall.rows[0].id]
  );

  let translationId: number | null = null;
  if (input.translatedTitle || input.translatedText) {
    const translationModelCall = await pool.query<{ id: number }>(
      "insert into model_calls (provider, model, purpose, schema_version, status) values ('fixture', 'fixture', 'translation', 'v1', 'success') returning id::int"
    );
    const translation = await pool.query<{ id: number }>(
      `
      insert into translations (
        raw_entry_id,
        extraction_id,
        model_call_id,
        target_language,
        schema_version,
        status,
        translated_title,
        translated_text,
        segments_json,
        quality_flags_json
      )
      values ($1, $2, $3, 'zh-Hans', 'v1', 'draft', $4, $5, '[]'::jsonb, '[]'::jsonb)
      returning id::int
      `,
      [
        rawEntryId,
        extractionId,
        translationModelCall.rows[0].id,
        input.translatedTitle ?? null,
        input.translatedText ?? "Draft translation body."
      ]
    );
    translationId = translation.rows[0].id;
  }

  if (input.createSummaryBlock !== false) {
    const summaryModelCall = await pool.query<{ id: number }>(
      "insert into model_calls (provider, model, purpose, schema_version, status) values ('fixture', 'fixture', 'summary_blocks', 'v1', 'success') returning id::int"
    );
    await pool.query(
      `
      insert into summary_blocks (
        raw_entry_id,
        extraction_id,
        ai_evaluation_id,
        translation_id,
        model_call_id,
        schema_version,
        status,
        one_sentence,
        detailed_summary,
        why_it_matters,
        source_note,
        china_relevance,
        related_topics_json
      )
      values ($1, $2, $3, $4, $5, 'v1', 'draft', $6, 'Detailed reader detail summary.', 'Reader detail why it matters.', 'Reader detail source note.', 'Reader detail China relevance.', '["AI", "Policy"]'::jsonb)
      `,
      [
        rawEntryId,
        extractionId,
        evaluation.rows[0].id,
        translationId,
        summaryModelCall.rows[0].id,
        input.summaryOneSentence ?? "One sentence reader detail summary."
      ]
    );
  }

  return rawEntryId;
}

async function cleanupReaderDetailFixtures(pool: Pool): Promise<void> {
  await pool.query(
    `
    delete from raw_entries
    where source_id in (
      select id from sources where url like 'https://example.invalid/reader-detail-%'
    )
    `
  );
  await pool.query(
    "delete from sources where url like 'https://example.invalid/reader-detail-%'"
  );
}

async function createDigestDiversitySource(
  pool: Pool,
  input: {
    boardSlug: string;
    sourceTitle: string;
    sourceUrl: string;
  }
): Promise<number> {
  const source = await pool.query<{ id: number }>(
    `
    insert into sources (board_id, source_type, title, url, enabled)
    values ((select id from boards where slug = $1), 'rss', $2, $3, true)
    returning id::int
    `,
    [input.boardSlug, input.sourceTitle, input.sourceUrl]
  );
  return source.rows[0].id;
}

async function createDigestDiversityEntry(
  pool: Pool,
  input: {
    sourceId: number;
    externalId: string;
    title: string;
    publishedAt: string;
  }
): Promise<number> {
  const rawEntry = await pool.query<{ id: number }>(
    `
    insert into raw_entries (
      source_id,
      external_id,
      url,
      title,
      summary_raw,
      published_at,
      raw_payload_json,
      canonical_hash,
      lifecycle_status,
      processing_stage,
      rights_status
    )
    values ($1, $2, $3, $4, $5, $6, '{"digestDiversityFixture": true}'::jsonb, $2, 'ready', 'extracted', 'metadata_only')
    returning id::int
    `,
    [
      input.sourceId,
      input.externalId,
      `https://example.invalid/items/${input.externalId}`,
      input.title,
      `${input.title} summary.`,
      input.publishedAt
    ]
  );
  return rawEntry.rows[0].id;
}

async function cleanupDigestDiversityFixtures(pool: Pool): Promise<void> {
  await pool.query(
    `
    delete from raw_entries
    where source_id in (
      select id from sources where url like 'https://example.invalid/digest-diversity-%'
    )
    `
  );
  await pool.query(
    "delete from sources where url like 'https://example.invalid/digest-diversity-%'"
  );
}

async function cleanupSimilarityDedupFixture(
  pool: Pool,
  sourceUrl: string,
  groupKey: string
): Promise<void> {
  await pool.query("delete from raw_entries where source_id in (select id from sources where url = $1)", [
    sourceUrl
  ]);
  await pool.query("delete from raw_entry_duplicate_groups where group_key = $1", [groupKey]);
  await pool.query("delete from sources where url = $1", [sourceUrl]);
}

async function addFeedbackFixture(
  pool: Pool,
  rawEntryId: number,
  feedbackTypes: string[]
): Promise<void> {
  for (const feedbackType of feedbackTypes) {
    await pool.query(
      "insert into reader_feedback (raw_entry_id, feedback_type, message) values ($1, $2, null)",
      [rawEntryId, feedbackType]
    );
  }
}
