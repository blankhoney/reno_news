create table if not exists boards (
  id bigserial primary key,
  slug text not null unique,
  name text not null,
  description text not null default '',
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists sources (
  id bigserial primary key,
  board_id bigint not null references boards(id),
  kind text not null check (kind in ('rss', 'atom')),
  title text not null,
  url text not null unique,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists raw_entries (
  id bigserial primary key,
  source_id bigint not null references sources(id),
  external_id text not null,
  url text not null,
  title text not null,
  summary_raw text,
  published_at timestamptz,
  raw_payload_json jsonb not null default '{}'::jsonb,
  canonical_hash text not null unique,
  lifecycle_status text not null default 'new' check (
    lifecycle_status in ('new', 'candidate', 'rejected', 'ready', 'published', 'hidden', 'archived')
  ),
  processing_stage text not null default 'metadata_ingested' check (
    processing_stage in ('metadata_ingested', 'prefiltered', 'fetched', 'extracted', 'failed', 'skipped')
  ),
  rights_status text not null default 'unknown' check (
    rights_status in ('unknown', 'blocked', 'metadata_only', 'private_allowed', 'public_excerpt_allowed', 'public_fulltext_allowed')
  ),
  failure_type text check (
    failure_type is null or failure_type in ('network', 'parse', 'policy', 'duplicate', 'unknown')
  ),
  created_at timestamptz not null default now(),
  unique (source_id, external_id)
);
