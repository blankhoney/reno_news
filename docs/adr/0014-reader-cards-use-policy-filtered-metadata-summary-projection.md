# Reader Cards Use Policy-Filtered Metadata Summary Projection

Milestone 4 starts with reader item cards built from board metadata, raw entry metadata, and optional summary blocks. Cards must not expose extracted full text, translation full text, private model payloads, or admin-only diagnostics.

This lets the reader UI start over existing stored data without inventing a full publishing workflow. The first reader listing may show policy-eligible metadata and summary snippets for non-blocked entries from enabled sources, but it does not decide publish approval, ranking policy, digest inclusion, saved/read-later state, or article-page visibility.

Issue 010 should therefore add a read-only reader projection for home and board listing pages, plus API/interface docs, before any article page, Chinese/original switch, saved items, read-later, search, digest, or public publishing workflow.
