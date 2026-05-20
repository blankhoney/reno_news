# Personal State API

Task 17 defines the backend contract for authenticated reader personal state. Task 18 implements the routes. Task 19 connects the web local-state migration path to these APIs.

Personal state is account-backed and scoped to the authenticated API session. Anonymous users may keep the existing browser-local experience, but anonymous requests cannot create server-side personal state.

## State Kinds

```text
saved
read_later
```

## Read Status Values

```text
unread
read
```

## Routes

### `GET /reader/personal-state`

Returns the current user's server-side personal state.

Response shape:

```json
{
  "saved": [
    {
      "itemId": 42,
      "createdAt": "2026-05-21T00:00:00.000Z"
    }
  ],
  "readLater": [],
  "readStatus": [
    {
      "itemId": 42,
      "status": "read",
      "updatedAt": "2026-05-21T00:00:00.000Z"
    }
  ]
}
```

### `PUT /reader/personal-state/saved`

Idempotently adds or removes a saved item for the current user.

Request:

```json
{
  "itemId": 42,
  "active": true
}
```

Returns the current user's full personal-state response after the mutation.

### `PUT /reader/personal-state/read-later`

Idempotently adds or removes a read-later item for the current user.

Request:

```json
{
  "itemId": 42,
  "active": true
}
```

Returns the current user's full personal-state response after the mutation.

### `PUT /reader/personal-state/read-status`

Idempotently updates read status for the current user.

Request:

```json
{
  "itemId": 42,
  "status": "read"
}
```

Returns the current user's full personal-state response after the mutation.

## Authorization

- Requests require an authenticated `reader` or `admin` session.
- A user can only list or mutate their own rows.
- Cross-user reads and writes are not exposed by route design.
- Admin role does not imply access to another reader's personal state through these reader routes.
- Request bodies reject client-supplied `userId` or other extra fields; user ownership comes only from the session.

## Non-Goals

- No recommendation, ranking, moderation, digest inclusion, feedback weighting, or public popularity signal is derived from personal state in these routes.
