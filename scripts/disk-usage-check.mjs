#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const backupDir = process.env.DISK_BACKUP_DIR || "backups";
const DISK_BACKUP_MAX_BYTES = Number(process.env.DISK_BACKUP_MAX_BYTES || 1024 * 1024 * 1024);

function fail(message) {
  console.error(`Disk Usage Guard FAILED: ${message}`);
  process.exit(1);
}

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes}B`;
  }
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(2)}${units[unitIndex]}`;
}

function directorySize(path) {
  if (!existsSync(path)) {
    return { bytes: 0, files: 0 };
  }

  let bytes = 0;
  let files = 0;
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    const entryPath = join(path, entry.name);
    if (entry.isDirectory()) {
      const child = directorySize(entryPath);
      bytes += child.bytes;
      files += child.files;
    } else if (entry.isFile()) {
      const stat = statSync(entryPath);
      bytes += stat.size;
      files += 1;
    }
  }
  return { bytes, files };
}

function parseDockerSystemDf(output) {
  const trimmed = output.trim();
  if (!trimmed) {
    return [];
  }

  if (trimmed.startsWith("[")) {
    return JSON.parse(trimmed);
  }

  return trimmed.split("\n").map((line) => JSON.parse(line));
}

function inspectDockerDiskUsage() {
  console.log("==> docker system df --format json");
  const result = spawnSync("docker", ["system", "df", "--format", "json"], {
    cwd: root,
    encoding: "utf8"
  });

  if (result.error) {
    fail(`docker system df failed: ${result.error.message}`);
  }

  if (result.status !== 0) {
    fail(`docker system df failed with ${result.status}: ${result.stderr}`);
  }

  const rows = parseDockerSystemDf(result.stdout);
  if (rows.length === 0) {
    fail("docker system df returned no rows");
  }

  for (const row of rows) {
    console.log(`${row.Type}: size=${row.Size}, reclaimable=${row.Reclaimable}, total=${row.TotalCount}, active=${row.Active}`);
  }
}

function inspectBackupArtifacts() {
  const path = resolve(root, backupDir);
  const size = directorySize(path);
  console.log(`==> ${backupDir}: files=${size.files}, size=${formatBytes(size.bytes)}, limit=${formatBytes(DISK_BACKUP_MAX_BYTES)}`);
  if (size.bytes > DISK_BACKUP_MAX_BYTES) {
    fail(`${backupDir} exceeds DISK_BACKUP_MAX_BYTES`);
  }
}

function checkRunbook() {
  const path = resolve(root, "docs/ops/disk-usage.md");
  if (!existsSync(path)) {
    fail("docs/ops/disk-usage.md is missing");
  }
}

inspectDockerDiskUsage();
inspectBackupArtifacts();
checkRunbook();

console.log("Disk Usage Guard OK");
