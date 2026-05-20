#!/usr/bin/env sh
set -eu

COMPOSE_FILE=${COMPOSE_FILE:-infra/compose/compose.yml}
DATABASE_NAME=${DATABASE_NAME:-reno_news}
DATABASE_USER=${DATABASE_USER:-reno_news}
BACKUP_DIR=${BACKUP_DIR:-backups}
BACKUP_S3_PREFIX=${BACKUP_S3_PREFIX:-reno-news/postgres}
BACKUP_RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}
BACKUP_MANIFEST_FILE=${BACKUP_MANIFEST_FILE:-"$BACKUP_DIR/offhost-backup-manifest.json"}
BACKUP_RETENTION_POLICY_FILE=${BACKUP_RETENTION_POLICY_FILE:-"$BACKUP_DIR/offhost-retention-policy.json"}
DRY_RUN=${DRY_RUN:-0}
APPLY_BACKUP_RETENTION_POLICY=${APPLY_BACKUP_RETENTION_POLICY:-0}

TIMESTAMP=$(date -u +"%Y%m%dT%H%M%SZ")
BACKUP_FILE=${BACKUP_FILE:-"$BACKUP_DIR/reno_news-$TIMESTAMP.dump"}

require_env() {
  name=$1
  eval "value=\${$name:-}"
  if [ -z "$value" ]; then
    echo "$name is required" >&2
    exit 2
  fi
}

case "$BACKUP_RETENTION_DAYS" in
  ''|*[!0-9]*)
    echo "BACKUP_RETENTION_DAYS must be a positive integer" >&2
    exit 2
    ;;
esac

if [ "$BACKUP_RETENTION_DAYS" -lt 7 ]; then
  echo "BACKUP_RETENTION_DAYS must be at least 7" >&2
  exit 2
fi

require_env BACKUP_S3_BUCKET
require_env BACKUP_S3_ENDPOINT_URL

if [ "$DRY_RUN" != "1" ]; then
  require_env AWS_ACCESS_KEY_ID
  require_env AWS_SECRET_ACCESS_KEY
  command -v docker >/dev/null 2>&1 || {
    echo "docker is required" >&2
    exit 2
  }
  command -v aws >/dev/null 2>&1 || {
    echo "aws CLI is required" >&2
    exit 2
  }
fi

S3_DUMP_URI="s3://$BACKUP_S3_BUCKET/$BACKUP_S3_PREFIX/$(basename "$BACKUP_FILE")"
S3_MANIFEST_URI="s3://$BACKUP_S3_BUCKET/$BACKUP_S3_PREFIX/offhost-backup-manifest.json"

if [ "$DRY_RUN" = "1" ]; then
  printf 'DRY RUN: docker compose -f %s exec -T postgres pg_dump -U %s -d %s -Fc > %s\n' \
    "$COMPOSE_FILE" "$DATABASE_USER" "$DATABASE_NAME" "$BACKUP_FILE"
  printf 'DRY RUN: aws s3 cp %s %s --endpoint-url %s\n' \
    "$BACKUP_FILE" "$S3_DUMP_URI" "$BACKUP_S3_ENDPOINT_URL"
  printf 'DRY RUN: write %s with retentionDays=%s and restoreCommand="sh scripts/db-restore-drill.sh %s"\n' \
    "$BACKUP_MANIFEST_FILE" "$BACKUP_RETENTION_DAYS" "$BACKUP_FILE"
  printf 'DRY RUN: write %s for S3-compatible lifecycle retention\n' \
    "$BACKUP_RETENTION_POLICY_FILE"
  printf 'DRY RUN: aws s3 cp %s %s --endpoint-url %s\n' \
    "$BACKUP_MANIFEST_FILE" "$S3_MANIFEST_URI" "$BACKUP_S3_ENDPOINT_URL"
  if [ "$APPLY_BACKUP_RETENTION_POLICY" = "1" ]; then
    printf 'DRY RUN: aws s3api put-bucket-lifecycle-configuration --bucket %s --lifecycle-configuration file://%s --endpoint-url %s\n' \
      "$BACKUP_S3_BUCKET" "$BACKUP_RETENTION_POLICY_FILE" "$BACKUP_S3_ENDPOINT_URL"
  fi
  exit 0
fi

mkdir -p "$BACKUP_DIR"

docker compose -f "$COMPOSE_FILE" exec -T postgres \
  pg_dump -U "$DATABASE_USER" -d "$DATABASE_NAME" -Fc > "$BACKUP_FILE"

if [ ! -s "$BACKUP_FILE" ]; then
  echo "Backup Snapshot was not created: $BACKUP_FILE" >&2
  exit 1
fi

cat > "$BACKUP_MANIFEST_FILE" <<EOF
{
  "database": "$DATABASE_NAME",
  "createdAt": "$TIMESTAMP",
  "dumpFile": "$BACKUP_FILE",
  "dumpObject": "$S3_DUMP_URI",
  "retentionDays": $BACKUP_RETENTION_DAYS,
  "restoreCommand": "sh scripts/db-restore-drill.sh $BACKUP_FILE"
}
EOF

cat > "$BACKUP_RETENTION_POLICY_FILE" <<EOF
{
  "Rules": [
    {
      "ID": "reno-news-postgres-backup-retention",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "$BACKUP_S3_PREFIX/"
      },
      "Expiration": {
        "Days": $BACKUP_RETENTION_DAYS
      },
      "AbortIncompleteMultipartUpload": {
        "DaysAfterInitiation": 7
      }
    }
  ]
}
EOF

aws s3 cp "$BACKUP_FILE" "$S3_DUMP_URI" --endpoint-url "$BACKUP_S3_ENDPOINT_URL"
aws s3 cp "$BACKUP_MANIFEST_FILE" "$S3_MANIFEST_URI" --endpoint-url "$BACKUP_S3_ENDPOINT_URL"

if [ "$APPLY_BACKUP_RETENTION_POLICY" = "1" ]; then
  aws s3api put-bucket-lifecycle-configuration \
    --bucket "$BACKUP_S3_BUCKET" \
    --lifecycle-configuration "file://$BACKUP_RETENTION_POLICY_FILE" \
    --endpoint-url "$BACKUP_S3_ENDPOINT_URL"
else
  printf 'Retention policy file written: %s\n' "$BACKUP_RETENTION_POLICY_FILE"
  printf 'Apply it explicitly with APPLY_BACKUP_RETENTION_POLICY=1 after reviewing bucket ownership.\n'
fi

printf 'Off-host Backup Snapshot OK: %s uploaded to %s\n' "$BACKUP_FILE" "$S3_DUMP_URI"
printf 'Run restore drill after downloading a dump: sh scripts/db-restore-drill.sh <backup.dump>\n'
