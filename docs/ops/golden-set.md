# AI Golden Set

This runbook covers the local AI golden-set regression harness. It is a deterministic quality gate for prompt, schema, model, and provider changes. It is not a live MiniMax quality approval by itself.

## Fixture

Default fixture:

```text
services/worker/golden/ai_evaluation_golden.jsonl
```

The committed fixture has 50 samples across the MVP boards. Each sample includes:

- `id`
- `board`
- `title`
- `extractedText`
- `expectedScores`

The current fixture is local and deterministic. It should be replaced or expanded with real reviewed articles when production provider evaluation begins, while staying in the 50-100 sample range unless a later ADR changes that budget.

## Local Command

Run the fake-provider regression:

```bash
pnpm ai:golden:check
```

Expected fake-provider result:

```text
sampleCount = 50
passedCount = 50
failedCount = 0
provider = fake
```

The command prints stable JSON sorted by key and does not call external providers.

## Live Provider Gate

Live provider execution is blocked unless both values are present:

```text
RUN_LIVE_AI_GOLDEN=1
MINIMAX_API_KEY
```

The current harness deliberately exits before live MiniMax execution because live scoring requires an explicitly reviewed provider adapter, cost budget, and output comparison policy.

## CI Boundary

CI runs the fake-provider harness in the Python worker job after worker unit tests. CI must not require `MINIMAX_API_KEY`, `RUN_LIVE_AI_GOLDEN`, or any provider credential.

## Failure Handling

If `pnpm ai:golden:check` fails:

1. Inspect the JSON report for failed sample ids and mismatched score keys.
2. Confirm the fixture is still valid JSONL with unique ids.
3. Re-run `uv --project services/worker run python -m unittest services.worker.tests.test_golden_eval`.
4. Treat schema failures as blocking because they indicate the local gate would reject provider output.

## Limitations

- The current fixture is synthetic and deterministic, not a human-reviewed production quality benchmark.
- The harness currently covers AI evaluation scores, not translation fluency or summary style.
- Live MiniMax regression remains disabled until real credentials, budget limits, and reviewed expected outputs exist.
