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

export type SearchReaderItemsInput = {
  query: string;
  boardSlug?: string;
};

export type ListRelatedReaderItemsInput = {
  id: number;
  limit?: number;
};

export type ListReaderDigestItemsInput = {
  boardSlug?: string;
  limit?: number;
};

export type ReaderRepository = {
  listReaderBoards(): Promise<ReaderBoard[]>;
  listReaderItems(input?: ListReaderItemsInput): Promise<ReaderItemCard[]>;
  searchReaderItems(input: SearchReaderItemsInput): Promise<ReaderItemCard[]>;
  listRelatedReaderItems(input: ListRelatedReaderItemsInput): Promise<ReaderItemCard[] | null>;
  listReaderDigestItems(input?: ListReaderDigestItemsInput): Promise<ReaderItemCard[]>;
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

type ReaderDigestItemRow = ReaderItemRow & {
  sourceId: number;
  qualityFeedbackPenalty: number;
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
const readerCardSummaryLength = 320;
const readerDetailSummaryLength = 1200;
const digestSourceItemLimit = 2;
const digestCandidateMultiplier = 8;
const digestMinimumCandidateLimit = 60;
const digestMaximumCandidateLimit = 500;

export function createReaderRepository(databaseUrl: string): ReaderRepository {
  const pool = new Pool({ connectionString: databaseUrl, allowExitOnIdle: true });

  return {
    listReaderBoards: async () => listReaderBoards(pool),
    listReaderItems: async (input) => listReaderItems(pool, input),
    searchReaderItems: async (input) => searchReaderItems(pool, input),
    listRelatedReaderItems: async (input) => listRelatedReaderItems(pool, input),
    listReaderDigestItems: async (input) => listReaderDigestItems(pool, input),
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
  const filters = [
    "s.enabled = true",
    "re.lifecycle_status != 'hidden'",
    "re.rights_status != 'blocked'"
  ];

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

async function searchReaderItems(
  queryable: Queryable,
  input: SearchReaderItemsInput
): Promise<ReaderItemCard[]> {
  const query = input.query.trim();
  if (query.length === 0) {
    return [];
  }

  const values = [query];
  const filters = [
    "s.enabled = true",
    "re.lifecycle_status != 'hidden'",
    "re.rights_status != 'blocked'",
    "(search_index.document @@ search_index.query or position(lower($1) in lower(search_document.text)) > 0)"
  ];

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
      select
        one_sentence,
        detailed_summary,
        why_it_matters,
        source_note,
        china_relevance
      from summary_blocks
      where raw_entry_id = re.id
      order by id desc
      limit 1
    ) sb on true
    cross join lateral (
      select concat_ws(
        ' ',
        re.title,
        re.url,
        s.title,
        b.name,
        re.summary_raw,
        sb.one_sentence,
        sb.detailed_summary,
        sb.why_it_matters,
        sb.source_note,
        sb.china_relevance
      ) as text
    ) search_document
    cross join lateral (
      select
        to_tsvector('simple', search_document.text) as document,
        websearch_to_tsquery('simple', $1) as query
    ) search_index
    where ${filters.join(" and ")}
    order by ts_rank(search_index.document, search_index.query) desc,
      coalesce(re.published_at, re.created_at) desc,
      re.id desc
    limit 100
    `,
    values
  );
  return result.rows.map(mapReaderItemRow);
}

async function listRelatedReaderItems(
  queryable: Queryable,
  input: ListRelatedReaderItemsInput
): Promise<ReaderItemCard[] | null> {
  const limit = input.limit ?? 6;
  const target = await queryable.query<{ id: number }>(
    `
    select re.id::int as "id"
    from raw_entries re
    join sources s on s.id = re.source_id
    where re.id = $1
      and s.enabled = true
      and re.lifecycle_status != 'hidden'
      and re.rights_status != 'blocked'
    `,
    [input.id]
  );

  if (!target.rows[0]) {
    return null;
  }

  const result = await queryable.query<ReaderItemRow>(
    `
    with target as (
      select
        re.id,
        re.source_id,
        re.duplicate_group_id,
        re.title,
        re.url,
        b.slug as board_slug,
        concat_ws(
          ' ',
          re.title,
          re.summary_raw,
          sb.one_sentence,
          sb.detailed_summary,
          sb.why_it_matters,
          sb.source_note,
          sb.china_relevance
        ) as text
      from raw_entries re
      join sources s on s.id = re.source_id
      join boards b on b.id = s.board_id
      left join lateral (
        select
          one_sentence,
          detailed_summary,
          why_it_matters,
          source_note,
          china_relevance
        from summary_blocks
        where raw_entry_id = re.id
        order by id desc
        limit 1
      ) sb on true
      where re.id = $1
    ),
    candidates as (
      select
        re.id,
        re.duplicate_group_id,
        dg.representative_raw_entry_id,
        b.slug as board_slug,
        b.name as board_name,
        s.id as source_id,
        s.title as source_title,
        re.title,
        re.url,
        coalesce(sb.one_sentence, nullif(re.summary_raw, ''), '') as summary,
        re.published_at,
        re.created_at,
        coalesce(similarity.score, 0) as similarity_score,
        similarity(re.title, target.title) as trigram_score,
        related_index.document,
        related_index.query
      from target
      join raw_entries re on re.id != target.id
      join sources s on s.id = re.source_id
      join boards b on b.id = s.board_id
      left join raw_entry_duplicate_groups dg on dg.id = re.duplicate_group_id
      left join lateral (
        select
          one_sentence,
          detailed_summary,
          why_it_matters,
          source_note,
          china_relevance
        from summary_blocks
        where raw_entry_id = re.id
        order by id desc
        limit 1
      ) sb on true
      left join lateral (
        select max(score) as score
        from raw_entry_similarity_signals
        where raw_entry_id = target.id
          and similar_raw_entry_id = re.id
      ) similarity on true
      cross join lateral (
        select concat_ws(
          ' ',
          re.title,
          re.url,
          s.title,
          b.name,
          re.summary_raw,
          sb.one_sentence,
          sb.detailed_summary,
          sb.why_it_matters,
          sb.source_note,
          sb.china_relevance
        ) as text
      ) related_document
      cross join lateral (
        select
          to_tsvector('simple', related_document.text) as document,
          websearch_to_tsquery('simple', target.text) as query
      ) related_index
      where s.enabled = true
        and re.lifecycle_status != 'hidden'
        and re.rights_status != 'blocked'
        and (
          target.duplicate_group_id is null
          or re.duplicate_group_id is distinct from target.duplicate_group_id
        )
        and (
          s.id = target.source_id
          or b.slug = target.board_slug
          or related_index.document @@ related_index.query
          or similarity.score is not null
          or similarity(re.title, target.title) >= 0.35
        )
    ),
    folded_candidates as (
      select *
      from (
        select
          candidates.*,
          row_number() over (
            partition by coalesce(duplicate_group_id, -id)
            order by
              case when representative_raw_entry_id = id then 0 else 1 end,
              similarity_score desc,
              trigram_score desc,
              coalesce(published_at, created_at) desc,
              id desc
          ) as duplicate_rank
        from candidates
      ) ranked_candidates
      where duplicate_rank = 1
    )
    select
      id::int as "id",
      board_slug as "boardSlug",
      board_name as "boardName",
      source_title as "sourceTitle",
      title as "title",
      url as "url",
      summary as "summary",
      published_at as "publishedAt",
      created_at as "createdAt"
    from folded_candidates
    order by
      case when similarity_score > 0 then 0 when trigram_score >= 0.35 then 1 else 2 end,
      similarity_score desc,
      trigram_score desc,
      case when source_id = (select source_id from target) then 0 else 1 end,
      case when board_slug = (select board_slug from target) then 0 else 1 end,
      ts_rank_cd(document, query) desc,
      coalesce(published_at, created_at) desc,
      id desc
    limit $2
    `,
    [input.id, limit]
  );

  return result.rows.map(mapReaderItemRow);
}

async function listReaderDigestItems(
  queryable: Queryable,
  input: ListReaderDigestItemsInput = {}
): Promise<ReaderItemCard[]> {
  const limit = input.limit ?? 12;
  const values: unknown[] = [digestCandidateLimit(limit)];
  const filters = [
    "s.enabled = true",
    "re.lifecycle_status != 'hidden'",
    "re.rights_status != 'blocked'"
  ];

  if (input.boardSlug) {
    values.push(input.boardSlug);
    filters.push(`b.slug = $${values.length}`);
  }

  const result = await queryable.query<ReaderDigestItemRow>(
    `
    select
      re.id::int as "id",
      b.slug as "boardSlug",
      b.name as "boardName",
      s.id::int as "sourceId",
      s.title as "sourceTitle",
      re.title as "title",
      re.url as "url",
      coalesce(sb.one_sentence, nullif(re.summary_raw, ''), '') as "summary",
      re.published_at as "publishedAt",
      re.created_at as "createdAt",
      coalesce(fp.quality_feedback_penalty, 0)::int as "qualityFeedbackPenalty"
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
    left join lateral (
      select least(
        coalesce(sum(
          case rf.feedback_type
            when 'rights_concern' then 4
            when 'correction' then 3
            when 'quality_issue' then 2
            when 'duplicate' then 1
            when 'broken_link' then 1
            else 0
          end
        ), 0),
        8
      ) as quality_feedback_penalty
      from reader_feedback rf
      where rf.raw_entry_id = re.id
        and rf.review_status != 'dismissed'
    ) fp on true
    where ${filters.join(" and ")}
    order by coalesce(fp.quality_feedback_penalty, 0) asc, coalesce(re.published_at, re.created_at) desc, re.id desc
    limit $1
    `,
    values
  );
  return selectDigestRows(result.rows, limit, !input.boardSlug).map(mapReaderItemRow);
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
    where re.id = $1
      and s.enabled = true
      and re.lifecycle_status != 'hidden'
      and re.rights_status != 'blocked'
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
    summary: normalizeReaderDisplayText(row.summary, readerCardSummaryLength),
    publishedAt: formatNullableDate(row.publishedAt),
    createdAt: formatDate(row.createdAt)
  };
}

function mapReaderItemDetailRow(row: ReaderItemDetailRow): ReaderItemDetail {
  const item = mapReaderItemRow(row);
  const detailSummary = normalizeReaderDisplayText(row.detailSummary, readerDetailSummaryLength);
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

function selectDigestRows(
  rows: ReaderDigestItemRow[],
  limit: number,
  diversifyBoards: boolean
): ReaderDigestItemRow[] {
  const selected: ReaderDigestItemRow[] = [];

  for (const group of digestPenaltyGroups(rows)) {
    const remaining = limit - selected.length;
    if (remaining <= 0) {
      break;
    }
    selected.push(...selectDigestRowsFromPenaltyGroup(group, remaining, diversifyBoards));
  }

  return selected;
}

function digestPenaltyGroups(rows: ReaderDigestItemRow[]): ReaderDigestItemRow[][] {
  const groups: ReaderDigestItemRow[][] = [];

  for (const row of rows) {
    const lastGroup = groups[groups.length - 1];
    if (!lastGroup || lastGroup[0].qualityFeedbackPenalty !== row.qualityFeedbackPenalty) {
      groups.push([row]);
    } else {
      lastGroup.push(row);
    }
  }

  return groups;
}

function selectDigestRowsFromPenaltyGroup(
  rows: ReaderDigestItemRow[],
  limit: number,
  diversifyBoards: boolean
): ReaderDigestItemRow[] {
  const selected: ReaderDigestItemRow[] = [];
  const selectedIds = new Set<number>();
  const sourceCounts = new Map<number, number>();
  const boardCounts = new Map<string, number>();

  const addRow = (row: ReaderDigestItemRow): boolean => {
    if (selected.length >= limit || selectedIds.has(row.id)) {
      return false;
    }

    selected.push(row);
    selectedIds.add(row.id);
    sourceCounts.set(row.sourceId, (sourceCounts.get(row.sourceId) ?? 0) + 1);
    boardCounts.set(row.boardSlug, (boardCounts.get(row.boardSlug) ?? 0) + 1);
    return true;
  };

  if (diversifyBoards) {
    for (const row of rows) {
      if (
        !selectedIds.has(row.id) &&
        !boardCounts.has(row.boardSlug) &&
        (sourceCounts.get(row.sourceId) ?? 0) < digestSourceItemLimit
      ) {
        addRow(row);
      }
    }
  }

  for (const row of rows) {
    if (
      !selectedIds.has(row.id) &&
      (sourceCounts.get(row.sourceId) ?? 0) < digestSourceItemLimit
    ) {
      addRow(row);
    }
  }

  for (const row of rows) {
    addRow(row);
  }

  return selected;
}

function digestCandidateLimit(limit: number): number {
  if (limit <= 0) {
    return 0;
  }

  return Math.max(
    limit,
    Math.min(
      Math.max(limit * digestCandidateMultiplier, digestMinimumCandidateLimit),
      digestMaximumCandidateLimit
    )
  );
}

function normalizeReaderDisplayText(value: string | null | undefined, maxLength: number): string {
  const decoded = decodeHtmlEntities(
    value
      ?.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
      .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
      .replace(/^\s{0,3}#{1,6}\s+/gm, "")
      .replace(/^\s{0,3}[-*+]\s+/gm, "")
      .replace(/^\s{0,3}\d+[.)]\s+/gm, "")
      .replace(/<\/?(?:p|div|section|article|header|footer|main|aside|br|li|ul|ol|h[1-6]|blockquote|pre|table|thead|tbody|tr|td|th)[^>]*>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/[*_`~]{1,3}/g, "")
      .replace(/[<>]/g, "")
      .replace(/\s+/g, " ")
      .trim() ?? ""
  );
  const normalized = decoded.replace(/[<>]/g, "").replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 3).trimEnd()}...`;
}

function decodeHtmlEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (match, entity) => {
    const normalizedEntity = String(entity).toLowerCase();
    if (normalizedEntity.startsWith("#x")) {
      return decodeNumericEntity(normalizedEntity.slice(2), 16, match);
    }
    if (normalizedEntity.startsWith("#")) {
      return decodeNumericEntity(normalizedEntity.slice(1), 10, match);
    }

    switch (normalizedEntity) {
      case "amp":
        return "&";
      case "lt":
        return "<";
      case "gt":
        return ">";
      case "quot":
        return "\"";
      case "apos":
        return "'";
      case "nbsp":
        return " ";
      default:
        return match;
    }
  });
}

function decodeNumericEntity(value: string, radix: number, fallback: string): string {
  const codePoint = Number.parseInt(value, radix);
  if (!Number.isFinite(codePoint)) {
    return fallback;
  }

  try {
    return String.fromCodePoint(codePoint);
  } catch {
    return fallback;
  }
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
