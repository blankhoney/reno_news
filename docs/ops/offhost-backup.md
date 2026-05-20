# Off-Host PostgreSQL Backup

This runbook extends the local Backup Snapshot and restore drill with S3-compatible off-host storage. It keeps the same logical `pg_dump -Fc` format so every uploaded dump can be downloaded and verified with the existing restore drill.

It does not create credentials, choose a vendor, configure a cron schedule, provide point-in-time recovery, or prove that a real remote bucket is reachable. Production launch still requires a real bucket, secret injection, alerting, and a successful restore drill from an off-host object.

## Required Environment

- `BACKUP_S3_BUCKET`: S3-compatible bucket name.
- `BACKUP_S3_ENDPOINT_URL`: object-store endpoint URL.
- `AWS_ACCESS_KEY_ID`: object-store access key for real uploads.
- `AWS_SECRET_ACCESS_KEY`: object-store secret key for real uploads.
- `BACKUP_S3_PREFIX`: object key prefix. Default: `reno-news/postgres`.
- `BACKUP_RETENTION_DAYS`: lifecycle retention period. Default: `30`; minimum: `7`.
- `BACKUP_MANIFEST_FILE`: local manifest path. Default: `backups/offhost-backup-manifest.json`.

Secrets must come from the server environment or a secret manager. Do not commit `.env.production`, AWS keys, bucket credentials, or vendor console exports.

## Dry Run

Use dry-run before wiring real credentials:

```bash
DRY_RUN=1 \
BACKUP_S3_BUCKET=example-bucket \
BACKUP_S3_ENDPOINT_URL=https://s3.example.invalid \
pnpm db:backup:offhost
```

Dry-run prints the `docker compose` dump command, `aws s3 cp` upload commands, manifest path, retention policy path, and restore drill command without connecting to Docker or the object store.

If the bucket and endpoint are already exported in the shell, the short form is `DRY_RUN=1 pnpm db:backup:offhost`.

## Create Off-Host Backup Snapshot

```bash
BACKUP_S3_BUCKET=<bucket> \
BACKUP_S3_ENDPOINT_URL=<endpoint-url> \
pnpm db:backup:offhost
```

`AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` must already be present in the server environment.

The script:

1. Creates a custom-format `pg_dump -Fc` file through the Compose `postgres` service.
2. Uploads the dump with `aws s3 cp` to the configured S3-compatible bucket and prefix.
3. Writes and uploads a manifest with the dump object URI, creation time, retention days, and restore command.
4. Writes a lifecycle retention policy file for review.

## Retention

`BACKUP_RETENTION_DAYS` defines the object-store retention period. The script writes `BACKUP_RETENTION_POLICY_FILE` with an S3 lifecycle policy for the configured prefix.

The script does not apply the lifecycle policy by default because it can expire real backup objects. After reviewing bucket ownership and prefix scope, apply it explicitly:

```bash
APPLY_BACKUP_RETENTION_POLICY=1 \
BACKUP_S3_BUCKET=<bucket> \
BACKUP_S3_ENDPOINT_URL=<endpoint-url> \
pnpm db:backup:offhost
```

`AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` must already be present in the server environment for this command too.

## Restore Drill From Off-Host Object

Download a dump from the bucket to a local ignored path:

```bash
aws s3 cp \
  s3://<bucket>/<prefix>/reno_news-YYYYMMDDTHHMMSSZ.dump \
  backups/restore-drill.dump \
  --endpoint-url <endpoint-url>
```

Run the existing restore drill:

```bash
pnpm db:restore:drill backups/restore-drill.dump
```

The drill restores into a disposable database, checks expected tables, and drops the disposable database on exit. A production backup is not considered proven until this restore drill succeeds against a dump downloaded from off-host storage.

## Verification

```bash
pnpm backup:offhost:check
DRY_RUN=1 BACKUP_S3_BUCKET=example-bucket BACKUP_S3_ENDPOINT_URL=https://s3.example.invalid pnpm db:backup:offhost
sh -n scripts/db-backup-offhost.sh
```

## Limitations

- This is a logical dump, not WAL archiving or point-in-time recovery.
- This runbook does not define backup scheduling, on-call ownership, or alert delivery.
- A real remote restore drill is blocked until object-store credentials and a bucket exist outside the repository.
- The lifecycle policy expires objects under the configured prefix; review the prefix before enabling `APPLY_BACKUP_RETENTION_POLICY=1`.
