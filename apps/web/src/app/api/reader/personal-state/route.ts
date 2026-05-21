import { proxyPersonalStateRequest } from "./proxy";

export function GET(request: Request) {
  return proxyPersonalStateRequest(request, "/reader/personal-state", "GET");
}
