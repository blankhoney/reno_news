# Issue 009 Plan: Summary Block Draft Foundation

## Goal

Issue 009 completes the remaining Milestone 3 AI pipeline foundation by generating structured summary blocks for one evaluated item, while keeping ranking, publishing, digest generation, and reader UI out of scope.

## Scope

In scope:
- Versioned summary block output schema.
- Provider-neutral summary adapter interface reusing the model-call boundary.
- Deterministic fake adapter for tests.
- OpenAI Responses API Structured Outputs request boundary for summary blocks, without live API calls in tests.
- `summary_blocks` storage linked to raw entry, extraction, AI evaluation, optional translation, and model call.
- Prefilter for missing extraction or missing AI evaluation.
- Structured fields for one-sentence summary, detailed summary, why it matters, source note, China relevance, and related topic hints.

Out of scope:
- Reader UI.
- Public publishing.
- Digest generation.
- Search indexing.
- Feedback-to-ranking.
- Multi-provider routing.
- Browser automation or non-RSS adapters.
- Real `OPENAI_API_KEY` setup.

## Design

Summary blocks should be generated after AI evaluation and optionally after translation draft creation. The first implementation should read one raw entry with extraction and AI evaluation, include the latest translation draft when present, run a cheap prefilter, call a summary adapter, record a `model_calls` row, and write one `summary_blocks` row.

The output is explanatory draft content. It must not update lifecycle status, publish status, board membership, ranking, search indexes, digests, or reader-facing routes.

Use the Responses API with Structured Outputs for the production adapter boundary. Current OpenAI docs recommend the Responses API for text generation and Structured Outputs for JSON-shaped output; latest-model guidance says to keep output schemas in Structured Outputs instead of prompt prose.

## Proposed Storage

`summary_blocks`:
- `id`
- `raw_entry_id`
- `extraction_id`
- `ai_evaluation_id`
- `translation_id`
- `model_call_id`
- `schema_version`
- `status`
- `one_sentence`
- `detailed_summary`
- `why_it_matters`
- `source_note`
- `china_relevance`
- `related_topics_json`
- `created_at`

## TDD Plan

1. Add migration tests for `summary_blocks` table existence and constrained status.
2. Add schema fixture tests for summary block output shape.
3. Add worker tests for fake-adapter success, missing extraction skip, missing evaluation skip, and adapter failure logging.
4. Implement SQL migration and persistence helpers.
5. Implement provider-neutral summary adapter interface and fake adapter.
6. Add OpenAI Responses adapter boundary without requiring live API tests.

## Acceptance Criteria

- One evaluated item can produce summary blocks through a fake adapter and be stored without network access.
- Every attempted summary generation creates a model-call record.
- Summary output includes one-sentence summary, detailed summary, why-it-matters, source note, China relevance, and related topic hints.
- Prefilter skips missing extraction or missing AI evaluation without calling the adapter.
- No reader UI, search, digest generation, public publishing, browser automation, or non-RSS adapter is added.

## Research References

- OpenAI text generation guide: https://developers.openai.com/api/docs/guides/text
- OpenAI Structured Outputs guide: https://developers.openai.com/api/docs/guides/structured-outputs
- OpenAI latest model guidance: https://developers.openai.com/api/docs/guides/latest-model
