export function authApiUrl(path: string): string {
  return `${(process.env.API_BASE_URL ?? "http://localhost:3001").replace(/\/$/, "")}${
    path.startsWith("/") ? path : `/${path}`
  }`;
}

export async function proxyAuthRequest(
  request: Request,
  apiPath: string,
  init: RequestInit
): Promise<Response> {
  const response = await fetch(authApiUrl(apiPath), {
    ...init,
    headers: authProxyHeaders(request, init.headers),
    cache: "no-store"
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: authProxyResponseHeaders(response)
  });
}

export function authProxyHeaders(
  request: Request,
  headers: RequestInit["headers"] = {}
): Record<string, string> | undefined {
  const nextHeaders: Record<string, string> = {};
  new Headers(headers).forEach((value, key) => {
    nextHeaders[key] = value;
  });
  const cookie = request.headers.get("cookie");
  if (cookie) {
    nextHeaders.cookie = cookie;
  }
  return Object.keys(nextHeaders).length > 0 ? nextHeaders : undefined;
}

export function authProxyResponseHeaders(response: Response): Headers {
  const headers = new Headers();
  const contentType = response.headers.get("content-type");
  if (contentType) {
    headers.set("content-type", contentType);
  }
  const setCookie = response.headers.get("set-cookie");
  if (setCookie) {
    headers.set("set-cookie", setCookie);
  }
  return headers;
}
