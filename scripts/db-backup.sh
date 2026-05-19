#!/usr/bin/env sh
set -eu

COMPOSE_FILE=${COMPOSE_FILE:-infra/compose/compose.yml}
DATABASE_NAME=${DATABASE_NAME:-reno_news}
DATABASE_USER=${DATABASE_USER:-reno_news}
BACKUP_DIR=${BACKUP_DIR:-backups}

mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date -u +"%Y%m%dT%H%M%SZ")
BACKUP_FILE=${BACKUP_FILE:-"$BACKUP_DIR/reno_news-$TIMESTAMP.dump"}

docker compose -f "$COMPOSE_FILE" exec -T postgres \
  pg_dump -U "$DATABASE_USER" -d "$DATABASE_NAME" -Fc > "$BACKUP_FILE"

if [ ! -s "$BACKUP_FILE" ]; then
  echo "Backup Snapshot was not created: $BACKUP_FILE" >&2
  exit 1
fi

printf '%s\n' "$BACKUP_FILE"
