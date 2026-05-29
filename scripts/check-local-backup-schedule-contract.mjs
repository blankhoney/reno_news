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
const systemdServicePath = "infra/systemd/reno-news-db-backup.service";
const systemdTimerPath = "infra/systemd/reno-news-db-backup.timer";
const backupRunbookPath = "docs/ops/backup-restore.md";
const productionAuditPath = "docs/ops/production-audit.md";
const productionGatePath = "docs/ops/final-production-gate-review.md";

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

for (const expected of [
  "LOCAL_BACKUP_MANIFEST_FILE",
  "latest-local-backup-manifest.json",
  "\"createdAt\"",
  "\"dumpFile\"",
  "\"retentionDays\"",
  "\"restoreCommand\"",
  "scripts/db-restore-drill.sh"
]) {
  requireText(retainedBackupScriptPath, retainedBackupScript, expected);
}

for (const path of [systemdServicePath, systemdTimerPath]) {
  if (!existsSync(path)) {
    fail(`${path} must exist`);
  }
}

const systemdService = readFileSync(systemdServicePath, "utf8");
const systemdTimer = readFileSync(systemdTimerPath, "utf8");

for (const expected of [
  "WorkingDirectory=/srv/reno_news",
  "User=deploy",
  "pnpm db:backup:local:retained",
  "LOCAL_BACKUP_RETENTION_DAYS=14"
]) {
  requireText(systemdServicePath, systemdService, expected);
}

for (const expected of [
  "OnCalendar=*-*-* 03:15:00",
  "Persistent=true",
  "Unit=reno-news-db-backup.service",
  "WantedBy=timers.target"
]) {
  requireText(systemdTimerPath, systemdTimer, expected);
}

for (const [label, content] of [
  [systemdServicePath, systemdService],
  [systemdTimerPath, systemdTimer]
]) {
  if (/BEGIN [A-Z ]*PRIVATE KEY|AWS_SECRET_ACCESS_KEY|RESEND_API_KEY|POSTGRES_PASSWORD|DATABASE_URL=/.test(content)) {
    fail(`${label} must not contain secrets`);
  }
}

const backupRunbook = readFileSync(backupRunbookPath, "utf8");
const productionAudit = readFileSync(productionAuditPath, "utf8");
const productionGate = readFileSync(productionGatePath, "utf8");

for (const expected of [
  "pnpm db:backup:local:retained",
  "reno-news-db-backup.timer",
  "LOCAL_BACKUP_RETENTION_DAYS",
  "This local timer does not replace off-host backup"
]) {
  requireText(backupRunbookPath, backupRunbook, expected);
}

for (const expected of [
  "local retained backup timer",
  "off-host backup remains blocked"
]) {
  requireText(productionAuditPath, productionAudit, expected);
  requireText(productionGatePath, productionGate, expected);
}

console.log("Local backup schedule contract check OK");
