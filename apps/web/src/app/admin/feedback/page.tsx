import Link from "next/link";
import { getFeedback, type FeedbackRecord } from "../api";

export default async function AdminFeedbackPage() {
  const feedback = await getFeedback();

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <Link href="/admin">Sources</Link>
          <h1>Feedback</h1>
          <p>Recent reader feedback events.</p>
        </div>
        <nav className="admin-header-links">
          <Link href="/admin/raw-entries">Raw entries</Link>
          <Link href="/admin/failures">Failures</Link>
        </nav>
      </header>

      {feedback.length === 0 ? (
        <p className="empty-state">No recent feedback.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Feedback</th>
              <th>Item</th>
              <th>Context</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {feedback.map((record) => (
              <tr key={record.id}>
                <td>
                  {feedbackTypeLabel(record.feedbackType)}
                  {record.message ? <span>{record.message}</span> : null}
                </td>
                <td>
                  <Link href={`/admin/raw-entries/${record.rawEntryId}`}>
                    {record.rawEntryTitle}
                  </Link>
                </td>
                <td>{feedbackContext(record)}</td>
                <td>{new Date(record.createdAt).toISOString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}

function feedbackContext(record: FeedbackRecord) {
  return (
    <div className="admin-context-links">
      <span>{record.boardName}</span>
      <span>{record.sourceTitle}</span>
    </div>
  );
}

function feedbackTypeLabel(feedbackType: string): string {
  return feedbackType
    .split("_")
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}
