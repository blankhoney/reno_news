# Manual hide restore reuses raw entry lifecycle state

Milestone 5 manual moderation should update the current raw-entry lifecycle state instead of introducing a moderation history or workflow table. `raw_entries.lifecycle_status` already has a constrained `hidden` value, so Issue 015 should use that state to remove an item from reader-facing surfaces and restore hidden items to `candidate` for reviewable visibility. A later moderation table can be added when feedback, reasons, audit history, or assignment semantics are defined.
