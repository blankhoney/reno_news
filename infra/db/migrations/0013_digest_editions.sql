create table if not exists digest_editions (
  id bigserial primary key,
  edition_key text not null,
  edition_date date not null,
  board_id bigint references boards(id) on delete restrict,
  window_start_at timestamptz not null,
  window_end_at timestamptz not null,
  status text not null default 'draft',
  generation_metadata_json jsonb not null default '{}'::jsonb,
  reviewed_by_user_id bigint references users(id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint digest_editions_key_unique unique (edition_key),
  constraint digest_editions_status_check check (status in ('draft', 'reviewed', 'archived')),
  constraint digest_editions_window_check check (window_start_at < window_end_at),
  constraint digest_editions_review_note_length_check check (
    review_note is null or length(review_note) <= 2000
  )
);

create index if not exists digest_editions_date_idx
  on digest_editions (edition_date desc, created_at desc);

create index if not exists digest_editions_board_date_idx
  on digest_editions (board_id, edition_date desc);

create index if not exists digest_editions_status_idx
  on digest_editions (status, created_at desc);

create table if not exists digest_edition_items (
  digest_edition_id bigint not null references digest_editions(id) on delete cascade,
  raw_entry_id bigint not null references raw_entries(id) on delete restrict,
  item_position integer not null,
  item_snapshot_json jsonb not null,
  selection_metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (digest_edition_id, raw_entry_id),
  constraint digest_edition_items_position_check check (item_position > 0),
  constraint digest_edition_items_position_unique unique (digest_edition_id, item_position)
);

create index if not exists digest_edition_items_raw_entry_idx
  on digest_edition_items (raw_entry_id);
