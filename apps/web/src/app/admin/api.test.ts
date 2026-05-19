import { test } from "node:test";
import assert from "node:assert/strict";
import { joinServiceUrl } from "./api";

test("joinServiceUrl handles trailing and leading slashes", () => {
  assert.equal(joinServiceUrl("http://localhost:3001/", "/sources"), "http://localhost:3001/sources");
  assert.equal(joinServiceUrl("http://localhost:3001", "sources/1"), "http://localhost:3001/sources/1");
});
