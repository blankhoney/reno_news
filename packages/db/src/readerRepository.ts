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

export type ReaderOriginalTextMode = "none" | "excerpt" | "full";
export type ReaderChineseTextMode = "summary_only";

export type ReaderItemDetail = ReaderItemCard & {
  detailSummary: string;
  whyItMatters: string;
  sourceNote: string;
  chinaRelevance: string;
  relatedTopics: string[];
  originalTitle: string;
  originalText: string;
  originalTextMode: ReaderOriginalTextMode;
  chineseTitle: string;
  chineseText: string;
  chineseTextMode: ReaderChineseTextMode;
};

export type ListReaderItemsInput = {
  boardSlug?: string;
};

export type ReaderRepository = {
  listReaderBoards(): Promise<ReaderBoard[]>;
  listReaderItems(input?: ListReaderItemsInput): Promise<ReaderItemCard[]>;
  getReaderItemDetail(id: number): Promise<ReaderItemDetail | null>;
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

type ReaderItemDetailRow = ReaderItemRow & {
  detailSummary: string | null;
  whyItMatters: string | null;
  sourceNote: string | null;
  chinaRelevance: string | null;
  relatedTopics: unknown;
  rightsStatus: string;
  extractedTitle: string | null;
  extractedText: string | null;
  translatedTitle: string | null;
};

const originalExcerptLength = 800;

export function createReaderRepository(databaseUrl: string): ReaderRepository {
  const pool = new Pool({ connectionString: databaseUrl, allowExitOnIdle: true });

  return {
    listReaderBoards: async () => listReaderBoards(pool),
    listReaderItems: async (input) => listReaderItems(pool, input),
    getReaderItemDetail: async (id) => getReaderItemDetail(pool, id),
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

async function getReaderItemDetail(
  queryable: Queryable,
  id: number
): Promise<ReaderItemDetail | null> {
  const result = await queryable.query<ReaderItemDetailRow>(
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
      re.created_at as "createdAt",
      sb.detailed_summary as "detailSummary",
      sb.why_it_matters as "whyItMatters",
      sb.source_note as "sourceNote",
      sb.china_relevance as "chinaRelevance",
      coalesce(sb.related_topics_json, '[]'::jsonb) as "relatedTopics",
      re.rights_status as "rightsStatus",
      rex.title as "extractedTitle",
      rex.extracted_text as "extractedText",
      tr.translated_title as "translatedTitle"
    from raw_entries re
    join sources s on s.id = re.source_id
    join boards b on b.id = s.board_id
    left join raw_entry_extractions rex on rex.raw_entry_id = re.id
    left join lateral (
      select
        one_sentence,
        detailed_summary,
        why_it_matters,
        source_note,
        china_relevance,
        related_topics_json
      from summary_blocks
      where raw_entry_id = re.id
      order by id desc
      limit 1
    ) sb on true
    left join lateral (
      select translated_title
      from translations
      where raw_entry_id = re.id
      order by id desc
      limit 1
    ) tr on true
    where re.id = $1 and s.enabled = true and re.rights_status != 'blocked'
    `,
    [id]
  );
  const row = result.rows[0];
  return row ? mapReaderItemDetailRow(row) : null;
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

function mapReaderItemDetailRow(row: ReaderItemDetailRow): ReaderItemDetail {
  const item = mapReaderItemRow(row);
  const detailSummary = row.detailSummary ?? "";
  const summary = item.summary || detailSummary;
  const originalText = buildOriginalText(row.rightsStatus, row.extractedText);

  return {
    ...item,
    summary,
    detailSummary,
    whyItMatters: row.whyItMatters ?? "",
    sourceNote: row.sourceNote ?? "",
    chinaRelevance: row.chinaRelevance ?? "",
    relatedTopics: parseRelatedTopics(row.relatedTopics),
    originalTitle: row.extractedTitle ?? item.title,
    originalText: originalText.text,
    originalTextMode: originalText.mode,
    chineseTitle: row.translatedTitle ?? item.title,
    chineseText: detailSummary || summary,
    chineseTextMode: "summary_only"
  };
}

function buildOriginalText(
  rightsStatus: string,
  extractedText: string | null
): { text: string; mode: ReaderOriginalTextMode } {
  if (!extractedText) {
    return { text: "", mode: "none" };
  }

  if (rightsStatus === "public_fulltext_allowed") {
    return { text: extractedText, mode: "full" };
  }

  if (rightsStatus === "public_excerpt_allowed") {
    return { text: makeExcerpt(extractedText), mode: "excerpt" };
  }

  return { text: "", mode: "none" };
}

function makeExcerpt(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= originalExcerptLength) {
    return trimmed;
  }
  return `${trimmed.slice(0, originalExcerptLength).trimEnd()}...`;
}

function parseRelatedTopics(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((topic): topic is string => typeof topic === "string");
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
