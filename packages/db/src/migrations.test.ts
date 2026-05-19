import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
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
