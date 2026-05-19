import Link from "next/link";
import { getSource } from "../../api";
import { triggerSourceIngestAction, updateSourceEnabledAction } from "../../actions";

export default async function SourceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const source = await getSource(id);

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <Link href="/admin">Sources</Link>
          <h1>{source.title}</h1>
          <p>{source.url}</p>
        </div>
        <Link href="/admin/raw-entries">Raw entries</Link>
      </header>

      <section className="admin-grid">
        <div>
          <h2>Source</h2>
          <dl>
            <dt>Board</dt>
            <dd>{source.boardSlug}</dd>
            <dt>Type</dt>
            <dd>{source.sourceType}</dd>
            <dt>Status</dt>
            <dd>{source.enabled ? "Enabled" : "Disabled"}</dd>
          </dl>
        </div>
        <div>
          <h2>Policy</h2>
          <dl>
            <dt>Crawl</dt>
            <dd>{source.policy.crawlEnabled ? "Enabled" : "Disabled"}</dd>
            <dt>Interval</dt>
            <dd>{source.policy.fetchIntervalMinutes} minutes</dd>
            <dt>Rate limit</dt>
            <dd>{source.policy.maxRequestsPerHour} requests/hour</dd>
            <dt>Save level</dt>
            <dd>{source.policy.saveLevel}</dd>
            <dt>Rights</dt>
            <dd>{source.policy.rightsPolicy}</dd>
            <dt>Translation</dt>
            <dd>{source.policy.translationPolicy}</dd>
            <dt>Risk</dt>
            <dd>{source.policy.riskLevel}</dd>
          </dl>
        </div>
      </section>

      <div className="admin-actions">
        <form action={updateSourceEnabledAction}>
          <input type="hidden" name="sourceId" value={source.id} />
          <input type="hidden" name="enabled" value={String(!source.enabled)} />
          <button type="submit">{source.enabled ? "Disable source" : "Enable source"}</button>
        </form>
        <form action={triggerSourceIngestAction}>
          <input type="hidden" name="sourceId" value={source.id} />
          <button type="submit">Trigger RSS ingest</button>
        </form>
      </div>
    </main>
  );
}
