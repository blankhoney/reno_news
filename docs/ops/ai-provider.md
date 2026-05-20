# AI Provider Runbook

This runbook defines the second-version MiniMax provider boundary. It is a local contract only: it does not create a MiniMax key, call a live model, approve prompts, or replace the schema and golden-set tasks that follow.

## Provider Boundary

MiniMax-M2.7 is the primary model for article translation, summary, scoring, and evidence-oriented analysis. The implementation should use the existing worker adapter boundary and prefer the Anthropic-compatible API at `https://api.minimax.io/anthropic`.

Use tool calling for strongly shaped outputs. The standard `response_format` JSON schema parameter is documented for MiniMax-Text-01, so M2.7 output must not be treated as strict schema-safe provider output. In this project, tool-call arguments are still untrusted and must pass local validation.

Default model:

```text
MiniMax-M2.7
```

Allowed latency variant:

```text
MiniMax-M2.7-highspeed
```

## Environment Contract

Production or staging configuration must inject these values through GitHub secrets, server env files, or a secret manager. They must not be committed with real values.

| Name | Required | Purpose |
|---|---|---|
| `AI_PROVIDER` | yes | Selects `minimax` only when the real provider is intentionally enabled. |
| `MINIMAX_API_KEY` | yes for live MiniMax | Secret API key; never log or commit. |
| `MINIMAX_BASE_URL` | yes | Defaults to the Anthropic-compatible endpoint. |
| `MINIMAX_MODEL` | yes | Defaults to `MiniMax-M2.7`; highspeed requires explicit opt-in. |
| `MINIMAX_TIMEOUT_MS` | yes | Per-call timeout budget. |
| `MINIMAX_MAX_OUTPUT_TOKENS` | yes | Output cap for cost and latency control. |
| `MINIMAX_RETRY_ATTEMPTS` | yes | Bounded retry count for retryable provider errors. |
| `MINIMAX_DAILY_BUDGET_CENTS` | yes | Local budget guard for the worker. |

Tests and CI make no real provider calls by default. Live smoke requires an explicit environment and must record only redacted request and response metadata.

## Timeout Retry And Budget Policy

Use a fail-fast timeout for each provider request and classify failures as retryable or terminal. Retry only transient network, timeout, and rate-limit failures. Do not retry schema failures indefinitely.

Every live attempt must create or update `model_calls` with provider, model, purpose, schema version, status, latency, retry classification, safe request metadata, safe response metadata, and budget-relevant usage if the provider returns it.

The worker must stop live MiniMax calls when `MINIMAX_DAILY_BUDGET_CENTS` is exhausted or unavailable in a production profile. The local fake adapter remains available for tests and fixture generation.

## Schema Gate

Structured output must pass local schema validation before it can enter `ai_evaluations`, `translations`, `summary_blocks`, digest editions, or any later formal table. The provider response can be useful input, but the database write boundary is the local validator.

The first schema-gated implementation should parse tool arguments, validate them against the versioned schema, and record a typed failure when parsing or validation fails. A bounded repair pass may call the model or use deterministic cleanup once, but the repaired output must be validated again.

Tool-call arguments are still untrusted. They can be malformed JSON, omit required fields, include extra fields, or conflict with local source/extraction facts.

## Fallback And Quarantine

Fallback behavior must be explicit. Acceptable fallback options are:

- run the bounded repair pass and revalidate;
- switch to a configured fallback provider only for the same schema and purpose;
- quarantine the result with a clear failure reason.

Unrecoverable output is quarantined and must not write to formal product tables. Quarantine records should keep enough safe metadata to debug provider, prompt, schema, and retry decisions through `model_calls` and the admin failure queue.

## Verification

Local checks:

```bash
pnpm ai:provider:check
pnpm --filter @reno-news/db test
uv --project services/worker run python -m unittest discover -s services/worker/tests
```

Expected behavior:

- provider docs and ADR name MiniMax-M2.7 as primary but not as the only possible model;
- strict structured correctness is enforced by local schema validation;
- malformed output goes through at most a bounded repair pass or quarantine;
- no real provider calls by default;
- all durable attempts are visible through model_calls and failure queue projections;
- prompt, schema, model, or fallback changes are evaluated through the golden set before production use.

## References

- MiniMax Compatible Anthropic API: https://platform.minimax.io/docs/api-reference/text-anthropic-api
- MiniMax Text Generation API: https://platform.minimax.io/docs/api-reference/text-post
- MiniMax Tool Use: https://platform.minimax.io/docs/guides/text-m2-function-call
- MiniMax Rate Limits: https://platform.minimax.io/docs/guides/rate-limits
