import Link from "next/link";
import { getRawEntry } from "../../api";
import { updateRawEntryLifecycleAction } from "../../actions";

export default async function RawEntryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const entry = await getRawEntry(id);
  const lifecycleAction = entry.lifecycleStatus === "hidden" ? "restore" : "hide";
  const lifecycleActionLabel = entry.lifecycleStatus === "hidden" ? "Restore" : "Hide";

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <Link href="/admin/raw-entries">Raw entries</Link>
          <h1>{entry.title}</h1>
          <p>{entry.url}</p>
        </div>
        <Link href={`/admin/sources/${entry.sourceId}`}>{entry.sourceTitle}</Link>
      </header>

      <section className="admin-grid">
        <div>
          <h2>Status</h2>
          <dl>
            <dt>Lifecycle</dt>
            <dd>{entry.lifecycleStatus}</dd>
            <dt>Processing</dt>
            <dd>{entry.processingStage}</dd>
            <dt>Rights</dt>
            <dd>{entry.rightsStatus}</dd>
            <dt>Failure</dt>
            <dd>{entry.failureType ?? "-"}</dd>
          </dl>
        </div>
        <div>
          <h2>Source</h2>
          <dl>
            <dt>Name</dt>
            <dd>{entry.sourceTitle}</dd>
            <dt>Created</dt>
            <dd>{entry.createdAt}</dd>
          </dl>
        </div>
      </section>

      <section className="admin-actions" aria-label="Moderation actions">
        <form action={updateRawEntryLifecycleAction}>
          <input type="hidden" name="rawEntryId" value={entry.id} />
          <input type="hidden" name="action" value={lifecycleAction} />
          <button type="submit">{lifecycleActionLabel}</button>
        </form>
      </section>
    </main>
  );
}
