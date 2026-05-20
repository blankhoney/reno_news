# 全球多源信息抓取中文化与 AI 评价阅读系统深度研究报告

## 研究结论与关键判断

这类系统**不应再以 RSS 阅读器为产品基座**，但也**不应放弃 RSS/Atom**。更合理的做法是：把 RSS/Atom、arXiv Atom API、GitHub Releases/API、GDELT、RSSHub 路由、网页 watcher 等都当作统一 ingestion fabric 里的“来源适配器”，而不是把整个系统设计成“更强一点的 Miniflux”。GDELT 适合做全球新闻雷达，因为它以近实时方式处理全球新闻并在 65 种语言上做翻译与结构化；arXiv API 本身就是 Atom 形态；GitHub Releases API 提供结构化版本变更信号；RSSHub 本质上是把非 RSS 页面转成 RSS 的开源中间层。citeturn38search8turn8view2turn8view1turn6search12

这套产品最值得坚持的核心，不是“抓得更多”，而是四件事：**来源政策建模、分阶段 AI pipeline、可解释评分、统一中文阅读体验**。其中最大风险不在抓取技术，而在**版权/再分发边界**：`robots.txt` 是抓取礼仪标准，不是授权机制；GitHub、arXiv 等平台也分别对 API 使用、品牌使用、内容再利用提出条件。因此“能抓到”绝不等于“能公开全文展示”，你必须把 **fetch / store / translate / share** 四种权限拆开建模。citeturn27search0turn27search12turn9search0turn8view3

从工程落地看，最稳妥的 MVP 不是“大而全”，而是：**5 个板块、5 类来源、100–300 条/日原始处理、每天每板块 3–5 条高价值推送、无个性化推荐、带证据链的中文阅读页**。这与 Readwise Reader 的“统一阅读入口”、Inoreader 的“监控与搜索”、NewsBlur 的“聚类归档”、Perplexity 的“引用链”相比，更像它们的组合体，而不是其中任何一个的复刻。citeturn11search2turn11search6turn10search1turn10search5turn10search6turn10search14turn12search1turn12academia16

### 关键判断题的明确结论

- **Next.js + TypeScript API + Python worker 适合这个项目。** Next.js 适合做阅读前台与后台界面；独立 TypeScript API 更适合承载鉴权、查询、管理后台和多租户业务；Python 生态则明显更适合正文抽取、抓取、NLP、AI worker。Next.js 官方已支持 App Router、Route Handlers 与自托管，但这不意味着它应该独自承担全部后端职责。citeturn16search0turn16search1turn16search10turn16search14turn28view2turn21view4

- **TypeScript API 和 Next.js 应放在同一个 monorepo。** 这不是因为“时髦”，而是因为你需要共享 UI 类型、鉴权模型、board 枚举、OpenAPI SDK 和设计系统；但部署时仍建议拆成 `web` 与 `api` 两个容器，避免把前端发布与后台 API 生命周期绑死。这个结论主要是工程判断。  

- **Python worker 与 TS API 不应共享 ORM，而应共享数据库契约与消息契约。** 最稳妥做法是 SQL-first：PostgreSQL schema/migrations 作为真源，TS 侧消费 OpenAPI/JSON Schema 与查询层，Python 侧消费同一数据库与 Pydantic/SQLAlchemy 模型；AI 输出也用 JSON Schema 约束。GitHub 官方 REST 文档本身就是 OpenAPI 描述，OpenAI/Gemini/DeepSeek 也都把结构化 JSON 作为一等能力，这正好说明“契约优先”比“共享 ORM”更稳。citeturn8view4turn35search0turn36search0turn35search3turn37search1

- **队列层推荐 Dramatiq，不推荐 Temporal，不优先 BullMQ；Celery 是次优但更重。** Celery 功能最全，内建状态、重试、beat 定时；Dramatiq 明确强调 simplicity / reliability / performance，并自带 retries middleware，更适合单机低复杂度 Python worker；BullMQ 的事件与 backoff 很强，但它是 Node/Redis 队列，与你的 Python-heavy worker 不匹配；Temporal 的 durable execution 很强，但对单机 4C8G、100–300 条/日的 MVP 来说是明显过度设计；RQ 够简单，但运维与状态能力偏薄。最终建议是 **Dramatiq + Redis + Postgres 内部任务表 + 一个轻量 scheduler loop**。citeturn21view5turn18search0turn18search1turn18search2turn21view4turn20search2turn21view0turn21view1turn21view2turn21view3turn22search2turn22search0turn22search1

- **Meilisearch 不值得在 MVP 首日引入，先用 PostgreSQL FTS + `pg_trgm` + 中文分词扩展。** PostgreSQL 自带 FTS、排名与高亮；`pg_trgm` 适合相似字符串和 typo-like 模糊搜；但中文需要额外 parser，例如 `zhparser`。Meilisearch 虽然轻量且能自托管，最低只需 256MB RAM，但其性能强依赖 RAM:disk 比，且默认索引阶段能占用可用内存的 2/3。对 4C8G 单机，同时跑 Postgres、Redis、Next.js、API、worker 时，首发不值得再塞一个常驻搜索服务。citeturn32search0turn32search1turn32search13turn13search4turn29search3turn29search7turn29search14turn29search16

