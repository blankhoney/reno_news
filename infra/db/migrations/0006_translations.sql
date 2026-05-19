create table if not exists translations (
  id bigserial primary key,
  raw_entry_id bigint not null references raw_entries(id) on delete cascade,
  extraction_id bigint references raw_entry_extractions(id) on delete set null,
  model_call_id bigint not null references model_calls(id),
  target_language text not null check (target_language in ('zh-Hans')),
  schema_version text not null,
  status text not null check (status in ('draft')),
  translated_title text,
  translated_text text not null check (length(trim(translated_text)) > 0),
  segments_json jsonb not null,
  quality_flags_json jsonb not null,
  created_at timestamptz not null default now()
);
