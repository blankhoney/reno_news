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

test("auth identity migration defines invite-only users, sessions, and login attempts", async () => {
  const migration = await readFile(
    join(process.cwd(), "../../infra/db/migrations/0010_auth_identity_rbac.sql"),
    "utf8"
  );

  for (const tableName of ["users", "user_invites", "user_sessions", "auth_login_attempts"]) {
    assert.match(migration, new RegExp(`create table if not exists ${tableName}`));
  }

  assert.match(migration, /users_role_check/);
  assert.match(migration, /role text not null default 'reader'/);
  assert.match(migration, /check \(role in \('reader', 'admin'\)\)/);
  assert.match(migration, /password_hash text not null/);
  assert.match(migration, /password_hash like '\$argon2id\$%'/);
  assert.match(migration, /users_email_lower_unique/);

  assert.match(migration, /user_invites_role_check/);
  assert.match(migration, /token_hash text not null unique/);
  assert.match(migration, /expires_at timestamptz not null/);
  assert.match(migration, /accepted_by_user_id bigint unique references users\(id\)/);

  assert.match(migration, /user_sessions_token_hash_unique/);
  assert.match(migration, /session_token_hash text not null/);
  assert.match(migration, /revoked_at timestamptz/);

  assert.match(migration, /auth_login_attempts_outcome_check/);
  assert.match(migration, /outcome text not null/);
  assert.match(migration, /failure_reason text/);
  assert.match(migration, /failure_reason is not null/);
});

test("audit events migration defines actor, action, object, request, and metadata fields", async () => {
  const migration = await readFile(
    join(process.cwd(), "../../infra/db/migrations/0011_audit_events.sql"),
    "utf8"
  );

  assert.match(migration, /create table if not exists audit_events/);
  assert.match(migration, /actor_user_id bigint references users\(id\) on delete set null/);
  assert.match(migration, /actor_role text/);
  assert.match(migration, /action text not null/);
  assert.match(migration, /object_type text not null/);
  assert.match(migration, /object_id text/);
  assert.match(migration, /request_id text not null/);
  assert.match(migration, /metadata_json jsonb not null default '\{\}'::jsonb/);
  assert.match(migration, /created_at timestamptz not null default now\(\)/);
  assert.match(migration, /audit_events_actor_created_idx/);
  assert.match(migration, /audit_events_action_created_idx/);
  assert.match(migration, /audit_events_object_created_idx/);
});

test("account personal state migration defines saved, read-later, and read status tables", async () => {
  const migration = await readFile(
    join(process.cwd(), "../../infra/db/migrations/0012_user_personal_state.sql"),
    "utf8"
  );

  for (const tableName of ["user_saved_items", "user_read_later_items", "user_read_status"]) {
    assert.match(migration, new RegExp(`create table if not exists ${tableName}`));
    assert.match(migration, new RegExp(`${tableName}_user_item_unique`));
    assert.match(migration, /user_id bigint not null references users\(id\) on delete cascade/);
    assert.match(migration, /raw_entry_id bigint not null references raw_entries\(id\) on delete cascade/);
  }

  assert.match(migration, /primary key \(user_id, raw_entry_id\)/);
  assert.match(migration, /read_status text not null/);
  assert.match(migration, /user_read_status_value_check/);
  assert.match(migration, /check \(read_status in \('unread', 'read'\)\)/);
  assert.match(migration, /read_at timestamptz/);
  assert.match(migration, /user_saved_items_raw_entry_idx/);
  assert.match(migration, /user_read_later_items_raw_entry_idx/);
  assert.match(migration, /user_read_status_raw_entry_idx/);
});

test("digest edition migration defines persisted editions and ordered item snapshots", async () => {
  const migration = await readFile(
    join(process.cwd(), "../../infra/db/migrations/0013_digest_editions.sql"),
    "utf8"
  );

  assert.match(migration, /create table if not exists digest_editions/);
  assert.match(migration, /edition_key text not null/);
  assert.match(migration, /edition_date date not null/);
  assert.match(migration, /board_id bigint references boards\(id\) on delete restrict/);
  assert.match(migration, /status text not null default 'draft'/);
  assert.match(migration, /digest_editions_status_check/);
  for (const status of ["draft", "reviewed", "archived"]) {
    assert.match(migration, new RegExp(`'${status}'`));
  }
  assert.match(migration, /generation_metadata_json jsonb not null default '\{\}'::jsonb/);
  assert.match(migration, /reviewed_by_user_id bigint references users\(id\) on delete set null/);
  assert.match(migration, /review_note text/);
  assert.match(migration, /length\(review_note\) <= 2000/);

  assert.match(migration, /create table if not exists digest_edition_items/);
  assert.match(migration, /digest_edition_id bigint not null references digest_editions\(id\) on delete cascade/);
  assert.match(migration, /raw_entry_id bigint not null references raw_entries\(id\) on delete restrict/);
  assert.match(migration, /item_position integer not null/);
  assert.match(migration, /item_snapshot_json jsonb not null/);
  assert.match(migration, /digest_edition_items_position_unique/);
  assert.match(migration, /primary key \(digest_edition_id, raw_entry_id\)/);
  assert.match(migration, /digest_editions_date_idx/);
  assert.match(migration, /digest_edition_items_raw_entry_idx/);
});

