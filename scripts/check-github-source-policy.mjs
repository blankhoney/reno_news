#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

function fail(message) {
  console.error(`GitHub source policy check FAILED: ${message}`);
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
const policy = readJson("config/source-adapters/github.json");
const runbook = read("docs/ops/github-source-adapter.md");
const masterPlan = read("docs/CODEX_MASTER_PLAN.md");
const adr = read("docs/adr/0038-source-expansion-uses-ordered-low-concurrency-adapters.md");
const ciWorkflow = read(".github/workflows/ci.yml");
const ciRunbook = read("docs/ops/github-cicd.md");

if (packageJson.scripts["github:source-policy:check"] !== "node scripts/check-github-source-policy.mjs") {
  fail("package.json must define github:source-policy:check");
}

if (policy.adapter !== "github") {
  fail("policy.adapter must be github");
}

if (policy.enabled !== false) {
  fail("GitHub adapter policy must default to enabled=false until an operator explicitly enables GitHub sources");
}

if (policy.scope?.allowlistOnly !== true) {
  fail("policy.scope.allowlistOnly must be true");
}

const allowedEndpoints = policy.scope?.allowedEndpoints ?? [];
for (const endpoint of ["GET /repos/{owner}/{repo}", "GET /repos/{owner}/{repo}/releases"]) {
  if (!allowedEndpoints.includes(endpoint)) {
    fail(`allowedEndpoints must include ${endpoint}`);
  }
}

if (allowedEndpoints.some((endpoint) => /search|issues|pulls|contents|commits/i.test(endpoint))) {
  fail("allowedEndpoints must not include search/issues/pulls/contents/commits endpoints");
}

if ((policy.scope?.allowedRepositories ?? []).length !== 0) {
  fail("allowedRepositories must start empty; real repositories are operator configuration, not repo defaults");
}

for (const forbidden of [
  "broad search polling",
  "full organization crawl",
  "full user crawl",
  "issues polling",
  "pull request polling",
  "repository contents crawl",
  "asset download mirroring"
]) {
  if (!policy.scope?.forbiddenPatterns?.includes(forbidden)) {
    fail(`forbiddenPatterns must include ${forbidden}`);
  }
}

if (policy.rateLimit?.concurrency !== 1) {
  fail("rateLimit.concurrency must be 1");
}

if (policy.rateLimit?.primary?.unauthenticatedRequestsPerHour !== 60) {
  fail("unauthenticated GitHub REST budget must be 60 requests/hour");
}

if (policy.rateLimit?.primary?.authenticatedRequestsPerHour !== 5000) {
  fail("authenticated GitHub REST budget must be 5000 requests/hour");
}

for (const expected of ["retry-after", "x-ratelimit-reset", "exponential backoff", "conditional requests"]) {
  requireText("config/source-adapters/github.json", JSON.stringify(policy), expected);
}

for (const heading of [
  "## Scope",
  "## Allowlist Policy",
  "## Rate Limit Policy",
  "## Source Mapping",
  "## Failure Isolation",
  "## Verification"
]) {
  requireText("docs/ops/github-source-adapter.md", runbook, heading);
}

for (const expected of [
  "GET /repos/{owner}/{repo}",
  "GET /repos/{owner}/{repo}/releases",
  "allowlist-only",
  "no broad search polling",
  "concurrency = 1",
  "secondary rate limit",
  "retry-after",
  "x-ratelimit-reset",
  "existing source/raw-entry/failure pipeline",
  "RSS/Atom baseline",
  "`github:repository:{owner}/{repo}`",
  "`github:release:{owner}/{repo}:{release_id}`",
  "github:source-policy:check"
]) {
  requireText("docs/ops/github-source-adapter.md", runbook, expected);
}

for (const expected of [
  "GitHub Releases",
  "repository metadata first",
  "GDELT radar",
  "RSSHub whitelist",
  "PostgreSQL FTS remains the main search path"
]) {
  requireText("docs/adr/0038-source-expansion-uses-ordered-low-concurrency-adapters.md", adr, expected);
}

requireText("docs/CODEX_MASTER_PLAN.md", masterPlan, "| V2.6 | Structured Source Expansion and Similarity Signals | In Progress |");
requireText(".github/workflows/ci.yml", ciWorkflow, "node scripts/check-github-source-policy.mjs");
requireText("docs/ops/github-cicd.md", ciRunbook, "GitHub source policy contract check");

for (const [label, content] of [
  ["config/source-adapters/github.json", JSON.stringify(policy)],
  ["docs/ops/github-source-adapter.md", runbook],
  [".github/workflows/ci.yml", ciWorkflow],
  ["docs/ops/github-cicd.md", ciRunbook]
]) {
  rejectPattern(label, content, /BEGIN [A-Z ]*PRIVATE KEY|ghp_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+|GITHUB_TOKEN=.+[A-Za-z0-9]{8}|blankhoney\.xyz|\/srv\/reno_news/);
}

console.log("GitHub source policy check OK");
