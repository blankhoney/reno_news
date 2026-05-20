#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

function fail(message) {
  console.error(`PostgreSQL similarity contract check FAILED: ${message}`);
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
const migration = read("infra/db/migrations/0016_postgresql_similarity_dedup.sql");
const adr = read("docs/adr/0039-postgresql-similarity-signals-stay-secondary.md");
const runbook = read("docs/ops/postgres-similarity-dedup.md");
const schema = read("docs/db/schema.md");
const context = read("CONTEXT.md");
const ciWorkflow = read(".github/workflows/ci.yml");
const ciRunbook = read("docs/ops/github-cicd.md");

if (
  packageJson.scripts["postgres:similarity:check"] !==
  "node scripts/check-postgres-similarity-contract.mjs"
) {
  fail("package.json must define postgres:similarity:check");
}

for (const expected of [
  "create extension if not exists pg_trgm",
  "raw_entries_title_trgm_idx",
  "title gin_trgm_ops",
  "raw_entries_url_trgm_idx",
  "url gin_trgm_ops",
  "raw_entry_duplicate_groups",
  "raw_entry_similarity_signals",
  "duplicate_group_id",
  "canonical_hash",
  "score numeric(5,4) not null check (score >= 0 and score <= 1)"
]) {
  requireText("infra/db/migrations/0016_postgresql_similarity_dedup.sql", migration, expected);
}

for (const expected of [
  "PostgreSQL full-text search remains the primary reader search path",
  "pg_trgm",
  "raw_entries.canonical_hash",
  "raw_entry_duplicate_groups",
  "raw_entry_similarity_signals",
  "`pgvector` remains optional",
  "must not require `CREATE EXTENSION vector`",
  "external search services remain deferred"
]) {
  requireText("docs/adr/0039-postgresql-similarity-signals-stay-secondary.md", adr, expected);
}

for (const expected of [
  "PostgreSQL FTS remains the primary reader search path",
  "raw_entries.title",
  "raw_entries.url",
  "raw_entries.canonical_hash",
  "score in 0..1",
  "`pgvector` remains optional",
  "no `vector` extension is required",
  "pnpm postgres:similarity:check"
]) {
  requireText("docs/ops/postgres-similarity-dedup.md", runbook, expected);
}

for (const expected of [
  "Duplicate Group",
  "Similarity Signal"
]) {
  requireText("CONTEXT.md", context, expected);
}

for (const expected of [
  "raw_entry_duplicate_groups",
  "raw_entry_similarity_signals",
  "duplicate_group_id",
  "pg_trgm"
]) {
  requireText("docs/db/schema.md", schema, expected);
}

requireText(".github/workflows/ci.yml", ciWorkflow, "node scripts/check-postgres-similarity-contract.mjs");
requireText("docs/ops/github-cicd.md", ciRunbook, "PostgreSQL similarity/dedup contract check");

for (const [label, content] of [
  ["infra/db/migrations/0016_postgresql_similarity_dedup.sql", migration]
]) {
  rejectPattern(label, content, /create extension if not exists vector/i);
  rejectPattern(label, content, /meilisearch|opensearch|elasticsearch/i);
}

for (const [label, content] of [
  ["docs/adr/0039-postgresql-similarity-signals-stay-secondary.md", adr],
  ["docs/ops/postgres-similarity-dedup.md", runbook],
  ["docs/db/schema.md", schema],
  ["docs/ops/github-cicd.md", ciRunbook]
]) {
  rejectPattern(label, content, /BEGIN [A-Z ]*PRIVATE KEY|ghp_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+|blankhoney\.xyz|\/srv\/reno_news/);
}

console.log("PostgreSQL similarity contract check OK");
