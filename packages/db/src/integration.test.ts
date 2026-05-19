import { test } from "node:test";
import assert from "node:assert/strict";
import { Pool } from "pg";
import { runMigrations, runSeed } from "./runner";
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
