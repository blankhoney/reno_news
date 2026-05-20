# Account-Backed Personal State Replaces Local-Only Reader State

Second-version reader state moves saved/read-later/read_status from local-only browser storage to backend records owned by an authenticated user.

The backend model must enforce cross-user isolation. A user can create, remove, list, and sync only their own saved/read-later/read_status records. Anonymous users may keep a local read-only or migration-compatible experience, but anonymous writes cannot create server-side personal state.

Browser localStorage remains a migration and cache source, not the source of truth after login. Existing local saved/read-later state should be offered for migration into the authenticated account path where feasible.

This supersedes the MVP-local decision for second-version work without rewriting the public reader pool, ranking semantics, or admin workflows.
