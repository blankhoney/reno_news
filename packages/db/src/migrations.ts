import { readdir } from "node:fs/promises";
import { join } from "node:path";

export type MigrationFile = {
  filename: string;
  path: string;
};

const migrationFilePattern = /^\d{4}_.+\.sql$/;

export async function listMigrationFiles(directory: string): Promise<MigrationFile[]> {
  const entries = await readdir(directory, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && migrationFilePattern.test(entry.name))
    .map((entry) => ({
      filename: entry.name,
      path: join(directory, entry.name)
    }))
    .sort((left, right) => left.filename.localeCompare(right.filename));
}
