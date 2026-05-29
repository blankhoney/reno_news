PLEASE IMPLEMENT THIS PLAN:
# Goal 12: 生产本机备份自动化，严格 TDD 版

## Summary
- 本轮不使用异地对象存储，不关闭 off-host backup blocker。
- 目标是把生产本机 PostgreSQL dump 做成可定时、可保留、可恢复演练、可审计的机制。
- 执行采用严格 TDD：每个行为单独 RED -> GREEN -> REFACTOR；每轮都在 `goal-12/tasks.md` 记录失败测试、最小实现、复跑结果和重构结果。

## TDD Workflow
- 先创建 `goal-12/input.md`、`plan.md`、`tasks.md`，不改代码。
- 每个行为只写一个失败测试或合同检查。
- 确认失败原因是“功能不存在”，不是测试写错。
- 只写最小实现让当前测试通过。
- 当前测试通过后，再跑相关已有检查，确认没有回归。
- 进入重构步骤：只清理当前新增代码的重复、命名、边界，不扩展功能。
- 重构后再次复跑同一组测试。
- 每 3 个任务做一次大检查：合同检查、生产边界检查、diff check、必要时生产 smoke。

## Red-Green-Refactor Slices
1. Retained backup 命令存在  
   RED: `pnpm backup:local-schedule:check` 失败，指出缺少 retained backup package script。  
   GREEN: 增加 `pnpm db:backup:local:retained` 和最小空壳检查通过条件。  
   REFACTOR: 收敛命名和错误输出。

2. Retained backup 生成 dump  
   RED: 测试要求 wrapper 调用现有 `pg_dump -Fc` 备份路径。  
   GREEN: 最小实现复用 `scripts/db-backup.sh` 或同等 Compose dump 命令。  
   REFACTOR: 去掉重复参数解析。

3. Retention 安全边界  
   RED: 测试要求只删除目标目录下 `reno_news-*.dump` 且保留天数最小 7。  
   GREEN: 实现保留策略。  
   REFACTOR: 简化路径和日期处理。

4. Manifest 证据  
   RED: 测试要求写入 latest manifest，包含 dump path、createdAt、retentionDays、restore command。  
   GREEN: 写最小 JSON manifest。  
   REFACTOR: 保持字段稳定、避免 secret 输出。

5. systemd 模板  
   RED: 合同测试要求 service/timer 模板存在，timer 每日 03:15，`Persistent=true`，不含 secret。  
   GREEN: 增加模板。  
   REFACTOR: 文案和路径统一为 `/srv/reno_news`。

6. 文档与 production gate  
   RED: 合同测试要求文档说明本机定时备份完成但 off-host 仍阻塞。  
   GREEN: 更新 backup/runbook 和生产证据文档。  
   REFACTOR: 去除重复表述，避免误称完整生产备份完成。

## Verification
- 本地：
  - `pnpm backup:local-schedule:check`
  - `pnpm backup:offhost:check`
  - `pnpm compose:production:check`
  - `pnpm deploy:contract:check`
  - `pnpm production:gate:check`
  - `git diff --check`
- 生产：
  - 安装并启用 systemd timer。
  - 手动启动一次 backup service。
  - 用生成 dump 执行 `pnpm db:restore:drill <dump>`。
  - 检查 `systemctl list-timers`、`journalctl`、生产 health。
- Chrome：
  - 打开 `https://news.blankhoney.xyz/`、`/digest`、`/admin`。
  - 截图保存到 `/tmp/reno_news_goal12_*`，确认备份操作未影响页面。

## Assumptions
- 默认每天 03:15 备份。
- 默认本机保留 14 天，最小 7 天。
- 本机备份不防 VPS 整机丢失，所以 off-host/PITR/远程告警仍是生产 blocker。
- 每个 TDD slice 完成后才能进入下一个 slice；不能一次性写完所有测试。
