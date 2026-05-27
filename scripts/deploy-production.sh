#!/usr/bin/env sh
set -eu

COMPOSE_FILE_LOCAL="infra/compose/compose.yml"
COMPOSE_FILE_PRODUCTION="infra/compose/compose.production.yml"
COMPOSE_FILE_EDGE="${RENO_NEWS_EDGE_COMPOSE_FILE:-infra/compose/compose.edge.yml}"
STATE_DIR="${RENO_NEWS_DEPLOY_STATE_DIR:-.deploy}"
CURRENT_TAG_FILE="$STATE_DIR/current-image-tag"
PREVIOUS_TAG_FILE="$STATE_DIR/previous-image-tag"
IMAGE_TAG="${1:-${RENO_NEWS_IMAGE_TAG:-}}"
INGRESS_MODE="${RENO_NEWS_INGRESS_MODE:-dedicated}"
HEALTH_BASE_URL="${RENO_NEWS_HEALTH_BASE_URL:-http://127.0.0.1}"
HEALTH_RETRIES="${RENO_NEWS_HEALTH_RETRIES:-30}"
HEALTH_SLEEP_SECONDS="${RENO_NEWS_HEALTH_SLEEP_SECONDS:-2}"
DRY_RUN="${DRY_RUN:-0}"
CORE_SERVICES="web api worker scheduler postgres redis"

if [ -z "$IMAGE_TAG" ]; then
  echo "RENO_NEWS_IMAGE_TAG or first argument is required" >&2
  exit 1
fi

case "$INGRESS_MODE" in
  dedicated)
    DEPLOY_SERVICES="$CORE_SERVICES caddy"
    ;;
  edge)
    DEPLOY_SERVICES="$CORE_SERVICES"
    ;;
  *)
    echo "RENO_NEWS_INGRESS_MODE must be dedicated or edge" >&2
    exit 1
    ;;
esac

HEALTH_BASE_URL="${HEALTH_BASE_URL%/}"
export RENO_NEWS_IMAGE_TAG="$IMAGE_TAG"

compose() {
  if [ "$INGRESS_MODE" = "edge" ]; then
    docker compose -f "$COMPOSE_FILE_LOCAL" -f "$COMPOSE_FILE_PRODUCTION" -f "$COMPOSE_FILE_EDGE" "$@"
  else
    docker compose -f "$COMPOSE_FILE_LOCAL" -f "$COMPOSE_FILE_PRODUCTION" "$@"
  fi
}

compose_label() {
  if [ "$INGRESS_MODE" = "edge" ]; then
    printf "docker compose -f %s -f %s -f %s" "$COMPOSE_FILE_LOCAL" "$COMPOSE_FILE_PRODUCTION" "$COMPOSE_FILE_EDGE"
  else
    printf "docker compose -f %s -f %s" "$COMPOSE_FILE_LOCAL" "$COMPOSE_FILE_PRODUCTION"
  fi
}

run_compose() {
  echo "+ $(compose_label) $*"
  if [ "$DRY_RUN" = "1" ]; then
    return 0
  fi
  compose "$@"
}

remove_project_caddy_for_edge() {
  if [ "$INGRESS_MODE" != "edge" ]; then
    return 0
  fi

  echo "+ $(compose_label) stop caddy"
  echo "+ $(compose_label) rm -f caddy"
  if [ "$DRY_RUN" = "1" ]; then
    return 0
  fi

  compose stop caddy >/dev/null 2>&1 || true
  compose rm -f caddy >/dev/null 2>&1 || true
}

write_state() {
  if [ "$DRY_RUN" = "1" ]; then
    return 0
  fi

  mkdir -p "$STATE_DIR"
  if [ -f "$CURRENT_TAG_FILE" ]; then
    previous_tag="$(cat "$CURRENT_TAG_FILE")"
    if [ -n "$previous_tag" ] && [ "$previous_tag" != "$IMAGE_TAG" ]; then
      printf "%s\n" "$previous_tag" > "$PREVIOUS_TAG_FILE"
    fi
  fi
  printf "%s\n" "$IMAGE_TAG" > "$CURRENT_TAG_FILE"
}

health_check_once() {
  curl -fsS "$HEALTH_BASE_URL/healthz" >/dev/null &&
    curl -fsS "$HEALTH_BASE_URL/api/healthz" >/dev/null &&
    curl -fsS "$HEALTH_BASE_URL/worker/healthz" >/dev/null
}

wait_for_health() {
  if [ "$DRY_RUN" = "1" ]; then
    echo "+ health check $HEALTH_BASE_URL/{healthz,api/healthz,worker/healthz}"
    return 0
  fi

  attempt=1
  while [ "$attempt" -le "$HEALTH_RETRIES" ]; do
    if health_check_once; then
      return 0
    fi
    echo "health check attempt $attempt/$HEALTH_RETRIES failed"
    attempt=$((attempt + 1))
    sleep "$HEALTH_SLEEP_SECONDS"
  done
  return 1
}

rollback() {
  if [ ! -f "$PREVIOUS_TAG_FILE" ]; then
    echo "rollback unavailable: $PREVIOUS_TAG_FILE does not exist" >&2
    return 1
  fi

  rollback_tag="$(cat "$PREVIOUS_TAG_FILE")"
  if [ -z "$rollback_tag" ]; then
    echo "rollback unavailable: previous image tag is empty" >&2
    return 1
  fi

  echo "rollback to image tag: $rollback_tag"
  export RENO_NEWS_IMAGE_TAG="$rollback_tag"
  run_compose pull web api worker scheduler
  remove_project_caddy_for_edge
  run_compose up -d --remove-orphans $DEPLOY_SERVICES
  wait_for_health
}

echo "deploy image tag: $IMAGE_TAG"
echo "deploy ingress mode: $INGRESS_MODE"
run_compose pull $DEPLOY_SERVICES
run_compose run --rm api pnpm db:migrate
remove_project_caddy_for_edge
run_compose up -d --remove-orphans $DEPLOY_SERVICES

if wait_for_health; then
  write_state
  echo "deploy health check passed"
  exit 0
fi

echo "deploy health check failed; starting rollback" >&2
if rollback; then
  echo "rollback health check passed"
else
  echo "rollback failed or unavailable" >&2
fi
exit 1
