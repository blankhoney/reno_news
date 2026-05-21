type PersonalStateProxyMethod = "GET" | "PUT";

export async function proxyPersonalStateRequest(
  request: Request,
  apiPath: string,
  method: PersonalStateProxyMethod
): Promise<Response> {
  const headers = personalStateProxyHeaders(request, method);
  const response = await fetch(apiUrl(apiPath), {
    method,
    headers,
    body: method === "GET" ? undefined : await request.text(),
    cache: "no-store"
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: personalStateProxyResponseHeaders(response)
  });
}

function personalStateProxyHeaders(
  request: Request,
  method: PersonalStateProxyMethod
): Record<string, string> | undefined {
  const headers: Record<string, string> = {};
  const cookie = request.headers.get("cookie");
  if (cookie) {
    headers.cookie = cookie;
  }

  const contentType = request.headers.get("content-type");
  if (method !== "GET" && contentType) {
    headers["content-type"] = contentType;
  }

  return Object.keys(headers).length > 0 ? headers : undefined;
}

function personalStateProxyResponseHeaders(response: Response): Headers {
  const headers = new Headers();
  const contentType = response.headers.get("content-type");
  if (contentType) {
    headers.set("content-type", contentType);
  }

  return headers;
}

function apiUrl(path: string): string {
  return `${(process.env.API_BASE_URL ?? "http://localhost:3001").replace(/\/$/, "")}${
    path.startsWith("/") ? path : `/${path}`
  }`;
}
