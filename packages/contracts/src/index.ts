export type HealthStatus = {
  status: "ok";
  service: "web" | "api" | "worker";
};

export const authRoles = ["reader", "admin"] as const;

export type AuthRole = (typeof authRoles)[number];

export const authLoginFailureReasons = [
  "invalid_credentials",
  "invite_required",
  "user_disabled",
  "session_expired",
  "rate_limited"
] as const;

export type AuthLoginFailureReason = (typeof authLoginFailureReasons)[number];

export type AuthUser = {
  id: number;
  email: string;
  role: AuthRole;
};

export type AuthLoginRequest = {
  email: string;
  password: string;
};

export type AuthLoginResponse = {
  user: AuthUser;
};

export type AuthCurrentUserResponse = {
  user: AuthUser | null;
};

export type AuthLogoutResponse = {
  status: "ok";
};

export type AuthErrorResponse = {
  error: AuthLoginFailureReason | "unauthorized" | "forbidden";
};

export const personalStateKinds = ["saved", "read_later"] as const;

export type PersonalStateKind = (typeof personalStateKinds)[number];

export const readStatusValues = ["unread", "read"] as const;

export type ReadStatusValue = (typeof readStatusValues)[number];

export type PersonalStateItem = {
  itemId: number;
  createdAt: string;
};

export type ReadStatusItem = {
  itemId: number;
  status: ReadStatusValue;
  updatedAt: string;
};

export type PersonalStateResponse = {
  saved: PersonalStateItem[];
  readLater: PersonalStateItem[];
  readStatus: ReadStatusItem[];
};

export type PersonalStateMutationRequest = {
  itemId: number;
  active: boolean;
};

export type ReadStatusMutationRequest = {
  itemId: number;
  status: ReadStatusValue;
};
