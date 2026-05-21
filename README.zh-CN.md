# Reno News

Reno News 是一个中文优先的公共情报阅读系统。它不是个人 RSS 阅读器，也不是基于个人兴趣的推荐流；它更接近一个公共情报池：由管理员维护来源、策略和质量边界，系统负责采集、抽取、评估、翻译草稿、摘要、检索、读者反馈和发布前的安全展示。

当前仓库已经覆盖基础设施、SQL 迁移、来源注册、来源策略、RSS/Atom 元数据采集、正文抽取、AI 草稿基础、API 侧认证会话和角色守卫、Web 登录/登出 BFF 入口、审计事件、Admin 调试视图、失败队列、原始条目隐藏/恢复、反馈审核、带分页的读者首页和板块列表、条目详情、相关文章、来源和板块多样化的 Digest 预览、持久化 Digest Edition、PostgreSQL 读者搜索、条目级反馈、认证用户的后端个人状态、匿名用户的浏览器本地保存/稍后读状态、Web BFF 个人状态代理，以及读者界面的开发 seed 样例标记。

## 项目定位

- 中文优先：读者界面以中文阅读体验为核心，原文和中文视图按权利策略安全呈现。
- 公共池优先：内容、反馈和排序服务于公共信息质量，不做个人化推荐。
- 权利策略优先：公开展示、翻译、保留全文或快照都必须经过来源和权利策略约束。
- PostgreSQL 优先：数据库、搜索、任务状态和审计记录以 PostgreSQL 为第一事实源。
- MVP 边界明确：复杂推荐、公开注册/完整生产身份体系、非 RSS 适配器、外部搜索服务、生产监控和自动化备份仍在范围外。

## 技术栈

- Monorepo：pnpm workspace
- Web：Next.js 16、React 19
- API：Fastify 5、TypeScript
- Worker：Python 3.12、uv、Dramatiq、Redis、httpx、trafilatura
- 数据库：PostgreSQL 18，SQL migrations 作为 schema source of truth
- 本地编排：Docker Compose + Caddy
- CI/CD：GitHub Actions、GHCR 镜像发布、手动 SSH 部署交接

## 目录结构

```text
apps/
  web/        # 读者界面和 Admin 调试界面
  api/        # Fastify API 服务
services/
  worker/     # Python worker 和 scheduler
packages/
  db/         # SQL 迁移、seed、数据库脚本
  contracts/  # 共享契约
  config/     # 共享配置
  ui/         # 共享 UI 包
infra/
  compose/    # 本地 Docker Compose 和 Caddy
  db/         # SQL migrations 和 seeds
docs/
  adr/        # 架构决策记录
  api/        # API 文档
  ops/        # 运维 runbook
  research/   # 研究材料
```

## 环境要求

- Node.js 22+
- pnpm 11+
- uv 0.11+
- Docker 29+ with Docker Compose

## 安装依赖

```bash
pnpm install
```

Python worker 的依赖由 `uv` 管理，位于 `services/worker/`。

## 本地检查

```bash
pnpm lint
pnpm test
pnpm build
cd services/worker
uv run python -m unittest discover -s tests
```

## 本地服务

启动完整本地栈：

```bash
docker compose -f infra/compose/compose.yml up --build
```

开发容器会挂载当前 `apps/`、`packages/` 和 worker 源码。代码变更后，如果不需要重新构建镜像，可以刷新长驻服务：

```bash
docker compose -f infra/compose/compose.yml up -d --no-build --force-recreate web api worker scheduler caddy
```

健康检查端点：

- Web：`http://localhost:3000/healthz`
- API：`http://localhost:3001/healthz`
- Worker：`http://localhost:3002/healthz`
- Caddy Web 代理：`http://localhost:8080/healthz`
- Caddy API 代理：`http://localhost:8080/api/healthz`
- Caddy Worker 代理：`http://localhost:8080/worker/healthz`

## 数据库

本地 Compose PostgreSQL 启动后，使用以下变量执行迁移和 seed：

```bash
DATABASE_URL=postgres://reno_news:reno_news@localhost:5432/reno_news pnpm db:migrate
DATABASE_URL=postgres://reno_news:reno_news@localhost:5432/reno_news pnpm db:seed
```

本地开发 seed 会创建仅供本机验收使用的账号：

- `admin@example.invalid`
- `reader@example.invalid`
- 密码：`reno-news-dev-password`

这些账号只是本地 seed 数据，不能视为生产凭据，也不应复制到生产配置。

本地 API 和 worker 进程使用同一个变量：

```bash
DATABASE_URL=postgres://reno_news:reno_news@localhost:5432/reno_news
```

本地备份和恢复演练：

```bash
pnpm db:backup:local
pnpm db:restore:drill backups/<dump-file>.dump
```

备份脚本会把 PostgreSQL custom-format dump 写入已忽略的 `backups/` 目录。恢复演练使用一次性数据库目标，并在退出时清理。

## 主要页面和端点

读者页面：

- 首页：`http://localhost:3000/`
- 板块：`http://localhost:3000/boards/ai`
- 搜索：`http://localhost:3000/search?q=Sample`
- Digest：`http://localhost:3000/digest`
- 条目详情：`http://localhost:3000/items/1`
- 个人空间：`http://localhost:3000/personal`

Admin 调试页面：

