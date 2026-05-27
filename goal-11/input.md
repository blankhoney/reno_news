PLEASE IMPLEMENT THIS PLAN:
# Goal 11: 生产数据初始化、入口加固与验收闭环

## Summary
- 基于当前生产状态修订 Goal 10：部署已成功，`news.blankhoney.xyz` 可访问，但生产库为空，backup/alert/rollback 仍未闭环。
- 按你的选择并行推进：真实源数据、服务器本地备份、Resend 告警、rollback、Chrome 实机验收一起纳入任务列表。
- 备份先采用“服务器本地 dump + restore drill”，明确不关闭 off-host backup blocker。
- 先修一个生产安全问题：当前 edge Caddy 暴露了 `/worker/*`，会让公网触达 ingest endpoint；本轮改为只公开 `/worker/healthz`。

## Key Changes
- 创建 `goal-11/input.md`、`plan.md`、`tasks.md`，记录本轮目标、任务、Chrome 截图路径、回滚方式。
- P0 入口加固：
  - 更新 dedicated/edge Caddy 配置，只公开 `/worker/healthz`。
  - 外部 `/worker/ingest/source/:id` 应返回 404/不可达；生产采集只从 VPS 内部触发。
  - 加合同测试防止 `handle_path /worker/*` 再出现。
- 生产真实源初始化：
  - 不运行 dev seed，不创建 dev 账号，不改默认 seed。
  - 只导入 Goal 3 已验证成功的 18 个真实源；排除 `arXiv cs.SE` 和 `CNCF Blog`。
  - 默认 policy：`metadata_only`、`rights_policy=metadata_only`、`translation_policy=none`；GitHub 源 `fetch_interval_minutes=360`、`max_requests_per_hour=2`；BLS JOLTS `risk_level=low`。
  - 通过 VPS 内部命令按 source id 串行触发 worker ingest；arXiv 间隔至少 3 秒。
- 生产本地备份：
  - 在数据导入前做一次本地 dump。
  - 数据导入后再做一次本地 dump，并运行 restore drill 到 disposable database。
  - 文档中保留 off-host backup 未完成状态。
- Resend/rollback/文档：
  - 检查 `send.blankhoney.xyz` 记录和 server env/API key；若 key 未配置，记录 blocker。
  - 在无 schema 变更的前提下做一次 controlled rollback drill，再恢复当前 image tag。
  - 更新生产证据文档，但不把 off-host backup 标为完成。

## Task List
1. Goal 11 记录  
   创建 goal 文件；复制本计划；列出每个任务的验收与回滚。

2. Caddy 安全加固 TDD  
   先写失败合同检查，再修改 Caddy 配置。部署后验证：
   - `/worker/healthz` 是 200
   - `/worker/ingest/source/1` 从公网不可用
   - `/healthz`、`/api/healthz` 仍是 200

3. 大检查 1  
   跑 `pnpm compose:production:check`、`pnpm deploy:contract:check`、`pnpm production:gate:check`、`git diff --check`，等待 CI 和 Publish Images 通过，部署加固版本。

4. 生产数据导入前快照  
   在 VPS 上记录 `sources/raw_entries/source_ingest_attempts` 计数，执行本地 DB dump，保存 dump 路径。

5. 导入 18 个真实源  
   用幂等 SQL 按 URL upsert `sources` 和 `source_policies`，记录新 source ids。导入后确认启用源数量和 policy 值。

6. 逐个采集  
   从 VPS 内部触发 worker ingest，记录每个 source 最新 attempt。失败源不删除，按需要禁用并记录原因。

7. 大检查 2  
   验证 API：
   - `/reader/items?limit=5`
   - `/reader/digest?limit=12`
   - `/reader/search?q=Kubernetes&limit=5`
   - board filters for all 5 boards  
   同时记录 board/source raw entry 分布。

8. Chrome 实机验收  
   使用 Chrome 插件打开并截图：
   - `/`
   - `/boards/ai`
   - `/boards/software-engineering`
   - `/boards/semiconductor`
   - `/boards/employment-trends`
   - `/boards/open-source`
   - `/digest`
   - `/search?q=Kubernetes`
   - 一个真实 item detail
   - `/personal`
   - `/admin`
   验收：页面有真实标题、无 raw HTML/Markdown、无 console error、digest 无明显单源刷屏。

9. 本地备份与 restore drill  
   数据导入后再做一次本地 dump，下载/复制到 restore drill 输入路径，恢复到 disposable database。记录结果；仍标记 off-host backup 未完成。

10. Resend 告警测试  
   若 server env 已有 Resend key，发送测试告警到 `13608729270@163.com` 并记录 delivery evidence。若没有 key，只记录 blocker，不伪造完成。

11. Rollback drill  
   若 `.deploy/previous-image-tag` 存在且本轮无 schema 变更，回滚到 previous tag，健康检查通过后再部署回 current tag。若不可安全执行，记录原因。

12. 大检查 3 与文档收口  
   更新 Goal 11 tasks 和生产证据文档；跑本地合同检查、CI 状态检查、生产 health、Chrome smoke。最终分类：哪些完成，哪些仍因 off-host backup/Resend 外部配置阻塞。

## Test Plan
- Local repo:
  - `pnpm compose:production:check`
  - `pnpm deploy:contract:check`
  - `pnpm backup:offhost:check`
  - `pnpm alerts:check`
  - `pnpm production:gate:check`
  - `git diff --check`
- Production API:
  - health endpoints all 200
  - public worker ingest route blocked
  - reader list/search/digest return real items after ingest
- Chrome:
  - screenshots saved under `/tmp/reno_news_goal11_*`
  - console errors collected and reported
  - visual check confirms non-empty reader pages
- Database:
  - pre/post counts recorded
  - source policies checked
  - latest ingest attempts checked
  - local restore drill passes

## Assumptions
- 本轮不引入新 source type，不做 GDELT/RSSHub，不改默认 seed。
- 生产真实源首批使用 Goal 3 成功的 18 个源；两个已知失败源不启用。
- 服务器本地 backup 是临时保护，不等于 off-host backup；生产闭环仍会保留该 blocker。
- Resend key、生产 DB 密码、服务器 `.env` 不进入聊天和仓库。
- 若 Chrome 或生产检查发现新 P0/P1 问题，先加失败复现测试或合同检查，再做最小修复。
