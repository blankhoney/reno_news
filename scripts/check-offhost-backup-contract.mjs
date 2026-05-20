#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

function fail(message) {
  console.error(`Off-host backup contract check FAILED: ${message}`);
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
const backupScript = read("scripts/db-backup-offhost.sh");
const runbook = read("docs/ops/offhost-backup.md");
const backupRunbook = read("docs/ops/backup-restore.md");
const ciWorkflow = read(".github/workflows/ci.yml");

if (packageJson.scripts["backup:offhost:check"] !== "node scripts/check-offhost-backup-contract.mjs") {
  fail("package.json must define backup:offhost:check");
}

if (packageJson.scripts["db:backup:offhost"] !== "sh scripts/db-backup-offhost.sh") {
  fail("package.json must define db:backup:offhost");
}

for (const expected of [
  "pg_dump",
  "-Fc",
  "aws s3 cp",
  "BACKUP_S3_BUCKET",
  "BACKUP_S3_PREFIX",
  "BACKUP_S3_ENDPOINT_URL",
  "BACKUP_RETENTION_DAYS",
  "DRY_RUN",
  "BACKUP_MANIFEST_FILE",
  "db-restore-drill.sh"
]) {
  requireText("scripts/db-backup-offhost.sh", backupScript, expected);
}

for (const envName of [
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "BACKUP_S3_BUCKET",
  "BACKUP_S3_ENDPOINT_URL",
  "BACKUP_RETENTION_DAYS"
]) {
  requireText("docs/ops/offhost-backup.md", runbook, envName);
}

for (const expected of [
  "pg_dump -Fc",
  "S3-compatible",
  "restore drill",
  "retention",
  "DRY_RUN=1 pnpm db:backup:offhost",
  "pnpm db:restore:drill"
]) {
  requireText("docs/ops/offhost-backup.md", runbook, expected);
}

requireText("docs/ops/backup-restore.md", backupRunbook, "docs/ops/offhost-backup.md");
requireText(".github/workflows/ci.yml", ciWorkflow, "node scripts/check-offhost-backup-contract.mjs");

for (const [label, content] of [
  ["scripts/db-backup-offhost.sh", backupScript],
  ["docs/ops/offhost-backup.md", runbook],
  [".github/workflows/ci.yml", ciWorkflow]
]) {
  rejectPattern(label, content, /BEGIN [A-Z ]*PRIVATE KEY|AWS_SECRET_ACCESS_KEY=|aws_secret_access_key|blankhoney\.xyz|\/srv\/reno_news/);
}

console.log("Off-host backup contract check OK");
