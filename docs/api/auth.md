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

## Non-Goals

- No OAuth provider is part of the initial auth contract.
- No frontend-only authorization is accepted as a security boundary.
- No raw password, invite token, or session token may be stored.
