# PostgreSQL Similarity Signals Stay Secondary

Second-version related item and duplicate-folding work may use PostgreSQL similarity signals, but PostgreSQL full-text search remains the primary reader search path.

The base schema enables `pg_trgm` and adds GIN trigram indexes on `raw_entries.title` and `raw_entries.url`. These indexes support title and URL similarity checks for related-item ordering and duplicate-folding candidates. Exact duplicate suppression still starts with the existing `raw_entries.canonical_hash` uniqueness constraint and source/external id uniqueness.

The schema adds `raw_entry_duplicate_groups` and `raw_entry_similarity_signals` as secondary evidence tables. They can record explainable duplicate groups and bounded pairwise similarity scores without changing reader visibility rules or replacing existing search, related-item, digest, or source-ingest behavior.

`pgvector` remains optional for a later slice. The base migration must not require `CREATE EXTENSION vector`, because the current local and CI PostgreSQL image is not a pgvector-specific image and no embedding model, vector dimension, or refresh workflow has been chosen. If pgvector is enabled later, it must be a secondary signal for related items, duplicate folding, or light clustering, not a new default search service.

Meilisearch, OpenSearch, Elasticsearch, and other external search services remain deferred. They should not be introduced while PostgreSQL FTS, `pg_trgm`, and bounded schema signals are sufficient for the current 4C8G single-host target.
