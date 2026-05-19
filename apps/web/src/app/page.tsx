import Link from "next/link";
import {
  getReaderBoards,
  getReaderItems,
  readerItemPath,
  type ReaderItemCard
} from "./readerApi";

export default async function Home() {
  const [boards, items] = await Promise.all([getReaderBoards(), getReaderItems()]);

  return (
    <main className="reader-shell">
      <header className="reader-header">
        <div>
          <h1>Reno News</h1>
          <p>Public Intelligence Pool</p>
        </div>
        <Link href="/admin">Admin</Link>
      </header>

      <section className="board-nav" aria-label="Boards">
        {boards.map((board) => (
          <Link key={board.slug} href={`/boards/${board.slug}`} className="board-link">
            <strong>{board.name}</strong>
            <span>{board.description}</span>
          </Link>
        ))}
      </section>

      <section>
        <h2>Latest items</h2>
        <ReaderItemList items={items} />
      </section>
    </main>
  );
}

export function ReaderItemList({ items }: { items: ReaderItemCard[] }) {
  if (items.length === 0) {
    return <p className="empty-state">No reader items are available yet.</p>;
  }

  return (
    <div className="reader-list">
      {items.map((item) => (
        <article key={item.id} className="reader-card">
          <div>
            <span>{item.boardName}</span>
            <span>{item.sourceTitle}</span>
          </div>
          <h3>
            <Link href={readerItemPath(item.id)}>{item.title}</Link>
          </h3>
          {item.summary ? <p>{item.summary}</p> : null}
          <time dateTime={item.publishedAt ?? item.createdAt}>
            {(item.publishedAt ?? item.createdAt).slice(0, 10)}
          </time>
        </article>
      ))}
    </div>
  );
}
