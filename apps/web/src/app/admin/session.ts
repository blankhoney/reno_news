import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser, type AdminApiContext, type AuthUser } from "./api";

export const adminSessionCookieName = "reno_news_session";
export const adminDeniedRedirectPath = "/admin/denied";

export function sessionCookieHeaderFromValue(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  return `${adminSessionCookieName}=${encodeURIComponent(value)}`;
}

export function isAdminUser(user: AuthUser | null): user is AuthUser & { role: "admin" } {
  return user?.role === "admin";
}

export async function readAdminSessionCookieHeader(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return sessionCookieHeaderFromValue(cookieStore.get(adminSessionCookieName)?.value);
}

export async function requireAdminSession(): Promise<AdminApiContext & { user: AuthUser }> {
  const cookieHeader = await readAdminSessionCookieHeader();
  if (!cookieHeader) {
    redirect(adminDeniedRedirectPath);
  }

  const user = await getCurrentUser({ cookieHeader });
  if (!isAdminUser(user)) {
    redirect(adminDeniedRedirectPath);
  }

  return { cookieHeader, user };
}
