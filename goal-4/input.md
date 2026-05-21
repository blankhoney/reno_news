PLEASE IMPLEMENT THIS PLAN:
# 真实源 Reader 修复方案

## Summary
已查本地代码、项目文档和官方技术文档。React 官方文档明确提示未信任 HTML 不应进入 `dangerouslySetInnerHTML`；Next.js App Router 支持在 Server Component/Route Handler 中做 `redirect()` 和 API 代理。因此第一轮按你选择的“纯文本清洗”执行：不渲染富文本、不新增 sanitizer 依赖，先修掉真实源页面最影响验收的问题。

## 待改进表格
| 优先级 | 问题 | 根因 | 修复策略 | 验收 |
|---|---|---|---|---|
| P0 | 摘要/详情显示 `<p>`、`<img>`、Markdown | `readerRepository` 直接把 `summary_raw` 返回给 UI | 在仓库/API 边界统一转安全纯文本、折叠空白、去 Markdown 链接、截断 | Chrome 页面不再出现原始标签/Markdown |
| P0 | GitHub release 摘要过长 | release body 被当作卡片摘要 | 同一清洗器加卡片长度上限，CSS 再做行数保护 | 列表卡片高度稳定 |
| P1 | `/admin` 未登录静默回首页 | `adminDeniedRedirectPath = "/"` | 改为 `/admin/denied`，显示明确无权限页面，不新增登录系统 | Chrome 打开 `/admin` 不再误以为到了首页 |
| P1 | 个人状态默认请求 `/api/...` 但 Web 无代理 | 客户端默认 BFF 路径，Next 没有 route handlers | 增加 Next Route Handlers 代理到 Fastify `/reader/personal-state*` | 无 404；匿名仍保持本地可用 |
| P2 | 列表一次渲染 100 条 | API 固定 limit 100，UI 无分页 | 本轮先通过摘要截断和 CSS 控制密度；分页另列后续 | 页面可读、不卡顿 |
| Deferred | Digest 被 GitHub/open-source 主导 | 当前排序只按反馈惩罚和时间 | 先不改 ranking；P0/P1 通过后再单独设计来源多样性 | 不阻塞本轮验收 |
| Deferred | seed 样例混在真实数据中 | dev seed 是项目默认本地数据 | 不改默认 seed；验收时只记录现象，不做代码过滤 | 不破坏既有 seed 合同 |

## Implementation Changes
1. 开始执行前按项目 Goal Mode 创建 `goal-4/input.md`、`plan.md`、`tasks.md`，记录本计划、Chrome 证据路径和回滚方式。
2. 在 `packages/db/src/readerRepository.ts` 附近加入 reader display text normalizer：
   - 去掉 HTML 标签、script/style 内容、Markdown 图片/链接语法、标题/列表标记。
   - 解码常见 HTML entity 和数字 entity。
   - 折叠空白，卡片摘要默认截断到约 320 字符。
   - `summary`、`detailSummary`、`chineseText` 都只输出展示用纯文本。
3. 在 `apps/web/src/app/styles.css` 给 reader cards 加摘要行数/溢出保护，避免真实源长文本撑爆列表。
4. 新增 `/admin/denied` 页面，把 admin route guard 从回首页改成跳到该页面；不实现前端登录。
5. 新增 Web BFF proxy routes：`/api/reader/personal-state`、`/saved`、`/read-later`、`/read-status`，只转发 cookie、method、JSON body 到 Fastify API。
6. 保持 Saved 和 Read later 可同时存在，这是当前 ADR/测试定义的行为；不改默认 seed、不改真实源清单默认配置。

## Test Plan
- 先写失败复现测试，再实现：
  - `packages/db/src/integration.test.ts` 增加 HTML/Markdown `summary_raw` fixture，覆盖 list/search/digest/detail 输出清洗结果。
  - `apps/web/src/app/admin/session.test.ts` 更新未授权跳转目标。
  - `apps/web/src/app/personalState.test.ts` 保持客户端 `/api` 合同；为新增 proxy helper/route 增加转发测试。
- 运行最小检查：
  - `pnpm --filter @reno-news/db test:integration`
  - `pnpm --filter @reno-news/web test`
  - `pnpm --filter @reno-news/web lint`
  - 需要时再跑 `pnpm -r test`。
- Chrome 插件验收：
  - 打开 `/boards/ai`、`/search?q=Kubernetes`、一个真实 item detail、`/personal`、`/admin`、`/digest`。
  - 保存截图到新的 `/tmp/reno_news_chrome_repair_*`。
  - 验收标准：可见文本无原始 HTML/Markdown；admin 未登录提示明确；personal state 无 `/api/...` 404；列表卡片不被长摘要撑开。

## Assumptions
- 内容展示采用你确认的“纯文本清洗”策略。
- 本轮不新增第三方 sanitizer/Markdown/html-to-text 依赖。
- 当前未提交的 `README.md`、`README.zh-CN.md`、`apps/web/next-env.d.ts` 视为既有工作区变化，执行时不碰，除非它们阻塞测试。
- 每完成一个 Goal task 就测试、提交、更新 `tasks.md`；每 3 个任务做一次完整 check-debug 循环，并根据 Chrome 结果微调后续任务。
