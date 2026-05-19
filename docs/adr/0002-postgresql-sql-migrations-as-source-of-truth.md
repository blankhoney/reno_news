# PostgreSQL SQL Migrations As Source Of Truth

PostgreSQL schema and SQL migrations are the source of truth for persistent data, rather than a TypeScript or Python ORM model. The TypeScript API and Python worker will share database and message contracts, because the project deliberately spans a TypeScript product/API surface and a Python ingestion/AI surface where shared ORM ownership would create coupling and drift.
