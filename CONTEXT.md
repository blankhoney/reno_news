# Public Intelligence Pool

This context defines the domain language for a Chinese-first public intelligence reading system. It keeps product terms distinct from implementation choices so implementation work can use stable names.

## Language

**Public Pool**:
The shared collection of sources, candidate items, evaluated content, and published items maintained for all readers.
_Avoid_: Personal feed, user subscription

**Reader**:
A person who consumes published items and may save, read later, annotate, search, or submit feedback.
_Avoid_: User when the action is reader-specific, subscriber, customer

**Admin**:
A trusted operator who maintains sources, policies, boards, rubrics, moderation, and release quality.
_Avoid_: Owner, editor, operator

**Admin Debug Surface**:
A functional, local-first admin view used to inspect sources, policies, raw entries, and ingest behavior before polished admin workflows exist.
_Avoid_: Reader UI, public dashboard, production CMS

**Board**:
A curated topical collection in the public pool; MVP boards are AI, Software Engineering, Semiconductor, Employment Trends, and Open Source.
_Avoid_: Category, channel, section

**Source**:
An origin from which candidate items may be discovered, such as a feed, public API, or converted feed.
_Avoid_: Site, publisher, feed when the origin is not only RSS/Atom

**Source Registry**:
The admin-maintained inventory of sources, including source type, board association, URL, title, and enablement state.
_Avoid_: Feed list, subscription list

**Source Adapter**:
The source-type-specific path used to discover candidate items from a source.
_Avoid_: Crawler when the source is structured

**Ingest Attempt**:
A recorded attempt to discover candidate items from a source, including success, skip, or failure outcome.
_Avoid_: Crawl job when the source is structured RSS/Atom

**Failure Queue**:
An admin-facing collection of failed ingest, extraction, or model-processing attempts that need inspection.
_Avoid_: Work queue, retry queue, reader error list

**Manual Moderation Action**:
An Admin decision to hide or restore one candidate or published item from reader-facing surfaces without deleting source evidence.
_Avoid_: Feedback, vote, delete, retry

**Source Policy**:
Rules that decide whether and how a source may be accessed, rate-limited, retried, and processed.
_Avoid_: Crawl config, fetch settings

**Policy Change**:
An admin-authored adjustment to a source's access, retention, translation, risk, or public-display rules.
_Avoid_: Reader preference, ranking change, feed setting

**Rights Policy**:
Rules that decide whether retrieved content may be stored, translated, snapshotted, or publicly displayed.
_Avoid_: Robots policy, copyright flag, share level

**Save Level**:
The policy value that decides whether metadata, excerpts, snapshots, or full text may be retained for a source.
_Avoid_: Cache level when the policy is about durable content retention

**Risk Level**:
The admin review bucket for operational, compliance, or source-quality risk.
_Avoid_: Ranking score, AI score

**Candidate Item**:
A discovered item that has not yet been accepted into the public pool.
_Avoid_: Article, story, post

**Extraction Attempt**:
A recorded attempt to fetch and extract readable text from one candidate item's URL.
_Avoid_: Crawl job, AI processing run

**Extraction Result**:
The durable output of a successful extraction attempt, including extracted text, metadata, extractor identity, and confidence.
_Avoid_: Published article, reader copy

**Extraction Confidence**:
A bounded operational signal estimating whether extraction produced enough usable text for later evaluation.
_Avoid_: Quality score, credibility score, AI score

**Content Item**:
A normalized item being evaluated for, or already present in, the public pool.
_Avoid_: Article when the item may not be an article, raw entry, story

**Published Item**:
A content item visible to readers according to its rights policy and publication state.
_Avoid_: Ready item, public article

**Reader Item Card**:
A compact reader UI presentation of policy-eligible item metadata and optional summary snippet.
_Avoid_: Article page, full-text copy, admin debug row

**Reader Detail Projection**:
A reader-facing detail view of one policy-eligible item, assembled from safe metadata, summary blocks, and rights-filtered original or Chinese presentation fields.
_Avoid_: Admin raw entry detail, unrestricted extraction result, automatic translation publication

