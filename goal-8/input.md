# Goal 8: 文档收口与脏工作区整理

## Summary
- 当前 review/testing 已完成：DB integration、API test、Web test、Web lint、`git diff --check` 全部通过，没有需要立即修复的代码失败。
- 下一轮只做文档与工作区收口：让 README、中文 README、API 文档与当前实现一致，并处理 `apps/web/next-env.d.ts` 的 Next 生成漂移。
- 不改业务代码、不改数据库 schema、不改 seed、不新增功能。

## Key Changes
- 创建 `goal-8/input.md`、`plan.md`、`tasks.md`，记录本轮目标、测试、回滚方式。
- 更新 `README.md` 与 `README.zh-CN.md`：
  - 补齐当前已实现的 auth、admin guard、audit events、backend personal-state、reader pagination、digest diversity、BFF proxy 事实。
  - 修正过期边界：不再声称 auth/backend personal-state/audit logs 完全不存在。
  - 保持中英文 README 结构一致，但不把 README 扩成完整产品文档。
- 更新 API 文档：
  - `docs/api/reader.md` 补 `GET /reader/items`、`GET /reader/search` 的 `limit/offset`、`pagination` 响应元数据和默认/边界。
  - `docs/api/auth.md` 修正 personal-state “introduced later” 的过期描述。
  - 如需要，轻量补 `docs/api/personal-state.md` 的 Web BFF 说明，不改变 API 合同。
- 处理 `apps/web/next-env.d.ts`：
  - 若 diff 仍仅为 `.next/types/routes.d.ts` 到 `.next/dev/types/routes.d.ts` 的生成路径漂移，则恢复为 committed 状态，不提交该生成变更。
  - 若出现额外 diff，先停止并重新评估。

## Test Plan
- 文档一致性检查：搜索 README/API docs 中的过期短语，如 “backend personal-state APIs remain out of scope”、“auth/RBAC not implemented”、“pagination no metadata”。
- 运行：
  - `pnpm --filter @reno-news/web lint`
  - `pnpm --filter @reno-news/web test`
  - `pnpm --filter @reno-news/api test`
  - `git diff --check`
- 最终确认：
  - `git status --short` 只显示本轮文档改动，无 `apps/web/next-env.d.ts` 漂移。
  - 提交文档收口 commit。

## Assumptions
- 本轮目标是文档真实反映当前实现，不重新设计产品范围。
- `README.zh-CN.md` 作为正式中文 README 纳入提交。
- `apps/web/next-env.d.ts` 是生成文件漂移，不作为文档收口的一部分提交。
