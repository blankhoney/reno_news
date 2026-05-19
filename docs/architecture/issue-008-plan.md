# Issue 008 Plan: Chinese Translation Draft Foundation

## Goal

Issue 008 adds the next Milestone 3 slice: translate one extracted, eligible item into a structured Chinese draft while recording the model call and keeping public publishing out of scope.

## Scope

In scope:
- Versioned translation output schema.
- Provider-neutral translation adapter interface reusing the model-call boundary.
- Deterministic fake adapter for tests.
- OpenAI Responses API Structured Outputs request boundary for translation, without live API calls in tests.
- `translations` storage linked to raw entry, extraction, and model call.
- Policy prefilter using `translation_policy`, `rights_policy`, and extracted text availability.
- Segment-aligned Chinese draft output for later original/Chinese switching.

Out of scope:
- Reader UI.
- Public translation publishing.
- Search indexing.
- Digest generation.
- Feedback-to-ranking.
- Multi-provider routing.
- Browser automation or non-RSS adapters.
- Real `OPENAI_API_KEY` setup.

## Design

The worker remains the owner of model-backed content processing. Issue 008 should read one extraction result plus source policy, run a cheap policy prefilter, call a translation adapter, record a `model_calls` row, and write one translation draft row.

The translation draft should be target-language specific and schema-versioned. It should store a full translated text plus segment JSON so a later reader page can support original/Chinese switching without reworking the model output.

Use the Responses API with Structured Outputs for the production adapter boundary. Current OpenAI docs recommend the Responses API for text generation and Structured Outputs for JSON-shaped output; latest-model guidance also says to keep output schemas in Structured Outputs instead of prompt prose.

## Proposed Storage

`translations`:
- `id`
- `raw_entry_id`
- `extraction_id`
- `model_call_id`
- `target_language`
- `schema_version`
- `status`
- `translated_title`
- `translated_text`
- `segments_json`
- `quality_flags_json`
- `created_at`

## TDD Plan

1. [x] Add migration tests for `translations` table existence and constrained status/target language.
2. [x] Add schema fixture tests for translation output shape.
3. [x] Add worker tests for fake-adapter success, missing extraction skip, disabled translation policy skip, blocked rights skip, and adapter failure logging.
4. [x] Implement SQL migration and persistence helpers.
5. [x] Implement provider-neutral translation adapter interface and fake adapter.
6. [x] Add OpenAI Responses adapter boundary without requiring live API tests.

## Implemented Boundary

- `infra/db/migrations/0006_translations.sql` adds `translations`.
- `services/worker/src/reno_worker/translation.py` owns translation prefiltering, adapter execution, model-call logging, and draft persistence.
- The fake adapter keeps tests deterministic and network-free.
- The OpenAI Responses boundary is an injectable client adapter that builds a `text.format` JSON Schema request and parses structured output text.
- Local verification does not require `OPENAI_API_KEY`.

## Acceptance Criteria

- One eligible extracted item can be translated through a fake adapter and stored without network access.
- Every attempted translation creates a model-call record.
- Translation output includes target language, title/text, aligned segments, and quality flags.
- Prefilter skips missing extraction text, `translation_policy = 'none'`, and blocked rights without calling the adapter.
- No reader UI, search, digest generation, public publishing, browser automation, or non-RSS adapter is added.

## Research References

- OpenAI text generation guide: https://developers.openai.com/api/docs/guides/text
- OpenAI Structured Outputs guide: https://developers.openai.com/api/docs/guides/structured-outputs
- OpenAI latest model guidance: https://developers.openai.com/api/docs/guides/latest-model
