import { proxyAuthRequest } from "../proxy";

export async function GET(request: Request): Promise<Response> {
  return proxyAuthRequest(request, "/auth/me", { method: "GET" });
}