- 登录页：`http://localhost:3000/login?next=/admin`
- Admin 首页：`http://localhost:3000/admin`
- 来源详情和策略表单：`http://localhost:3000/admin/sources/1`
- 原始条目详情和隐藏/恢复：`http://localhost:3000/admin/raw-entries/1`
- 失败队列：`http://localhost:3000/admin/failures`
- 反馈队列：`http://localhost:3000/admin/feedback`

常用 API：

- 认证登录：`POST http://localhost:3001/auth/login`
- 当前用户：`http://localhost:3001/auth/me`
- Web BFF 认证登录：`POST http://localhost:3000/api/auth/login`
- Web BFF 认证登出：`POST http://localhost:3000/api/auth/logout`
- Web BFF 当前用户：`http://localhost:3000/api/auth/me`
- 来源：`http://localhost:3001/sources`
- 原始条目：`http://localhost:3001/raw-entries`
- 读者板块：`http://localhost:3001/reader/boards`
- 读者条目：`http://localhost:3001/reader/items?limit=25&offset=0`
- 读者搜索：`http://localhost:3001/reader/search?q=Sample&limit=25&offset=0`
- 读者 Digest：`http://localhost:3001/reader/digest`
- 读者个人状态：`http://localhost:3001/reader/personal-state`
- Digest Edition：`http://localhost:3001/admin/digest-editions`
- Web BFF 个人状态：`http://localhost:3000/api/reader/personal-state`
- Web BFF 条目补齐：`http://localhost:3000/api/reader/items/1`
- Worker 手动采集：`POST http://localhost:3002/ingest/source/:id`

## 运维脚本

本地发布健康审计：

```bash
pnpm release:audit:local
```

本地磁盘使用检查：

```bash
pnpm disk:check:local
```

生产审计报告通常组合运行：

```bash
pnpm release:audit:local
pnpm disk:check:local
```

这些脚本用于收集当前可发布性、健康状态、备份恢复准备度和磁盘使用证据。它们不部署、不发布、不发送告警，也不修改生产状态。

## CI/CD

GitHub Actions 覆盖三类工作流：

- CI：`.github/workflows/ci.yml`，运行 JavaScript lint/test/build、Python worker 测试、PostgreSQL 集成测试和 Docker Compose 配置校验。
- 镜像发布：`.github/workflows/docker-publish.yml`，在 `main`、版本 tag 或手动触发时构建并发布 `web`、`api`、`worker` 镜像到 GHCR。
- 部署交接：`.github/workflows/deploy.yml`，手动触发，使用 `production` environment，需要 `DEPLOY_HOST`、`DEPLOY_USER`、`DEPLOY_SSH_KEY` 和 `DEPLOY_COMMAND`。

更多细节见 `docs/ops/github-cicd.md`。

## 范围边界

Admin 策略编辑只修改当前 Source Policy。原始条目隐藏/恢复只修改当前生命周期状态，不增加完整审核历史。失败队列是已有采集、抽取和模型调用记录的只读投影，不包含重试、认领、解决流、策略历史表或审批流。API 侧认证会话、角色守卫、Web 登录/登出入口和审计事件已经存在，但还没有公开注册、OAuth、密码重置或完整生产 Admin 身份工作流。

认证用户的个人状态通过 API 存储并由 Web BFF 代理；匿名用户的保存/稍后读仍保存在浏览器本地。个人状态不会影响排序、Digest 纳入、审核或公共热度。读者反馈是追加式条目级事件；Digest 预览只把符合条件的反馈作为有界排序惩罚。反馈审核可把单条反馈标记为 `open`、`reviewed`、`dismissed` 或 `resolved`；只有 `dismissed` 会改变惩罚资格，审核不会隐藏、恢复、删除、审核内容、个性化、改变搜索顺序或修改原始条目生命周期。

读者列表和搜索使用有界 `limit` / `offset` 分页，并只查询 PostgreSQL 中的 reader-safe 元数据和摘要字段。Reader 条目卡片和详情会暴露 `isDevelopmentSeed`，用于把本地 seed 样例标记为 `Development sample`；该标记不会隐藏、过滤、排序或提升 seed 数据。相关文章、搜索和 Digest 预览都不暴露抽取全文、翻译草稿全文、私有模型载荷、反馈事件或 Admin 诊断信息。Digest 预览使用 best-effort 来源和板块多样性；Digest Edition 是持久化回放快照，但不包含邮件投递、定时 Digest 生成、编辑发布流或个性化推荐。

本地备份/恢复只是手动 PostgreSQL dump 和一次性恢复演练，不包含生产调度、远程存储、监控、告警、WAL 归档或 PITR。GitHub CI/CD 提供质量门禁、GHCR 镜像发布和手动 SSH 部署交接，但仓库内没有编码服务器、域名、生产 secrets、监控、告警、备份排期或上线批准。当前仍未实现公共发布工作流、浏览器自动化、语义/向量搜索、外部搜索服务、搜索扩展部署、完整审核工作流、信任加权、读者回复工作流或非 RSS 适配器。翻译草稿不是公开读者正文。

更完整的范围冻结、里程碑和剩余边界见 `docs/CODEX_MASTER_PLAN.md`。

## 重要文档

- `CONTEXT.md`：领域词汇表
- `docs/CODEX_MASTER_PLAN.md`：MVP v0.1 执行蓝图和进度
- `docs/adr/`：架构决策记录
- `docs/api/`：API 行为说明
- `docs/ops/`：备份、恢复、发布、磁盘和 CI/CD 运维说明
- `docs/research/deep-research-report.md`：原始研究报告
