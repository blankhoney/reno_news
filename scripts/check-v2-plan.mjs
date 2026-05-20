#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

function fail(message) {
  console.error(`V2 Plan Check FAILED: ${message}`);
  process.exit(1);
}

function readRequiredFile(path) {
  const absolutePath = resolve(root, path);
  if (!existsSync(absolutePath)) {
    fail(`required file is missing: ${path}`);
  }
  return readFileSync(absolutePath, "utf8");
}

function requireSnippets(path, snippets) {
  const body = readRequiredFile(path);
  for (const snippet of snippets) {
    if (!body.includes(snippet)) {
      fail(`${path} is missing required text: ${snippet}`);
    }
  }
}

requireSnippets("docs/CODEX_MASTER_PLAN.md", [
  "## 17. Second-Version Execution Plan",
  "| V2 Milestone | Name | Status | Exit Gate |",
  "| V2.1 | Identity, RBAC, and Audit |",
  "| V2.2 | Production Deploy, Secrets, and Off-Host Backup |",
  "| V2.3 | Observability and Alerting |",
  "| V2.4 | MiniMax Model Integration and Evaluation Gate |",
  "| V2.5 | Account-Backed Personal State and Digest Editions |",
  "| V2.6 | Structured Source Expansion and Similarity Signals |",
  "Second-version work must proceed through `goal-2/tasks.md` one task at a time."
]);

const requiredAdrs = [
  {
    path: "docs/adr/0032-api-owned-identity-sessions-and-rbac.md",
    snippets: [
      "# API-Owned Identity Sessions And RBAC",
      "invite-only email/password",
      "argon2id",
      "HTTP-only",
      "`reader`",
      "`admin`"
    ]
  },
  {
    path: "docs/adr/0033-production-deployment-uses-caddy-only-public-boundary.md",
    snippets: [
      "# Production Deployment Uses Caddy Only Public Boundary",
      "Only Caddy binds public host ports",
      "web, api, worker, and scheduler stay on private Compose networks",
      "Deployment secrets are injected through GitHub secrets and server environment files"
    ]
  },
  {
    path: "docs/adr/0034-remote-observability-starts-with-prometheus-alertmanager-and-trace-ids.md",
    snippets: [
      "# Remote Observability Starts With Prometheus Alertmanager And Trace IDs",
      "`/metrics`",
      "Prometheus",
      "Alertmanager",
      "trace id",
      "self-hosted Sentry is deferred"
    ]
  },
  {
    path: "docs/adr/0035-minimax-m27-is-primary-ai-provider-behind-a-schema-gate.md",
    snippets: [
      "# MiniMax M2.7 Is Primary AI Provider Behind A Schema Gate",
      "MiniMax M2.7",
      "schema validation",
      "repair pass",
      "golden set",
      "`model_calls`"
    ]
  },
  {
    path: "docs/adr/0036-account-backed-personal-state-replaces-local-only-reader-state.md",
    snippets: [
      "# Account-Backed Personal State Replaces Local-Only Reader State",
      "saved/read-later/read_status",
      "authenticated user",
      "localStorage",
      "cross-user isolation"
    ]
  },
  {
    path: "docs/adr/0037-digest-editions-are-persisted-reviewable-objects.md",
    snippets: [
      "# Digest Editions Are Persisted Reviewable Objects",
      "digest edition",
      "stable replay",
      "review metadata",
      "dynamic preview"
    ]
  },
  {
    path: "docs/adr/0038-source-expansion-uses-ordered-low-concurrency-adapters.md",
    snippets: [
      "# Source Expansion Uses Ordered Low-Concurrency Adapters",
      "GitHub Releases",
      "arXiv Atom",
      "GDELT radar",
      "RSSHub whitelist",
      "PostgreSQL FTS remains the main search path"
    ]
  }
];

for (const adr of requiredAdrs) {
  requireSnippets(adr.path, adr.snippets);
}

console.log("V2 Plan Check OK");