**Language View**:
A reader-selected presentation mode for one detail page, such as original-source view or Chinese-first summary view.
_Avoid_: Translation publishing decision, locale, user preference

**Reader Search Query**:
Reader-authored text used to find policy-visible items in the public pool.
_Avoid_: Admin filter, crawler query, ranking signal

**Reader Search Result**:
A policy-filtered reader item returned because reader-safe metadata or summary text matches a Reader Search Query.
_Avoid_: Admin raw entry, private full-text match, recommendation

**Related Item**:
A policy-visible item shown near a current Reader Detail Projection because it shares board, source, or reader-safe text signals with that item.
_Avoid_: Personalized recommendation, ranking signal, digest item

**Rubric**:
The scoring standard used to evaluate a content item for a board.
_Avoid_: Prompt, ranking formula

**Model Call**:
A recorded request to an AI provider, including provider, model, purpose, schema or prompt version, status, latency, and redacted payload references.
_Avoid_: AI result, evaluation, prompt

**Prefilter**:
A cheap eligibility check that decides whether an extracted item should receive expensive AI evaluation.
_Avoid_: Final ranking, moderation, publication decision

**AI Evaluation**:
A structured assessment of an extracted candidate item, or later content item, against a rubric, including scores, rationale, supporting evidence, and summary output.
_Avoid_: Summary, model answer

**Evidence Span**:
A cited fragment from original content that supports an AI-generated claim, score, or rationale.
_Avoid_: Citation when a specific supporting fragment is required

**Translation**:
A Chinese rendering of original content governed by rights policy.
_Avoid_: Rewritten article, public copy

**Translation Draft**:
A worker-generated translation stored for review or later publishing decisions, not automatically visible to readers.
_Avoid_: Published translation, reader copy

**Translation Segment**:
A bounded original/translated text pair used to preserve alignment between source text and Chinese output.
_Avoid_: Paragraph when the boundary may not match the source paragraph exactly

**Summary Block**:
A structured, model-generated explanatory draft for a candidate or content item, such as one-sentence summary, detailed summary, why it matters, source note, and China relevance.
_Avoid_: Digest, published article body, ranking score

**Personal Space**:
A reader-owned area for saved items, read-later items, annotations, and personal reading status.
_Avoid_: Public pool, recommendation signal

**Saved Item**:
A reader-marked item kept for later reference in the reader's personal space.
_Avoid_: Public bookmark, ranking signal, admin curation

**Read Later Item**:
A reader-marked item queued for future reading in the reader's personal space.
_Avoid_: Published queue, digest item, recommendation

**Feedback**:
A reader-submitted item-scoped correction or complaint that is stored as an explicit signal, not as a personal preference or automatic ranking change.
_Avoid_: Like, preference, vote, saved item, read-later item, manual moderation action

**Feedback Type**:
A constrained label explaining why Reader Feedback was submitted, such as correction, quality issue, duplicate, broken link, or rights concern.
_Avoid_: Free-form status, ranking formula, moderation state

**Quality Feedback Penalty**:
A bounded public ordering penalty derived from item-scoped Feedback Types, used only after an issue explicitly scopes feedback consumption.
_Avoid_: Vote count, personal preference, automatic moderation, hide rule

**Feedback Review**:
An Admin inspection of one Feedback event that records whether the event remains eligible to affect public ordering signals.
_Avoid_: Manual Moderation Action, reader reply, content lifecycle change

**Feedback Review Status**:
A constrained review state for Feedback, such as open, reviewed, dismissed, or resolved.
_Avoid_: Feedback Type, lifecycle status, trust score

**Digest**:
A curated summary of notable published items for a board or homepage period.
_Avoid_: Newsletter unless email delivery is specifically meant

**Digest Window**:
The board and time boundary used to select items for one Digest.
_Avoid_: Cron schedule, email cadence, reader session

**Digest Item**:
A policy-visible item selected for inclusion in a Digest.
_Avoid_: Ranking winner, recommendation, feedback target

## Relationships

