import Link from "next/link";
import { notFound } from "next/navigation";
import { ReaderSearchForm } from "../../ReaderSearchForm";
import { ReaderItemList } from "../../page";
import {
  getReaderBoards,
  getReaderItems,
  readerLoadMorePath,
  readerPaginationFromSearchParams
} from "../../readerApi";

type BoardPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    limit?: string;
    offset?: string;
  }>;
};

export default async function BoardPage({ params, searchParams }: BoardPageProps) {
  const { slug } = await params;
  const paginationInput = readerPaginationFromSearchParams(await searchParams);
  const boards = await getReaderBoards();
  const board = boards.find((candidate) => candidate.slug === slug);

  if (!board) {
    notFound();
  }

  const itemPage = await getReaderItems({ boardSlug: slug, ...paginationInput });
  const loadMorePath = readerLoadMorePath(`/boards/${board.slug}`, {}, itemPage.pagination);

  return (
    <main className="reader-shell">
      <header className="reader-header">
        <div>
          <Link href="/">Home</Link>
          <h1>{board.name}</h1>
          <p>{board.description}</p>
        </div>
        <nav className="reader-header-links">
          <Link href={`/digest?board=${board.slug}`}>Digest</Link>
          <Link href="/personal">Personal</Link>
          <Link href="/admin">Admin</Link>
        </nav>
      </header>

      <ReaderSearchForm boardSlug={board.slug} lockBoard />

      <ReaderItemList
        items={itemPage.items}
        pagination={itemPage.pagination}
        loadMorePath={loadMorePath}
      />
    </main>
  );
}
