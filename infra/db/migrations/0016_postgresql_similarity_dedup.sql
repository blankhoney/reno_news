create extension if not exists pg_trgm;

create table if not exists raw_entry_duplicate_groups (
  id bigserial primary key,
  group_kind text not null check (
    group_kind in ('canonical_hash', 'title_url_trgm', 'embedding', 'operator_review')
  ),
  group_key text not null unique,
  representative_raw_entry_id bigint references raw_entries(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table raw_entries
  add column if not exists duplicate_group_id bigint references raw_entry_duplicate_groups(id) on delete set null;

create table if not exists raw_entry_similarity_signals (
  id bigserial primary key,
  raw_entry_id bigint not null references raw_entries(id) on delete cascade,
  similar_raw_entry_id bigint not null references raw_entries(id) on delete cascade,
  signal_type text not null check (
    signal_type in ('canonical_hash', 'title_trgm', 'url_trgm', 'embedding', 'operator_review')
  ),
  score numeric(5,4) not null check (score >= 0 and score <= 1),
  signal_payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (raw_entry_id <> similar_raw_entry_id),
  unique (raw_entry_id, similar_raw_entry_id, signal_type)
);

create index if not exists raw_entries_title_trgm_idx
  on raw_entries using gin (title gin_trgm_ops);

create index if not exists raw_entries_url_trgm_idx
  on raw_entries using gin (url gin_trgm_ops);

create index if not exists raw_entries_duplicate_group_id_idx
  on raw_entries(duplicate_group_id);

create index if not exists raw_entry_duplicate_groups_kind_created_idx
  on raw_entry_duplicate_groups(group_kind, created_at desc);

create index if not exists raw_entry_similarity_signals_entry_score_idx
  on raw_entry_similarity_signals(raw_entry_id, score desc);

create index if not exists raw_entry_similarity_signals_similar_entry_idx
  on raw_entry_similarity_signals(similar_raw_entry_id);