- **`pgvector` 在 MVP 最适合先做语义去重、相似内容推荐、轻量聚类，不适合一开始就做用户侧语义搜索主入口。** pgvector 默认是 exact nearest neighbor，也支持 HNSW/IVFFlat；其中 HNSW 更吃内存，IVFFlat 更省内存但召回更弱。以你当前量级，先把 embeddings 用于“重复折叠、相关内容、板块内相似项”，性价比最高。citeturn33view0

- **ArchiveBox 不应进入 MVP 常驻路径，只保留接口和高价值手动/异步归档能力。** ArchiveBox 很强，能存 HTML、PDF、PNG、TXT、JSON、WARC、媒体等，Docker Compose 也是推荐部署方式；但其初始化会安装 Chrome、wget、yt-dlp、SingleFile、readability 等组件，存储与资源成本都不低。把它放进 `archive_requested` 的旁路任务，比把它做成每条内容的默认步骤更稳。citeturn28view3

- **主抓取层应是 `httpx + trafilatura`，而不是 Crawl4AI。** Trafilatura 官方明确主打抓取、下载、正文抽取、元数据、去重、feed/sitemap 支持，并强调 polite download queues；它还集成了 jusText/readability 思路，且 benchmark 中对开源抽取器表现更稳。Crawl4AI 的强项是 LLM-ready Markdown、动态页面、CSS/LLM 提取、登录态/cookies/local storage，但官方文档对 Docker 部署仍写着 experimental，更适合作为 JS-heavy 与交互式站点的二线抓取器。citeturn28view2turn27search5turn23search4turn28view0turn28view1

- **MiniMax M2.7 适合做全文翻译与结构化评分，但必须设计模型路由与后备适配器。** MiniMax 官方文档给出 204,800 context，支持 tool use / reasoning details，M2.7-highspeed 还提供更高输出速度；Anthropic-compatible API 与 prompt caching 也已公开。对文章级英文/多语内容翻译和 schema 化评分，它是可用的；但因为兼容接口里尚不支持 image/document input，且不同 plan 存在不同 QPS/TPM 配额，所以仍应预留 OpenAI、Anthropic、Gemini、DeepSeek、Qwen/DashScope adapter。citeturn34view1turn34view0turn34view2turn0search0turn35search0turn35search1turn36search0turn36search6turn35search3turn35search7turn37search1turn37search2

- **减少幻觉与错误摘要的关键不在“换更贵模型”，而在 pipeline 设计。** 生成式搜索的研究显示，带引用的系统也经常出现 unsupported statements 和 inaccurate citations，因此你的系统不能只让模型“读完全文自己总结”，而应该要求句级 evidence spans、事实/观点/推测拆分、强制 JSON schema、失败重试、解析校验和人工可追溯版本记录。citeturn12academia16turn35search0turn36search0turn35search3

- **来源评分与内容评分必须拆开，且板块 rubric 必须独立。** 来源评分评估长期可靠性、机构类型、是否一手、是否经常更正；内容评分评估该条信息的“价值密度、时效性、方法透明度、对中文用户的信息差、跨源可验证性”。这样做才能解释“为什么被推”，而不是形成黑盒推荐。GDELT 的非西方覆盖与多语新闻监测，以及 NewsBlur 的 duplicate clustering，都说明“多源多视角”要靠系统设计，而不是口号。citeturn38search8turn10search14turn10search6

- **在不做个性化推荐的情况下，也能做‘高价值推送’。** 排名函数不应学习用户“喜欢什么”，而应在 board 维度综合：内容质量分、来源可靠度、时效衰减、跨源 corroboration、对中文读者的信息差、板块配额、多样性约束、重复折叠结果。用户只改变阅读排序与个人收藏，不训练公共推荐器。这个方向与 Inoreader 的 monitoring feeds、NewsBlur 的 clustering、Perplexity 的 citation-first 更一致。citeturn10search5turn10search8turn10search14turn12search1

- **4C8G VPS 可以支撑 MVP，但前提是坚决砍掉两个常驻重量级服务：Meilisearch 和 ArchiveBox。** Meilisearch 虽可轻启，但会和 Postgres/worker 抢内存；OpenSearch 则更重，Docker 文档开头就写了至少 4GB host memory、并建议 heap 约为系统内存一半；ArchiveBox 也不是轻量组件。首发建议常驻服务只有：Caddy、web、api、worker、scheduler、Postgres、Redis。citeturn29search3turn29search7turn30search0turn30search5turn30search8turn28view3

- **MVP 不应做完整事件聚类图谱。** 但应该做“轻聚类”：URL 规范化 + canonical hash + 标题 trigram 相似 + embedding 相似，再结合 board/time window 折叠重复，阅读页显示“同一事件的其他来源”。这比一上来做复杂 event graph 更稳，也更符合单机资源预算。citeturn32search1turn33view0turn10search14

- **最该后置的功能包括：Meilisearch/OpenSearch、全量 ArchiveBox、复杂团队权限、用户自定义订阅、移动端 App、复杂事件图谱、论坛/社交大规模抓取、登录态全文公共共享、秒级实时推送。** 这些功能会同时拉高合规、资源、运维与产品复杂度。citeturn28view3turn30search0turn27search0

