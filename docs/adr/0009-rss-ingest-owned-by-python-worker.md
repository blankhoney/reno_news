# RSS Ingest Owned By Python Worker

RSS/Atom ingest will run in the Python worker, not in the TypeScript API. The worker uses HTTPX for feed fetching, feedparser for RSS/Atom parsing, and Dramatiq with Redis for task dispatch. The API remains the source administration surface.

This keeps the first adapter aligned with later Python-heavy fetch, extraction, and AI work while preserving SQL migrations and PostgreSQL as the durable source of truth for discovered entries, failures, and policy state.
