# Database Schema

This document summarizes the current SQL schema. SQL files in `infra/db/migrations` remain the source of truth for product schema.

## Migration Metadata

`schema_migrations`

- Created by the migration runner as migration metadata.
- `filename`: migration filename, primary key.
- `applied_at`: timestamp when the migration was applied.

## Boards

`boards`

- Stores MVP board definitions.
- `slug` is unique and stable.
- Seeded values: `ai`, `software-engineering`, `semiconductor`, `employment-trends`, `open-source`.

## Development Sources

`sources`

- Source Registry records.
- `source_type` is constrained to `rss`, `atom`, or `github`; the GitHub adapter is still limited to allowlisted repository metadata and releases.
- Each source belongs to one board.
- Source-specific access and rights controls live in `source_policies`.

## Source Policies

`source_policies`

- One policy row per source.
- `crawl_enabled` controls whether worker ingest may consider the source.
- `fetch_interval_minutes` and `max_requests_per_hour` define source-level crawl/rate policy.
- `save_level`, `rights_policy`, `translation_policy`, and `risk_level` define operational and rights boundaries.
- Rights policy is stored separately from UI display logic.

## Development Raw Entries

`raw_entries`

- Minimal seedable raw entry records for development and later ingest tests.
- `lifecycle_status`, `processing_stage`, `rights_status`, and `failure_type` are constrained text fields.
- RSS/Atom feed metadata and allowlisted GitHub repository/release metadata land here before full-text extraction.
- Duplicate feed entries are ignored through existing unique constraints and `on conflict do nothing`.

## Source Ingest Attempts

`source_ingest_attempts`

- Records one Source Adapter execution outcome for one source.
- `status` is constrained to `success`, `failure`, or `skipped`.
- `failure_type` is constrained to `network`, `parse`, `policy`, `duplicate`, `rate_limit`, or `unknown` when present.
- Stores entry counts and failure messages for worker/debug visibility.

## Raw Entry Extraction Attempts

`raw_entry_extraction_attempts`

- Records one extraction attempt for one raw entry.
- `status` is constrained to `success`, `failure`, or `skipped`.
- `failure_type` is constrained to `network`, `parse`, `policy`, or `unknown` when present.
- Stores failure messages and start/completion timestamps.

## Raw Entry Extractions

`raw_entry_extractions`

- Stores the latest successful extraction result for one raw entry.
- Links back to the raw entry and the attempt that produced the result.
- Stores extractor identity, final URL, optional metadata, extracted text, text length, and extraction confidence.
- `extraction_confidence` is constrained to the inclusive range `0..1`.

## Model Calls

`model_calls`

- Records one AI provider interaction or internal prefilter decision.
- Stores provider, model, purpose, schema version, status, optional latency, optional error code, and redacted request/response JSON.
- `status` is constrained to `success`, `failure`, or `skipped`.
- Redacted payload fields are metadata only; raw extracted text and full provider responses should not be stored here.

## AI Evaluations

`ai_evaluations`

- Stores structured AI evaluation output for one raw entry and, when present, one extraction result.
- Links each evaluation to the model call that produced it.
- Stores the versioned schema and separate JSON objects for scores, rationale, evidence, and summary.
- Reader display, translation publishing, and search indexing are not represented by this table.

## Users

`users`

- Stores authenticated reader/admin accounts for the second-version identity layer.
- `email` is stored in canonical lowercase form and is unique case-insensitively.
- `password_hash` must be an argon2id PHC string.
- `role` is constrained to `reader` or `admin`.
- `disabled_at` supports server-side account disablement without deleting audit history.

## User Invites

`user_invites`

- Stores invite-only account creation records.
- `email` is canonical lowercase and `role` is constrained to `reader` or `admin`.
- `token_hash` is unique; raw invite tokens must not be stored.
- `invited_by_user_id` may be null for bootstrap.
- `accepted_by_user_id`, `accepted_at`, and `revoked_at` record the invite lifecycle.

