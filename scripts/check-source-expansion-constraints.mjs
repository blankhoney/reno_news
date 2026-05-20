#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

function fail(message) {
  console.error(`Source expansion constraints check FAILED: ${message}`);
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
const gdeltPolicy = readJson("config/source-adapters/gdelt.json");
const rsshubPolicy = readJson("config/source-adapters/rsshub.json");
const runbook = read("docs/ops/gdelt-radar-rsshub-whitelist.md");
const context = read("CONTEXT.md");
const ciWorkflow = read(".github/workflows/ci.yml");
const ciRunbook = read("docs/ops/github-cicd.md");

if (packageJson.scripts["source:expansion:check"] !== "node scripts/check-source-expansion-constraints.mjs") {
  fail("package.json must define source:expansion:check");
}

if (gdeltPolicy.adapter !== "gdelt" || gdeltPolicy.enabled !== false) {
  fail("GDELT policy must default to adapter=gdelt and enabled=false");
}

if (gdeltPolicy.mode !== "candidate_radar_only") {
  fail("GDELT policy mode must be candidate_radar_only");
}

if (gdeltPolicy.outputs?.writesRawEntries !== false || gdeltPolicy.outputs?.createsSources !== false) {
  fail("GDELT radar must not write raw entries or create sources automatically");
}

if (!gdeltPolicy.reviewGate?.operatorReviewRequired) {
  fail("GDELT radar candidates must require operator review");
}

if (!gdeltPolicy.scope?.allowedEndpoints?.includes("GET /api/v2/doc/doc")) {
  fail("GDELT policy must only allow the DOC 2.0 endpoint in this slice");
}

if (gdeltPolicy.rateLimit?.concurrency !== 1 || gdeltPolicy.rateLimit?.maxRecordsPerQuery > 50) {
  fail("GDELT radar must remain low-concurrency and max 50 records per query");
}

for (const forbidden of ["full corpus ingest", "event table import", "image mirroring", "automatic publication"]) {
  if (!gdeltPolicy.scope?.forbiddenPatterns?.includes(forbidden)) {
    fail(`GDELT forbiddenPatterns must include ${forbidden}`);
  }
}

if (rsshubPolicy.adapter !== "rsshub" || rsshubPolicy.enabled !== false) {
  fail("RSSHub policy must default to adapter=rsshub and enabled=false");
}

if (rsshubPolicy.scope?.whitelistOnly !== true) {
  fail("RSSHub policy must be whitelist-only");
}

if ((rsshubPolicy.scope?.allowedRoutes ?? []).length !== 0) {
  fail("RSSHub allowedRoutes must start empty; real routes are operator-managed");
}

if (rsshubPolicy.outputs?.createsSourcesAutomatically !== false) {
  fail("RSSHub must not create Source Registry entries automatically");
}

for (const forbidden of ["wildcard route expansion", "unsafe user-supplied domains", "fulltext mode by default", "public instance dependency"]) {
  if (!rsshubPolicy.scope?.forbiddenPatterns?.includes(forbidden)) {
    fail(`RSSHub forbiddenPatterns must include ${forbidden}`);
  }
}

if (!rsshubPolicy.scope?.allowedOutputFormats?.includes("rss") || !rsshubPolicy.scope?.allowedOutputFormats?.includes("atom")) {
  fail("RSSHub policy must allow only feed formats needed by the existing RSS/Atom pipeline");
}

for (const expected of [
  "candidate radar only",
  "operator review",
  "writesRawEntries = false",
  "no full GDELT ingest",
  "RSSHub whitelist only",
  "allowedRoutes starts empty",
  "no wildcard route expansion",
  "source:expansion:check"
]) {
  requireText("docs/ops/gdelt-radar-rsshub-whitelist.md", runbook, expected);
}

for (const expected of ["GDELT Radar", "RSSHub Whitelist"]) {
  requireText("CONTEXT.md", context, expected);
}

requireText(".github/workflows/ci.yml", ciWorkflow, "node scripts/check-source-expansion-constraints.mjs");
requireText("docs/ops/github-cicd.md", ciRunbook, "GDELT/RSSHub source expansion constraints check");

for (const [label, content] of [
  ["config/source-adapters/gdelt.json", JSON.stringify(gdeltPolicy)],
  ["config/source-adapters/rsshub.json", JSON.stringify(rsshubPolicy)],
  ["docs/ops/gdelt-radar-rsshub-whitelist.md", runbook],
  [".github/workflows/ci.yml", ciWorkflow],
  ["docs/ops/github-cicd.md", ciRunbook]
]) {
  rejectPattern(label, content, /BEGIN [A-Z ]*PRIVATE KEY|ghp_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+|GITHUB_TOKEN=.+[A-Za-z0-9]{8}|blankhoney\.xyz|\/srv\/reno_news/);
}

console.log("Source expansion constraints check OK");
