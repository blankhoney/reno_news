import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import { listMigrationFiles } from "./migrations";
import { defaultMigrationsDirectory, defaultSeedPath } from "./paths";

type DatabaseOptions = {
  databaseUrl: string;
};

type MigrationOptions = DatabaseOptions & {
  migrationsDirectory?: string;
};

type SeedOptions = DatabaseOptions & {
  seedPath?: string;
};

export async function runMigrations({
  databaseUrl,
  migrationsDirectory = defaultMigrationsDirectory
}: MigrationOptions): Promise<void> {
  const pool = new Pool({ connectionString: databaseUrl, allowExitOnIdle: true });

  try {
    await pool.query(`
      create table if not exists schema_migrations (
        filename text primary key,
        applied_at timestamptz not null default now()
      )
    `);

    const appliedResult = await pool.query<{ filename: string }>(
      "select filename from schema_migrations"
    );
    const applied = new Set(appliedResult.rows.map((row) => row.filename));
    const migrations = await listMigrationFiles(migrationsDirectory);

    for (const migration of migrations) {
      if (applied.has(migration.filename)) {
        continue;
      }

      const sql = await readFile(migration.path, "utf-8");
      const client = await pool.connect();

      try {
        await client.query("begin");
        await client.query(sql);
        await client.query("insert into schema_migrations (filename) values ($1)", [
          migration.filename
        ]);
        await client.query("commit");
      } catch (error) {
        await client.query("rollback");
        throw error;
      } finally {
        client.release();
      }
    }
  } finally {
    await pool.end();
  }
}

export async function runSeed({
  databaseUrl,
  seedPath = defaultSeedPath
}: SeedOptions): Promise<void> {
  const pool = new Pool({ connectionString: databaseUrl, allowExitOnIdle: true });
  const sql = await readFile(seedPath, "utf-8");
  const client = await pool.connect();

  try {
    await client.query("begin");
    await client.query(sql);
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}
