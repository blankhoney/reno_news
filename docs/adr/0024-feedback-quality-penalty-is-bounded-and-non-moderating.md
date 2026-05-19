# Feedback quality penalty is bounded and non-moderating

Issue 020 should be the first explicitly scoped place where stored Reader Feedback can influence a public ordering surface. This is a key boundary change from Issue 017: feedback remains item-scoped and append-only, but a derived Quality Feedback Penalty may lower an item's digest ordering when readers report quality, correction, duplicate, broken-link, or rights concerns.

The first implementation should keep the penalty computed from existing `reader_feedback` rows and apply it only to reader-safe Digest preview ordering. It must be bounded, explainable, and never treated as automatic moderation: it must not hide, restore, delete, change lifecycle status, change board placement, personalize results, create reader accounts, or replace Admin review. Later issues may add moderation workflows, stronger trust weighting, or wider ranking consumption after those semantics are explicitly scoped.
