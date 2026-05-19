# Issue 007 Plan: AI Evaluation Adapter Foundation

## Goal

Issue 007 adds the first Milestone 3 AI slice: evaluate one extracted item through a provider-neutral adapter, store the model call, and store a structured AI evaluation.

## Scope

In scope:
- Versioned AI evaluation output schema.
- Provider-neutral AI adapter interface.
- Deterministic fake adapter for tests.
- OpenAI Responses API adapter boundary, without requiring real API calls in tests.
- `model_calls` storage for provider, model, purpose, schema version, status, latency, and redacted request/response metadata.
- `ai_evaluations` storage linked to the extracted/raw item path.
- Simple prefilter gate for missing extraction text or blocked rights.
- One scoring/evidence/summary structured output shape.

Out of scope:
- Real production API key setup.
- Reader UI.
- Search indexing.
- Translation publishing.
- Feedback-to-ranking.
- Multi-provider routing.
- Browser automation or non-RSS adapters.

## Design

The worker owns AI evaluation orchestration because extraction output already lands there and later model calls should be asynchronous. The first implementation should read one extracted item, run a prefilter, call an adapter, record a `model_calls` row, and write an `ai_evaluations` row.

OpenAI is the first production provider boundary, but tests use a fake adapter. The adapter contract should make provider, model, schema version, latency, status, and redacted payload metadata explicit before persisting evaluation output.

Use OpenAI Responses API Structured Outputs for the production adapter plan. In Responses, structured output schemas belong under `text.format`; JSON mode is not enough because it does not guarantee schema adherence.

## Proposed Storage

`model_calls`:
- `id`
- `provider`
- `model`
- `purpose`
- `schema_version`
- `status`
- `latency_ms`
- `error_code`
- `request_redacted_json`
- `response_redacted_json`
- `created_at`

`ai_evaluations`:
- `id`
- `raw_entry_id`
- `extraction_id`
- `model_call_id`
- `schema_version`
- `scores_json`
- `rationale_json`
- `evidence_json`
- `summary_json`
- `created_at`

## TDD Plan

1. [x] Add migration tests for `model_calls` and `ai_evaluations`.
2. [x] Add schema fixture tests for the AI evaluation output shape.
3. [x] Add worker tests for prefilter skip, fake-adapter success, fake-adapter failure logging, and persistence.
4. [x] Implement SQL migration and persistence helpers.
5. [x] Implement provider-neutral adapter interface and fake adapter.
6. [x] Add OpenAI adapter boundary after fake-adapter behavior is stable, without requiring live API tests.

## Implemented Boundary

- `infra/db/migrations/0005_ai_evaluation.sql` adds `model_calls` and `ai_evaluations`.
- `services/worker/src/reno_worker/ai_evaluation.py` owns prefiltering, adapter execution, model-call logging, and evaluation persistence.
- The fake adapter keeps tests deterministic and network-free.
- The OpenAI Responses boundary is an injectable client adapter that builds a `text.format` JSON Schema request and parses structured output text.
- Local verification does not require `OPENAI_API_KEY`.

## Acceptance Criteria

- One extracted item can be evaluated through a fake adapter and stored without network access.
- Every attempted evaluation creates a model-call record.
- Structured evaluation output includes scores, rationale, evidence, and summary fields.
- Prefilter can skip missing or policy-blocked text without calling the adapter.
- Provider/model/schema version are durable.
- No reader UI, search, translation publishing, browser automation, or non-RSS adapter is added.

## Research References

- OpenAI Responses API migration guidance: https://developers.openai.com/api/docs/guides/migrate-to-responses
- OpenAI Structured Outputs guide: https://developers.openai.com/api/docs/guides/structured-outputs
- OpenAI model guidance: https://developers.openai.com/api/docs/models
