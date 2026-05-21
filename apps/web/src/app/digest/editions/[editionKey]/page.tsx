import Link from "next/link";
import { notFound } from "next/navigation";
import { ReaderProvenanceBadge } from "../../../ReaderProvenanceBadge";
import { getReaderDigestEdition, readerItemPath, type DigestEdition } from "../../../readerApi";

type DigestEditionPageProps = {
  params: Promise<{ editionKey: string }>;
};

export default async function DigestEditionPage({ params }: DigestEditionPageProps) {
  const { editionKey } = await params;
  const edition = await getReaderDigestEdition(decodeURIComponent(editionKey));

  if (!edition) {
    notFound();
  }

  return (
    <main className="reader-shell">
      <header className="reader-header">
        <div>
          <Link href="/digest">Digest</Link>
          <h1>Digest {edition.editionDate}</h1>
          <p>
            {edition.boardSlug ? `Board ${edition.boardSlug}` : "All boards"} · {edition.status}
          </p>
        </div>
        <nav className="reader-header-links">
          <Link href="/personal">Personal</Link>
          <Link href="/">Home</Link>
        </nav>
      </header>

      <DigestEditionItems edition={edition} />
    </main>
  );
}

function DigestEditionItems({ edition }: { edition: DigestEdition }) {
  if (edition.items.length === 0) {
    return <p className="empty-state">No items were stored in this digest edition.</p>;
  }

  return (
    <section>
      <h2>Stored items</h2>
      <div className="reader-list">
        {edition.items.map((item) => (
          <article className="reader-card" key={`${edition.editionKey}-${item.itemId}`}>
            <div>
              <span>#{item.position}</span>
              <span>{item.snapshot.boardName}</span>
              <span>{item.snapshot.sourceTitle}</span>
              <ReaderProvenanceBadge item={item.snapshot} />
            </div>
            <h3>
              <Link href={readerItemPath(item.itemId)}>{item.snapshot.title}</Link>
            </h3>
            {item.snapshot.summary ? <p>{item.snapshot.summary}</p> : null}
            <time dateTime={item.snapshot.publishedAt ?? item.snapshot.createdAt}>
              {(item.snapshot.publishedAt ?? item.snapshot.createdAt).slice(0, 10)}
            </time>
          </article>
        ))}
      </div>
    </section>
  );
}
