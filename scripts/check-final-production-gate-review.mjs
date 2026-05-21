#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

function fail(message) {
  console.error(`Final production gate review check FAILED: ${message}`);
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
const report = read("docs/ops/final-production-gate-review.md");
const productionAudit = read("docs/ops/production-audit.md");
const ciWorkflow = read(".github/workflows/ci.yml");
const ciRunbook = read("docs/ops/github-cicd.md");

if (
  packageJson.scripts["production:gate:check"] !==
  "node scripts/check-final-production-gate-review.mjs"
) {
  fail("package.json must define production:gate:check");
}

for (const heading of [
  "# Final Production Gate Review",
  "## Review Method",
  "## Gate Decision",
  "## Blocking Production Gaps",
  "## Evidence Checked",
  "## Non-Blocking Deferrals",
  "## Verification"
]) {
  requireText("docs/ops/final-production-gate-review.md", report, heading);
}

for (const expectedGap of [
  "No production VPS/server layout",
  "No production domain",
  "No configured production deployment secrets",
  "No remote Prometheus scrape target",
  "No real object-store bucket",
  "No live MiniMax key",
  "No production incident owner",
  "No host/container hardening review",
  "No production privacy/legal review"
]) {
  requireText("docs/ops/final-production-gate-review.md", report, expectedGap);
}

for (const expectedEvidence of [
  "pnpm source:expansion:check",
  "pnpm github:source-policy:check",
  "pnpm arxiv:source-policy:check",
  "pnpm postgres:similarity:check",
  "pnpm release:handoff:check",
  "pnpm compose:production:check",
  "pnpm deploy:contract:check",
  "pnpm backup:offhost:check",
  "pnpm alerts:check",
  "pnpm ai:provider:check",
  "pnpm ai:golden:check",
  "pnpm --filter @reno-news/db test:integration",
  "pnpm --filter @reno-news/api test",
  "uv --project services/worker run python -m unittest discover -s services/worker/tests",
  "pnpm lint",
  "pnpm test",
  "pnpm build",
  "git diff --check",
  "only PostgreSQL was running locally"
]) {
  requireText("docs/ops/final-production-gate-review.md", report, expectedEvidence);
}

for (const expectedDeferral of [
  "GDELT runtime radar",
  "RSSHub route allowlist",
  "pgvector extension",
  "email digest delivery",
  "admin duplicate review workflow",
  "live GitHub/arXiv API calls",
  "browser smoke against a deployed production hostname"
]) {
  requireText("docs/ops/final-production-gate-review.md", report, expectedDeferral);
}

requireText("docs/ops/production-audit.md", productionAudit, "Final Production Gate Review");
requireText(".github/workflows/ci.yml", ciWorkflow, "node scripts/check-final-production-gate-review.mjs");
requireText("docs/ops/github-cicd.md", ciRunbook, "Final production gate review check");

for (const forbidden of [
  /is approved for public production launch/i,
  /production launch approved/i,
  /production launch is approved/i,
  /security certified/i,
  /live MiniMax verified/i,
  /off-host restore verified/i
]) {
  rejectPattern("docs/ops/final-production-gate-review.md", report, forbidden);
}

rejectPattern(
  "docs/ops/final-production-gate-review.md",
  report,
  /BEGIN [A-Z ]*PRIVATE KEY|ghp_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+|MINIMAX_API_KEY=.+[A-Za-z0-9]{8}|blankhoney\.xyz|\/srv\/reno_news/
);

console.log("Final production gate review check OK");
