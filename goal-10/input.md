# Goal 10: 生产实机上线闭环

## Summary
- 目标是把 Reno News 从“本地/合同可验证”推进到“真实 VPS 可访问、可部署、可备份、可告警、可回滚”的生产验收状态。
- 生产访问域名使用 `news.blankhoney.xyz`，VPS 为 `205.186.67.177` / `2400:8d60:0003:0000:0000:0001:6661:0ce4`。
- 部署路径使用 GitHub manual `Deploy` workflow；服务器部署用户为 `deploy`；服务器仓库目录默认 `/srv/reno_news`。
- off-host 备份使用 Cloudflare R2；告警邮件由 Resend 发出，收件人为 `13608729270@163.com`。
- 不在仓库提交任何真实 secret、SSH 私钥、R2 key、Resend key 或生产 `.env`。

## Key Changes
- 创建 `goal-10/input.md`、`plan.md`、`tasks.md`，记录本阶段真实生产上线目标、人工操作点、回滚方式和验收证据。
- DNS 配置要求：
  - `A news.blankhoney.xyz -> 205.186.67.177`
  - `AAAA news.blankhoney.xyz -> 2400:8d60:0003:0000:0000:0001:6661:0ce4`
  - Resend 发信域名使用 `send.blankhoney.xyz`；按 Resend 后台生成的 DKIM/SPF/MX 记录添加到 DNS。
- VPS 初始化：
  - 创建非 root `deploy` 用户，授予 Docker/Compose 所需权限。
  - 安装 Docker、Compose plugin、Git、curl、AWS CLI。
  - 在 `/srv/reno_news` clone `https://github.com/blankhoney/reno_news.git`。
  - 在服务器本地配置生产环境变量，不提交到仓库。
- GitHub production secrets：
  - `DEPLOY_HOST=205.186.67.177`
  - `DEPLOY_USER=deploy`
  - `DEPLOY_SSH_KEY=<deploy 私钥，由用户在 GitHub 配置>`
  - `DEPLOY_COMMAND=cd /srv/reno_news && git fetch origin main && git checkout main && git pull --ff-only origin main && scripts/deploy-production.sh "$RENO_NEWS_IMAGE_TAG"`
- 生产 env/secrets：
  - 必需：`DATABASE_URL`、`POSTGRES_PASSWORD`、`RENO_NEWS_SITE_ADDRESS=https://news.blankhoney.xyz`、`RENO_NEWS_HEALTH_BASE_URL=https://news.blankhoney.xyz`
  - R2：`BACKUP_S3_BUCKET`、`BACKUP_S3_ENDPOINT_URL`、`BACKUP_S3_PREFIX=reno-news/postgres`、`AWS_ACCESS_KEY_ID`、`AWS_SECRET_ACCESS_KEY`
  - Resend：使用 SMTP 或 API key；发件人建议 `Reno News Alerts <alerts@send.blankhoney.xyz>`，收件人 `13608729270@163.com`。Resend SMTP 参考官方文档：`smtp.resend.com`、username `resend`、password 为 API key。
- 验收文档更新：
  - 将 `docs/ops/production-audit.md`、`production-deploy.md`、`release-handoff.md`、`final-production-gate-review.md` 从“缺口记录”更新为“生产实机证据记录”。
  - 记录 DNS、deploy run、health check、backup restore drill、alert test、rollback drill 的证据路径和时间。

## Test Plan
- 本地/仓库合同：
  - `pnpm compose:production:check`
  - `pnpm deploy:contract:check`
  - `pnpm backup:offhost:check`
  - `pnpm alerts:check`
  - `pnpm production:gate:check`
  - `git diff --check`
- DNS/TLS：
  - `dig A news.blankhoney.xyz`
  - `dig AAAA news.blankhoney.xyz`
  - `curl -I https://news.blankhoney.xyz/healthz`
  - `curl -I https://news.blankhoney.xyz/api/healthz`
  - `curl -I https://news.blankhoney.xyz/worker/healthz`
- GitHub deploy：
  - 等待 `CI` 和 `Publish Images` 成功。
  - 手动触发 `Deploy` workflow，image tag 使用 `latest` 或 `sha-<commit>`。
  - 读取 GitHub Actions deploy log，确认 SSH deploy、migration、Compose up、health checks 全部成功。
- 生产页面验收：
  - Chrome 打开 `https://news.blankhoney.xyz/`
  - 登录 `https://news.blankhoney.xyz/login?next=/admin`
  - 验证 `/admin`、`/digest`、`/search?q=Sample`、`/items/5`。
  - 保存截图到 `/tmp/reno_news_goal10_*`。
- 备份验收：
  - 在生产服务器执行一次 R2 backup upload。
  - 从 R2 下载 dump 到临时路径。
  - 执行 restore drill，确认可恢复到 disposable database。
- 告警验收：
  - Resend 域名 `send.blankhoney.xyz` 验证通过。
  - 发送一封测试告警到 `13608729270@163.com`。
  - 记录 Resend delivery evidence，不记录 API key。
- 回滚验收：
  - 至少验证 `scripts/deploy-production.sh` 已记录 current/previous image tag。
  - 若已有 previous tag，执行一次受控 rollback drill；若没有 previous tag，则记录“首次上线无 previous tag，下一次发布前必须完成 rollback drill”。

## Assumptions
- 用户不会把 SSH 私钥、R2 secret、Resend API key 发到聊天里；这些只通过 GitHub secrets、服务器 env 或服务商后台配置。
- `blankhoney.xyz` 是正确域名；`blanhoney.xyz` 视为拼写错误，不用于本阶段。
- 本轮生产入口只暴露 Caddy 的 80/443；web/api/worker/scheduler/postgres/redis 不直接暴露公网端口。
- 本轮不做 MiniMax live provider、公开注册、OAuth、密码重置、邮件 Digest 投递、推荐算法、RSSHub/GDELT runtime 接入。
- 如果 DNS、GitHub secrets、R2 或 Resend 任一项未配置成功，生产上线验收不得标记完成，只能记录阻塞项和下一步操作。