- **最小可上线版本** 应该是：5 个板块；来源只接 RSS/Atom、GDELT、GitHub、arXiv、RSSHub；Trafilatura 为主抽取；Dramatiq 队列；Postgres FTS；AI 只做快筛、评分、翻译、摘要、事实/观点/推测拆分；前台只做首页简报、板块流、阅读页、搜索、收藏/稍后读、反馈与后台。citeturn28view2turn38search8turn8view1turn8view2turn6search12turn21view4

- **最后一个必须明确的逆向建议：不要把‘所有达标内容都公开展示全文中文译文’设成不变前提。** 这是你整个项目里风险最高、最容易拖垮产品与合规的设定。正确做法是：系统可以“抓取、翻译、分析、缓存”，但**公共展示级别**必须受 source policy 和 rights policy 控制；默认公开只到 metadata + 摘要 + 证据块 + 原文链接，全文/译文公开展示只对白名单许可源开放。citeturn27search0turn9search0turn8view3

## 完整 PRD

### 产品定位

这个产品最准确的定位是：**面向中文读者的全球多源信息公共情报池与阅读系统**。它吸收 Readwise Reader 的统一阅读容器、Inoreader 的多源监控与组织、NewsBlur 的重复故事聚类、Perplexity 的证据链展示，但它的核心不是“个人订阅”，而是“作者/管理员维护的公共高质量信息池”。Readwise Reader 证明了把网页、RSS、PDF、YouTube、newsletter 收敛到同一阅读入口能显著提升体验；Inoreader 证明多源监控、newsletter ingest、global search 和 monitoring feed 是成熟需求；NewsBlur 最近甚至把重复 story clustering 做到把同一新闻折叠展示；Perplexity 则把“答案背后必须可回溯到来源”做成了大众产品心智。citeturn11search2turn11search6turn10search5turn10search1turn10search8turn10search14turn10search6turn12search1

因此，产品非目标也要写得足够硬：它**不是**传统 RSS 阅读器、**不是**为了迎合用户兴趣的推荐流、**不是**大规模通用搜索引擎、**不是**用户自己配源/传 cookie 的工具。你要做的是“小而强的公共情报编辑系统”，而不是“大而全的信息入口”。这个边界越早写进 PRD，后面的技术决策越清晰。  

### 用户画像与核心场景

核心用户只有两类。第一类是 **owner/admin**：维护来源、规则、板块、政策、反馈处理和上线审计。第二类是 **reader**：阅读公共池内容，在自己的空间里收藏、稍后读、检索、提交错误反馈与来源建议。disabled 只是 user 的禁用状态，不是独立产品角色。  

最重要的几个核心场景是：管理员每天批量接收来自不同 adapter 的候选项；系统自动做快筛、抓全文、评分、翻译与板块分发；读者打开首页看到“今日简报 + 各板块高分条目 + 全球重要事件 + 反茧房探索位 + 昨日未读精选”；点击进入阅读页，以中文全文为主，原文可切换；分析块默认折叠但可展开查看证据链、评分依据与事实/观点/推测拆分；发现错误时提交反馈，系统影响公共排序而不是训练个性化推荐。这个流程与 Readwise/NewsBlur/Inoreader 的成熟阅读心智高度兼容，但目标更接近“公共分析台”。citeturn11search2turn10search12turn10search5turn10search6

### MVP 范围与页面列表

MVP 建议只保留五个板块：AI、软件工程、电子信息/半导体、就业趋势、开源项目。来源只接五类：RSS/Atom、GDELT、GitHub Releases / GitHub Search、arXiv、RSSHub。这样可以在不引入太多登录态、爬虫、视频转录和邮件解析复杂度的前提下，已经覆盖“新闻、论文、软件发布、网站更新、非标准站点 feed 化”这五种最有代表性的信号类型。GitHub API 对公开资源可匿名访问，但只有 60 次/小时；认证后默认 5,000 次/小时，还存在二级并发与 point 限制，因此 GitHub 必须从第一天起做节流和增量抓取。citeturn8view0turn8view1turn38search8turn8view2turn6search12

首页/今日简报、板块信息流页、文章阅读页、搜索页、收藏页、稍后读页、后台管理页、用户设置页、错误反馈入口，这九个页面就是最小闭环，不要再加。首页应该以“板块卡片 + 今日最重要内容 + 未读精选”形式组织，而不是像无尽瀑布流那样把算法排序藏起来。板块页默认按“综合评分 + 时间衰减”，同时允许切换按时间、按评分、按来源类型、按语言/地区查看。  

### 用户流程、管理员流程与成功指标

用户流程很简单：打开首页 → 看简报 → 进入板块 → 打开阅读页 → 收藏/稍后读/标注 → 搜索回查 → 必要时提交错误反馈。管理员流程则是：维护 sources 与 policies → 观察 crawling / AI job 状态 → 处理失败队列 → 审核高风险隐藏项与版权投诉 → 调整 rubric 版本 → 观察每天各板块输出质量与长期来源衰退。  

成功指标不应只看 DAU。更适合这类产品的指标包括：允许抓取来源的抓取成功率；候选到 ready 的转化率；JSON 结构化输出成功率；翻译与摘要的错误反馈率；阅读页展开 AI 分析块的比例；收藏与稍后读比例；每板块日推送条目中被管理员二次隐藏的比例；重复折叠命中率；以及“昨日未读精选”的重新打开率。  

