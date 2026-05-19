import Link from "next/link";
import { getRawEntries } from "../api";

export default async function RawEntriesPage() {
  const rawEntries = await getRawEntries();

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <Link href="/admin">Sources</Link>
          <h1>Raw Entries</h1>
          <p>Metadata discovered by RSS/Atom ingest.</p>
        </div>
      </header>

      <table>
        <thead>
          <tr>
            <th>Entry</th>
            <th>Source</th>
            <th>Lifecycle</th>
            <th>Stage</th>
            <th>Failure</th>
          </tr>
        </thead>
        <tbody>
          {rawEntries.map((entry) => (
            <tr key={entry.id}>
              <td>
                <Link href={`/admin/raw-entries/${entry.id}`}>{entry.title}</Link>
                <span>{entry.url}</span>
              </td>
              <td>
                <Link href={`/admin/sources/${entry.sourceId}`}>{entry.sourceTitle}</Link>
              </td>
              <td>{entry.lifecycleStatus}</td>
              <td>{entry.processingStage}</td>
              <td>{entry.failureType ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
