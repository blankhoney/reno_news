import Link from "next/link";
import {
  getSource,
  RIGHTS_POLICY_OPTIONS,
  RISK_LEVEL_OPTIONS,
  SAVE_LEVEL_OPTIONS,
  TRANSLATION_POLICY_OPTIONS
} from "../../api";
import {
  triggerSourceIngestAction,
  updateSourceEnabledAction,
  updateSourcePolicyAction
} from "../../actions";

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
        <nav className="admin-header-links">
          <Link href="/admin/raw-entries">Raw entries</Link>
          <Link href="/admin/failures">Failures</Link>
        </nav>
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

      <section className="admin-policy-section">
        <h2>Edit policy</h2>
        <form className="admin-policy-form" action={updateSourcePolicyAction}>
          <input type="hidden" name="sourceId" value={source.id} />
          <label className="admin-checkbox-field">
            <input
              type="checkbox"
              name="crawlEnabled"
              value="true"
              defaultChecked={source.policy.crawlEnabled}
            />
            <span>Crawl enabled</span>
            <input type="hidden" name="crawlEnabled" value="false" />
          </label>
          <label>
            <span>Fetch interval minutes</span>
            <input
              type="number"
              name="fetchIntervalMinutes"
              min="1"
              step="1"
              defaultValue={source.policy.fetchIntervalMinutes}
              required
            />
          </label>
          <label>
            <span>Max requests per hour</span>
            <input
              type="number"
              name="maxRequestsPerHour"
              min="1"
              step="1"
              defaultValue={source.policy.maxRequestsPerHour}
              required
            />
          </label>
          <PolicySelect
            label="Save level"
            name="saveLevel"
            value={source.policy.saveLevel}
            options={SAVE_LEVEL_OPTIONS}
          />
          <PolicySelect
            label="Rights policy"
            name="rightsPolicy"
            value={source.policy.rightsPolicy}
            options={RIGHTS_POLICY_OPTIONS}
          />
          <PolicySelect
            label="Translation policy"
            name="translationPolicy"
            value={source.policy.translationPolicy}
            options={TRANSLATION_POLICY_OPTIONS}
          />
          <PolicySelect
            label="Risk level"
            name="riskLevel"
            value={source.policy.riskLevel}
            options={RISK_LEVEL_OPTIONS}
          />
          <button type="submit">Save policy</button>
        </form>
      </section>
    </main>
  );
}

function PolicySelect({
  label,
  name,
  value,
  options
}: {
  label: string;
  name: string;
  value: string;
  options: readonly string[];
}) {
  return (
    <label>
      <span>{label}</span>
      <select name={name} defaultValue={value}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
