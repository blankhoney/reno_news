import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(currentDirectory, "../../..");

export const defaultMigrationsDirectory = resolve(repoRoot, "infra/db/migrations");
export const defaultSeedPath = resolve(repoRoot, "infra/db/seeds/dev.sql");
