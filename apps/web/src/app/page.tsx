import Link from "next/link";
import { PersonalControls } from "./PersonalControls";
import { ReaderSearchForm } from "./ReaderSearchForm";
import {
  getReaderBoards,
  getReaderItems,
  readerItemPath,
  type ReaderItemCard
} from "./readerApi";
import { toPersonalItemSnapshot } from "./personalState";

export default async function Home() {
  const [boards, items] = await Promise.all([getReaderBoards(), getReaderItems()]);

  return (
    <main className="reader-shell">
      <header className="reader-header">
        <div>
          <h1>Reno News</h1>
          <p>Public Intelligence Pool</p>
        </div>
        <nav className="reader-header-links">
          <Link href="/digest">Digest</Link>
          <Link href="/personal">Personal</Link>
          <Link href="/admin">Admin</Link>
        </nav>
      </header>

      <ReaderSearchForm />

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

export function ReaderItemList({
  items,
  emptyText = "No reader items are available yet."
}: {
  items: ReaderItemCard[];
  emptyText?: string;
}) {
  if (items.length === 0) {
    return <p className="empty-state">{emptyText}</p>;
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
          <PersonalControls item={toPersonalItemSnapshot(item)} />
        </article>
      ))}
    </div>
  );
}
