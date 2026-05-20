# Goal Plan: Reno News 第二版执行

## 目标

一次性规划 Reno News 第二版全部可执行任务，并在后续按 Goal Mode 和 TDD 逐项完成。第二版目标不是重新设计项目，而是在现有 MVP v0.1 基础上补齐上线前门槛：

- 身份、RBAC、Admin 边界和审计。
- 生产部署、密钥管理、发布回滚和 off-host 备份。
- 远程观测、告警、结构化日志和 trace id。
- MiniMax 真实模型接入、schema 校验、repair/fallback 和黄金样本回归。
- 个人空间后端化、digest edition 持久化。
- GitHub、arXiv、GDELT radar、RSSHub whitelist 和 PostgreSQL related/dup 增强。

## 当前上下文

- `docs/CODEX_MASTER_PLAN.md` 是当前执行来源。此前 Milestone 0-7 和 MVP v0.1 已冻结完成。
- GitHub 仓库已改为 public，已有 CI、GHCR 镜像发布和手动 Deploy workflow。
- `main` 已有保护规则，`production` environment 已有受保护部署入口。
- 当前工作树存在用户或既有改动：`README.md` 已修改，`README.zh-CN.md` 未跟踪。本目标执行中不得覆盖或混入这些改动，除非后续任务明确要求。
- 当前项目还缺少真实上线门槛：服务端身份/RBAC/审计、生产 secrets、off-host 备份、远程监控、真实模型密钥和质量闸门、后端个人态。

## 已定技术决策

- 身份源：API 是唯一身份事实源，web 只消费 API session。
- 登录方式：invite-only email/password；密码使用 argon2id。
- Session：服务端 session 表，HTTP-only cookie；生产环境必须 secure/sameSite。
- 角色：最小 `reader` / `admin`；匿名只访问公开 reader 面。
- 授权：Fastify 路由级鉴权和 role guard；admin API 默认拒绝非 admin。
- 审计：登录/登出、source policy 变更、hide/restore、manual retry、feedback review 等关键操作入审计表。
- 数据演进：继续使用 SQL migration 作为数据库事实源，不引入 ORM 作为第二事实源。
- 部署：单 VPS + Docker Compose + Caddy；公网只暴露 Caddy，web/api/worker/scheduler 不裸露公网端口。
- 密钥：GitHub secrets / server env 注入，不提交真实 secrets。
- 备份：PostgreSQL `pg_dump -Fc` + off-host S3-compatible storage + restore drill。
- 可观测：结构化日志、`/metrics`、Prometheus/Alertmanager、OpenTelemetry trace id；不在当前 VPS 自托管 Sentry。
- AI：MiniMax M2.7 作为主翻译/分析模型；严格结构化结果必须经过本地 schema 校验、repair pass 和 fallback gate。
- 个人空间：saved/read-later/read_status 进入后端，localStorage 只作为迁移来源和临时 cache。
- 来源扩展顺序：GitHub Releases/Repository metadata -> arXiv Atom -> GDELT radar -> RSSHub whitelist。
- 检索增强：PostgreSQL FTS 保持主轴，`pg_trgm` 和 `pgvector` 只做 related items、duplicate folding 和轻量聚类。

## 执行方式

1. 先维护 `goal-2/input.md`、`goal-2/plan.md`、`goal-2/tasks.md`，再修改业务代码。
2. 每次只执行 `tasks.md` 中一个任务。
3. 每个实现任务采用 tracer bullet TDD：
   - 先定义一个可观察行为。
   - 写一个通过公开接口验证行为的失败测试。
   - 写最小实现让测试通过。
   - 必要时重构，并在每一步后重新运行相关测试。
4. 不做横向切片：不一次性写完整套测试后再一次性实现。
5. 每 3 个任务后执行一次 Check-Debug Loop，覆盖当前阶段相关的测试、lint、migration、build 或 compose 配置检查。
6. 每个任务完成后更新 `tasks.md` 的状态、记录完成内容和验证证据。
7. 有代码或项目文档改动时，以小提交保存该任务成果；不得把无关用户改动混入提交。
8. 若任务需要外部 secrets、VPS、域名、MiniMax key 或远端对象存储，而当前环境无法验证真实连接，则提交本地可验证的 contract、docs、scripts 和 dry-run 测试，并在任务记录中明确真实验证缺口。

## 风险

- 范围大：第二版跨安全、ops、AI、产品状态和来源扩展，必须按任务边界推进。
- 安全风险：auth、session、RBAC、audit 不能靠前端保护，必须在 API 层验证。
- 迁移风险：数据库 migration 需要尽量 additive，避免破坏已有 MVP 数据。
- 部署风险：真实 VPS、域名、secrets 可能不在当前环境可用，不能伪造生产验证。
- AI 风险：MiniMax 输出结构化可靠性需要黄金样本验证，不能只靠 prompt 假设。
- 公开仓库风险：不得提交密钥、真实私有配置、token 或生产凭据。
- 外部 API 风险：GitHub/arXiv/GDELT/RSSHub 都需要 rate-limit、节流和失败隔离。
- 工作树风险：`README.md` 和 `README.zh-CN.md` 当前已有未提交变更，执行中必须保护。

## 验证方法

- 规划和文档：Markdown lint 基础检查、链接/路径人工核对、`git diff --check`。
- 数据库：migration up/down 或等价 schema verification，最小集成测试覆盖表结构与约束。
- API：Fastify route tests 覆盖 auth、role guard、audit、personal state、digest 和 adapter contracts。
- Web：Next.js 相关 route/component tests、必要时 Playwright/Browser smoke 验证用户路径。
- Worker：job handler tests 覆盖 AI adapter、schema gate、source adapters、retry/failure 分类。
- Ops：Compose config render、Caddy route contract、backup dry-run、restore drill、metrics scrape contract。
- CI/CD：本地最小测试通过后，必要时推送并读取 GitHub Actions 结果。
- 最终 review：从用户行为、API、安全、数据、ops、AI 质量、CI/CD 和文档一致性做完整审计。

## 回滚计划

- 每个任务小提交，便于 `git revert <commit>` 回滚单项改动。
- 数据库 migration 优先 additive；若需要 destructive change，先做 ADR 和备份/restore 验证。
- 部署通过镜像 tag 和 deploy script 支持回滚到前一版本。
- auth/RBAC 改动失败时，优先回滚 API guard 和 web guard 的同一任务提交，避免半启用状态。
- AI adapter 改动失败时，可通过 provider/env 开关回退 fake/openai adapter 或禁用真实模型路径。
- 新 source adapter 默认受 feature flag 或 allowlist 控制，失败时禁用对应 adapter 不影响 RSS 主链路。

