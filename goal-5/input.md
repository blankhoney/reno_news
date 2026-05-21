PLEASE IMPLEMENT THIS PLAN:
# Goal 5: 补齐 Personal Hydration 的 Reader Item 代理

## Summary
当前 `personalState.ts` 已默认请求 `/api/reader/items/:id` 来补齐后端 personal-state 返回但本地没有快照的条目；Fastify 已有 `GET /reader/items/:id`，但 Web 端还没有对应 Next BFF route。本轮只补这个缺口，不改 personal-state 语义、不改 digest、不改分页、不新增认证 UI。

## Interface Changes
- 新增 Web BFF endpoint：`GET /api/reader/items/:id`
- 代理到 Fastify：`GET /reader/items/:id`
- 响应保持 Fastify 原样语义：
  - `200 { item }`
  - `404 { error: "Reader item not found" }`
- 不改数据库 schema、不改 Fastify API、不改 `personalState.ts` 的 public 调用形状。

## Implementation Changes
- 执行前按项目规则创建 `goal-5/input.md`、`plan.md`、`tasks.md`。
- 新增 `apps/web/src/app/api/reader/items/[id]/route.ts`：
  - 从 route params 读取 `id`
  - 拼接 `API_BASE_URL ?? http://localhost:3001`
  - 转发 `GET`、`cookie`、`cache: "no-store"`
  - 返回 API response body、status、content-type
- 保持现有 `/api/reader/personal-state*` proxy 不重构，避免扩大改动面。
- 如果 TypeScript/Next route handler 签名在测试中暴露兼容问题，只做最小签名调整，不做架构抽取。

## Test Plan
- 先写失败测试，再实现：
  - `GET /api/reader/items/:id` forwards to `http://api.test/reader/items/:id`
  - forwards cookie when present
  - preserves `200` JSON item response
  - preserves `404` missing-item response
- 跑：
  - `pnpm --filter @reno-news/web test`
  - `pnpm --filter @reno-news/web lint`
- 轻量运行验收：
  - `curl http://localhost:3000/api/reader/items/8245`
  - 若本地 item id 不存在，则先从 `/reader/items` 或页面选一个真实 id。
- Chrome 验收：
  - 打开 `/personal`
  - 确认没有 `/api/reader/items/:id` 404 相关 app 日志
  - 如 Chrome 扩展继续拦截直接 `/api/...` 导航，以 `curl` 结果作为 API route 证据，Chrome 只验页面行为。

## Assumptions
- 本轮只处理 P1 personal hydration proxy。
- Digest 多样性、列表分页、seed 标记、共享清洗 util、Admin 登录页都延后到后续 goal。
- 继续保留匿名 personal 本地可用；401/404 不清空 localStorage。
- 不触碰当前未提交的 `README.md`、`README.zh-CN.md`、`apps/web/next-env.d.ts`。
