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
