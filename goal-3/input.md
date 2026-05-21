A previous agent produced the plan below to accomplish the user's task. Implement the plan in a fresh context. Treat the plan as the source of user intent, re-read files as needed, and carry the work through implementation and verification.

# 真实源本地导入与采集测试计划

## Summary
- 范围锁定为“本地测试库”：不改默认 seed、不碰生产、不提交真实源清单为默认配置。
- 只使用现有 `rss` / `atom` / `github` / `arxiv` adapter，不新增来源类型，不引入 GDELT/RSSHub。
- 已联网验证候选源：可用源进入首批；Netflix TechBlog、Uber 旧 feed、Semiconductor Today 猜测 feed、Anthropic 非官方 RSS 先排除。

## Implementation
- 执行开始先按 Goal Mode 创建/更新 `goal-[next]/input.md`、`plan.md`、`tasks.md`，然后再改本地数据库。
- 通过本地 SQL 幂等写入 `sources` + `source_policies`，以 `url` 去重；保留现有 5 个 seed 源。
- 首批新增源：
  - `ai`: [Google AI](https://blog.google/technology/ai/rss/), [Google DeepMind](https://www.deepmind.com/blog/rss.xml), [Hugging Face Blog](https://huggingface.co/blog/feed.xml), arXiv `cat:cs.AI`, arXiv `cat:cs.LG`
  - `software-engineering`: [Cloudflare Blog](https://blog.cloudflare.com/rss/), [Cloudflare Developer Platform changelog](https://developers.cloudflare.com/fundamentals/new-features/available-rss-feeds/), [Meta Engineering](https://engineering.fb.com/feed/), [AWS Architecture Blog](https://aws.amazon.com/blogs/architecture/feed/), arXiv `cat:cs.SE`, GitHub `fastify/fastify`
  - `semiconductor`: [EE Times](https://www.eetimes.com/feed/), [SemiWiki](https://semiwiki.com/feed/)
  - `employment-trends`: [BLS JOLTS](https://www.bls.gov/feed/jolts.rss), [Indeed Hiring Lab](https://www.hiringlab.org/feed/)
  - `open-source`: [CNCF Blog](https://www.cncf.io/feed/), GitHub `kubernetes/kubernetes`, `nodejs/node`, `vercel/next.js`, `astral-sh/uv`
- Policy 默认：`saveLevel=metadata_only`、`rightsPolicy=metadata_only`、`translationPolicy=none`；RSS/Atom 中等风险，BLS 低风险；GitHub 源 `fetchIntervalMinutes=360`、`maxRequestsPerHour=2`。
- arXiv URL 使用 `max_results=10`，并遵守官方 3 秒间隔和单连接限制；GitHub 只用仓库元数据与 releases，遵守串行请求和 rate-limit header。

## Test Plan
- 导入前记录本地 `sources`、`raw_entries`、`source_ingest_attempts` 计数。
- 逐个调用 worker `POST /ingest/source/:id`，arXiv 源之间至少间隔 3 秒。
- 验证每个新增源最近一次 `source_ingest_attempts.status` 为 `success`，或把失败源记录为排除候选。
- 验证 `raw_entries` 按 board/source 有真实新增数据，且 reader API `/reader/items?board=...` 能返回真实标题。
- 打开本地页面检查 `/boards/ai`、`/boards/software-engineering`、`/boards/semiconductor`、`/boards/employment-trends`、`/boards/open-source`、`/digest`、`/search?q=Kubernetes`。
- 如果发现 adapter 代码缺陷，再进入 TDD：先加失败复现测试，再做最小修复。

## Rollback
- 只回滚本次新增 URL：删除对应 `raw_entries`、`source_ingest_attempts`、`source_policies`、`sources`。
- 若只是源质量差，不删数据，改为本地禁用：`sources.enabled=false` 且 `source_policies.crawl_enabled=false`。
- 不修改生产、不改 committed seed，所以 Git 回滚不参与这次数据测试。

## Assumptions
- 本次验收目标是本地 reader/admin 能看到真实数据，而不是把真实源固化成项目默认配置。
- Anthropic 先不加入，因为没有确认到官方 RSS；只看到第三方生成/聚合源。
- Netflix TechBlog、Uber Engineering 旧 feed、Semiconductor Today 猜测 feed 不进首批，因为本机实时验证未通过。
