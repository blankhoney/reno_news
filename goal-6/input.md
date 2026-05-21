PLEASE IMPLEMENT THIS PLAN:
# Goal 6: Digest 来源与板块多样性

## Summary
修复 `/digest` 被单一高频来源或单一板块主导的问题。保持现有 API 响应结构、数据库 schema、reader-safe 边界和反馈惩罚语义不变；只改变 digest selection ordering。规则按已确认选择执行：温和配额，并统一作用于 live digest preview 与 admin 生成的 Digest Edition。

## Key Changes
- 执行前创建 `goal-6/input.md`、`plan.md`、`tasks.md`，记录本计划、验收方式和回滚方式。
- 在 `packages/db/src/readerRepository.ts` 内调整 `listReaderDigestItems`：
  - 先用现有基础排序取过采样候选池：`quality_feedback_penalty asc`、时间倒序、`id desc`。
  - 在同一反馈惩罚等级内做多样性选择，确保反馈惩罚仍是第一优先级。
  - 每个 `source_id` 默认最多选 2 条；如果候选不足以填满 `limit`，最后按基础排序放宽该限制回填。
  - 全局 digest 尽量先选不同 board 的代表项，再按基础排序回填；带 `boardSlug` 时只做来源配额。
- 不新增 query 参数，不改 `/reader/digest`、`/digest`、Digest Edition response shape。
- 轻量更新 reader API 文档，说明 digest ordering 是 best-effort source/board diversity，而不是个性化推荐。

## Test Plan
- 先加失败集成测试：
  - 同一 board 内，一个来源有多条最新内容、另一个来源有较旧内容时，`limit=3` 返回中单一来源不超过 2 条，且包含替代来源。
  - 全局 digest 中一个 board/source 有多条最新内容、其它 board 有可见内容时，优先覆盖不同 board。
  - 当只有一个来源有足够内容时，digest 仍回填到 `limit`，不因为配额欠填。
  - 现有反馈惩罚测试继续通过，确认高惩罚内容不会被多样性规则提前。
- 运行：
  - `pnpm --filter @reno-news/db test:integration`
  - `pnpm --filter @reno-news/api test`
  - 如文档或共享类型变动，再跑对应 lint/test。
- 本地验收：
  - `curl http://localhost:3001/reader/digest?limit=12` 检查来源分布。
  - `curl "http://localhost:3001/reader/digest?board=ai&limit=12"` 检查 board 内来源分布。
  - Chrome 打开 `/digest` 和一个 board-filtered digest，保存截图并记录页面没有明显单源刷屏。

## Assumptions
- 本轮只做 digest 多样性，不做分页、seed 标记、推荐算法、个性化、来源元数据 schema 或 UI 重设计。
- 多样性是 best-effort：有足够替代候选时限制单源刷屏；没有替代候选时宁可填满 digest。
- 反馈质量惩罚仍是最高排序边界；多样性只在相同惩罚等级内重排。