## User Sessions

`user_sessions`

- Stores server-side browser sessions for authenticated users.
- `session_token_hash` is unique; raw session tokens must not be stored.
- Sessions have `expires_at`, optional `revoked_at`, optional `last_seen_at`, and safe request metadata.
- Sessions are deleted when the owning user is deleted.

## User Saved Items

`user_saved_items`

- Stores account-backed Saved Item membership for one authenticated user and one raw entry.
- `(user_id, raw_entry_id)` is the primary key, so writes are idempotent per user and item.
- Deleting a user or raw entry deletes only the matching personal-state rows.
- `migrated_from_local` marks state imported from browser localStorage.

## User Read-Later Items

`user_read_later_items`

- Stores account-backed Read Later Item membership for one authenticated user and one raw entry.
- `(user_id, raw_entry_id)` is the primary key, so writes are idempotent per user and item.
- Saved and read-later are intentionally separate tables because readers may use both markers on the same item.
- `migrated_from_local` marks state imported from browser localStorage.

## User Read Status

`user_read_status`

- Stores account-backed Read Status for one authenticated user and one raw entry.
- `(user_id, raw_entry_id)` is the primary key, enforcing cross-user isolation while keeping updates idempotent.
- `read_status` is constrained to `unread` or `read`.
- `read_at` is required only when `read_status = 'read'`; `updated_at` records the latest state transition.

## Digest Editions

`digest_editions`

- Stores one persisted Digest Edition for an edition date, time window, and optional board.
- `edition_key` is unique and stable for API lookup.
- `status` is constrained to `draft`, `reviewed`, or `archived`.
- `generation_metadata_json` stores safe generation inputs and counters.
- `reviewed_by_user_id`, `reviewed_at`, and `review_note` store admin review metadata without creating delivery state.

`digest_edition_items`

- Stores the ordered Digest Items for one edition.
- `(digest_edition_id, raw_entry_id)` prevents duplicate items in one edition.
- `(digest_edition_id, item_position)` keeps replay order stable.
- `item_snapshot_json` stores reader-safe card fields so replay does not silently change when source records or ranking signals later change.

## Auth Login Attempts

`auth_login_attempts`

- Records normalized login outcomes for auth security checks.
- `outcome` is constrained to `success` or `failure`.
- `failure_reason` is required for failures and omitted for successes.
- Failure reasons are constrained to the shared auth contract vocabulary.

## Audit Events

`audit_events`

- Stores append-only security and admin action records for login/logout, source changes, raw-entry lifecycle actions, and feedback review.
- `actor_user_id` links to `users` when the actor is known and is set to null if the user is deleted.
- `actor_role` is constrained to `reader` or `admin` when present.
- `action`, `object_type`, `object_id`, and `request_id` identify what happened and which request produced the event.
- `metadata_json` stores safe structured metadata only; raw credentials, invite tokens, session tokens, and full request payloads must not be stored.
- Lookup indexes support actor, action, and object-oriented inspection.

## Translations

`translations`

- Stores worker-generated translation drafts for one raw entry and, when present, one extraction result.
- Links each translation draft to the model call that produced it.
- `target_language` is constrained to `zh-Hans` for the MVP Chinese-first path.
- `status` is constrained to `draft`; public publishing is a later workflow.
- Stores translated title, translated text, aligned segment JSON, and quality flag JSON.

## Summary Blocks

`summary_blocks`

- Stores worker-generated explanatory draft blocks for one raw entry.
- Links each summary block to the raw entry, optional extraction, required AI evaluation, optional translation draft, and model call.
- `status` is constrained to `draft`; ranking, digest inclusion, and public publishing are later workflows.
- Stores one-sentence summary, detailed summary, why-it-matters text, source note, China relevance, and related topic JSON.

## Status Boundaries

The constrained status fields are deliberately broad MVP values. They are not AI, extraction, or publishing workflows by themselves.
