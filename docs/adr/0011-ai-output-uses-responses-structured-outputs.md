# AI Output Uses Responses API Structured Outputs

The first production AI provider path will use OpenAI's Responses API with Structured Outputs for schema-constrained evaluation output. Tests must use deterministic fake adapters and must not require network access or API keys.

This records the boundary between provider integration and product semantics. The product stores durable `model_calls` and `ai_evaluations`; the provider adapter is replaceable. Structured Outputs is preferred over plain JSON mode because schema adherence is required for scoring, evidence, and later translation workflows.

Issue 007 should therefore add a provider adapter interface, versioned output schema, model-call logging, and deterministic evaluation tests before any broad AI workflow expansion.
