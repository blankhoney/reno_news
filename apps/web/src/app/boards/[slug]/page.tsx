import Link from "next/link";
import { notFound } from "next/navigation";
import { ReaderSearchForm } from "../../ReaderSearchForm";
import { ReaderItemList } from "../../page";
import { getReaderBoards, getReaderItems } from "../../readerApi";

export default async function BoardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const boards = await getReaderBoards();
  const board = boards.find((candidate) => candidate.slug === slug);

  if (!board) {
    notFound();
  }

  const items = await getReaderItems(slug);

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

      <ReaderItemList items={items} />
    </main>
  );
}
