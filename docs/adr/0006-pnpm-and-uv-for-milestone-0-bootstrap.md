# pnpm And uv For Milestone 0 Bootstrap

The project uses `pnpm` for the JavaScript and TypeScript workspace and `uv` for the Python worker. This keeps the monorepo aligned around a workspace-aware Node package manager while letting the Python side use a fast, lockfile-oriented project manager without forcing one ecosystem's tooling onto the other.