## 系统架构与技术选型

### 总体架构

推荐的总体架构是六层：**source adapters → fetch/extract → normalize/dedupe → AI evaluation/translation → publish/index → reading experience**。具体服务拆分为：`web`（Next.js）、`api`（TypeScript）、`worker`（Python）、`scheduler`（与 worker 同代码基或独立轻服务）、`postgres`、`redis`、`caddy`，另加两个默认关闭的 profile：`browser-worker`（Playwright/Crawl4AI）与 `archiver`（ArchiveBox）。这个结构既符合 Next.js 自托管与 App Router 模式，也能把 Python 生态的抓取/NLP 能力充分利用起来。citeturn16search14turn16search0turn28view2turn23search2turn28view3

在抓取层，**第一优先级** 是结构化来源：RSS/Atom、arXiv API、GitHub Releases/API、GDELT API；**第二优先级** 是 feed conversion：RSSHub；**第三优先级** 才是普通网页抓取与 JS fallback。这样做的原因，是优先走官方/稳定/结构化接口能显著降低抓取失败、法律争议和正文抽取误差。GDELT 的价值在于“全球新闻雷达”，不是文章存档；其公开说明同时提醒你原始数据量非常大，单年 GKG 可达 2.5TB，因此对单机 MVP 来说更适合做 API 查询和候选发现，而不是全量镜像。citeturn38search0turn38search2turn38search8

### 前后端与语言分工

前端建议用 **Next.js + React + Tailwind/shadcn/ui**。不是因为它绝对优于 Nuxt/SvelteKit，而是因为你现在的项目核心是“复杂阅读页 + 管理后台 + 多状态交互 + 未来可能的 server actions / streaming / auth 集成”，而 Next.js 在 React 生态、服务端组件、App Router、自托管与周边组件上的组合最成熟。与此同时，我不建议把 Next.js Route Handlers 当成你唯一的业务 API。官方文档确实说明 Route Handlers 可以做 API endpoints，但对这个项目而言，独立 TypeScript API 服务会让权限、任务状态查询、后台治理和未来扩展更干净。citeturn16search1turn16search7turn16search10turn16search14

后端建议保留 **TypeScript API + Python worker** 双栈。若你把全部后端都塞进 FastAPI，短期会更省心，但中期会让前台/后台/鉴权/表单验证/前后类型共享失去很多优势；反过来，如果你把抓取/抽取/AI 处理都塞进 Node，也是在逆生态而行。Trafilatura、readability-lxml、Crawl4AI、Dramatiq 这一串能力都天然偏 Python；而前台、后台和查询 API 与 Next.js/React 代码共享契约则天然偏 TypeScript。这个复杂度是值得的，但前提是你要接受“契约优先而不是 ORM 共享”。citeturn28view2turn26search1turn28view0turn21view4

### 数据层、搜索层与归档层

数据库首选 **PostgreSQL**，因为它既能承担交易数据，也能承担 FTS、ranking、JSONB、任务状态和审计日志。FTS 自带 relevance、highlight 与索引；`pg_trgm` 能处理标题和来源名的近似匹配；中文则通过 `zhparser` 这类扩展补齐。首发不建议引入 Meilisearch；更不建议 OpenSearch。OpenSearch 文档本身就体现出它是分布式搜索与分析套件，还带 JVM heap、插件、Dashboards、vector search、snapshot/cluster 健康等一整套运维面；这和你的单机 MVP 目标并不匹配。citeturn32search0turn32search1turn13search4turn29search1turn30search0turn30search5turn31search0

向量层建议只用 **pgvector**，而且先只服务内部能力：相似内容、轻聚类、重复折叠、相关阅读。pgvector 官方 README 对 exact search、HNSW、IVFFlat、filtering 和 recall tradeoffs 写得很清楚；这恰好说明在当前规模下，把它放在 Postgres 内部统一管理最方便，没必要再加一套专门的 vector store。citeturn33view0

归档层首发只保留两类：**抽取正文** 与 **按政策保存的 HTML snapshot**。WARC/PDF/screenshot 不是完全不做，而是只给高价值/高争议/证据型来源做 Level 3/4 旁路任务。ArchiveBox 能存的格式极多，但正因此它也最容易吃掉你的磁盘与维护精力。citeturn28view3

### 主抓取器与降级链路

推荐的抓取降级链条是：

`官方 API / feed → httpx + trafilatura → readability-lxml fallback → Playwright / Crawl4AI → Firecrawl API → 放弃全文，仅保留 metadata + link`

Trafilatura 官方文档明确支持 feed/sitemap、polite queue、正文/元数据/评论抽取、去重与多输出格式；readability-lxml 则是一个更窄、更简单的 main body extractor；newspaper3k 家族不建议作为主干，连其维护中的 fork newspaper4k 都明确写出它出现的原因之一就是原 newspaper3k 长期未更新。Crawl4AI 则更像高阶、JS-aware、LLM-friendly 的 fallback 层，而不是你最稳的主层。Firecrawl 适合做商业兜底，因为它能直接返回 markdown、HTML、JSON、screenshot 甚至 question/highlights 等格式，但它更像“付费基础设施”，不是首发主路径。citeturn28view2turn26search1turn25search1turn25search2turn28view0turn28view1turn28view4turn28view5

