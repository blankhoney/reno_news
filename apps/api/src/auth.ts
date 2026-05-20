import { createHash, randomBytes } from "node:crypto";
import argon2 from "argon2";
import type { AuthLoginFailureReason, AuthUser } from "@reno-news/contracts";
import type { AuthRepository, AuthUserWithPasswordRecord } from "@reno-news/db";

const sessionDurationMs = 30 * 24 * 60 * 60 * 1000;

type AuthLoginResult =
  | {
      ok: true;
      user: AuthUser;
      sessionToken: string;
      expiresAt: Date;
    }
  | {
      ok: false;
      error: AuthLoginFailureReason;
    };

export type AuthService = {
  login(input: {
    email: string;
    password: string;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<AuthLoginResult>;
  currentUser(sessionToken: string | undefined): Promise<AuthUser | null>;
  logout(sessionToken: string | undefined): Promise<void>;
};

type AuthServiceOptions = {
  now?: () => Date;
  generateSessionToken?: () => string;
};

export function canonicalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  return argon2.verify(passwordHash, password);
}

export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(sessionToken: string): string {
  return `sha256:${createHash("sha256").update(sessionToken).digest("hex")}`;
}

export function createAuthService(
  repository: AuthRepository,
  options: AuthServiceOptions = {}
): AuthService {
  const now = options.now ?? (() => new Date());
  const generateToken = options.generateSessionToken ?? generateSessionToken;

  return {
    login: async ({ email, password, userAgent, ipAddress }) => {
      const canonicalEmail = canonicalizeEmail(email);
      const user = await repository.findUserByEmail(canonicalEmail);

      if (!user) {
        const error = (await repository.hasPendingInvite(canonicalEmail))
          ? "invite_required"
          : "invalid_credentials";
        await recordFailure(repository, canonicalEmail, error, { userAgent, ipAddress });
        return { ok: false, error };
      }

      if (user.disabledAt) {
        await recordFailure(repository, canonicalEmail, "user_disabled", {
          userId: user.id,
          userAgent,
          ipAddress
        });
        return { ok: false, error: "user_disabled" };
      }

      if (!(await verifyPassword(user.passwordHash, password))) {
        await recordFailure(repository, canonicalEmail, "invalid_credentials", {
          userId: user.id,
          userAgent,
          ipAddress
        });
        return { ok: false, error: "invalid_credentials" };
      }

      const sessionToken = generateToken();
      const expiresAt = new Date(now().getTime() + sessionDurationMs);
      await repository.createSession({
        userId: user.id,
        sessionTokenHash: hashSessionToken(sessionToken),
        expiresAt,
        userAgent,
        ipAddress
      });
      await repository.recordLoginAttempt({
        userId: user.id,
        email: canonicalEmail,
        outcome: "success",
        userAgent,
        ipAddress
      });

      return {
        ok: true,
        user: toAuthUser(user),
        sessionToken,
        expiresAt
      };
    },
    currentUser: async (sessionToken) => {
      if (!sessionToken) {
        return null;
      }

      return repository.findUserBySessionTokenHash(hashSessionToken(sessionToken));
    },
    logout: async (sessionToken) => {
      if (!sessionToken) {
        return;
      }

      await repository.revokeSession(hashSessionToken(sessionToken));
    }
  };
}

async function recordFailure(
  repository: AuthRepository,
  email: string,
  failureReason: AuthLoginFailureReason,
  metadata: {
    userId?: number;
    userAgent?: string;
    ipAddress?: string;
  }
): Promise<void> {
  await repository.recordLoginAttempt({
    userId: metadata.userId,
    email,
    outcome: "failure",
    failureReason,
    userAgent: metadata.userAgent,
    ipAddress: metadata.ipAddress
  });
}

function toAuthUser(user: AuthUserWithPasswordRecord): AuthUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role
  };
}
