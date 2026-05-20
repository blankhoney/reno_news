import Link from "next/link";
import { getFailures, type FailureRecord } from "../api";
import { requireAdminSession } from "../session";

export default async function AdminFailuresPage() {
  const adminSession = await requireAdminSession();
  const failures = await getFailures(adminSession);

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <Link href="/admin">Sources</Link>
          <h1>Failures</h1>
          <p>Recent failed ingest, extraction, and model-processing attempts.</p>
        </div>
        <Link href="/admin/raw-entries">Raw entries</Link>
      </header>

      {failures.length === 0 ? (
        <p className="empty-state">No recent failures.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Failure</th>
              <th>Context</th>
              <th>Signal</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {failures.map((failure) => (
              <tr key={`${failure.failureStage}-${failure.id}`}>
                <td>
                  {failure.failureStage}
                  {failure.purpose ? <span>{failure.purpose}</span> : null}
                </td>
                <td>{failureContext(failure)}</td>
                <td>
                  {failure.failureType ?? failure.errorCode ?? "-"}
                  {failure.message ? <span>{failure.message}</span> : null}
                </td>
                <td>{new Date(failure.createdAt).toISOString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}

function failureContext(failure: FailureRecord) {
  return (
    <div className="admin-context-links">
      {failure.sourceId && failure.sourceTitle ? (
        <Link href={`/admin/sources/${failure.sourceId}`}>{failure.sourceTitle}</Link>
      ) : null}
      {failure.rawEntryId && failure.rawEntryTitle ? (
        <Link href={`/admin/raw-entries/${failure.rawEntryId}`}>{failure.rawEntryTitle}</Link>
      ) : null}
      {!failure.sourceId && !failure.rawEntryId ? "-" : null}
    </div>
  );
}
