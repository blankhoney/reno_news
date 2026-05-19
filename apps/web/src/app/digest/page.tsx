import Link from "next/link";
import { notFound } from "next/navigation";
import { ReaderItemList } from "../page";
import { getReaderBoards, getReaderDigestItems } from "../readerApi";

type DigestPageProps = {
  searchParams: Promise<{ board?: string }>;
};

export default async function DigestPage({ searchParams }: DigestPageProps) {
  const [{ board: boardSlug }, boards] = await Promise.all([searchParams, getReaderBoards()]);
  const selectedBoard = boardSlug
    ? boards.find((board) => board.slug === boardSlug)
    : undefined;

  if (boardSlug && !selectedBoard) {
    notFound();
  }

  const items = await getReaderDigestItems({ boardSlug, limit: 12 });

  return (
    <main className="reader-shell">
      <header className="reader-header">
        <div>
          <Link href="/">Home</Link>
          <h1>Digest</h1>
          <p>{selectedBoard ? selectedBoard.name : "All boards"}</p>
        </div>
        <nav className="reader-header-links">
          <Link href="/personal">Personal</Link>
          <Link href="/admin">Admin</Link>
        </nav>
      </header>

      <form action="/digest" className="reader-search-form">
        <label>
          <span>Board</span>
          <select name="board" defaultValue={boardSlug ?? ""}>
            <option value="">All boards</option>
            {boards.map((board) => (
              <option key={board.slug} value={board.slug}>
                {board.name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit">View digest</button>
      </form>

      <ReaderItemList items={items} emptyText="No digest items are available yet." />
    </main>
  );
}
