#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

function fail(message) {
  console.error(`Alert rules check FAILED: ${message}`);
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
const rules = read("infra/monitoring/prometheus/alerts.yml");
const runbook = read("docs/ops/alerts.md");
const ciWorkflow = read(".github/workflows/ci.yml");

if (packageJson.scripts["alerts:check"] !== "node scripts/check-alert-rules.mjs") {
  fail("package.json must define alerts:check");
}

for (const alertName of [
  "RenoNewsApiDown",
  "RenoNewsWorkerDown",
  "RenoNewsFailureQueueBacklogHigh",
  "RenoNewsIngestFailuresHigh",
  "RenoNewsModelFailuresPresent",
  "RenoNewsBackupSignalMissing",
  "RenoNewsDiskRisk"
]) {
  requireText("infra/monitoring/prometheus/alerts.yml", rules, `alert: ${alertName}`);
  requireText("infra/monitoring/prometheus/alerts.yml", rules, "runbook_url");
  requireText("docs/ops/alerts.md", runbook, `## ${alertName}`);
}

for (const expectedMetric of [
  "reno_news_api_failure_queue_backlog",
  "reno_news_api_ingest_failures",
  "reno_news_api_model_failures",
  "reno_news_api_backup_offhost_contract_configured",
  "node_filesystem_avail_bytes"
]) {
  requireText("infra/monitoring/prometheus/alerts.yml", rules, expectedMetric);
}

for (const expectedRunbookTerm of [
  "Diagnosis",
  "Mitigation",
  "Escalation",
  "Limitations",
  "pnpm release:audit:local",
  "pnpm disk:check:local",
  "pnpm db:restore:drill"
]) {
  requireText("docs/ops/alerts.md", runbook, expectedRunbookTerm);
}

requireText(".github/workflows/ci.yml", ciWorkflow, "node scripts/check-alert-rules.mjs");

for (const [label, content] of [
  ["infra/monitoring/prometheus/alerts.yml", rules],
  ["docs/ops/alerts.md", runbook]
]) {
  rejectPattern(label, content, /BEGIN [A-Z ]*PRIVATE KEY|AWS_SECRET_ACCESS_KEY=|blankhoney\.xyz|\/srv\/reno_news/);
}

console.log("Alert rules check OK");
