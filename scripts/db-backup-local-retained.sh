#!/usr/bin/env sh
set -eu

BACKUP_DIR=${BACKUP_DIR:-/srv/reno_news/backups/production}
RETENTION_DAYS=${LOCAL_BACKUP_RETENTION_DAYS:-${BACKUP_RETENTION_DAYS:-14}}

case "$RETENTION_DAYS" in
  ''|*[!0-9]*)
    echo "LOCAL_BACKUP_RETENTION_DAYS must be a positive integer" >&2
    exit 2
    ;;
esac

if [ "$RETENTION_DAYS" -lt 7 ]; then
  echo "LOCAL_BACKUP_RETENTION_DAYS must be at least 7" >&2
  exit 2
fi

export BACKUP_DIR

backup_file=$(sh scripts/db-backup.sh)

find "$BACKUP_DIR" -maxdepth 1 -type f -name 'reno_news-*.dump' -mtime +"$RETENTION_DAYS" -exec rm -f {} +

printf '%s\n' "$backup_file"
