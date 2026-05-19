# Release health audit is local and non-deploying

Milestone 7 should add a Release Health Audit as a local operator gate before adding any production release workflow. The next implementation should aggregate existing evidence: package checks, worker checks, Compose service status, direct and Caddy health endpoints, backup/restore runbook presence, and deferred-scope boundaries.

The Release Health Audit may be automated as a local command, but it must not deploy, publish, push images, change GitHub workflow permissions, call remote monitoring services, send alerts, mutate production data, or decide product quality. Production deployment, remote monitoring, alerting, approval systems, and audit logs remain separate decisions that need explicit later scope.
