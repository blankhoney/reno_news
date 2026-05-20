create table if not exists user_saved_items (
  user_id bigint not null references users(id) on delete cascade,
  raw_entry_id bigint not null references raw_entries(id) on delete cascade,
  migrated_from_local boolean not null default false,
  created_at timestamptz not null default now(),
  constraint user_saved_items_user_item_unique
    primary key (user_id, raw_entry_id)
);

create index if not exists user_saved_items_raw_entry_idx
  on user_saved_items(raw_entry_id, created_at desc);

create table if not exists user_read_later_items (
  user_id bigint not null references users(id) on delete cascade,
  raw_entry_id bigint not null references raw_entries(id) on delete cascade,
  migrated_from_local boolean not null default false,
  created_at timestamptz not null default now(),
  constraint user_read_later_items_user_item_unique
    primary key (user_id, raw_entry_id)
);

create index if not exists user_read_later_items_raw_entry_idx
  on user_read_later_items(raw_entry_id, created_at desc);

create table if not exists user_read_status (
  user_id bigint not null references users(id) on delete cascade,
  raw_entry_id bigint not null references raw_entries(id) on delete cascade,
  read_status text not null default 'unread',
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_read_status_user_item_unique
    primary key (user_id, raw_entry_id),
  constraint user_read_status_value_check
    check (read_status in ('unread', 'read')),
  constraint user_read_status_read_at_check
    check (
      (read_status = 'read' and read_at is not null)
      or (read_status = 'unread' and read_at is null)
    )
);

create index if not exists user_read_status_raw_entry_idx
  on user_read_status(raw_entry_id, updated_at desc);
