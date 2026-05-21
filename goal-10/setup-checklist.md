# Goal 10 Production Setup Checklist

This checklist contains only non-secret values and operator steps. Do not paste SSH private keys, R2 secrets, Resend API keys, database passwords, or production `.env` contents into the repository or chat.

## DNS

Configure these records at the DNS provider that controls `blankhoney.xyz`:

```text
A     news     205.186.67.177
AAAA  news     2400:8d60:0003:0000:0000:0001:6661:0ce4
```

Resend sending domain:

```text
send.blankhoney.xyz
```

Add the DKIM/SPF/MX records exactly as generated in the Resend dashboard for `send.blankhoney.xyz`. Current preflight already sees an MX record and SPF TXT record, but DKIM records still need to be checked against Resend's dashboard values.

## VPS

Expected host:

```text
205.186.67.177
```

Expected deployment user:

```text
deploy
```

Expected repo directory:

```text
/srv/reno_news
```

Minimum server preparation:

```bash
sudo useradd -m -s /bin/bash deploy
sudo usermod -aG docker deploy
sudo mkdir -p /srv/reno_news
sudo chown -R deploy:deploy /srv/reno_news
sudo -iu deploy git clone https://github.com/blankhoney/reno_news.git /srv/reno_news
```

The server must have Docker, Docker Compose plugin, Git, curl, and AWS CLI installed before deployment.

## SSH Trust

The current preflight saw an SSH host-key mismatch for `205.186.67.177`.

Current ED25519 fingerprint observed by `ssh-keyscan`:

```text
SHA256:ot9wN93KiyAzDbUeGpwAOw2MzGQNRdTNfmmYLsVsGjA
```

Before removing or replacing local `known_hosts` entries, confirm this fingerprint from the VPS provider console or a trusted server session.

## GitHub Production Secrets

Set these in the GitHub `production` environment:

```text
DEPLOY_HOST=205.186.67.177
DEPLOY_USER=deploy
DEPLOY_SSH_KEY=<deploy private key>
DEPLOY_COMMAND=cd /srv/reno_news && git fetch origin main && git checkout main && git pull --ff-only origin main && scripts/deploy-production.sh "$RENO_NEWS_IMAGE_TAG"
```

Only `DEPLOY_SSH_KEY` is sensitive, but all four values should be managed in GitHub secrets for consistency with the existing Deploy workflow.

## Server Production Environment

Configure these on the server environment used by `docker compose`:

```text
DATABASE_URL=postgres://reno_news:<password>@postgres:5432/reno_news
POSTGRES_PASSWORD=<password>
RENO_NEWS_SITE_ADDRESS=news.blankhoney.xyz
RENO_NEWS_HEALTH_BASE_URL=https://news.blankhoney.xyz
```

The production Compose overlay passes `RENO_NEWS_SITE_ADDRESS` into Caddy so TLS is issued for the public hostname.

## Cloudflare R2 Backup

Configure these server environment values:

```text
BACKUP_S3_BUCKET=<r2 bucket>
BACKUP_S3_ENDPOINT_URL=<r2 s3 endpoint url>
BACKUP_S3_PREFIX=reno-news/postgres
AWS_ACCESS_KEY_ID=<r2 access key id>
AWS_SECRET_ACCESS_KEY=<r2 secret access key>
BACKUP_RETENTION_DAYS=30
```

The launch is not complete until a dump is uploaded to R2, downloaded back, and restored with `pnpm db:restore:drill`.

## Resend Alerts

Sending platform:

```text
Resend
```

Recommended sender:

```text
Reno News Alerts <alerts@send.blankhoney.xyz>
```

Alert recipient:

```text
13608729270@163.com
```

The launch is not complete until Resend verifies `send.blankhoney.xyz` and one test alert is received or has confirmed delivery evidence.
