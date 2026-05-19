import { test } from "node:test";
import assert from "node:assert/strict";
import { Pool } from "pg";
import { runMigrations, runSeed } from "./runner";

const databaseUrl =
  process.env.DATABASE_URL ?? "postgres://reno_news:reno_news@localhost:5432/reno_news";

test("migrations and dev seed can be applied repeatedly", async () => {
  await runMigrations({ databaseUrl });
  await runSeed({ databaseUrl });
  await runSeed({ databaseUrl });

  const pool = new Pool({ connectionString: databaseUrl, allowExitOnIdle: true });

  try {
    const boards = await pool.query<{ count: string }>("select count(*) from boards");
    const sources = await pool.query<{ count: string }>("select count(*) from sources");
    const rawEntries = await pool.query<{ count: string }>("select count(*) from raw_entries");

    assert.equal(Number(boards.rows[0].count), 5);
    assert.equal(Number(sources.rows[0].count), 5);
    assert.equal(Number(rawEntries.rows[0].count), 5);

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
  } finally {
    await pool.end();
  }
});
