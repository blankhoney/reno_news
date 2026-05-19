# Disk usage starts with local log rotation and read-only checks

Milestone 7 disk usage controls should start with local guardrails: bounded Docker Compose log retention and a read-only disk usage check. The current MVP runs several long-lived services through Compose, and unbounded container logs or leftover local backup dumps are the most immediate disk-growth risks.

The first implementation should add per-service Compose logging limits and a local operator command that inspects Docker disk usage and local backup artifacts. It must not run destructive cleanup such as `docker system prune`, remove volumes, delete backups, call remote monitoring services, send alerts, deploy, push images, or mutate production state. Destructive cleanup, retention automation, remote metrics, and alerting remain later operational decisions.
