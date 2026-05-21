# Auth API Contract

The second-version auth API is owned by the Fastify API service. The web app consumes this API and must not become a separate identity authority.

## Roles

- `reader`: authenticated reader who can operate only on their own personal state.
- `admin`: authenticated admin who can operate admin/source/failure/feedback workflows.

Anonymous users may access public reader-safe routes only.

## Session Boundary

- Sessions are server-side rows in `user_sessions`.
- Browser clients receive an HTTP-only cookie containing a raw session token.
- Only a hash of the session token is stored.
- Production cookies must be secure and sameSite constrained.

## Routes

### `POST /auth/login`

Request:

```json
{
  "email": "reader@example.com",
  "password": "password"
}
```

Success response:

```json
{
  "user": {
    "id": 1,
    "email": "reader@example.com",
    "role": "reader"
  }
}
```

Failure responses use the shared auth error vocabulary:

- `invalid_credentials`
- `invite_required`
- `user_disabled`
- `session_expired`
- `rate_limited`

### `POST /auth/logout`

Revokes the current server-side session and clears the session cookie.

Success response:

```json
{
  "status": "ok"
}
```

### `GET /auth/me`

Returns the authenticated user for a valid session, otherwise `user: null`.

Success response:

```json
{
  "user": {
    "id": 1,
    "email": "reader@example.com",
    "role": "reader"
  }
}
```

Anonymous response:

```json
{
  "user": null
}
```

## Authorization Matrix

Admin/source/failure/feedback review workflows require an authenticated `admin`
session at the API layer. Anonymous requests receive:

```json
{
  "error": "authentication_required"
}
```

Authenticated non-admin users receive:

```json
{
  "error": "admin_required"
}
```

The protected surfaces are:

- `GET /sources`
- `GET /sources/:id`
- `POST /sources`
- `PATCH /sources/:id`
- `GET /raw-entries`
- `GET /raw-entries/:id`
- `PATCH /raw-entries/:id`
- `GET /admin/failures`
- `GET /admin/audit-events`
- `GET /admin/feedback`
- `PATCH /admin/feedback/:id`
- `GET /admin/digest-editions`
- `GET /admin/digest-editions/:id`
- `POST /admin/digest-editions`

Reader-safe routes, including reader item views, digest, search, related items,
and reader feedback submission, remain public at this stage. Account-bound
personal-state routes are implemented and require an authenticated session; the
API scopes every personal-state read or mutation to the current session user.

## Audit Events

The API records append-only audit events for security-sensitive and admin
actions:

- Login failure and login success.
- Logout when a current user session exists.
- Source create and source policy/update changes.
- Raw-entry hide and restore lifecycle actions.
- Feedback review status changes.

`GET /admin/audit-events` returns recent audit events for admin inspection. Each
event contains actor id/role when known, action, object type/id, request id,
timestamp, and safe metadata. Audit metadata must not include passwords, raw
session tokens, invite tokens, or full request payloads.

## Non-Goals

- No OAuth provider is part of the initial auth contract.
- No frontend-only authorization is accepted as a security boundary.
- No raw password, invite token, or session token may be stored.
