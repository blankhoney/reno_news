# Feedback review is event-local and non-moderating

Issue 021 should add Admin review state to individual Reader Feedback events, not a general moderation workflow. This is the smallest useful follow-up to Issue 020: once feedback can lower Digest ordering through a Quality Feedback Penalty, an Admin needs a way to dismiss invalid feedback so it no longer affects that penalty.

The first implementation should keep review state on `reader_feedback` itself with constrained statuses. Dismissed feedback may be excluded from the Quality Feedback Penalty; open, reviewed, and resolved feedback may remain eligible. A Feedback Review must not hide, restore, delete, re-board, personalize, change reader identity/trust, or mutate raw-entry lifecycle. Later issues may add Admin identity, audit logs, moderation queues, or lifecycle actions after those semantics are explicitly scoped.
