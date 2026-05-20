# Reader Personal State

Issue 012 stores saved and read-later state in the reader's browser.

Storage key:

```text
reno-news:personal-state:v1
```

Stored shape:

```json
{
  "saved": [],
  "readLater": []
}
```

Each entry is a reader item snapshot with `id`, board/source labels, title, summary, and timestamps. The snapshot intentionally excludes extracted full text, translation draft full text, model payloads, admin policy fields, and reader identity.

Second-version behavior keeps the same browser shape as a migration source and cache, but authenticated readers now sync through the account-backed Personal State API.

Migration marker:

```text
reno-news:personal-state:migrated:v1
```

On reader item pages and `/personal`, the client first reads local state so anonymous and offline flows remain usable. It then attempts to migrate local saved/read-later item ids to the authenticated API session, loads `/reader/personal-state`, hydrates any missing item snapshots through reader item detail responses, and writes the backend result back to local storage.

Reader detail pages also mark the current item as `read` through `/reader/personal-state/read-status`. Listing pages do not mark cards as read.

Anonymous API responses do not set the migration marker. This preserves the local state for a later authenticated migration. After login, the backend tables are the source of truth; local storage is only a cache and migration input.

This does not create recommendation, ranking, search, digest inclusion, public popularity, browser automation, or non-RSS adapter behavior.
