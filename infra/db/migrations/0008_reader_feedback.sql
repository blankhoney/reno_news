create table if not exists reader_feedback (
  id bigserial primary key,
  raw_entry_id bigint not null references raw_entries(id) on delete cascade,
  feedback_type text not null check (
    feedback_type in ('correction', 'quality_issue', 'duplicate', 'broken_link', 'rights_concern')
  ),
  message text check (
    message is null or (length(trim(message)) > 0 and length(message) <= 2000)
  ),
  created_at timestamptz not null default now()
);

create index if not exists reader_feedback_raw_entry_id_idx
  on reader_feedback(raw_entry_id);

create index if not exists reader_feedback_created_at_idx
  on reader_feedback(created_at desc, id desc);
