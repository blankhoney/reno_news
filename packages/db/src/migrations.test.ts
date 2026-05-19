import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { listMigrationFiles } from "./migrations";

test("listMigrationFiles returns numbered SQL migrations in order", async () => {
  const directory = await mkdtemp(join(tmpdir(), "reno-news-migrations-"));

  try {
    await writeFile(join(directory, "0002_second.sql"), "select 2;");
    await writeFile(join(directory, "notes.md"), "ignore me");
    await writeFile(join(directory, "0001_first.sql"), "select 1;");

    const migrations = await listMigrationFiles(directory);

    assert.deepEqual(
      migrations.map((migration) => migration.filename),
      ["0001_first.sql", "0002_second.sql"]
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("reader feedback migration defines constrained item-scoped feedback", async () => {
  const migration = await readFile(
    join(process.cwd(), "../../infra/db/migrations/0008_reader_feedback.sql"),
    "utf8"
  );

  assert.match(migration, /create table if not exists reader_feedback/);
  assert.match(migration, /raw_entry_id bigint not null references raw_entries\(id\)/);
  assert.match(migration, /feedback_type text not null check/);
  for (const feedbackType of [
    "correction",
    "quality_issue",
    "duplicate",
    "broken_link",
    "rights_concern"
  ]) {
    assert.match(migration, new RegExp(`'${feedbackType}'`));
  }
});

test("reader feedback review migration defines constrained review state", async () => {
  const migration = await readFile(
    join(process.cwd(), "../../infra/db/migrations/0009_reader_feedback_review.sql"),
    "utf8"
  );

  assert.match(migration, /alter table reader_feedback/);
  assert.match(migration, /review_status text not null default 'open'/);
  assert.match(migration, /reader_feedback_review_status_check/);
  for (const reviewStatus of ["open", "reviewed", "dismissed", "resolved"]) {
    assert.match(migration, new RegExp(`'${reviewStatus}'`));
  }
  assert.match(migration, /review_note text/);
  assert.match(migration, /length\(review_note\) <= 2000/);
  assert.match(migration, /reviewed_at timestamptz/);
});

test("backup and restore drill scripts stay local and disposable", async () => {
  const packageJson = JSON.parse(
    await readFile(join(process.cwd(), "../../package.json"), "utf8")
  ) as { scripts: Record<string, string> };
  const backupScript = await readFile(
    join(process.cwd(), "../../scripts/db-backup.sh"),
    "utf8"
  );
  const restoreScript = await readFile(
    join(process.cwd(), "../../scripts/db-restore-drill.sh"),
    "utf8"
  );
  const gitignore = await readFile(join(process.cwd(), "../../.gitignore"), "utf8");

  assert.equal(packageJson.scripts["db:backup:local"], "sh scripts/db-backup.sh");
  assert.equal(packageJson.scripts["db:restore:drill"], "sh scripts/db-restore-drill.sh");
  assert.match(gitignore, /^backups\/$/m);

  assert.match(backupScript, /pg_dump/);
  assert.match(backupScript, /-Fc/);
  assert.match(backupScript, /docker compose -f "\$COMPOSE_FILE" exec -T postgres/);
  assert.doesNotMatch(backupScript, /cron|systemd|aws|s3|gsutil|wal/i);

  assert.match(restoreScript, /pg_restore/);
  assert.match(restoreScript, /--exit-on-error/);
  assert.match(restoreScript, /RESTORE_DATABASE/);
  assert.match(restoreScript, /template0/);
  assert.match(restoreScript, /dropdb/);
  assert.match(restoreScript, /docker compose -f "\$COMPOSE_FILE" exec -T postgres/);
  assert.match(restoreScript, /RESTORE_DATABASE" = "\$PRIMARY_DATABASE"/);
  assert.doesNotMatch(restoreScript, /cron|systemd|aws|s3|gsutil|wal/i);
});

test("release health audit stays local and non-deploying", async () => {
  const packageJson = JSON.parse(
    await readFile(join(process.cwd(), "../../package.json"), "utf8")
  ) as { scripts: Record<string, string> };
  const auditScript = await readFile(
    join(process.cwd(), "../../scripts/release-health-audit.mjs"),
    "utf8"
  );
  const runbook = await readFile(
    join(process.cwd(), "../../docs/ops/release-health-audit.md"),
    "utf8"
  );

  assert.equal(
    packageJson.scripts["release:audit:local"],
    "node scripts/release-health-audit.mjs"
  );

  for (const expectedCheck of [
    "pnpm install --frozen-lockfile",
    "pnpm lint",
    "pnpm test",
    "pnpm build",
    "uv --project services/worker run python -m unittest discover -s services/worker/tests",
    "uv lock --check",
    "docker compose -f",
    "ps --format json",
    "http://localhost:3000/healthz",
    "http://localhost:3001/healthz",
    "http://localhost:3002/healthz",
    "http://localhost:8080/healthz",
    "http://localhost:8080/api/healthz",
    "http://localhost:8080/worker/healthz",
    "docs/ops/backup-restore.md",
    "scripts/db-backup.sh",
    "scripts/db-restore-drill.sh"
  ]) {
    assert.match(auditScript, new RegExp(expectedCheck.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(runbook, /Failure Handling/);
  assert.match(runbook, /Limitations/);
  assert.doesNotMatch(
    auditScript,
    /docker compose (pull|push|up)|git push|gh release|scp|ssh|webhook|alertmanager|uptime/i
  );
});

test("disk usage guard stays read-only and log-bounded", async () => {
  const packageJson = JSON.parse(
    await readFile(join(process.cwd(), "../../package.json"), "utf8")
  ) as { scripts: Record<string, string> };
  const composeFile = await readFile(
    join(process.cwd(), "../../infra/compose/compose.yml"),
    "utf8"
  );
  const diskScript = await readFile(
    join(process.cwd(), "../../scripts/disk-usage-check.mjs"),
    "utf8"
  );
  const runbook = await readFile(join(process.cwd(), "../../docs/ops/disk-usage.md"), "utf8");

  assert.equal(packageJson.scripts["disk:check:local"], "node scripts/disk-usage-check.mjs");

  for (const serviceName of ["web", "api", "worker", "scheduler", "postgres", "redis", "caddy"]) {
    const serviceBlock = composeFile.match(
      new RegExp(`\\n  ${serviceName}:\\n([\\s\\S]*?)(?=\\n  [a-z]|$)`)
    )?.[1];
    assert.ok(serviceBlock, `missing Compose service ${serviceName}`);
    assert.match(serviceBlock, /\n    logging:/);
  }
  assert.equal((composeFile.match(/driver: "json-file"/g) ?? []).length, 7);
  assert.equal((composeFile.match(/max-size: "10m"/g) ?? []).length, 7);
  assert.equal((composeFile.match(/max-file: "5"/g) ?? []).length, 7);

  for (const expectedCheck of [
    "docker system df",
    "DISK_BACKUP_MAX_BYTES",
    "backups",
    "docs/ops/disk-usage.md"
  ]) {
    assert.match(diskScript, new RegExp(expectedCheck.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(runbook, /Failure Handling/);
  assert.match(runbook, /Manual Cleanup/);
  assert.match(runbook, /Limitations/);
  assert.doesNotMatch(
    diskScript,
    /docker system prune|docker volume rm|docker rm|rm -rf|unlink|rmdir|writeFile|fs\.rm/i
  );
});
