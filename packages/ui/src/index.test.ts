import { test } from "node:test";
import assert from "node:assert/strict";
import { uiPackageReady } from "./index";

test("UI package placeholder is importable", () => {
  assert.equal(uiPackageReady, true);
});