## 数据模型与 AI pipeline

### 多维状态模型与失败恢复

你不想要“超长状态机”，这个方向是对的。推荐把状态拆成四个维度：**lifecycle_status**、**processing_stages**、**rights_status**、**failure_status**。例如 `content_items.lifecycle_status` 管 `new/candidate/rejected/ready/published/hidden/archived`；`content_processing_runs` 记录每个 stage 的 `pending/running/succeeded/failed/skipped`；`rights_status` 记录 `fetch_allowed/store_allowed/translate_allowed/public_excerpt_allowed/public_fulltext_allowed/snapshot_allowed`；`task_failures` 记录 stage、error_class、retry_count、next_retry_at、manual_retry_by。Celery、BullMQ、RQ 都有自己的任务状态模型，但你真正应该持久化在产品数据库里的，不是队列框架状态，而是“内容处理事实”。citeturn18search1turn21view2turn22search13

自动重试建议是：网络类与 provider 限流类错误重试 3 次，使用指数退避加 jitter；解析类错误 1 次后进失败队列；高价值来源可加白名单更高重试策略。AWS 关于 backoff with jitter 的工程建议仍然适用，因为你的失败大部分不是永久错误，而是网络抖动、限流或暂时性页面异常。citeturn19search10turn21view1turn18search0turn22search0

### Source policy 与 rights policy

你现有的 `source_policy` 思路是对的，但还不够。建议从“抓取政策”升级为“**来源政策 + 权利政策**”。除了 `crawl_allowed / robots_respected / login_required / paywall_status / share_level / save_level / rate_limit / retry_policy / snapshot_policy / translation_policy / risk_level`，至少再加：

`terms_url`、`license_type`、`copyright_note`、`allowed_use`、`retention_policy_days`、`attribution_required`、`api_preferred`、`api_terms_checked_at`、`can_store_extracted_text_private`、`can_store_extracted_text_public`、`can_store_translation_private`、`can_store_translation_public`、`can_store_snapshot_private`、`can_store_snapshot_public`、`sensitive_source`、`personal_data_risk`。  

最重要的设计思想是：**是否可抓、是否可存、是否可翻、是否可公开展示，必须分离建模**。RFC 9309 说明 robots 是访问约定而非授权；GitHub 公开仓库默认授予的也是“通过服务查看/显示/复刻”的权利，额外再利用要看仓库许可证；arXiv 也明确要求 API 使用者阅读条款与做数据致谢。把这些约束直接转成 policy flags，才是可执行的风控。citeturn27search0turn9search0turn9search11turn8view3

### 数据库 schema 草案

建议把表分成**全局共享池**与**用户私有空间**两组。

全局共享池包括：`boards`、`sources`、`source_policies`、`raw_entries`、`content_items`、`content_snapshots`、`translations`、`ai_evaluations`、`rubrics`、`model_calls`、`search_index_jobs`、`board_items`、`digests`、`crawl_jobs`、`task_failures`。  
用户私有空间包括：`tenants`、`users`、`user_read_status`、`saved_items`、`read_later_items`、`annotations`、`feedback`、`admin_audit_logs`。其中 `feedback` 是“私有提交、公共影响”的混合表：提交记录属于用户空间，但聚合后的影响进入公共排序。  

每张表的最小关键字段建议如下。`users`：`id, tenant_id, role, status, email, locale, timezone, settings_json, created_at`。`tenants`：`id, name, type, status, owner_user_id`。`boards`：`id, slug, name, description, active_rubric_id, default_sort, is_public`。`sources`：`id, kind, canonical_url, title, country, language, org_type, source_policy_id, auth_mode, last_checked_at`。`source_policies`：前述抓取/权利字段。`raw_entries`：`id, source_id, external_id, url, title, summary_raw, published_at, raw_payload_json, canonical_hash`。`content_items`：`id, primary_raw_entry_id, cluster_key, original_language, lifecycle_status, publish_status, rights_status, canonical_url, extracted_text, extraction_confidence, quality_score, credibility_score, novelty_score, china_gap_score, final_score, published_at`。`translations`：`id, item_id, target_lang, provider, model, version, text_full, segments_json, quality_flags`。`ai_evaluations`：`id, item_id, board_id, rubric_id, model_call_id, scores_json, rationale_json, evidence_json, fact_opinion_speculation_json, version`。`model_calls`：`id, provider, model, purpose, prompt_hash, schema_hash, token_in, token_out, latency_ms, status, error_code, request_redacted, response_redacted`。其余表则以“交付、索引、失败、用户交互”维度分别承载。  

### AI pipeline 设计

推荐采用下面这条多阶段 pipeline，并认为它比“一次性读全文生成所有东西”更合理：

**阶段一**：metadata ingest。抓标题、摘要、来源、语言、发布时间，做 URL 规范化、hash 去重、来源政策检查。  
**阶段二**：cheap prefilter。只用标题/摘要/来源 metadata 做板块候选判断、低成本打分、垃圾过滤。  
**阶段三**：fetch & extraction。只对候选项抓正文，并记录抽取置信度与 extractor 来源。  
**阶段四**：source-grounded scoring。模型读取“正文 + 元数据 + rubric schema”，输出结构化评分、理由、事实/观点/推测拆分与 evidence spans。  
**阶段五**：translation。只对达阈值项做中文全文翻译，保留段落对齐与原文切换能力。  
**阶段六**：summary & publish blocks。基于原文与译文生成一句话摘要、详细摘要、为何重要、来源可信度、中文用户信息差、相关项。  
**阶段七**：publish & index。进入 board pool、digest、FTS 索引与相关内容索引。  

