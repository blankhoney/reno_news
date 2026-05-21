import { proxyPersonalStateRequest } from "../proxy";

export function PUT(request: Request) {
  return proxyPersonalStateRequest(request, "/reader/personal-state/read-later", "PUT");
}
