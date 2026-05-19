# MVP digest starts as a reader-safe preview

Issue 019 should start Digest work as a reader-safe preview derived from existing PostgreSQL reader projections, not as an email newsletter, scheduled job, persisted digest table, editorial workflow, or feedback-weighted ranking system. This keeps the MVP digest useful for readers while avoiding delivery, identity, subscription, and publication-history decisions that are not yet scoped.

The first implementation should select Digest Items from the same policy-visible pool used by reader lists, details, search, and related items. It may use a bounded Digest Window, board filter, recency, and existing summary fields. It must not expose private extraction text, translation draft full text, feedback events, admin diagnostics, semantic/vector search, external search services, backend personal state, or non-RSS adapters. Later issues may persist digests, add delivery, or consume feedback after those decisions are explicitly scoped.
