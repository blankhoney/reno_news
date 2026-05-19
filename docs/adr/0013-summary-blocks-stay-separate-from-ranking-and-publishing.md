# Summary Blocks Stay Separate From Ranking And Publishing

Milestone 3 summary blocks are model-generated explanatory drafts, not publication, ranking, digest, or reader UI state.

This keeps model output auditable. A summary block may later help a reader page explain a published item, but Issue 009 only stores structured summary draft output linked to the raw entry, extraction, evaluation, translation draft, and model call. It must not decide publish status, board placement, ranking, digest inclusion, or public display.

Issue 009 should therefore add versioned summary block output, model-call logging, deterministic fake-adapter tests, and storage for one extracted/evaluated item without adding search, reader UI, digest generation, or public publishing.
