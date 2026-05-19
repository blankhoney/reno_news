# Reader Detail Pages Use Rights-Filtered Language Views

Milestone 4 article detail pages must use a reader-specific detail projection instead of reusing admin raw-entry, extraction, translation, or model-call records directly.

The detail projection may show safe metadata, summary block fields, source links, and a bounded original or Chinese-first language view. Original full text may only be exposed when the item's rights status permits public full-text display. Original excerpts may only be exposed when public excerpt display is allowed. Translation drafts remain non-public unless a later publishing workflow explicitly promotes them under a compatible rights and translation policy.

This keeps the Chinese/original switch from becoming an implicit public publishing decision. Issue 011 should therefore add a read-only item detail API and reader page over rights-filtered fields, but it must not add saved/read-later state, search, digest generation, public publishing workflow, browser automation, or non-RSS adapters.