test("GitHub source adapter migration allows GitHub sources and rate-limit attempts", async () => {
  const migration = await readFile(
    join(process.cwd(), "../../infra/db/migrations/0014_github_source_adapter.sql"),
    "utf8"
  );

  assert.match(migration, /sources_source_type_check/);
  assert.match(migration, /source_type in \('rss', 'atom', 'github'\)/);
  assert.match(migration, /source_ingest_attempts_failure_type_check/);
  assert.match(migration, /failure_type in \('network', 'parse', 'policy', 'duplicate', 'rate_limit', 'unknown'\)/);
});

test("arXiv source adapter migration allows arXiv sources without changing failure vocabulary", async () => {
  const migration = await readFile(
    join(process.cwd(), "../../infra/db/migrations/0015_arxiv_source_adapter.sql"),
    "utf8"
  );

  assert.match(migration, /sources_source_type_check/);
  assert.match(migration, /source_type in \('rss', 'atom', 'github', 'arxiv'\)/);
  assert.doesNotMatch(migration, /download|pdf|source files/i);
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

test("production audit report stays evidence-only and non-approving", async () => {
  const packageJson = JSON.parse(
    await readFile(join(process.cwd(), "../../package.json"), "utf8")
  ) as { scripts: Record<string, string> };
  const report = await readFile(
    join(process.cwd(), "../../docs/ops/production-audit.md"),
    "utf8"
  );

  for (const heading of [
    "# Production Audit",
    "## Evidence Matrix",
    "## Residual Production Gaps",
    "## Explicit Non-Goals",
    "## Runbook References",
    "## Production Launch Boundary"
  ]) {
    assert.match(report, new RegExp(heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  for (const expectedEvidence of [
    "pnpm release:audit:local",
    "pnpm disk:check:local",
    "docs/ops/release-health-audit.md",
    "docs/ops/metrics.md",
    "docs/ops/logging-trace.md",
    "docs/ops/alerts.md",
    "docs/ops/backup-restore.md",
    "docs/ops/offhost-backup.md",
    "docs/ops/disk-usage.md",
    "branch/environment protection configured",
    "http://localhost:8080/api/healthz"
  ]) {
    assert.match(report, new RegExp(expectedEvidence.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  for (const residualGap of [
    "No production deployment target",
    "No remote monitoring or alerting",
    "No production backup schedule or PITR",
    "No production secret management",
    "No real object-store bucket",
    "No production restore objective"
  ]) {
    assert.match(report, new RegExp(residualGap.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(report, /not a deployment approval/i);
  assert.doesNotMatch(
    report,
    /docker compose (pull|push|up)|git push|gh release|scp|ssh|webhook|alertmanager|uptime/i
  );

  for (const scriptName of Object.keys(packageJson.scripts)) {
    if (scriptName === "deploy:contract:check") {
      continue;
    }
    assert.doesNotMatch(scriptName, /deploy|publish|push/i);
  }
});

test("GitHub CI/CD workflows define quality gate, image publishing, and manual deploy handoff", async () => {
  const ciWorkflow = await readFile(join(process.cwd(), "../../.github/workflows/ci.yml"), "utf8");
  const publishWorkflow = await readFile(
    join(process.cwd(), "../../.github/workflows/docker-publish.yml"),
    "utf8"
  );
  const deployWorkflow = await readFile(
    join(process.cwd(), "../../.github/workflows/deploy.yml"),
    "utf8"
  );
  const runbook = await readFile(join(process.cwd(), "../../docs/ops/github-cicd.md"), "utf8");
  const adr = await readFile(
    join(process.cwd(), "../../docs/adr/0030-github-actions-ghcr-and-manual-ssh-deploy.md"),
    "utf8"
  );

  for (const expectedCiBoundary of [
    "pull_request:",
    "FORCE_JAVASCRIPT_ACTIONS_TO_NODE24",
    "branches:",
    "- main",
    "JavaScript lint, test, build",
    "pnpm install --frozen-lockfile",
    "pnpm lint",
    "pnpm test",
    "pnpm build",
    "Python worker tests",
    "uv lock --check",
    "uv run python -m unittest discover -s tests",
    "PostgreSQL integration tests",
    "postgres:18-alpine",
    "pnpm db:migrate",
    "pnpm db:seed",
    "pnpm --filter @reno-news/db test:integration",
    "Docker Compose config",
    "docker compose -f infra/compose/compose.yml config"
  ]) {
    assert.match(
      ciWorkflow,
      new RegExp(expectedCiBoundary.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    );
  }

  for (const expectedPublishBoundary of [
    "packages: write",
    "FORCE_JAVASCRIPT_ACTIONS_TO_NODE24",
    "ghcr.io",
    "docker/login-action",
    "docker/metadata-action",
    "docker/build-push-action",
    "apps/web/Dockerfile",
    "apps/api/Dockerfile",
    "services/worker/Dockerfile",
    "reno-news-web",
    "reno-news-api",
    "reno-news-worker",
    "type=sha,prefix=sha-",
    "type=ref,event=tag"
  ]) {
    assert.match(
      publishWorkflow,
      new RegExp(expectedPublishBoundary.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    );
  }

  for (const expectedDeployBoundary of [
    "workflow_dispatch:",
    "environment: production",
    "DEPLOY_HOST",
    "DEPLOY_USER",
    "DEPLOY_SSH_KEY",
    "DEPLOY_COMMAND",
    "RENO_NEWS_IMAGE_TAG",
    "ssh \"$DEPLOY_USER@$DEPLOY_HOST\""
  ]) {
    assert.match(
      deployWorkflow,
      new RegExp(expectedDeployBoundary.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    );
  }

  assert.doesNotMatch(deployWorkflow, /blankhoney\.xyz|\/srv\/reno_news|BEGIN OPENSSH PRIVATE KEY/);
  assert.match(runbook, /blankhoney\/reno_news/);
  assert.match(runbook, /ghcr\.io\/blankhoney\/reno-news-web/);
  assert.match(runbook, /Configured branch protection/);
  assert.match(runbook, /Configured environment protection/);
  assert.match(runbook, /Required repository or environment secrets/);
  assert.match(adr, /manual SSH deploy/);
  assert.match(adr, /must not hard-code any server/);
});

test("compose dev services run current source without image rebuild", async () => {
  const composeFile = await readFile(
    join(process.cwd(), "../../infra/compose/compose.yml"),
    "utf8"
  );

  const webBlock = composeFile.match(/\n  web:\n([\s\S]*?)(?=\n  [a-z]|$)/)?.[1];
  const apiBlock = composeFile.match(/\n  api:\n([\s\S]*?)(?=\n  [a-z]|$)/)?.[1];
  const workerBlock = composeFile.match(/\n  worker:\n([\s\S]*?)(?=\n  [a-z]|$)/)?.[1];
  const schedulerBlock = composeFile.match(/\n  scheduler:\n([\s\S]*?)(?=\n  [a-z]|$)/)?.[1];

  assert.ok(webBlock, "missing Compose web service");
  assert.ok(apiBlock, "missing Compose API service");
  assert.ok(workerBlock, "missing Compose worker service");
  assert.ok(schedulerBlock, "missing Compose scheduler service");

  for (const serviceBlock of [webBlock, apiBlock]) {
    assert.match(serviceBlock, /..\/..\/apps:\/app\/apps/);
    assert.match(serviceBlock, /..\/..\/packages:\/app\/packages/);
    assert.match(serviceBlock, /..\/..\/package\.json:\/app\/package\.json:ro/);
    assert.match(serviceBlock, /..\/..\/pnpm-lock\.yaml:\/app\/pnpm-lock\.yaml:ro/);
    assert.match(serviceBlock, /..\/..\/pnpm-workspace\.yaml:\/app\/pnpm-workspace\.yaml:ro/);
    assert.match(serviceBlock, /..\/..\/tsconfig\.base\.json:\/app\/tsconfig\.base\.json:ro/);
  }

  assert.match(webBlock, /API_BASE_URL: http:\/\/api:3001/);
  assert.match(webBlock, /WORKER_BASE_URL: http:\/\/worker:3002/);

  for (const serviceBlock of [workerBlock, schedulerBlock]) {
    assert.match(serviceBlock, /..\/..\/services\/worker\/pyproject\.toml:\/app\/pyproject\.toml:ro/);
    assert.match(serviceBlock, /..\/..\/services\/worker\/uv\.lock:\/app\/uv\.lock:ro/);
    assert.match(serviceBlock, /..\/..\/services\/worker\/src\/reno_worker:\/app\/src\/reno_worker:ro/);
  }
});
