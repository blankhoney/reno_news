#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const composeFile = process.env.COMPOSE_FILE || "infra/compose/compose.yml";

const requiredServices = ["api", "caddy", "postgres", "redis", "scheduler", "web", "worker"];
const healthProbes = [
  { url: "http://localhost:3000/healthz", service: "web" },
  { url: "http://localhost:3001/healthz", service: "api" },
  { url: "http://localhost:3002/healthz", service: "worker" },
  { url: "http://localhost:8080/healthz", service: "web" },
  { url: "http://localhost:8080/api/healthz", service: "api" },
  { url: "http://localhost:8080/worker/healthz", service: "worker" }
];

function fail(message) {
  console.error(`Release Health Audit FAILED: ${message}`);
  process.exit(1);
}

function runCommand(label, command, args, options = {}) {
  console.log(`==> ${label}`);
  const result = spawnSync(command, args, {
    cwd: options.cwd ? resolve(root, options.cwd) : root,
    env: process.env,
    stdio: "inherit"
  });

  if (result.error) {
    fail(`${label}: ${result.error.message}`);
  }

  if (result.status !== 0) {
    fail(`${label}: exited with ${result.status}`);
  }
}

function captureCommand(label, command, args, options = {}) {
  console.log(`==> ${label}`);
  const result = spawnSync(command, args, {
    cwd: options.cwd ? resolve(root, options.cwd) : root,
    env: process.env,
    encoding: "utf8"
  });

  if (result.error) {
    fail(`${label}: ${result.error.message}`);
  }

  if (result.status !== 0) {
    fail(`${label}: exited with ${result.status}\n${result.stderr}`);
  }

  return result.stdout;
}

function parseComposeRows(output) {
  const trimmed = output.trim();
  if (!trimmed) {
    return [];
  }

  if (trimmed.startsWith("[")) {
    return JSON.parse(trimmed);
  }

  return trimmed.split("\n").map((line) => JSON.parse(line));
}

function checkFile(path) {
  if (!existsSync(resolve(root, path))) {
    fail(`required file is missing: ${path}`);
  }
}

function checkReadinessFiles() {
  console.log("==> backup/restore readiness files");
  for (const path of [
    "docs/ops/backup-restore.md",
    "scripts/db-backup.sh",
    "scripts/db-restore-drill.sh"
  ]) {
    checkFile(path);
  }

  const gitignore = readFileSync(resolve(root, ".gitignore"), "utf8");
  if (!/^backups\/$/m.test(gitignore)) {
    fail("backups/ must stay ignored by git");
  }
}

function checkComposeStatus() {
  const output = captureCommand(
    `docker compose -f ${composeFile} ps --format json`,
    "docker",
    ["compose", "-f", composeFile, "ps", "--format", "json"]
  );
  const rows = parseComposeRows(output);
  const byService = new Map(rows.map((row) => [row.Service, row]));

  for (const service of requiredServices) {
    const row = byService.get(service);
    if (!row) {
      fail(`Compose service is missing: ${service}`);
    }
    if (row.State !== "running") {
      fail(`Compose service is not running: ${service} (${row.State})`);
    }
    if (row.Health && row.Health !== "healthy") {
      fail(`Compose service is not healthy: ${service} (${row.Health})`);
    }
  }
}

async function checkHealthProbes() {
  for (const probe of healthProbes) {
    console.log(`==> ${probe.url}`);
    const response = await fetch(probe.url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) {
      fail(`${probe.url}: HTTP ${response.status}`);
    }

    const body = await response.json();
    if (body.status !== "ok" || body.service !== probe.service) {
      fail(`${probe.url}: unexpected payload ${JSON.stringify(body)}`);
    }
  }
}

runCommand("pnpm install --frozen-lockfile", "pnpm", ["install", "--frozen-lockfile"]);
runCommand("pnpm lint", "pnpm", ["lint"]);
runCommand("pnpm test", "pnpm", ["test"]);
runCommand("pnpm build", "pnpm", ["build"]);
runCommand(
  "uv --project services/worker run python -m unittest discover -s services/worker/tests",
  "uv",
  ["--project", "services/worker", "run", "python", "-m", "unittest", "discover", "-s", "services/worker/tests"]
);
runCommand("uv lock --check", "uv", ["lock", "--check"], { cwd: "services/worker" });
checkComposeStatus();
await checkHealthProbes();
checkReadinessFiles();

console.log("Release Health Audit OK");
