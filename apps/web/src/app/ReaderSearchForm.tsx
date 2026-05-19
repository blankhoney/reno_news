import type { ReaderBoard } from "./readerApi";

type ReaderSearchFormProps = {
  defaultQuery?: string;
  boardSlug?: string;
  boards?: ReaderBoard[];
  lockBoard?: boolean;
};

export function ReaderSearchForm({
  defaultQuery = "",
  boardSlug,
  boards = [],
  lockBoard = false
}: ReaderSearchFormProps) {
  return (
    <form action="/search" className="reader-search-form">
      <label>
        <span>Search</span>
        <input
          type="search"
          name="q"
          defaultValue={defaultQuery}
          placeholder="Search reader items"
          required
        />
      </label>
      {lockBoard && boardSlug ? <input type="hidden" name="board" value={boardSlug} /> : null}
      {!lockBoard && boards.length > 0 ? (
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
      ) : null}
      <button type="submit">Search</button>
    </form>
  );
}
