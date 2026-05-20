create table if not exists audit_events (
  id bigserial primary key,
  actor_user_id bigint references users(id) on delete set null,
  actor_role text,
  action text not null,
  object_type text not null,
  object_id text,
  request_id text not null,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint audit_events_actor_role_check
    check (actor_role is null or actor_role in ('reader', 'admin')),
  constraint audit_events_action_check
    check (length(trim(action)) > 0),
  constraint audit_events_object_type_check
    check (length(trim(object_type)) > 0),
  constraint audit_events_request_id_check
    check (length(trim(request_id)) > 0),
  constraint audit_events_metadata_object_check
    check (jsonb_typeof(metadata_json) = 'object')
);

create index if not exists audit_events_actor_created_idx
  on audit_events(actor_user_id, created_at desc)
  where actor_user_id is not null;

create index if not exists audit_events_action_created_idx
  on audit_events(action, created_at desc);

create index if not exists audit_events_object_created_idx
  on audit_events(object_type, object_id, created_at desc);
