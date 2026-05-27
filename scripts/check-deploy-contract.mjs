#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

function read(path) {
  return readFileSync(resolve(root, path), "utf8");
}

function fail(message) {
  console.error(`Deploy contract check FAILED: ${message}`);
  process.exit(1);
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
const deployScript = read("scripts/deploy-production.sh");
const runbook = read("docs/ops/production-deploy.md");
const githubRunbook = read("docs/ops/github-cicd.md");
const deployWorkflow = read(".github/workflows/deploy.yml");
const ciWorkflow = read(".github/workflows/ci.yml");

if (packageJson.scripts["deploy:contract:check"] !== "node scripts/check-deploy-contract.mjs") {
  fail("package.json must define deploy:contract:check");
}

for (const expected of [
  "RENO_NEWS_IMAGE_TAG",
  "RENO_NEWS_INGRESS_MODE",
  "infra/compose/compose.edge.yml",
  "infra/compose/compose.yml",
  "infra/compose/compose.production.yml",
  "docker compose",
  "pull",
  "pnpm db:migrate",
  "/healthz",
  "rollback",
  "previous-image-tag"
]) {
  requireText("scripts/deploy-production.sh", deployScript, expected);
}

for (const secretName of ["DEPLOY_HOST", "DEPLOY_USER", "DEPLOY_SSH_KEY", "DEPLOY_COMMAND"]) {
  requireText(".github/workflows/deploy.yml", deployWorkflow, secretName);
  requireText("docs/ops/production-deploy.md", runbook, secretName);
  requireText("docs/ops/github-cicd.md", githubRunbook, secretName);
}

for (const envName of [
  "DATABASE_URL",
  "POSTGRES_PASSWORD",
  "RENO_NEWS_SITE_ADDRESS",
  "RENO_NEWS_HEALTH_BASE_URL"
]) {
  requireText("docs/ops/production-deploy.md", runbook, envName);
}

requireText(".github/workflows/ci.yml", ciWorkflow, "node scripts/check-deploy-contract.mjs");
requireText("docs/ops/production-deploy.md", runbook, "rollback");
requireText("docs/ops/production-deploy.md", runbook, "health check");
requireText("docs/ops/production-deploy.md", runbook, "edge");
requireText("docs/ops/production-deploy.md", runbook, "RENO_NEWS_INGRESS_MODE");
requireText("docs/ops/github-cicd.md", githubRunbook, "scripts/deploy-production.sh");

for (const [label, content] of [
  ["scripts/deploy-production.sh", deployScript],
  ["docs/ops/production-deploy.md", runbook],
  [".github/workflows/deploy.yml", deployWorkflow]
]) {
  rejectPattern(label, content, /BEGIN OPENSSH PRIVATE KEY/);
}

console.log("Deploy contract check OK");
