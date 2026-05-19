create table if not exists source_ingest_attempts (
  id bigserial primary key,
  source_id bigint not null references sources(id) on delete cascade,
  status text not null check (status in ('success', 'failure', 'skipped')),
  failure_type text check (
    failure_type is null or failure_type in ('network', 'parse', 'policy', 'duplicate', 'unknown')
  ),
  message text,
  entries_seen integer not null default 0 check (entries_seen >= 0),
  entries_inserted integer not null default 0 check (entries_inserted >= 0),
  created_at timestamptz not null default now()
);
