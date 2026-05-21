# Goal 9: Web 登录入口与 Reader 数据来源标记

## Summary
- 本轮合并两项计划内工作：补齐本地可验收的 Web 登录/登出入口，并在 Reader 中明确标记开发 seed 样例。
- 不做公开注册、OAuth、密码重置、完整 Admin 身份工作流、seed 过滤、推荐算法或 schema 重设计。
- 执行前创建 `goal-9/input.md`、`plan.md`、`tasks.md`；按 TDD 分任务推进，每 3 个任务做一次 check-debug loop。

## Interface Changes
- 新增 Web BFF auth routes：
  - `GET /api/auth/me`
  - `POST /api/auth/login`
  - `POST /api/auth/logout`
- BFF 代理到 Fastify：
  - `/auth/me`
  - `/auth/login`
  - `/auth/logout`
- Reader item projections 新增 `isDevelopmentSeed: boolean`，覆盖 list/search/digest/detail/related/Digest Edition snapshot。
- Dev seed 新增本地账号：
  - `admin@example.invalid`
  - `reader@example.invalid`
  - password: `reno-news-dev-password`
  - 只用于本地开发验收，文档明确不能视为生产凭据。

## Key Changes
- Auth BFF：
  - JSON 请求保留 Fastify 的 status、JSON body、`content-type`，并复制 `set-cookie`。
  - Form 登录支持 `/api/auth/login?next=/admin`；成功 303 到安全 `next`，失败 303 回 `/login?error=...&next=...`。
  - Form 登出支持 `/api/auth/logout?next=/`；转发当前 cookie，复制清 cookie 的 `set-cookie`，然后 303 跳转。
  - `next` 只允许单斜杠开头的相对路径，拒绝 `//...` 和绝对 URL；登录默认 `/admin`，登出默认 `/`。
- Web UI：
  - 新增 `/login` 页面，只有 email/password 表单、错误提示和返回链接。
  - `/admin/denied` 增加 Login 链接到 `/login?next=/admin`。
  - `/admin` 显示当前 admin email 和 Logout 表单；不重构所有 admin 子页。
- Dev seed：
  - 在 `infra/db/seeds/dev.sql` 幂等插入 reader/admin 示例用户，密码 hash 使用 argon2id PHC 字符串。
  - 不新增 invite 接受流程，不写生产 secret，不改变生产 compose/env。
- Provenance：
  - `isDevelopmentSeed` 来自 `raw_entries.raw_payload_json @> '{"seed": true}'::jsonb`。
  - UI 只标记，不隐藏 seed：卡片、详情、相关条目、Digest preview、Digest Edition replay 显示 `Development sample` badge。
  - README/API docs 补充该字段和本地 dev 登录方式。

## Test Plan
- 先写失败测试再实现：
  - Web BFF route tests：login/me/logout 转发到 `http://api.test`，转发 cookie/body，复制 `set-cookie`，form 成功/失败 redirect 正确，`next` 防开放重定向。
  - Web UI/helper tests：登录错误文案、admin denied login URL、seed badge helper。
  - DB integration：dev seed 创建两个用户；reader list/search/digest/detail 对 seed 返回 `isDevelopmentSeed=true`，普通真实/测试条目返回 `false`。
  - API tests：`/reader/items`、`/reader/search`、`/reader/digest`、`/reader/items/:id` 响应包含 `isDevelopmentSeed`。
  - Digest Edition tests：新生成 snapshot 保存 `isDevelopmentSeed`；读取旧 snapshot 缺字段时按 `false` 归一化。
- 运行：
  - `pnpm --filter @reno-news/db test:integration`
  - `pnpm --filter @reno-news/api test`
  - `pnpm --filter @reno-news/web test`
  - `pnpm --filter @reno-news/web lint`
  - `git diff --check`
- Chrome 验收：
  - 打开 `/admin` -> denied -> `/login?next=/admin` -> 使用 dev admin 登录 -> 进入 Admin -> logout -> 再访问 `/admin` 回 denied。
  - 打开 `/`、`/search?q=Sample`、`/digest`、一个 seed detail，确认 seed 有 `Development sample` 标记。
  - 打开真实源列表/搜索结果，确认真实条目没有 seed 标记。
  - 截图保存到 `/tmp/reno_news_goal9_*`。

## Assumptions
- 本轮采用 “Mark only”：保留 seed 默认可见合同，不按真实数据存在与否过滤 seed。
- Dev seed 账号只面向本地开发数据库；生产部署不得运行或依赖这些凭据。
- Auth 仍由 Fastify API 拥有；Next 只做 same-origin BFF 和轻量页面，不成为独立身份系统。
- 不新增第三方依赖；cookie 复制和 form handling 用 Next Route Handler 标准能力完成。
