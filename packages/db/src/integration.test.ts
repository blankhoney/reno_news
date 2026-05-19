import { test } from "node:test";
import assert from "node:assert/strict";
import { Pool } from "pg";
import { runMigrations, runSeed } from "./runner";
import { createFailureQueueRepository } from "./failureQueueRepository";
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

type ReaderDetailFixtureInput = {
  externalId: string;
  title: string;
  sourceTitle?: string;
  boardSlug?: string;
  sourceUrl: string;
  summaryOneSentence?: string;
  rightsStatus: string;
  sourceEnabled: boolean;
  lifecycleStatus?: string;
  extractedText?: string;
  translatedTitle?: string;
  translatedText?: string;
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
    values ($1, $2, $3, $4, $5, '2026-05-20T00:00:00Z', '{"readerDetailFixture": true}'::jsonb, $2, $7, 'extracted', $6)
    returning id::int
    `,
    [
      source.rows[0].id,
      input.externalId,
      `https://example.invalid/items/${input.externalId}`,
      input.title,
      "Raw reader detail summary.",
      input.rightsStatus,
      input.lifecycleStatus ?? "ready"
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
