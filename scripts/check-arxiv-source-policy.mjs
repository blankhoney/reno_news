#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

function fail(message) {
  console.error(`arXiv source policy check FAILED: ${message}`);
  process.exit(1);
}

function read(path) {
  const absolutePath = resolve(root, path);
  if (!existsSync(absolutePath)) {
    fail(`${path} must exist`);
  }
  return readFileSync(absolutePath, "utf8");
}

function readJson(path) {
  try {
    return JSON.parse(read(path));
  } catch (error) {
    fail(`${path} must be valid JSON: ${error.message}`);
  }
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

const packageJson = readJson("package.json");
const policy = readJson("config/source-adapters/arxiv.json");
const runbook = read("docs/ops/arxiv-source-adapter.md");
const masterPlan = read("docs/CODEX_MASTER_PLAN.md");
const ciWorkflow = read(".github/workflows/ci.yml");
const ciRunbook = read("docs/ops/github-cicd.md");

if (packageJson.scripts["arxiv:source-policy:check"] !== "node scripts/check-arxiv-source-policy.mjs") {
  fail("package.json must define arxiv:source-policy:check");
}

if (policy.adapter !== "arxiv") {
  fail("policy.adapter must be arxiv");
}

if (policy.enabled !== false) {
  fail("arXiv adapter policy must default to enabled=false until an operator explicitly enables arXiv sources");
}

if (policy.scope?.allowlistOnly !== true) {
  fail("policy.scope.allowlistOnly must be true");
}

if (!policy.scope?.allowedEndpoints?.includes("GET /api/query")) {
  fail("allowedEndpoints must include GET /api/query");
}

if ((policy.scope?.allowedQueries ?? []).length < 1) {
  fail("allowedQueries must list category-scoped queries");
}

for (const query of policy.scope?.allowedQueries ?? []) {
  if (!/^cat:[A-Za-z.-]+$/.test(query)) {
    fail(`allowedQueries must stay category-scoped, got ${query}`);
  }
}

for (const forbidden of ["free-text broad search", "PDF mirroring", "source file mirroring", "multi-connection crawling"]) {
  if (!policy.scope?.forbiddenPatterns?.includes(forbidden)) {
    fail(`forbiddenPatterns must include ${forbidden}`);
  }
}

if (policy.rateLimit?.concurrency !== 1) {
  fail("rateLimit.concurrency must be 1");
}

if (policy.rateLimit?.requestSpacingSeconds !== 3) {
  fail("requestSpacingSeconds must be 3");
}

if (policy.rateLimit?.maxResultsPerRequest > 100) {
  fail("maxResultsPerRequest must stay <= 100 in this local adapter");
}

for (const expected of [
  "Thank you to arXiv for use of its open access interoperability.",
  "one request every three seconds",
  "single connection",
  "Atom",
  "start",
  "max_results"
]) {
  requireText("docs/ops/arxiv-source-adapter.md", runbook, expected);
}

for (const expected of [
  "query allowlist",
  "metadata-only",
  "`arxiv:{arxiv_id}`",
  "arxiv:source-policy:check",
  "no PDF mirroring",
  "existing source/raw-entry/failure pipeline"
]) {
  requireText("docs/ops/arxiv-source-adapter.md", runbook, expected);
}

if (!/\| V2\.6 \| Structured Source Expansion and Similarity Signals \| (In Progress|Completed) \|/.test(masterPlan)) {
  fail("docs/CODEX_MASTER_PLAN.md must include V2.6 with In Progress or Completed status");
}
requireText(".github/workflows/ci.yml", ciWorkflow, "node scripts/check-arxiv-source-policy.mjs");
requireText("docs/ops/github-cicd.md", ciRunbook, "arXiv source policy contract check");

for (const [label, content] of [
  ["config/source-adapters/arxiv.json", JSON.stringify(policy)],
  ["docs/ops/arxiv-source-adapter.md", runbook],
  [".github/workflows/ci.yml", ciWorkflow],
  ["docs/ops/github-cicd.md", ciRunbook]
]) {
  rejectPattern(label, content, /BEGIN [A-Z ]*PRIVATE KEY|ghp_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+|GITHUB_TOKEN=.+[A-Za-z0-9]{8}|blankhoney\.xyz|\/srv\/reno_news/);
}

console.log("arXiv source policy check OK");
