#!/usr/bin/env node
import { readFileSync } from "node:fs";

function fail(message) {
  console.error(`Local backup schedule contract check FAILED: ${message}`);
  process.exit(1);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

const packageJson = readJson("package.json");

if (packageJson.scripts["backup:local-schedule:check"] !== "node scripts/check-local-backup-schedule-contract.mjs") {
  fail("package.json must define backup:local-schedule:check");
}

if (!packageJson.scripts["db:backup:local:retained"]) {
  fail("package.json must define db:backup:local:retained");
}

console.log("Local backup schedule contract check OK");
