import { test } from "node:test";
import assert from "node:assert/strict";
import {
  joinServiceUrl,
  sourcePolicyUpdateFromFormData,
  updateSourcePolicy,
  type SourcePolicyUpdate
} from "./api";

test("joinServiceUrl handles trailing and leading slashes", () => {
  assert.equal(joinServiceUrl("http://localhost:3001/", "/sources"), "http://localhost:3001/sources");
  assert.equal(joinServiceUrl("http://localhost:3001", "sources/1"), "http://localhost:3001/sources/1");
});

test("sourcePolicyUpdateFromFormData builds a constrained policy payload", () => {
  const formData = new FormData();
  formData.set("crawlEnabled", "false");
  formData.set("fetchIntervalMinutes", "45");
  formData.set("maxRequestsPerHour", "9");
  formData.set("saveLevel", "excerpt");
  formData.set("rightsPolicy", "public_excerpt_allowed");
  formData.set("translationPolicy", "private_only");
  formData.set("riskLevel", "high");

  assert.deepEqual(sourcePolicyUpdateFromFormData(formData), {
    crawlEnabled: false,
    fetchIntervalMinutes: 45,
    maxRequestsPerHour: 9,
    saveLevel: "excerpt",
    rightsPolicy: "public_excerpt_allowed",
    translationPolicy: "private_only",
    riskLevel: "high"
  });
});

test("sourcePolicyUpdateFromFormData rejects non-positive numeric policy values", () => {
  const formData = new FormData();
  formData.set("crawlEnabled", "true");
  formData.set("fetchIntervalMinutes", "0");
  formData.set("maxRequestsPerHour", "9");
  formData.set("saveLevel", "metadata_only");
  formData.set("rightsPolicy", "metadata_only");
  formData.set("translationPolicy", "none");
  formData.set("riskLevel", "low");

  assert.throws(() => sourcePolicyUpdateFromFormData(formData), /fetchIntervalMinutes must be a positive integer/);
});

test("updateSourcePolicy sends nested policy payload to the source API", async () => {
  const previousFetch = globalThis.fetch;
  const policy: SourcePolicyUpdate = {
    crawlEnabled: true,
    fetchIntervalMinutes: 30,
    maxRequestsPerHour: 6,
    saveLevel: "snapshot",
    rightsPolicy: "private_allowed",
    translationPolicy: "public_excerpt",
    riskLevel: "medium"
  };
  let requestUrl = "";
  let requestInit: RequestInit | undefined;

  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(url);
    requestInit = init;
    return new Response("{}", { status: 200 });
  }) as typeof fetch;
  test.after(() => {
    globalThis.fetch = previousFetch;
  });

  await updateSourcePolicy("7", policy);

  assert.equal(requestUrl, "http://localhost:3001/sources/7");
  assert.equal(requestInit?.method, "PATCH");
  assert.deepEqual(requestInit?.headers, { "content-type": "application/json" });
  assert.equal(requestInit?.body, JSON.stringify({ policy }));
});
