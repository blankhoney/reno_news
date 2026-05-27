#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

function fail(message) {
  console.error(`Release handoff check FAILED: ${message}`);
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
const handoff = read("docs/ops/release-handoff.md");
const ciWorkflow = read(".github/workflows/ci.yml");
const ciRunbook = read("docs/ops/github-cicd.md");
const productionAudit = read("docs/ops/production-audit.md");

if (packageJson.scripts["release:handoff:check"] !== "node scripts/check-release-handoff.mjs") {
  fail("package.json must define release:handoff:check");
}

for (const heading of [
  "# Public Repo CI/CD Release Handoff",
  "## Repository State",
  "## Branch And Environment Protection",
  "## Workflows",
  "## Secrets And Packages",
  "## Release Handoff Steps",
  "## Remaining Gaps",
  "## Verification"
]) {
  requireText("docs/ops/release-handoff.md", handoff, heading);
}

for (const expected of [
  "https://github.com/blankhoney/reno_news",
  "Visibility: public",
  "Default branch: `main`",
  "re-run the verification commands after every push",
  "required status checks are strict",
  "JavaScript lint, test, build",
  "Python worker tests",
  "PostgreSQL integration tests",
  "Docker Compose config",
  "pull request review is required",
  "force pushes and branch deletion are blocked",
  "required reviewer: `blankhoney`",
  "production environment secrets are configured",
  "`CI`",
  "`Deploy`",
  "`Publish Images`",
  "Deploy` is manual-only",
  "hardened ingress deploy",
  "controlled rollback drill",
  "DEPLOY_HOST",
  "DEPLOY_USER",
  "DEPLOY_SSH_KEY",
  "DEPLOY_COMMAND",
  "read:packages",
  "production deploy and rollback pulls",
  "pnpm release:handoff:check",
  "gh repo view blankhoney/reno_news",
  "gh api repos/blankhoney/reno_news/branches/main/protection",
  "gh api repos/blankhoney/reno_news/environments/production"
]) {
  requireText("docs/ops/release-handoff.md", handoff, expected);
}

requireText(".github/workflows/ci.yml", ciWorkflow, "node scripts/check-release-handoff.mjs");
requireText("docs/ops/github-cicd.md", ciRunbook, "Release handoff contract check");
requireText("docs/ops/production-audit.md", productionAudit, "docs/ops/release-handoff.md");

for (const [label, content] of [
  ["docs/ops/release-handoff.md", handoff],
  [".github/workflows/ci.yml", ciWorkflow],
  ["docs/ops/github-cicd.md", ciRunbook],
  ["docs/ops/production-audit.md", productionAudit]
]) {
  rejectPattern(label, content, /BEGIN [A-Z ]*PRIVATE KEY|ghp_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+|GITHUB_TOKEN=.+[A-Za-z0-9]{8}|MINIMAX_API_KEY=.+[A-Za-z0-9]{8}/);
}

for (const forbidden of [
  /production deployment approved/i,
  /production launch approved/i,
  /GHCR package versions verified/i,
  /full production launch readiness is approved/i
]) {
  rejectPattern("docs/ops/release-handoff.md", handoff, forbidden);
}

console.log("Release handoff check OK");
