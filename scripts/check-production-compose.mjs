#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const composeFiles = [
  "infra/compose/compose.yml",
  "infra/compose/compose.production.yml"
];
const requiredServices = ["web", "api", "worker", "scheduler", "postgres", "redis", "caddy"];
const privateServices = ["web", "api", "worker", "scheduler", "postgres", "redis"];

function fail(message) {
  console.error(`Production Compose check FAILED: ${message}`);
  process.exit(1);
}

const args = [
  "compose",
  ...composeFiles.flatMap((file) => ["-f", file]),
  "config",
  "--format",
  "json"
];
const result = spawnSync("docker", args, {
  cwd: root,
  env: {
    ...process.env,
    CADDY_HTTP_PORT: process.env.CADDY_HTTP_PORT ?? "80",
    CADDY_HTTPS_PORT: process.env.CADDY_HTTPS_PORT ?? "443",
    DATABASE_URL:
      process.env.DATABASE_URL ??
      "postgres://reno_news:reno_news@postgres:5432/reno_news",
    POSTGRES_DB: process.env.POSTGRES_DB ?? "reno_news",
    POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD ?? "reno_news",
    POSTGRES_USER: process.env.POSTGRES_USER ?? "reno_news",
    RENO_NEWS_IMAGE_TAG: process.env.RENO_NEWS_IMAGE_TAG ?? "latest",
    RENO_NEWS_SITE_ADDRESS: process.env.RENO_NEWS_SITE_ADDRESS ?? "localhost"
  },
  encoding: "utf8"
});

if (result.error) {
  fail(result.error.message);
}

if (result.status !== 0) {
  fail(`docker compose config exited with ${result.status}\n${result.stderr}`);
}

const project = JSON.parse(result.stdout);
const services = project.services ?? {};

for (const service of requiredServices) {
  if (!services[service]) {
    fail(`missing service: ${service}`);
  }
}

if (services.postgres.image !== "postgres:17-alpine") {
  fail(
    "postgres image must stay on postgres:17-alpine until the production volume mount is migrated for PostgreSQL 18"
  );
}

for (const service of privateServices) {
  const ports = services[service].ports ?? [];
  if (ports.length > 0) {
    fail(`${service} must not publish host ports in production`);
  }
}

const publicServices = Object.entries(services)
  .filter(([, service]) => (service.ports ?? []).length > 0)
  .map(([name]) => name)
  .sort();

if (JSON.stringify(publicServices) !== JSON.stringify(["caddy"])) {
  fail(`only caddy may publish host ports, got: ${publicServices.join(", ")}`);
}

const caddyPorts = (services.caddy.ports ?? [])
  .map((port) => String(port.published))
  .sort();

if (JSON.stringify(caddyPorts) !== JSON.stringify(["443", "80"])) {
  fail(`caddy must publish 80 and 443, got: ${caddyPorts.join(", ")}`);
}

const caddyEnvironment = services.caddy.environment ?? {};
if (caddyEnvironment.RENO_NEWS_SITE_ADDRESS !== "localhost") {
  fail("caddy must receive RENO_NEWS_SITE_ADDRESS from production Compose");
}

console.log("Production Compose check OK");
