#!/usr/bin/env sh
set -eu

BACKUP_DIR=${BACKUP_DIR:-/srv/reno_news/backups/production}

export BACKUP_DIR

exec sh scripts/db-backup.sh
