PLEASE IMPLEMENT THIS PLAN:
# Goal 7: Reader 列表与搜索分页

## Summary
为 Reader 首页、board 页和 search 页增加 `limit+offset` 分页与 “Load more” 导航，解决一次渲染 100 条导致的密度和可读性问题。保持现有 reader item card shape、数据库 schema、digest、personal state、admin、seed 和真实源配置不变。API 保持向后兼容：`items` 字段不变，只新增分页元数据。

## Key Changes
- 按 Goal Mode 创建 `goal-7/input.md`、`plan.md`、`tasks.md`，再改代码；按 TDD 每个行为先写失败测试再实现。
- Reader API 新增可选查询参数：
  - `GET /reader/items?board=&limit=&offset=`
  - `GET /reader/search?q=&board=&limit=&offset=`
  - `limit`: 1-100；API 默认 100，Web 默认 25。
  - `offset`: 默认 0，最小 0。
  - 响应改为 `{ items, pagination: { limit, offset, hasMore, nextOffset } }`，现有只读 `items` 的调用保持可用。
- DB repository 增加分页能力：
  - 列表排序仍为 `coalesce(published_at, created_at) desc, id desc`。
  - 搜索排序仍为 rank、时间、id。
  - 用 `limit + 1` 判断 `hasMore`，返回前 `limit` 条。
- Web 页面：
  - 首页、board、search 从 URL 读取 `offset`，默认加载 25 条。
  - `ReaderItemList` 下方显示 `Load more` 链接；链接保留当前 board/search query，并追加 `offset=nextOffset&limit=25`。
  - 不做无限滚动，不新增客户端状态，不改变 digest/personal 页面。

## Test Plan
- DB integration：
  - `listReaderItemsPage` 按 `limit/offset` 返回稳定顺序和 `hasMore/nextOffset`。
  - board filter 与分页同时生效。
  - `searchReaderItemsPage` 对搜索结果分页，保留 search rank 与 board filter。
- API tests：
  - `/reader/items?board=ai&limit=25&offset=25` 将参数传给 repository 并返回 `pagination`。
  - `/reader/search?q=Kubernetes&limit=25&offset=25` 同上。
  - invalid `limit=0`、`limit=101`、`offset=-1` 返回 schema validation error。
- Web tests：
  - `getReaderItems`、`getReaderSearchItems` 会序列化 `limit/offset`。
  - `ReaderItemList` 或分页 helper 生成正确的 Load more URL，保留 `q`、`board`、`limit`。
- Run:
  - `pnpm --filter @reno-news/db test:integration`
  - `pnpm --filter @reno-news/api test`
  - `pnpm --filter @reno-news/web test`
  - `pnpm --filter @reno-news/web lint`
- Local/Chrome acceptance:
  - `curl 'http://localhost:3001/reader/items?limit=5&offset=0'`
  - `curl 'http://localhost:3001/reader/search?q=Kubernetes&limit=5&offset=0'`
  - Chrome 打开 `/`, `/boards/ai`, `/search?q=Kubernetes`，确认每页只显示 25 条以内且 Load more URL 正确。

## Assumptions
- 采用你确认的 `limit+offset`，不做 cursor。
- 作用面覆盖首页、board 页、search 页；digest 不纳入本轮。
- API 默认仍保留 100 条，降低兼容风险；Web 主动使用 25 条改善体验。
- 不触碰现有未提交的 `README.md`、`README.zh-CN.md`、`apps/web/next-env.d.ts`，除非后续明确要求。
