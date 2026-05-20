# API-Owned Identity Sessions And RBAC

Second-version authentication and authorization use the API as the only identity source. The web app consumes API session state instead of becoming a second authority for users, roles, or audit context.

The first login path is invite-only email/password. Passwords use argon2id, sessions are stored server-side, and browser sessions use HTTP-only cookies. Production cookies must be secure and sameSite constrained. The initial roles are `reader` and `admin`; anonymous users may only access public reader-safe surfaces.

Fastify route guards enforce authorization before handler logic. Admin APIs default to deny for anonymous and `reader` sessions. Reader personal-state APIs may only operate on the authenticated user's own records. Frontend route guards are usability support, not the security boundary.

This avoids split-brain identity between Next.js and Fastify, keeps audit attribution on the API side, and makes later token rotation, session invalidation, and role checks testable through public API behavior.
