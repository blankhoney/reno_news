# Failure Queue Uses Existing Attempt Logs

Milestone 5 failure queue work should start as a read-only projection over existing attempt and model-call logs, not a new workflow table. Source ingest attempts, extraction attempts, and model calls already record failure status, type, message, and time, so duplicating those records would create competing sources of truth before retry, assignment, or resolution semantics exist. A later issue can add a workflow table when the product needs acknowledgement, retry ownership, or durable resolution state.