为什么这样做更稳？因为生成式搜索可验证性研究表明，仅靠最终答案和引用并不能保障可靠性；而结构化输出 + evidence-first + 分阶段 gating 能显著降低“坏内容也被完整翻译归档”的成本。OpenAI、Gemini、DeepSeek、Qwen 都公开支持结构化 JSON；MiniMax 也支持 tools / reasoning details / compatible APIs / prompt caching，因此这条 pipeline 的工程实现是现实可行的。citeturn12academia16turn35search0turn36search0turn35search3turn37search1turn34view0turn34view2

### 板块 rubric 设计

rubric 必须采用 **通用基座 + 板块扩展**。通用基座建议包含：来源透明度、是否一手/原始数据、方法透明度、信息密度、时效性、可验证性、重复度、噪声/宣传惩罚。然后为五个 MVP 板块分别加权。

AI 板块更看重：模型/系统新意、实验或 benchmark 透明度、是否有 code/model card、真实落地影响、政策/市场信号，与“营销腔惩罚”。  
软件工程更看重：技术深度、复现性、运维相关性、维护状态、社区采用信号。  
半导体更看重：制程/产能/供应链影响、原始公告/财报/机构文件、地缘相关性。  
就业趋势更看重：样本口径、统计方法、领先/滞后指标价值、地区对比口径一致性。  
开源项目更看重：release substance、breaking changes、维护活跃度、依赖面、安全/性能影响。  

关键不是分数本身，而是**展示“为什么被推”**：阅读页要能展开 rubric 子项、权重、命中的证据段落、来源国家/语言/机构类型，这样你的系统才是“可解释的公共筛选”，而不是伪装成客观的黑盒推荐。  

## 阅读体验、搜索与推送设计

### 阅读界面设计原则

阅读体验建议遵循五条原则。第一，**中文优先但原文可随时切换**；第二，**正文优先，分析块折叠**；第三，**来源与证据链固定可见**；第四，**相关内容以轻聚类方式呈现**；第五，**个人动作只影响个人空间，不改变公共推荐逻辑**。Readwise Reader 的价值在于把 RSS、PDF、YouTube、web article、newsletter 放到统一容器中，并围绕“干净阅读 + 高亮/标注”设计；Inoreader 的价值在于 feed 组织、monitoring 与 global search；NewsBlur 则提醒你“聚类重复故事 + 长期归档”是重度阅读产品的重要体验资产。citeturn11search2turn11search6turn10search5turn10search1turn10search6turn10search14

首页建议由四个区域组成：`今日最重要内容`、`板块卡片流`、`全球重要事件折叠区`、`反信息茧房探索位`。最后这个探索位不要个性化，而要系统性地按地区/语言/机构类型做配额，强制展示少量“高价值但不在中文主流讨论里的内容”。这样既符合你“公共客观池”的定位，也能把 GDELT 式的全球覆盖价值真正体现出来。citeturn38search8

阅读页建议采用三栏信息架构：中间是中文正文；右侧是可折叠的 AI 分析块与来源信息；底部是 related items / same cluster alternatives。AI 分析块的最小字段就是你列出的那套，但我建议额外加两个字段：`证据片段` 与 `翻译风险提醒`。前者避免“无依据摘要”，后者对名字、数字、引语、专业术语变动做显式提示。之所以要这样设计，是因为带引用的生成式结果仍然可能出现 unsupported statements；展示证据片段比只展示“来源链接”更能建立可信度。citeturn12academia16turn12search1

### 搜索与知识库

MVP 搜索建议只做四层：标题搜索、全文搜索、中文译文搜索、来源/板块/时间筛选。实现方式是：Postgres `tsvector` 管英文与形态化语言；中文使用 `zhparser` 或外部分词入库；`pg_trgm` 管标题/来源名/短 query 的模糊匹配；`pgvector` 只在“相似内容/相关阅读/重复折叠”里用。这样既能控制资源，又不会一上来陷入多搜索引擎同步、索引故障和一致性问题。citeturn32search0turn32search1turn13search4turn33view0

Meilisearch 可以后置成“第二阶段体验增强器”。它的真正优势在于 search-as-you-type、容错、过滤和对产品搜索体验的快速调优，而不是替代数据库本身。但在 4C8G MVP 上，它不是第一性需求。OpenSearch 则完全不推荐进入 MVP，因为它的安装、heap、插件、Dashboards、快照与升级路径都意味着额外运维面。citeturn13search2turn29search3turn29search7turn29search19turn30search0turn30search7turn31search0

### 无个性化条件下的高价值推送

公共推送建议使用这条排名思路：

`final_rank = board_quality_score × source_reliability × time_decay × novelty × china_gap × corroboration_bonus – duplication_penalty – quality_feedback_penalty`

