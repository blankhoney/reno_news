import Link from "next/link";
import { notFound } from "next/navigation";
import { PersonalControls } from "../../PersonalControls";
import { ReaderProvenanceBadge } from "../../ReaderProvenanceBadge";
import { toPersonalItemSnapshot } from "../../personalState";
import { submitReaderFeedbackAction } from "./actions";
import {
  READER_FEEDBACK_TYPE_OPTIONS,
  getReaderItemDetail,
  getReaderRelatedItems,
  readerItemPath,
  type ReaderItemCard,
  type ReaderItemDetail,
  type ReaderLanguageView
} from "../../readerApi";

type ItemPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string }>;
};

export default async function ItemPage({ params, searchParams }: ItemPageProps) {
  const { id } = await params;
  const itemId = Number(id);

  if (!Number.isInteger(itemId) || itemId < 1) {
    notFound();
  }

  const item = await getReaderItemDetail(itemId);
  if (!item) {
    notFound();
  }

  const relatedItems = (await getReaderRelatedItems(item.id)) ?? [];
  const { view } = await searchParams;
  const selectedView: ReaderLanguageView = view === "original" ? "original" : "zh";

  return (
    <main className="reader-shell">
      <header className="reader-header">
        <div>
          <Link href={`/boards/${item.boardSlug}`}>{item.boardName}</Link>
          <h1>{selectedView === "original" ? item.originalTitle : item.chineseTitle}</h1>
          <p>
            {item.sourceTitle} · {(item.publishedAt ?? item.createdAt).slice(0, 10)}
            {" "}
            <ReaderProvenanceBadge item={item} />
          </p>
        </div>
        <nav className="reader-header-links">
          <Link href="/personal">Personal</Link>
          <Link href="/">Home</Link>
        </nav>
      </header>

      <PersonalControls item={toPersonalItemSnapshot(item)} markReadOnView />

      <nav className="language-switch" aria-label="Language view">
        <Link
          href={readerItemPath(item.id, "zh")}
          aria-current={selectedView === "zh" ? "page" : undefined}
        >
          Chinese
        </Link>
        <Link
          href={readerItemPath(item.id, "original")}
          aria-current={selectedView === "original" ? "page" : undefined}
        >
          Original
        </Link>
      </nav>

      {selectedView === "original" ? (
        <OriginalView item={item} />
      ) : (
        <ChineseView item={item} />
      )}

      <RelatedItems items={relatedItems} />
      <FeedbackForm itemId={item.id} />
    </main>
  );
}

const feedbackTypeLabels: Record<(typeof READER_FEEDBACK_TYPE_OPTIONS)[number], string> = {
  correction: "Correction",
  quality_issue: "Quality issue",
  duplicate: "Duplicate",
  broken_link: "Broken link",
  rights_concern: "Rights concern"
};

function FeedbackForm({ itemId }: { itemId: number }) {
  return (
    <section className="reader-feedback">
      <h2>Feedback</h2>
      <form action={submitReaderFeedbackAction}>
        <input type="hidden" name="itemId" value={itemId} />
        <label>
          <span>Type</span>
          <select name="feedbackType" defaultValue="quality_issue" required>
            {READER_FEEDBACK_TYPE_OPTIONS.map((feedbackType) => (
              <option key={feedbackType} value={feedbackType}>
                {feedbackTypeLabels[feedbackType]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Message</span>
          <textarea name="message" maxLength={2000} rows={4} />
        </label>
        <button type="submit">Submit feedback</button>
      </form>
    </section>
  );
}

function ChineseView({ item }: { item: ReaderItemDetail }) {
  return (
    <article className="reader-detail">
      <p className="reader-lede">{item.chineseText || item.summary}</p>
      {item.whyItMatters ? (
        <section>
          <h2>Why it matters</h2>
          <p>{item.whyItMatters}</p>
        </section>
      ) : null}
      {item.chinaRelevance ? (
        <section>
          <h2>China relevance</h2>
          <p>{item.chinaRelevance}</p>
        </section>
      ) : null}
      {item.sourceNote ? (
        <section>
          <h2>Source note</h2>
          <p>{item.sourceNote}</p>
        </section>
      ) : null}
      <SourceLink url={item.url} />
      <RelatedTopics topics={item.relatedTopics} />
    </article>
  );
}

function OriginalView({ item }: { item: ReaderItemDetail }) {
  return (
    <article className="reader-detail">
      {item.originalTextMode === "none" ? (
        <p className="empty-state">Original text is not available for public display.</p>
      ) : (
        <p className="reader-body">{item.originalText}</p>
      )}
      {item.originalTextMode === "excerpt" ? (
        <p className="empty-state">Excerpt only. Open the source for the complete original item.</p>
      ) : null}
      <SourceLink url={item.url} />
    </article>
  );
}

function SourceLink({ url }: { url: string }) {
  return (
    <p className="source-link">
      <a href={url}>Open source</a>
    </p>
  );
}

function RelatedItems({ items }: { items: ReaderItemCard[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="reader-related">
      <h2>Related items</h2>
      <div className="reader-list">
        {items.map((item) => (
          <article className="reader-card" key={item.id}>
            <div>
              <span>{item.boardName}</span>
              <span>{item.sourceTitle}</span>
              <ReaderProvenanceBadge item={item} />
              <time dateTime={item.publishedAt ?? item.createdAt}>
                {(item.publishedAt ?? item.createdAt).slice(0, 10)}
              </time>
            </div>
            <h3>
              <Link href={`/items/${item.id}`}>{item.title}</Link>
            </h3>
            <p>{item.summary}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function RelatedTopics({ topics }: { topics: string[] }) {
  if (topics.length === 0) {
    return null;
  }

  return (
    <div className="topic-list">
      {topics.map((topic) => (
        <span key={topic}>{topic}</span>
      ))}
    </div>
  );
}
