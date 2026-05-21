import { authApiUrl, authProxyResponseHeaders, proxyAuthRequest } from "../proxy";

export async function POST(request: Request): Promise<Response> {
  const requestUrl = new URL(request.url);
  const next = requestUrl.searchParams.get("next");
  if (next === null) {
    return proxyAuthRequest(request, "/auth/logout", { method: "POST" });
  }

  const response = await fetch(authApiUrl("/auth/logout"), {
    method: "POST",
    headers: logoutHeaders(request),
    cache: "no-store"
  });
  const headers = authProxyResponseHeaders(response);
  headers.set("location", safeNextPath(next, "/"));
  return new Response(null, { status: 303, headers });
}

function logoutHeaders(request: Request): Record<string, string> | undefined {
  const cookie = request.headers.get("cookie");
  return cookie ? { cookie } : undefined;
}

function safeNextPath(value: string | null, fallback: string): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }
  return value;
}
