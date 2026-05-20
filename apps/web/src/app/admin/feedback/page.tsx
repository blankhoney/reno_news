import Link from "next/link";
import {
  FEEDBACK_REVIEW_STATUS_OPTIONS,
  getFeedback,
  type FeedbackRecord
} from "../api";
import { updateFeedbackReviewAction } from "../actions";
import { requireAdminSession } from "../session";

export default async function AdminFeedbackPage() {
  const adminSession = await requireAdminSession();
  const feedback = await getFeedback(adminSession);

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
              <th>Review</th>
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
                <td>
                  <FeedbackReviewForm record={record} />
                </td>
                <td>{new Date(record.createdAt).toISOString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}

function FeedbackReviewForm({ record }: { record: FeedbackRecord }) {
  return (
    <form className="admin-feedback-review-form" action={updateFeedbackReviewAction}>
      <input type="hidden" name="feedbackId" value={record.id} />
      <label>
        <span>Status</span>
        <select name="reviewStatus" defaultValue={record.reviewStatus}>
          {FEEDBACK_REVIEW_STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {reviewStatusLabel(status)}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Note</span>
        <textarea
          name="reviewNote"
          maxLength={2000}
          rows={2}
          defaultValue={record.reviewNote ?? ""}
        />
      </label>
      {record.reviewedAt ? <span>Reviewed {new Date(record.reviewedAt).toISOString()}</span> : null}
      <button type="submit">Save review</button>
    </form>
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

function reviewStatusLabel(reviewStatus: string): string {
  return reviewStatus
    .split("_")
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}
