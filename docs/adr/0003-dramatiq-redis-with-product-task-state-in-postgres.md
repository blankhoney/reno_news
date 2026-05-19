# Dramatiq Redis With Product Task State In Postgres

Background work will use Dramatiq with Redis for queue execution, while durable content-processing facts, failures, retry metadata, and audit-relevant task state belong in PostgreSQL. This rejects Temporal as too heavy for the MVP resource envelope and avoids making framework-specific queue state the product source of truth.
