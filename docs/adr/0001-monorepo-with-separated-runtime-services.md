# Monorepo With Separated Runtime Services

The project will use one monorepo for `web`, `api`, `worker`, shared contracts, UI, configuration, and deployment assets, while still running `web`, `api`, `worker`, `scheduler`, `postgres`, `redis`, and `caddy` as separate runtime services. This keeps shared product contracts and interface code close together without forcing the Python-heavy ingestion and AI work into the TypeScript API or tying the frontend release lifecycle to worker execution.
