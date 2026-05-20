create table if not exists users (
  id bigserial primary key,
  email text not null,
  password_hash text not null,
  role text not null default 'reader',
  disabled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_email_canonical_check
    check (email = lower(trim(email)) and position('@' in email) > 1),
  constraint users_password_hash_argon2id_check
    check (password_hash like '$argon2id$%'),
  constraint users_role_check
    check (role in ('reader', 'admin'))
);

create unique index if not exists users_email_lower_unique
  on users ((lower(email)));

create table if not exists user_invites (
  id bigserial primary key,
  email text not null,
  role text not null default 'reader',
  token_hash text not null unique,
  invited_by_user_id bigint references users(id) on delete set null,
  accepted_by_user_id bigint unique references users(id) on delete set null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint user_invites_email_canonical_check
    check (email = lower(trim(email)) and position('@' in email) > 1),
  constraint user_invites_role_check
    check (role in ('reader', 'admin')),
  constraint user_invites_expiry_check
    check (expires_at > created_at),
  constraint user_invites_acceptance_check
    check (
      (accepted_at is null and accepted_by_user_id is null)
      or (accepted_at is not null and accepted_by_user_id is not null)
    ),
  constraint user_invites_revocation_check
    check (revoked_at is null or accepted_at is null)
);

create index if not exists user_invites_email_idx
  on user_invites(email);

create index if not exists user_invites_pending_idx
  on user_invites(email, expires_at)
  where accepted_at is null and revoked_at is null;

create table if not exists user_sessions (
  id bigserial primary key,
  user_id bigint not null references users(id) on delete cascade,
  session_token_hash text not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_seen_at timestamptz,
  user_agent text,
  ip_address inet,
  created_at timestamptz not null default now(),
  constraint user_sessions_token_hash_check
    check (length(session_token_hash) >= 32),
  constraint user_sessions_expiry_check
    check (expires_at > created_at),
  constraint user_sessions_revoked_check
    check (revoked_at is null or revoked_at >= created_at),
  constraint user_sessions_last_seen_check
    check (last_seen_at is null or last_seen_at >= created_at)
);

create unique index if not exists user_sessions_token_hash_unique
  on user_sessions(session_token_hash);

create index if not exists user_sessions_active_user_idx
  on user_sessions(user_id, expires_at)
  where revoked_at is null;

create table if not exists auth_login_attempts (
  id bigserial primary key,
  user_id bigint references users(id) on delete set null,
  email text not null,
  outcome text not null,
  failure_reason text,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now(),
  constraint auth_login_attempts_email_canonical_check
    check (email = lower(trim(email)) and position('@' in email) > 1),
  constraint auth_login_attempts_outcome_check
    check (outcome in ('success', 'failure')),
  constraint auth_login_attempts_failure_reason_check
    check (
      (outcome = 'success' and failure_reason is null)
      or (
        outcome = 'failure'
        and failure_reason is not null
        and failure_reason in (
          'invalid_credentials',
          'invite_required',
          'user_disabled',
          'session_expired',
          'rate_limited'
        )
      )
    )
);

create index if not exists auth_login_attempts_email_created_idx
  on auth_login_attempts(email, created_at desc);

create index if not exists auth_login_attempts_user_created_idx
  on auth_login_attempts(user_id, created_at desc)
  where user_id is not null;
