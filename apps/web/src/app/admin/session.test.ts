import { test } from "node:test";
import assert from "node:assert/strict";
import {
  adminDeniedRedirectPath,
  isAdminUser,
  sessionCookieHeaderFromValue
} from "./session";
import { adminDeniedLoginPath } from "./denied/page";
import { adminLogoutAction } from "./page";

test("sessionCookieHeaderFromValue builds the API Cookie header", () => {
  assert.equal(
    sessionCookieHeaderFromValue("raw token/value"),
    "reno_news_session=raw%20token%2Fvalue"
  );
  assert.equal(sessionCookieHeaderFromValue(undefined), undefined);
});

test("isAdminUser accepts only admin auth users", () => {
  assert.equal(isAdminUser({ id: 1, email: "admin@example.com", role: "admin" }), true);
  assert.equal(isAdminUser({ id: 2, email: "reader@example.com", role: "reader" }), false);
  assert.equal(isAdminUser(null), false);
  assert.equal(adminDeniedRedirectPath, "/admin/denied");
});

test("admin auth pages expose login and logout BFF actions", () => {
  assert.equal(adminDeniedLoginPath(), "/login?next=%2Fadmin");
  assert.equal(adminLogoutAction(), "/api/auth/logout?next=%2F");
});
