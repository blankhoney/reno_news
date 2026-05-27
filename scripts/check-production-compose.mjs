#!/usr/bin/env node
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const productionComposeFiles = [
  "infra/compose/compose.yml",
  "infra/compose/compose.production.yml"
];
const edgeComposeFiles = [
  ...productionComposeFiles,
  "infra/compose/compose.edge.yml"
];
const expectedEdgeNetwork = process.env.RENO_NEWS_EDGE_NETWORK ?? "myrss-app";
const requiredServices = ["web", "api", "worker", "scheduler", "postgres", "redis", "caddy"];
const privateServices = ["web", "api", "worker", "scheduler", "postgres", "redis"];

function fail(message) {
  console.error(`Production Compose check FAILED: ${message}`);
  process.exit(1);
}

function renderCompose(composeFiles, profiles = []) {
  for (const file of composeFiles) {
    if (!existsSync(resolve(root, file))) {
      fail(`missing compose file: ${file}`);
    }
  }

  const args = [
    "compose",
    ...profiles.flatMap((profile) => ["--profile", profile]),
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
      RENO_NEWS_EDGE_NETWORK: expectedEdgeNetwork,
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

  return JSON.parse(result.stdout);
}

function assertRequiredServices(services) {
  for (const service of requiredServices) {
    if (!services[service]) {
      fail(`missing service: ${service}`);
    }
  }
}

function assertRequiredCoreServices(services) {
  for (const service of privateServices) {
    if (!services[service]) {
      fail(`missing service: ${service}`);
    }
  }
}

function assertPrivateServicesDoNotPublishPorts(services) {
  for (const service of privateServices) {
    const ports = services[service].ports ?? [];
    if (ports.length > 0) {
      fail(`${service} must not publish host ports in production`);
    }
  }
}

const productionProject = renderCompose(productionComposeFiles);
const services = productionProject.services ?? {};

assertRequiredServices(services);

if (services.postgres.image !== "postgres:17-alpine") {
  fail(
    "postgres image must stay on postgres:17-alpine until the production volume mount is migrated for PostgreSQL 18"
  );
}

assertPrivateServicesDoNotPublishPorts(services);

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

const edgeProject = renderCompose(edgeComposeFiles);
const edgeProfileProject = renderCompose(edgeComposeFiles, ["reno-caddy-disabled"]);
const edgeServices = edgeProject.services ?? {};
const edgeProfileServices = edgeProfileProject.services ?? {};
const edgeNetworks = edgeProject.networks ?? {};

assertRequiredCoreServices(edgeServices);
assertPrivateServicesDoNotPublishPorts(edgeServices);

if (edgeServices.caddy) {
  fail("edge-managed ingress mode must not include project caddy unless its disabled profile is explicitly enabled");
}

const edgePublicServices = Object.entries(edgeServices)
  .filter(([, service]) => (service.ports ?? []).length > 0)
  .map(([name]) => name)
  .sort();

if (edgePublicServices.length > 0) {
  fail(
    `edge-managed ingress mode must not publish host ports, got: ${edgePublicServices.join(", ")}`
  );
}

if (edgeNetworks.edge?.name !== expectedEdgeNetwork || edgeNetworks.edge?.external !== true) {
  fail(`edge-managed ingress mode must use external ${expectedEdgeNetwork} network`);
}

for (const [service, alias] of [
  ["web", "reno-news-web"],
  ["api", "reno-news-api"],
  ["worker", "reno-news-worker"]
]) {
  const edgeNetwork = edgeServices[service].networks?.edge;
  if (!edgeNetwork) {
    fail(`${service} must attach to the external edge network`);
  }
  if (!(edgeNetwork.aliases ?? []).includes(alias)) {
    fail(`${service} must expose edge network alias ${alias}`);
  }
}

if (!edgeProfileServices.caddy) {
  fail("edge-managed ingress mode must define project caddy behind a disabled profile");
}

if ((edgeProfileServices.caddy.ports ?? []).length > 0) {
  fail("edge-managed ingress mode must remove project caddy host ports");
}

if (!(edgeProfileServices.caddy.profiles ?? []).includes("reno-caddy-disabled")) {
  fail("edge-managed ingress mode must disable the project caddy service behind a profile");
}

console.log("Production Compose check OK");
