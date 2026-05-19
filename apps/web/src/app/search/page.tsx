import Link from "next/link";
import { ReaderSearchForm } from "../ReaderSearchForm";
import { ReaderItemList } from "../page";
import { getReaderBoards, getReaderSearchItems } from "../readerApi";

type SearchPageProps = {
  searchParams: Promise<{
    q?: string;
    board?: string;
  }>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q = "", board } = await searchParams;
  const query = q.trim();
  const boardSlug = board?.trim() || undefined;
  const boards = await getReaderBoards();
  const selectedBoard = boardSlug
    ? boards.find((candidate) => candidate.slug === boardSlug)
    : undefined;
  const items = query ? await getReaderSearchItems(query, boardSlug) : [];
  const scopeLabel = selectedBoard?.name ?? boardSlug ?? "All boards";

  return (
    <main className="reader-shell">
      <header className="reader-header">
        <div>
          <Link href="/">Home</Link>
          <h1>Search</h1>
          <p>{scopeLabel}</p>
        </div>
        <nav className="reader-header-links">
          <Link href="/personal">Personal</Link>
          <Link href="/admin">Admin</Link>
        </nav>
      </header>

      <ReaderSearchForm defaultQuery={query} boardSlug={boardSlug} boards={boards} />

      <section>
        <h2>{query ? `Results for "${query}"` : "Results"}</h2>
        {query ? (
          <ReaderItemList
            items={items}
            emptyText={`No reader items match "${query}" in ${scopeLabel}.`}
          />
        ) : (
          <p className="empty-state">Enter a query to search reader items.</p>
        )}
      </section>
    </main>
  );
}
