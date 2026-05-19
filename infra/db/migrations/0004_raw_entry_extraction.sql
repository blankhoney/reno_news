create table if not exists raw_entry_extraction_attempts (
  id bigserial primary key,
  raw_entry_id bigint not null references raw_entries(id) on delete cascade,
  status text not null check (status in ('success', 'failure', 'skipped')),
  failure_type text check (
    failure_type is null or failure_type in ('network', 'parse', 'policy', 'unknown')
  ),
  message text,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists raw_entry_extractions (
  id bigserial primary key,
  raw_entry_id bigint not null unique references raw_entries(id) on delete cascade,
  attempt_id bigint references raw_entry_extraction_attempts(id) on delete set null,
  extractor_name text not null,
  extractor_version text not null,
  final_url text not null,
  title text,
  author text,
  published_at timestamptz,
  language text,
  extracted_text text not null,
  text_length integer not null check (text_length > 0),
  extraction_confidence numeric(5, 4) not null check (
    extraction_confidence >= 0 and extraction_confidence <= 1
  ),
  created_at timestamptz not null default now()
);