- An **Admin** uses the **Admin Debug Surface** to maintain and inspect the **Source Registry**, **Source Policies**, **Rights Policies**, **Boards**, and **Rubrics**.
- A **Source** uses one **Source Adapter** to discover **Candidate Items**.
- A **Policy Change** applies to one **Source** and changes its **Source Policy** or **Rights Policy**.
- An **Ingest Attempt** records one **Source Adapter** execution for one **Source**.
- A **Failure Queue** can include failed **Ingest Attempts**, failed **Extraction Attempts**, and failed **Model Calls**.
- A **Manual Moderation Action** is performed by an **Admin** and may hide or restore a **Candidate Item** or **Published Item** without deleting source evidence.
- An **Extraction Attempt** fetches and extracts readable text for one **Candidate Item** when **Source Policy** and **Rights Policy** allow it.
- An **Extraction Result** may feed later normalization into a **Content Item**.
- A **Candidate Item** may become a **Content Item** after normalization, deduplication, and policy checks.
- A **Rights Policy** constrains whether a **Content Item** may be stored, translated, snapshotted, or publicly displayed.
- A **Rubric** evaluates **Content Items** for one or more **Boards**.
- A **Model Call** records the provider interaction that may produce an **AI Evaluation**.
- A **Prefilter** may skip expensive **AI Evaluation** when an extracted item is clearly ineligible.
- An **AI Evaluation** belongs to one extracted **Candidate Item** at the current MVP stage, and may later be attached to a normalized **Content Item**.
- A **Content Item** may have zero or more **Translations**.
- A **Translation Draft** contains one or more **Translation Segments** and must pass publishing policy before it can become reader-facing.
- A **Summary Block** explains an evaluated item but does not itself publish, rank, index, or place the item.
- A **Reader Item Card** may present safe metadata and summary snippets without exposing full extracted or translated text.
- A **Reader Detail Projection** may expose an item in one or more **Language Views**, but it must still obey **Rights Policy** and cannot publish **Translation Drafts** by implication.
- A **Reader Search Query** returns **Reader Search Results** only from the same policy-visible item set used by reader listings and detail projections.
- A **Related Item** is selected from the same policy-visible item set used by **Reader Search Results** and must not expose private extraction text, translation drafts, feedback signals, or admin diagnostics.
- A **Published Item** is a **Content Item** visible to **Readers** in one or more **Boards**.
- A **Saved Item** or **Read Later Item** belongs to a **Reader**'s **Personal Space** and does not affect public ranking or admin curation by itself.
- **Feedback** belongs to one **Reader** action and one **Content Item**, but MVP feedback capture does not imply reader accounts, backend personal-state sync, moderation workflow, or ranking mutation.
- A **Feedback Type** constrains what a **Feedback** event means before any later moderation or ranking logic consumes it.
- A **Quality Feedback Penalty** may be derived from stored **Feedback**, but it must remain bounded and must not hide, restore, delete, moderate, or personalize items by itself.
- A **Feedback Review** can change whether one **Feedback** event remains eligible for a **Quality Feedback Penalty**, but it must not change item lifecycle by itself.
- A **Digest** contains selected **Digest Items** from one **Digest Window**.
- A **Digest Item** must still be a policy-visible **Published Item** and must not expose private extraction text, translation drafts, feedback events, or admin diagnostics.

## Example dialogue

> **Dev:** "When a **Source Adapter** discovers an item, should it become a **Published Item** immediately?"
> **Domain expert:** "No. It starts as a **Candidate Item**, then policy checks, normalization, and evaluation decide whether it becomes a **Content Item** and eventually a **Published Item**."

## Flagged ambiguities

- "user" was used for both **Reader** and **Admin**; resolved: use **Reader** for consumption actions and **Admin** for operational actions.
- "article" was too narrow for releases, papers, and feed entries; resolved: use **Candidate Item**, **Content Item**, or **Published Item** based on lifecycle stage.
- "crawl policy", "source policy", and "rights policy" were easy to conflate; resolved: **Source Policy** controls access and processing behavior, while **Rights Policy** controls storage, translation, snapshots, and public display.
- "RSS reader" misstates the product boundary; resolved: RSS/Atom is a **Source Adapter**, not the product category.
- "hide" could mean delete, reject, block a source, or process reader feedback; resolved: use **Manual Moderation Action** for Admin hide/restore decisions.
