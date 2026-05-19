alter table sources rename column kind to source_type;

alter table sources drop constraint if exists sources_kind_check;

alter table sources
  add constraint sources_source_type_check check (source_type in ('rss', 'atom'));

alter table sources
  add column if not exists description text not null default '',
  add column if not exists updated_at timestamptz not null default now();

create table if not exists source_policies (
  id bigserial primary key,
  source_id bigint not null unique references sources(id) on delete cascade,
  crawl_enabled boolean not null default true,
  fetch_interval_minutes integer not null default 60 check (fetch_interval_minutes > 0),
  max_requests_per_hour integer not null default 12 check (max_requests_per_hour > 0),
  save_level text not null default 'metadata_only' check (
    save_level in ('metadata_only', 'excerpt', 'snapshot', 'full_text')
  ),
  rights_policy text not null default 'metadata_only' check (
    rights_policy in ('blocked', 'metadata_only', 'private_allowed', 'public_excerpt_allowed', 'public_fulltext_allowed')
  ),
  translation_policy text not null default 'none' check (
    translation_policy in ('none', 'private_only', 'public_excerpt', 'public_fulltext')
  ),
  risk_level text not null default 'medium' check (
    risk_level in ('low', 'medium', 'high')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
