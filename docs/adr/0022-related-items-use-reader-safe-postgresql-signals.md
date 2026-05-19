# Related items use reader-safe PostgreSQL signals

Issue 018 should add lightweight Related Items from the existing reader-safe PostgreSQL projection, not from feedback, personal state, digest membership, private extraction text, translation drafts, admin diagnostics, semantic/vector search, or an external search service. A Related Item is only a nearby reading affordance on an item detail page; it is not a global ranking policy or a personalized recommendation.

The first implementation should reuse PostgreSQL and the same visibility filters used by reader lists, item details, and search. It may use explainable signals such as shared board, shared source, recency, and PostgreSQL full-text rank over reader-safe title/source/board/summary fields, while excluding the current item. Later issues may add stronger similarity, feedback-informed ranking, semantic/vector search, or digest selection after those semantics are explicitly scoped.