然后再施加三个约束：**板块配额约束**、**地区/语言多样性约束**、**同事件去重约束**。用户层面只允许改变展示排序，不改变公共 rank。只有“事实错误/翻译错误/摘要误导/侵权投诉”这类反馈才进入公共降权逻辑，其余反馈只进入管理员分析面板。这样做和 NewsBlur 的 cluster folding、Inoreader 的 monitoring 场景更接近，而不是做一个偷换概念的推荐算法。citeturn10search14turn10search8turn10search6

## 部署、运维、备份与监控

### 单机 Docker Compose 架构

建议 Compose 常驻 7 个服务：`caddy`、`web`、`api`、`worker`、`scheduler`、`postgres`、`redis`。`browser-worker`、`archivebox`、`meilisearch` 做成可选 profile，不默认启动。Caddy 比 Nginx 更适合你现在的低运维目标，因为 Meilisearch 官方生产部署文档也明确把 Nginx / Caddy 都列为 HTTPS termination 的推荐反向代理，而 Next.js 官方也已给出 Node server / Docker / self-hosting 路径。citeturn29search3turn16search14

CI/CD 建议走：GitHub Actions `lint + test + build` → 推送镜像到 GHCR → VPS `docker compose pull && docker compose up -d` → healthcheck → 若失败则回滚到上一个镜像 digest。真正的“零停机”在单机 Compose + 数据库迁移场景下并不经济，最现实的目标是**低停机部署**。数据库迁移要坚持 expand-and-contract：先加字段/表，再切代码，再删旧字段，避免一次性 destructive migration。  

### 资源规划、备份与恢复

资源预算上，4C8G 足够支撑首发，但磁盘大小会决定你能否做 snapshot。PostgreSQL 是核心资源；Redis 只做队列与短缓存，不要把业务真相放进去；worker 进程数量按 CPU 与外部 API 配额调节，而不是无脑拉满。GDELT 原始集很大，GitHub 与 arXiv 又完全没必要全文镜像，所以磁盘真正的消耗会来自你自己抓下来的 HTML/译文/snapshot。citeturn38search0turn28view3

备份建议如下：PostgreSQL 每日全量 `pg_dump`，保留 7–14 天；每次部署前做 schema backup；正文/译文/HTML snapshot 做内容寻址存储并周备份；Meilisearch 若以后启用，可视为可重建索引；ArchiveBox 若以后启用，必须单独做价值分层备份，因为它最容易把磁盘打满。  

监控建议坚持轻量：应用输出结构化 JSON 日志到 stdout，Docker 做 log rotation；配一个 Uptime/health 监控；API 与 worker 暴露轻量 `/healthz` 和 `/metrics`；日级业务指标写回 Postgres，后台直接可视化。不要在 MVP 默认引入一整套重型日志平台。更重要的是把下面这些计数器做出来：抓取成功率、抽取失败率、AI 调用失败率、JSON schema 解析失败率、翻译失败率、失败队列积压、每日板块产出、每来源近 7 天更新时间、单位内容平均 AI 成本。  

## 风险与合规清单

### 高风险

最高风险不是技术，而是**公开全文与中文译文再分发**。robots 不是授权；公开网页 ≠ 可以公开缓存全文；登录态更不应默认进入共享全文库。因此，登录态内容、论坛内容、社交内容、付费墙内容，MVP 的最安全默认都是：**最多做内部候选分析或私有笔记，不进公共全文展示**。GitHub 公共仓库内容的再利用也受 repo 许可控制；arXiv 也要求 API 使用者阅读条款、致谢来源，商业产品先审文档。citeturn27search0turn9search0turn9search11turn8view3

第二高风险是**AI 幻觉与错误归因**。如果不给 sentence-level evidence、schema validator、claim type classification 和错误反馈闭环，再漂亮的阅读页也会很快失去公信力。研究已经表明，带 citation 的生成式搜索系统仍然会出现大量 unsupported statements。citeturn12academia16

第三高风险是**来源偏差被“高分化”**。如果只抓英文主流科技媒体，你的系统会稳定地产生“看起来客观、实际上单一视角”的高质量错觉。GDELT 的价值正是提醒你，全球新闻与叙事实际上是多语言、多地区的；因此 source onboarding 时就该记录国家、语言、机构类型，并对板块推送设 diversity quotas。citeturn38search8

### 中风险

中风险主要包括：抓取失败与限流、翻译质量漂移、磁盘膨胀、多租户隔离、恶意反馈。GitHub 官方给出了主限额和二级限速；Trafilatura 官方也强调 polite processing；Dramatiq/Celery/BullMQ 都支持 retry/backoff；这些都说明你应该把“重试”和“节流”当成一等公民，而不是 try-catch。citeturn8view0turn27search5turn20search2turn18search0turn21view1

反馈机制建议保留你设想的阈值，但要加三道保险：一是**每用户每内容每类型只能投一次**；二是**只有事实/翻译/摘要/侵权类反馈能影响公共排序**；三是**降权采用加权阈值而非裸计数**，例如 account age、历史有效率、是否独立来源都纳入权重。版权/不应收录类反馈要进入“即刻隐藏 + 管理员复核”通道，其余只做 gradual downrank，避免被少数人恶意刷掉。  

### 低风险但必须前置处理

