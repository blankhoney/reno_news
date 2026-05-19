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

This is local-only MVP behavior. It does not create auth, reader accounts, backend personal-state APIs, ranking changes, search, digest generation, public publishing workflow, browser automation, or non-RSS adapters.
