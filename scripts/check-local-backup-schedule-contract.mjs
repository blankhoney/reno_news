#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

function fail(message) {
  console.error(`Local backup schedule contract check FAILED: ${message}`);
  process.exit(1);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function requireText(label, content, expected) {
  if (!content.includes(expected)) {
    fail(`${label} must contain ${expected}`);
  }
}

const packageJson = readJson("package.json");
const retainedBackupScriptPath = "scripts/db-backup-local-retained.sh";

if (packageJson.scripts["backup:local-schedule:check"] !== "node scripts/check-local-backup-schedule-contract.mjs") {
  fail("package.json must define backup:local-schedule:check");
}

if (!packageJson.scripts["db:backup:local:retained"]) {
  fail("package.json must define db:backup:local:retained");
}

if (!existsSync(retainedBackupScriptPath)) {
  fail(`${retainedBackupScriptPath} must exist`);
}

const retainedBackupScript = readFileSync(retainedBackupScriptPath, "utf8");

if (!retainedBackupScript.includes("scripts/db-backup.sh")) {
  fail("retained local backup must call scripts/db-backup.sh");
}

if (retainedBackupScript.includes("Retained local backup placeholder")) {
  fail("retained local backup must not be a placeholder");
}

for (const expected of [
  "LOCAL_BACKUP_RETENTION_DAYS",
  "BACKUP_RETENTION_DAYS",
  "must be at least 7",
  "find \"$BACKUP_DIR\" -maxdepth 1 -type f -name 'reno_news-*.dump'",
  "-exec rm -f {} +"
]) {
  requireText(retainedBackupScriptPath, retainedBackupScript, expected);
}

console.log("Local backup schedule contract check OK");
