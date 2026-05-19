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

**Source Policy**:
Rules that decide whether and how a source may be accessed, rate-limited, retried, and processed.
_Avoid_: Crawl config, fetch settings

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

**Content Item**:
A normalized item being evaluated for, or already present in, the public pool.
_Avoid_: Article when the item may not be an article, raw entry, story

**Published Item**:
A content item visible to readers according to its rights policy and publication state.
_Avoid_: Ready item, public article

**Rubric**:
The scoring standard used to evaluate a content item for a board.
_Avoid_: Prompt, ranking formula

**AI Evaluation**:
A structured assessment of a content item against a rubric, including scores, rationale, and supporting evidence.
_Avoid_: Summary, model answer

**Evidence Span**:
A cited fragment from original content that supports an AI-generated claim, score, or rationale.
_Avoid_: Citation when a specific supporting fragment is required

**Translation**:
A Chinese rendering of original content governed by rights policy.
_Avoid_: Rewritten article, public copy

**Personal Space**:
A reader-owned area for saved items, read-later items, annotations, and personal reading status.
_Avoid_: Public pool, recommendation signal

**Feedback**:
A reader-submitted correction or complaint that may affect moderation or public ranking only when type-eligible.
_Avoid_: Like, preference, vote

**Digest**:
A curated summary of notable published items for a board or homepage period.
_Avoid_: Newsletter unless email delivery is specifically meant

## Relationships

- An **Admin** maintains the **Source Registry**, **Source Policies**, **Rights Policies**, **Boards**, and **Rubrics**.
- A **Source** uses one **Source Adapter** to discover **Candidate Items**.
- A **Candidate Item** may become a **Content Item** after normalization, deduplication, and policy checks.
- A **Rights Policy** constrains whether a **Content Item** may be stored, translated, snapshotted, or publicly displayed.
- A **Rubric** evaluates **Content Items** for one or more **Boards**.
- An **AI Evaluation** belongs to one **Content Item** and cites zero or more **Evidence Spans**.
- A **Content Item** may have zero or more **Translations**.
- A **Published Item** is a **Content Item** visible to **Readers** in one or more **Boards**.
- **Feedback** belongs to one **Reader** and one **Content Item**.
- A **Digest** contains selected **Published Items**.

## Example dialogue

> **Dev:** "When a **Source Adapter** discovers an item, should it become a **Published Item** immediately?"
> **Domain expert:** "No. It starts as a **Candidate Item**, then policy checks, normalization, and evaluation decide whether it becomes a **Content Item** and eventually a **Published Item**."

## Flagged ambiguities

- "user" was used for both **Reader** and **Admin**; resolved: use **Reader** for consumption actions and **Admin** for operational actions.
- "article" was too narrow for releases, papers, and feed entries; resolved: use **Candidate Item**, **Content Item**, or **Published Item** based on lifecycle stage.
- "crawl policy", "source policy", and "rights policy" were easy to conflate; resolved: **Source Policy** controls access and processing behavior, while **Rights Policy** controls storage, translation, snapshots, and public display.
- "RSS reader" misstates the product boundary; resolved: RSS/Atom is a **Source Adapter**, not the product category.
