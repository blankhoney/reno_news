# Constrained Text For Early Status Values

Issue 002 uses constrained `text` fields for lifecycle status, processing stage, rights status, and failure type instead of PostgreSQL enum types. This keeps SQL migrations as the source of truth while leaving status vocabularies easier to adjust during the early ingest milestones, before the final workflow boundaries are proven by real RSS and policy behavior.
