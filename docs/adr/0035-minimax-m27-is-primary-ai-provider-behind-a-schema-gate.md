# MiniMax M2.7 Is Primary AI Provider Behind A Schema Gate

Second-version AI integration uses MiniMax M2.7 as the primary translation and analysis provider behind the existing adapter boundary. MiniMax's official API documentation lists M2.7 for text generation, Anthropic/OpenAI-compatible access, and tool-calling workflows.

Provider output is not trusted just because it came from the primary model. Structured results must pass local schema validation before entering durable product tables. Malformed output may go through a bounded repair pass; unrecoverable output is quarantined with a typed failure reason.

All provider attempts must be recorded in `model_calls` with safe metadata, timing, retry/failure classification, and budget-relevant fields. Tests use deterministic fake adapters or mocked HTTP boundaries and must not require a real MiniMax key by default.

Prompt, model, or provider changes must be evaluated through a golden set before they are treated as quality improvements. The golden set is the quality gate for translation, summary, scoring, and fact/opinion/suspicion extraction.

References:

- https://platform.minimax.io/docs/api-reference/api-overview
- https://platform.minimax.io/docs/guides/text-m2-function-call
