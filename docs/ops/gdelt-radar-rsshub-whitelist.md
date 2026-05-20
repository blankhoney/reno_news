# GDELT Radar And RSSHub Whitelist

This runbook records the Task 25 boundary for the next source expansion candidates. It does not implement a GDELT adapter or RSSHub adapter. It prevents later work from accidentally turning either system into an unbounded crawler.

## GDELT Radar

GDELT is candidate radar only in this project. It may be used later to discover that a topic, country, domain, or narrative is worth operator review, but it must not write directly to `raw_entries`, create Source Registry records, publish reader items, import event tables, mirror images, or run backfill sweeps.

The committed policy states:

```text
mode = candidate_radar_only
writesRawEntries = false
createsSources = false
operator review required
no full GDELT ingest
```

The only planned endpoint in this slice is the GDELT DOC 2.0 API:

```text
GET /api/v2/doc/doc
```

GDELT DOC 2.0 exposes global news search over a large rolling corpus and supports query parameters, modes, and JSON output. That makes it useful as radar, but too broad for direct ingest into the current single-VPS source pipeline. Any candidate must pass operator review before becoming a Source Registry change or manually approved raw-entry candidate.

## RSSHub Whitelist

RSSHub is RSSHub whitelist only in this project. It may later convert a small set of operator-approved routes into ordinary RSS/Atom sources, but it must not become an open route generator, route discovery crawler, or dependency on a public shared RSSHub instance.

The committed policy states:

```text
allowedRoutes starts empty
whitelistOnly = true
createsSourcesAutomatically = false
no wildcard route expansion
```

RSSHub supports feed output formats including RSS and Atom, plus common route query parameters such as `limit` and `format`. This project will use only RSS/Atom output and the existing RSS/Atom ingest path. Fulltext mode, unsafe user-supplied domains, debug output, route discovery, and wildcard route expansion are out of scope.

Operators should prefer a self-hosted RSSHub instance with cache enabled. The policy requires cache and constrains route count/fetch frequency before any real route is enabled.

## Verification

Local contract check:

```bash
pnpm source:expansion:check
```

Expected behavior:

- `config/source-adapters/gdelt.json` keeps GDELT disabled and candidate-radar only;
- GDELT writes no raw entries and creates no Source Registry records automatically;
- GDELT candidates require operator review;
- `config/source-adapters/rsshub.json` keeps RSSHub disabled and whitelist-only;
- RSSHub `allowedRoutes` starts empty and is operator-managed;
- RSSHub uses only the existing RSS/Atom ingestion path;
- scheduler/runtime still do not support `gdelt` or `rsshub` source types.

## References

- GDELT DOC 2.0 API: https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/
- GDELT Project: https://www.gdeltproject.org/
- RSSHub parameters and output formats: https://docs.rsshub.app/guide/parameters
- RSSHub deployment configuration: https://docs.rsshub.app/deploy/config
- RSSHub deployment: https://docs.rsshub.app/deploy/
