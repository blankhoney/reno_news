create table if not exists model_calls (
  id bigserial primary key,
  provider text not null,
  model text not null,
  purpose text not null,
  schema_version text not null,
  status text not null check (status in ('success', 'failure', 'skipped')),
  latency_ms integer check (latency_ms is null or latency_ms >= 0),
  error_code text,
  request_redacted_json jsonb not null default '{}'::jsonb,
  response_redacted_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists ai_evaluations (
  id bigserial primary key,
  raw_entry_id bigint not null references raw_entries(id) on delete cascade,
  extraction_id bigint references raw_entry_extractions(id) on delete set null,
  model_call_id bigint not null references model_calls(id),
  schema_version text not null,
  scores_json jsonb not null,
  rationale_json jsonb not null,
  evidence_json jsonb not null,
  summary_json jsonb not null,
  created_at timestamptz not null default now()
);
