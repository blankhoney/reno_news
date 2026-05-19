# MVP Saved And Read Later Use Local Browser State

Milestone 4 saved and read-later behavior should start as local browser state, not account-backed server state.

The MVP does not yet have authentication, reader accounts, sync, privacy controls, or feedback-to-ranking logic. Adding a database-backed personal state model now would force product decisions outside the current milestone. A local browser store can make the reader workflow usable while keeping the public pool, ranking, digest generation, and admin workflows unchanged.

Issue 012 should therefore add a small Client Component boundary for saved/read-later controls and a local personal-space view. Server Components may pass serializable item snapshots into that boundary. The implementation must not add auth, user tables, backend personal-state APIs, public ranking changes, search, digest generation, browser automation, or non-RSS adapters.
