import { test } from "node:test";
import assert from "node:assert/strict";
import { loginErrorMessage, loginFormAction } from "./page";

test("loginFormAction points form submissions at the auth BFF with a safe next path", () => {
  assert.equal(loginFormAction("/admin"), "/api/auth/login?next=%2Fadmin");
  assert.equal(loginFormAction("https://evil.invalid/admin"), "/api/auth/login?next=%2Fadmin");
  assert.equal(loginFormAction("//evil.invalid/admin"), "/api/auth/login?next=%2Fadmin");
});

test("loginErrorMessage maps auth errors to user-facing copy", () => {
  assert.equal(loginErrorMessage(undefined), null);
  assert.equal(loginErrorMessage("invalid_credentials"), "Email or password is incorrect.");
  assert.equal(loginErrorMessage("admin_required"), "Login with an admin account to continue.");
  assert.equal(loginErrorMessage("unexpected"), "Login failed. Try again.");
});
