import Link from "next/link";
import { PersonalControls } from "./PersonalControls";
import { ReaderProvenanceBadge } from "./ReaderProvenanceBadge";
import { ReaderSearchForm } from "./ReaderSearchForm";
import {
  getReaderBoards,
  getReaderItems,
  readerItemPath,
  readerLoadMorePath,
  readerPaginationFromSearchParams,
  type ReaderPagination,
  type ReaderItemCard
} from "./readerApi";
import { toPersonalItemSnapshot } from "./personalState";

type HomeProps = {
  searchParams: Promise<{
    limit?: string;
    offset?: string;
  }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const paginationInput = readerPaginationFromSearchParams(await searchParams);
  const [boards, itemPage] = await Promise.all([
    getReaderBoards(),
    getReaderItems(paginationInput)
  ]);
  const loadMorePath = readerLoadMorePath("/", {}, itemPage.pagination);

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
        <ReaderItemList
          items={itemPage.items}
          pagination={itemPage.pagination}
          loadMorePath={loadMorePath}
        />
      </section>
    </main>
  );
}

export function ReaderItemList({
  items,
  emptyText = "No reader items are available yet.",
  pagination,
  loadMorePath
}: {
  items: ReaderItemCard[];
  emptyText?: string;
  pagination?: ReaderPagination;
  loadMorePath?: string | null;
}) {
  if (items.length === 0) {
    return <p className="empty-state">{emptyText}</p>;
  }

  return (
    <>
      <div className="reader-list">
        {items.map((item) => (
          <article key={item.id} className="reader-card">
            <div>
              <span>{item.boardName}</span>
              <span>{item.sourceTitle}</span>
              <ReaderProvenanceBadge item={item} />
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
      {pagination?.hasMore && loadMorePath ? (
        <Link className="load-more-link" href={loadMorePath}>
          Load more
        </Link>
      ) : null}
    </>
  );
}
