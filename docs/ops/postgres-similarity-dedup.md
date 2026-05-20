# PostgreSQL Similarity And Dedup

This runbook defines the Task 26 contract for similarity and duplicate-folding signals. It does not replace reader search, add an external search service, or enable semantic/vector search by default.

## Search Boundary

PostgreSQL FTS remains the primary reader search path. Reader Search Query behavior continues to use the existing reader-safe projection and PostgreSQL full-text search. Trigram and future embedding signals are secondary inputs for related items, duplicate folding, or light clustering.

The current base migration enables `pg_trgm` and adds GIN trigram indexes on:

- `raw_entries.title`
- `raw_entries.url`

These indexes are for title/URL similarity candidates. They are not a replacement for the existing `websearch_to_tsquery`, `to_tsvector`, and substring fallback search path.

## Duplicate Boundary

Exact duplicate protection still starts with existing database constraints:

- `raw_entries.canonical_hash` is unique.
- `(source_id, external_id)` is unique.

The new `raw_entry_duplicate_groups` table records a duplicate group after exact-hash, title/URL trigram, embedding, or operator-review evidence exists. A raw entry may reference a duplicate group through `raw_entries.duplicate_group_id`.

The new `raw_entry_similarity_signals` table records bounded pairwise evidence:

```text
raw_entry_id
similar_raw_entry_id
signal_type
score in 0..1
signal_payload_json
```

The table rejects self-pairs and duplicate `(raw_entry_id, similar_raw_entry_id, signal_type)` rows. These records are evidence for later folding logic; they do not hide, delete, publish, rank, or expose items by themselves.

## Related Items Runtime

`GET /reader/items/:id/related` now consumes similarity and duplicate signals while keeping the existing reader-safe visibility filters. A related candidate may enter the result set through shared source, shared board, PostgreSQL FTS, an explicit `raw_entry_similarity_signals` row from the target to the candidate, or title trigram similarity.

Runtime ordering is:

1. explicit Similarity Signal score;
2. title trigram score;
3. shared source;
4. shared board;
5. PostgreSQL full-text rank;
6. recency and id tie-breakers.

Duplicate Groups fold within related-item results. If a candidate group has a representative raw entry, only that representative is returned. Entries in the target item's own Duplicate Group are excluded, so a duplicate of the current page is not presented as a nearby read.

URL trigram evidence is stored and indexed for duplicate/similarity signal generation, but it is not used directly as a reader related-item candidate signal because common source domains can be too broad.

## pgvector Boundary

`pgvector` remains optional and is not enabled by the base migration. A later implementation may add vector columns and HNSW or IVFFlat indexes only after the operator chooses a PostgreSQL image with pgvector installed, an embedding model, a vector dimension, and a refresh workflow.

Until then, pgvector must be treated as a possible secondary signal only. It must not become the default reader search path and must not introduce a separate search service.

## Verification

Local contract check:

```bash
pnpm postgres:similarity:check
```

Database checks:

```bash
pnpm --filter @reno-news/db test
pnpm --filter @reno-news/db test:integration
```

Expected behavior:

- `0016_postgresql_similarity_dedup.sql` enables `pg_trgm`.
- title and URL trigram indexes exist on `raw_entries`.
- `raw_entry_duplicate_groups` and `raw_entry_similarity_signals` exist.
- `canonical_hash` uniqueness remains the first exact duplicate guard.
- no `vector` extension is required by the base migration.
- no Meilisearch, OpenSearch, Elasticsearch, or external search service is introduced.

## References

- PostgreSQL full-text search: https://www.postgresql.org/docs/current/textsearch.html
- PostgreSQL `pg_trgm`: https://www.postgresql.org/docs/current/pgtrgm.html
- pgvector: https://github.com/pgvector/pgvector