较低但必须前置的风险包括：Prompt/version 漂移、跨模型回退格式不一致、抓取器升级破坏抽取质量、以及 future migration 时的 schema 分叉。解决方式都一样：**版本化**。每次 rubric、prompt、model、schema、extractor 变更，都要落在 `rubrics`、`model_calls`、`content_processing_runs`、`admin_audit_logs` 里。这样未来你才能知道“某段时间为什么翻译变差了/为什么这个板块分数突然漂移了”。  

## 里程碑计划与 Codex 开发准备

### MVP 里程碑计划

**Phase 0** 做项目骨架、Compose、Caddy、GH Actions、镜像发布与健康检查。验收标准是本地与 VPS 都能一键起服务，能跑 smoke test，支持回滚到前一个镜像。可延期的是美化式监控面板。  

**Phase 1** 做 Source Registry、Source Policy、RSS/arXiv/GitHub/GDELT/RSSHub adapters、raw entry 入库。验收标准是至少 20 个种子源能稳定入库，支持来源启停、频率配置与基本去重。风险在于 GitHub 节流与 GDELT 结果噪声。  

**Phase 2** 做正文抓取与抽取：`httpx + trafilatura` 主路径、readability fallback、失败队列、抽取置信度、canonical URL、HTML 保存。验收标准是候选正文抽取成功率达到一个可接受水平，失败项能后台重试。可延期的是 browser automation。  

**Phase 3** 做 AI 快筛、评分、翻译、摘要、事实/观点/推测拆分与 JSON schema 校验。验收标准是结构化输出成功率高、失败可重试、所有 AI 调用可追踪 model/prompt/version/tokens。可延期的是跨模型 router 自动优化。  

**Phase 4** 做阅读前台：首页简报、板块页、阅读页、原文切换、收藏、稍后读。验收标准是读者能完整消费内容，阅读页加载与排版合格。可延期的是复杂标注系统。  

**Phase 5** 做管理后台：来源、规则、板块、失败队列、人工隐藏/恢复、反馈处理。验收标准是管理员不需要进数据库也能运转系统。可延期的是复杂统计图表。  

**Phase 6** 做搜索、反馈、每日 digest、相关阅读与轻聚类。验收标准是可以按标题/全文/来源/板块/时间搜索，反馈能进入公共降权逻辑。可延期的是语义搜索 UI 与复杂事件页。  

**Phase 7** 做备份、上线审计、磁盘治理、上线 checklists。验收标准是：能恢复数据库、能恢复 object files、能知道最近一次成功备份时间、能审计模型与来源策略变更。  

### 推荐仓库结构与契约方式

推荐 monorepo 结构如下：`apps/web`、`apps/api`、`services/worker`、`packages/contracts`、`packages/ui`、`packages/config`、`infra/compose`、`infra/github-actions`、`docs/architecture`、`docs/source-policy`、`docs/prompts-rubrics`。`web` 与 `api` 用 pnpm workspace；`worker` 用 `uv` 或 Poetry 独立管理。不要追求一个包管理器统治全部，而要追求**契约统一**。  

契约方式推荐三层：**数据库 schema 用 SQL migrations 作为真源**；**HTTP API 用 OpenAPI**；**异步任务 payload 与 AI 输出都用 JSON Schema**。这样 TS 前端、TS API、Python worker 三侧都能消费同一套 contracts。  

### 测试策略、seed data 与本地环境

测试分五层：adapter fixture tests、extractor golden tests、AI schema contract tests、API integration tests、Playwright E2E。最关键的是 fixture/golden：选 30–50 篇横跨五板块与多语言的固定样本，任何 extractor/prompt/model 升级都先跑回归。  

seed data 至少要包含：5 个板块、20–30 个来源、每来源一套 policy、100 条 raw entries、20 条 accepted content、若干失败任务与若干反馈样本。这样 Codex 后续才能在不依赖真实外部网络的情况下先搭起全流程。  

本地开发环境需要三套 profile：`core`（web/api/worker/postgres/redis）、`browser`（加 Playwright/Crawl4AI）、`ops`（加备份/可视化/调试工具）。README 至少要写四份：顶层 README、开发 README、部署 README、来源政策 README。coding rules 则必须先定：SQL-first、所有异步任务幂等、外部调用必须可重试且可审计、AI 输出必须 schema 校验、source policy 检查先于抓取、权限与 rights flags 严禁在前端 hardcode。  

### 适合交给 Codex 分阶段实现的边界

最适合让 Codex 分阶段实现的是：数据库迁移、Source Registry、adapter 基础设施、任务框架、OpenAPI client、阅读前台骨架、后台 CRUD、搜索 DSL、日志埋点与测试样板。最不适合一开始就让 Codex 自动铺开的，是：完整 rights policy 细节、复杂 rubric 调优、模型路由策略、以及登录态来源的具体接入，因为这些地方需要你本人亲自定边界。  

**最终建议可以浓缩成一句话**：  
先做一个**以 PostgreSQL 为真源、以 Trafilatura 为主抓取、以 Dramatiq 为任务层、以 MiniMax M2.7 为默认 AI、以 Next.js 阅读体验为外壳、以“权利分离建模”作为底线**的公共情报池系统；把 RSS 保留为来源适配器，而不是产品基座；把“全文中文化公共展示一切”从产品公理改成“按来源权利策略决定的能力”。这条路线最符合你的目标，也最经得起上线后的真实世界压力。