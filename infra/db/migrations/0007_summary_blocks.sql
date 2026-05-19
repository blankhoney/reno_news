create table if not exists summary_blocks (
  id bigserial primary key,
  raw_entry_id bigint not null references raw_entries(id) on delete cascade,
  extraction_id bigint references raw_entry_extractions(id) on delete set null,
  ai_evaluation_id bigint not null references ai_evaluations(id) on delete cascade,
  translation_id bigint references translations(id) on delete set null,
  model_call_id bigint not null references model_calls(id),
  schema_version text not null,
  status text not null check (status in ('draft')),
  one_sentence text not null check (length(trim(one_sentence)) > 0),
  detailed_summary text not null check (length(trim(detailed_summary)) > 0),
  why_it_matters text not null check (length(trim(why_it_matters)) > 0),
  source_note text not null check (length(trim(source_note)) > 0),
  china_relevance text not null check (length(trim(china_relevance)) > 0),
  related_topics_json jsonb not null,
  created_at timestamptz not null default now()
);
