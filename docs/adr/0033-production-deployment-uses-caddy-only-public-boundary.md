# Production Deployment Uses Caddy Only Public Boundary

Second-version production deployment keeps the single-VPS Docker Compose shape, but tightens the public boundary. Only Caddy binds public host ports. web, api, worker, and scheduler stay on private Compose networks and are reached through Caddy or internal service names.

Production images come from GHCR. Deployment secrets are injected through GitHub secrets and server environment files, never committed to the repository. Required secrets and server-local env files must be documented before deploy automation is treated as complete.

Deploy scripts must support a health check after pull/migration/restart and a rollback path to the previous image tag. If the real VPS, domain, or secrets are unavailable in the local environment, the task can only claim local contract verification, not production success.

This keeps the current architecture intact while making the exposed network surface small enough to reason about and test.
