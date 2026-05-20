#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

function fail(message) {
  console.error(`AI provider contract check FAILED: ${message}`);
  process.exit(1);
}

function read(path) {
  const absolutePath = resolve(root, path);
  if (!existsSync(absolutePath)) {
    fail(`${path} must exist`);
  }
  return readFileSync(absolutePath, "utf8");
}

function requireText(label, content, expected) {
  if (!content.includes(expected)) {
    fail(`${label} must include ${expected}`);
  }
}

function rejectPattern(label, content, pattern) {
  if (pattern.test(content)) {
    fail(`${label} must not match ${pattern}`);
  }
}

const packageJson = JSON.parse(read("package.json"));
const adr = read("docs/adr/0035-minimax-m27-is-primary-ai-provider-behind-a-schema-gate.md");
const runbook = read("docs/ops/ai-provider.md");
const goldenRunbook = read("docs/ops/golden-set.md");
const masterPlan = read("docs/CODEX_MASTER_PLAN.md");
const ciWorkflow = read(".github/workflows/ci.yml");

if (packageJson.scripts["ai:provider:check"] !== "node scripts/check-ai-provider-contract.mjs") {
  fail("package.json must define ai:provider:check");
}

if (
  packageJson.scripts["ai:golden:check"] !==
  "uv --project services/worker run python -m reno_worker.golden_eval --fixture services/worker/golden/ai_evaluation_golden.jsonl --provider fake"
) {
  fail("package.json must define ai:golden:check");
}

for (const expected of [
  "MiniMax-M2.7",
  "Anthropic-compatible",
  "https://api.minimax.io/anthropic",
  "tool calling",
  "response_format",
  "MiniMax-Text-01",
  "local schema validation",
  "repair pass",
  "quarantine",
  "`model_calls`",
  "golden set",
  "fallback"
]) {
  requireText("docs/adr/0035-minimax-m27-is-primary-ai-provider-behind-a-schema-gate.md", adr, expected);
}

for (const heading of [
  "## Provider Boundary",
  "## Environment Contract",
  "## Timeout Retry And Budget Policy",
  "## Schema Gate",
  "## Fallback And Quarantine",
  "## Verification"
]) {
  requireText("docs/ops/ai-provider.md", runbook, heading);
}

for (const envName of [
  "AI_PROVIDER",
  "MINIMAX_API_KEY",
  "MINIMAX_BASE_URL",
  "MINIMAX_MODEL",
  "MINIMAX_TIMEOUT_MS",
  "MINIMAX_MAX_OUTPUT_TOKENS",
  "MINIMAX_RETRY_ATTEMPTS",
  "MINIMAX_DAILY_BUDGET_CENTS"
]) {
  requireText("docs/ops/ai-provider.md", runbook, envName);
}

for (const expected of [
  "no real provider calls by default",
  "Tool-call arguments are still untrusted",
  "Structured output must pass local schema validation",
  "bounded repair pass",
  "Unrecoverable output is quarantined",
  "model_calls",
  "golden set",
  "pnpm ai:provider:check"
]) {
  requireText("docs/ops/ai-provider.md", runbook, expected);
}

for (const expected of [
  "# AI Golden Set",
  "services/worker/golden/ai_evaluation_golden.jsonl",
  "pnpm ai:golden:check",
  "sampleCount = 50",
  "RUN_LIVE_AI_GOLDEN=1",
  "MINIMAX_API_KEY",
  "not a human-reviewed production quality benchmark"
]) {
  requireText("docs/ops/golden-set.md", goldenRunbook, expected);
}

requireText("docs/CODEX_MASTER_PLAN.md", masterPlan, "| V2.4 | MiniMax Model Integration and Evaluation Gate | Completed |");
requireText(".github/workflows/ci.yml", ciWorkflow, "node scripts/check-ai-provider-contract.mjs");
requireText(".github/workflows/ci.yml", ciWorkflow, "reno_worker.golden_eval");

for (const [label, content] of [
  ["docs/adr/0035-minimax-m27-is-primary-ai-provider-behind-a-schema-gate.md", adr],
  ["docs/ops/ai-provider.md", runbook],
  ["docs/ops/golden-set.md", goldenRunbook]
]) {
  rejectPattern(label, content, /sk-[A-Za-z0-9_-]{16,}|BEGIN [A-Z ]*PRIVATE KEY|MINIMAX_API_KEY=.+[A-Za-z0-9]{8}|blankhoney\.xyz|\/srv\/reno_news/);
}

console.log("AI provider contract check OK");
