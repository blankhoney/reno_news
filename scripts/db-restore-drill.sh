#!/usr/bin/env sh
set -eu

if [ "$#" -ne 1 ]; then
  echo "Usage: sh scripts/db-restore-drill.sh <backup.dump>" >&2
  exit 2
fi

COMPOSE_FILE=${COMPOSE_FILE:-infra/compose/compose.yml}
DATABASE_USER=${DATABASE_USER:-reno_news}
PRIMARY_DATABASE=${DATABASE_NAME:-reno_news}
RESTORE_DATABASE=${RESTORE_DATABASE:-reno_news_restore_drill}
BACKUP_FILE=$1

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Backup Snapshot not found: $BACKUP_FILE" >&2
  exit 1
fi

if [ "$RESTORE_DATABASE" = "$PRIMARY_DATABASE" ]; then
  echo "Restore Drill target must not be the primary database: $PRIMARY_DATABASE" >&2
  exit 1
fi

cleanup() {
  docker compose -f "$COMPOSE_FILE" exec -T postgres \
    dropdb -U "$DATABASE_USER" --if-exists "$RESTORE_DATABASE" >/dev/null 2>&1 || true
}

trap cleanup EXIT

cleanup

docker compose -f "$COMPOSE_FILE" exec -T postgres \
  createdb -U "$DATABASE_USER" -T template0 "$RESTORE_DATABASE"

docker compose -f "$COMPOSE_FILE" exec -T postgres \
  pg_restore -U "$DATABASE_USER" -d "$RESTORE_DATABASE" --exit-on-error --no-owner < "$BACKUP_FILE"

TABLE_COUNT=$(docker compose -f "$COMPOSE_FILE" exec -T postgres \
  psql -U "$DATABASE_USER" -d "$RESTORE_DATABASE" -t -A \
  -c "select count(*) from information_schema.tables where table_schema = 'public' and table_name in ('boards', 'sources', 'raw_entries', 'reader_feedback')")

if [ "$TABLE_COUNT" -lt 4 ]; then
  echo "Restore Drill failed: expected MVP tables were not restored" >&2
  exit 1
fi

printf 'Restore Drill OK: %s restored into disposable database %s\n' "$BACKUP_FILE" "$RESTORE_DATABASE"
