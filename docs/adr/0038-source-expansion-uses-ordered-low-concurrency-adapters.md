# Source Expansion Uses Ordered Low-Concurrency Adapters

Second-version source expansion uses ordered, low-concurrency adapters instead of broad crawling.

The adapter order is GitHub Releases and repository metadata first, arXiv Atom second, GDELT radar third, and RSSHub whitelist fourth. GitHub and arXiv can enter the existing source pipeline as structured sources. GDELT is candidate discovery only, not full ingest. RSSHub is explicit whitelist only, not an open route expansion layer.

Each adapter must normalize into the existing source/raw-entry/failure pipeline and respect rate-limit, retry, deduplication, and attribution requirements. A failed adapter must not block the RSS/Atom baseline.

PostgreSQL FTS remains the main search path. pg_trgm and pgvector may assist related items, duplicate folding, or lightweight clustering, but they do not replace the existing PostgreSQL-first search contract.
