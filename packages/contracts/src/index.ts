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

export const digestEditionStatuses = ["draft", "reviewed", "archived"] as const;

export type DigestEditionStatus = (typeof digestEditionStatuses)[number];

export type DigestEditionGenerateRequest = {
  editionDate: string;
  boardSlug?: string;
  limit?: number;
};

export type DigestEditionItemSnapshot = {
  id: number;
  boardSlug: string;
  boardName: string;
  sourceTitle: string;
  title: string;
  summary: string;
  isDevelopmentSeed: boolean;
  publishedAt: string | null;
  createdAt: string;
};

export type DigestEditionItem = {
  itemId: number;
  position: number;
  snapshot: DigestEditionItemSnapshot;
};

export type DigestEdition = {
  id: number;
  editionKey: string;
  editionDate: string;
  boardSlug: string | null;
  status: DigestEditionStatus;
  windowStartAt: string;
  windowEndAt: string;
  generatedAt: string;
  reviewedAt: string | null;
  reviewNote: string | null;
  items: DigestEditionItem[];
};

export type DigestEditionSummary = {
  id: number;
  editionKey: string;
  editionDate: string;
  boardSlug: string | null;
  status: DigestEditionStatus;
  itemCount: number;
  generatedAt: string;
  reviewedAt: string | null;
};

export type DigestEditionResponse = {
  edition: DigestEdition;
};

export type DigestEditionListResponse = {
  editions: DigestEditionSummary[];
};
