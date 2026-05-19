# Issue 019 Plan: Reader-Safe Digest Preview Foundation

## Goal

Issue 019 adds the first Digest slice: a Reader can view a small digest preview of policy-visible items for a board or homepage period, without adding email delivery, scheduled generation, persisted digest tables, editorial workflow, feedback-to-ranking, or personalization.

## Scope

In scope:
- Current reader-safe PostgreSQL projection used by reader lists, details, search, and related items.
- Digest Window and Digest Item terminology in `CONTEXT.md`.
- ADR for starting Digest as a reader-safe preview.
- DB repository method to list Digest Items from visible reader items.
- API endpoint `GET /reader/digest` with optional board and bounded limit.
- Web API helper and `/digest` reader page.
- README, Reader API documentation, master plan, and implementation log updates.

Out of scope:
- Email newsletter delivery, subscriptions, reader accounts, or notification preferences.
- Scheduler jobs, persisted digest table, digest history, or editorial approval workflow.
- Feedback-to-ranking consumption, feedback weighting, moderation workflow, or automatic hide/restore.
- Semantic/vector search, external search service, search extension deployment, `pg_trgm`, or `zhparser`.
- Auth/RBAC, backend personal-state sync, personalized recommendations, browser automation, or non-RSS adapters.

## Design

Digest preview should be a deterministic reader surface over existing visible items. The first slice should not create a new digest lifecycle or durable digest record. It should select recent reader-visible items, optionally scoped by board, and return the same safe card fields already used by reader lists and search.

The implementation should treat Digest Window as a selection boundary, not as a delivery schedule. A later issue can add persisted digest editions, editorial curation, email delivery, feedback-weighted ordering, or scheduled jobs once those semantics are explicitly defined.

## TDD Plan

1. [ ] Add DB integration tests for digest item visibility, board filtering, bounded limit, hidden raw-entry exclusion, blocked item exclusion, disabled-source exclusion, and empty-result behavior.
2. [ ] Implement `ReaderRepository.listReaderDigestItems`.
3. [ ] Add API tests for `GET /reader/digest`, optional `board`, optional `limit`, and invalid limit.
4. [ ] Implement Fastify route with full JSON Schema query validation.
5. [ ] Add web API client tests for digest loading.
6. [ ] Add `/digest` reader page and navigation entrypoint.
7. [ ] Update README, Reader API docs, master plan, goal plan, and implementation log.

## Acceptance Criteria

- [ ] Reader can view a digest preview of visible item cards.
- [ ] Reader can filter digest preview by board.
- [ ] Digest limit is bounded by API validation.
- [ ] Hidden raw entries, blocked items, and disabled-source items are excluded.
- [ ] Digest Items do not expose extracted full text, translation draft full text, private model payloads, feedback events, or admin-only diagnostics.
- [ ] No email delivery, scheduler job, persisted digest table, editorial workflow, feedback-to-ranking consumption, moderation workflow, semantic/vector search, external search service, search extension deployment, auth/RBAC, backend personal-state sync, browser automation, or non-RSS adapter is added.

## Research References

- Existing reader-safe projection decisions: ADR 0014, ADR 0015, ADR 0020, ADR 0022
- Current Fastify v5 full JSON Schema route validation: Context7 `/fastify/fastify`
- Current Next.js 16.2.2 App Router Server Component and Link guidance: Context7 `/vercel/next.js/v16.2.2`
