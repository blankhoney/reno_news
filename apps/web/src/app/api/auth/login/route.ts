import { authApiUrl, authProxyResponseHeaders } from "../proxy";

export async function POST(request: Request): Promise<Response> {
  const contentType = request.headers.get("content-type");
  if (
    contentType?.includes("application/x-www-form-urlencoded") ||
    contentType?.includes("multipart/form-data")
  ) {
    return postLoginForm(request);
  }

  const response = await fetch(authApiUrl("/auth/login"), {
    method: "POST",
    headers: contentType ? { "content-type": contentType } : undefined,
    body: await request.text(),
    cache: "no-store"
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: authProxyResponseHeaders(response)
  });
}

async function postLoginForm(request: Request): Promise<Response> {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const response = await fetch(authApiUrl("/auth/login"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
    cache: "no-store"
  });

  const nextPath = safeNextPath(new URL(request.url).searchParams.get("next"), "/admin");
  if (response.ok) {
    return redirectResponse(nextPath, response);
  }

  const error = await authErrorCode(response);
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("error", error);
  loginUrl.searchParams.set("next", nextPath);
  return redirectResponse(`${loginUrl.pathname}${loginUrl.search}`);
}

function redirectResponse(location: string, sourceResponse?: Response): Response {
  const headers = new Headers();
  headers.set("location", location);
  const setCookie = sourceResponse?.headers.get("set-cookie");
  if (setCookie) {
    headers.set("set-cookie", setCookie);
  }
  return new Response(null, { status: 303, headers });
}

function safeNextPath(value: string | null, fallback: string): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }
  return value;
}

async function authErrorCode(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { error?: unknown };
    return typeof payload.error === "string" && payload.error.length > 0
      ? payload.error
      : "login_failed";
  } catch {
    return "login_failed";
  }
}
