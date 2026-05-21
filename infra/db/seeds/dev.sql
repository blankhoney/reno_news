insert into boards (slug, name, description)
values
  ('ai', 'AI', 'Artificial intelligence research, products, and policy.'),
  ('software-engineering', 'Software Engineering', 'Engineering practices, platforms, and operations.'),
  ('semiconductor', 'Semiconductor', 'Electronic information and semiconductor industry signals.'),
  ('employment-trends', 'Employment Trends', 'Labor market and hiring trend signals.'),
  ('open-source', 'Open Source', 'Open source project releases and ecosystem signals.')
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description;

insert into sources (board_id, source_type, title, url)
values
  ((select id from boards where slug = 'ai'), 'rss', 'OpenAI News', 'https://openai.com/news/rss.xml'),
  ((select id from boards where slug = 'software-engineering'), 'rss', 'GitHub Engineering', 'https://github.blog/engineering.atom'),
  ((select id from boards where slug = 'semiconductor'), 'rss', 'Semiconductor Engineering', 'https://semiengineering.com/feed/'),
  ((select id from boards where slug = 'employment-trends'), 'rss', 'BLS Employment Situation', 'https://www.bls.gov/feed/empsit.rss'),
  ((select id from boards where slug = 'open-source'), 'rss', 'GitHub Blog', 'https://github.blog/feed/')
on conflict (url) do update
set
  board_id = excluded.board_id,
  source_type = excluded.source_type,
  title = excluded.title,
  enabled = true;

insert into raw_entries (
  source_id,
  external_id,
  url,
  title,
  summary_raw,
  published_at,
  raw_payload_json,
  canonical_hash,
  lifecycle_status,
  processing_stage,
  rights_status
)
values
  (
    (select id from sources where url = 'https://openai.com/news/rss.xml'),
    'sample-ai-001',
    'https://example.invalid/ai/sample-ai-001',
    'Sample AI item',
    'Development seed item for the AI board.',
    '2026-05-20T00:00:00Z',
    '{"seed": true}'::jsonb,
    'sample-ai-001',
    'new',
    'metadata_ingested',
    'metadata_only'
  ),
  (
    (select id from sources where url = 'https://github.blog/engineering.atom'),
    'sample-software-001',
    'https://example.invalid/software/sample-software-001',
    'Sample software engineering item',
    'Development seed item for the Software Engineering board.',
    '2026-05-20T00:00:00Z',
    '{"seed": true}'::jsonb,
    'sample-software-001',
    'new',
    'metadata_ingested',
    'metadata_only'
  ),
  (
    (select id from sources where url = 'https://semiengineering.com/feed/'),
    'sample-semiconductor-001',
    'https://example.invalid/semiconductor/sample-semiconductor-001',
    'Sample semiconductor item',
    'Development seed item for the Semiconductor board.',
    '2026-05-20T00:00:00Z',
    '{"seed": true}'::jsonb,
    'sample-semiconductor-001',
    'new',
    'metadata_ingested',
    'metadata_only'
  ),
  (
    (select id from sources where url = 'https://www.bls.gov/feed/empsit.rss'),
    'sample-employment-001',
    'https://example.invalid/employment/sample-employment-001',
    'Sample employment trends item',
    'Development seed item for the Employment Trends board.',
    '2026-05-20T00:00:00Z',
    '{"seed": true}'::jsonb,
    'sample-employment-001',
    'new',
    'metadata_ingested',
    'metadata_only'
  ),
  (
    (select id from sources where url = 'https://github.blog/feed/'),
    'sample-open-source-001',
    'https://example.invalid/open-source/sample-open-source-001',
    'Sample open source item',
    'Development seed item for the Open Source board.',
    '2026-05-20T00:00:00Z',
    '{"seed": true}'::jsonb,
    'sample-open-source-001',
    'new',
    'metadata_ingested',
    'metadata_only'
  )
on conflict (source_id, external_id) do update
set
  url = excluded.url,
  title = excluded.title,
  summary_raw = excluded.summary_raw,
  published_at = excluded.published_at,
  raw_payload_json = excluded.raw_payload_json,
  canonical_hash = excluded.canonical_hash,
  lifecycle_status = excluded.lifecycle_status,
  processing_stage = excluded.processing_stage,
  rights_status = excluded.rights_status;

insert into source_policies (
  source_id,
  crawl_enabled,
  fetch_interval_minutes,
  max_requests_per_hour,
  save_level,
  rights_policy,
  translation_policy,
  risk_level
)
values
  ((select id from sources where url = 'https://openai.com/news/rss.xml'), true, 60, 12, 'metadata_only', 'metadata_only', 'none', 'medium'),
  ((select id from sources where url = 'https://github.blog/engineering.atom'), true, 60, 12, 'metadata_only', 'metadata_only', 'none', 'medium'),
  ((select id from sources where url = 'https://semiengineering.com/feed/'), true, 120, 6, 'metadata_only', 'metadata_only', 'none', 'medium'),
  ((select id from sources where url = 'https://www.bls.gov/feed/empsit.rss'), true, 180, 4, 'metadata_only', 'metadata_only', 'none', 'low'),
  ((select id from sources where url = 'https://github.blog/feed/'), true, 60, 12, 'metadata_only', 'metadata_only', 'none', 'medium')
on conflict (source_id) do update
set
  crawl_enabled = excluded.crawl_enabled,
  fetch_interval_minutes = excluded.fetch_interval_minutes,
  max_requests_per_hour = excluded.max_requests_per_hour,
  save_level = excluded.save_level,
  rights_policy = excluded.rights_policy,
  translation_policy = excluded.translation_policy,
  risk_level = excluded.risk_level,
  updated_at = now();

insert into users (email, password_hash, role, disabled_at)
values
  (
    'admin@example.invalid',
    '$argon2id$v=19$m=65536,t=3,p=4$y+My/dqvDfXm8elKRtB4ZQ$Bp5pX2ECeV+wUCnBqJUxKlgn1RjyDKOg3mldYL61Lms',
    'admin',
    null
  ),
  (
    'reader@example.invalid',
    '$argon2id$v=19$m=65536,t=3,p=4$y+My/dqvDfXm8elKRtB4ZQ$Bp5pX2ECeV+wUCnBqJUxKlgn1RjyDKOg3mldYL61Lms',
    'reader',
    null
  )
on conflict ((lower(email))) do update
set
  password_hash = excluded.password_hash,
  role = excluded.role,
  disabled_at = null,
  updated_at = now();
