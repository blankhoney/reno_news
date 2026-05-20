import Link from "next/link";
import { getSources } from "./api";
import { requireAdminSession } from "./session";

export default async function AdminPage() {
  const adminSession = await requireAdminSession();
  const sources = await getSources(adminSession);

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <h1>Admin Debug</h1>
          <p>Source Registry</p>
        </div>
        <nav className="admin-header-links">
          <Link href="/admin/raw-entries">Raw entries</Link>
          <Link href="/admin/failures">Failures</Link>
          <Link href="/admin/feedback">Feedback</Link>
        </nav>
      </header>

      <table>
        <thead>
          <tr>
            <th>Source</th>
            <th>Board</th>
            <th>Type</th>
            <th>Status</th>
            <th>Risk</th>
          </tr>
        </thead>
        <tbody>
          {sources.map((source) => (
            <tr key={source.id}>
              <td>
                <Link href={`/admin/sources/${source.id}`}>{source.title}</Link>
                <span>{source.url}</span>
              </td>
              <td>{source.boardSlug}</td>
              <td>{source.sourceType}</td>
              <td>{source.enabled ? "Enabled" : "Disabled"}</td>
              <td>{source.policy.riskLevel}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
