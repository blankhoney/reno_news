type ReaderItemRouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: ReaderItemRouteContext): Promise<Response> {
  const { id } = await context.params;
  const headers = readerItemProxyHeaders(request);
  const response = await fetch(apiUrl(`/reader/items/${encodeURIComponent(id)}`), {
    method: "GET",
    headers,
    cache: "no-store"
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: readerItemProxyResponseHeaders(response)
  });
}

function readerItemProxyHeaders(request: Request): Record<string, string> | undefined {
  const cookie = request.headers.get("cookie");
  return cookie ? { cookie } : undefined;
}

function readerItemProxyResponseHeaders(response: Response): Headers {
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
