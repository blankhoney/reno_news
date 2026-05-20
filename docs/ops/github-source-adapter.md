# GitHub Source Adapter

This runbook defines the Task 22 policy for GitHub source expansion. It is a planning contract only: it does not implement a GitHub client, create a token, fetch repositories, download assets, or change the existing RSS/Atom ingestion path.

## Scope

The first GitHub adapter slice is limited to public repository metadata and published releases:

- `GET /repos/{owner}/{repo}`
- `GET /repos/{owner}/{repo}/releases`

These endpoints are enough for repository-level signals and release-change signals. GitHub Search, Issues, Pull Requests, repository contents, commits, organization crawls, user crawls, and release asset mirroring are out of scope. Webhooks may replace polling later, but they are not part of Task 22 or Task 23.

## Allowlist Policy

GitHub ingestion is allowlist-only. The committed policy file starts with an empty `allowedRepositories` list because real source choices are operator configuration, not repository defaults. Each allowed entity must name:

- `owner`
- `repo`
- `boardSlug`
- an existing source policy binding

The policy explicitly allows no broad search polling. It also forbids full organization crawl, full user crawl, issues polling, pull request polling, repository contents crawl, and asset download mirroring.

## Rate Limit Policy

GitHub's REST API primary limits are 60 unauthenticated requests per hour for public data and 5,000 authenticated requests per hour for typical authenticated user/app requests. Some Search endpoints have stricter limits, which is another reason this adapter does not use Search in the first slice.

The local policy is deliberately below GitHub's documented secondary ceiling:

```text
concurrency = 1
```

Requests must run serially through the worker queue. The adapter must read response rate-limit headers and stop when `retry-after` or `x-ratelimit-reset` requires a pause. A secondary rate limit error must wait at least one minute, then use exponential backoff with a bounded retry count. Authenticated conditional requests with ETag or Last-Modified should be used when credentials are available.

## Source Mapping

Repository metadata maps to:

```text
external_id = `github:repository:{owner}/{repo}`
url = html_url
title = full_name
summary_raw = description
published_at = pushed_at
```

Release metadata maps to:

```text
external_id = `github:release:{owner}/{repo}:{release_id}`
url = html_url
title = name or tag_name
summary_raw = body
published_at = published_at
```

Both records must enter the existing source/raw-entry/failure pipeline. `raw_payload_json` should keep safe provider metadata such as provider, owner, repo, endpoint, id, node id, tag, dates, and license fields where present. It must not store tokens or clone credentials.

## Failure Isolation

GitHub adapter failure must not block the RSS/Atom baseline. Network failures, parse failures, permission failures, rate-limit pauses, and policy skips should be recorded through the same attempt/failure surfaces used by the existing ingestion path or through a typed `github_source_ingest` stage introduced in Task 23.

The default committed policy has `"enabled": false` until Task 23 implements and tests the runtime adapter. Production enablement requires an explicit allowlist and secret injection if authenticated requests are used.

## Verification

Local contract check:

```bash
pnpm github:source-policy:check
```

Expected behavior:

- `config/source-adapters/github.json` defines only repository metadata and release endpoints;
- allowed repositories are empty by default and operator-managed;
- no broad search polling or content crawling is permitted;
- rate-limit handling is serial, low-concurrency, and header-aware;
- mappings target the existing source/raw-entry/failure pipeline;
- RSS/Atom baseline ingestion remains independent.

## References

- GitHub REST API rate limits: https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api
- GitHub REST API best practices: https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api
- Get a repository: https://docs.github.com/en/rest/repos/repos#get-a-repository
- List releases: https://docs.github.com/en/rest/releases/releases#list-releases
