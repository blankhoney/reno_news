import { readerProvenanceBadgeLabel } from "./readerApi";

type ReaderProvenanceItem = {
  isDevelopmentSeed: boolean;
};

export function ReaderProvenanceBadge({ item }: { item: ReaderProvenanceItem }) {
  const label = readerProvenanceBadgeLabel(item);

  if (!label) {
    return null;
  }

  return <span className="provenance-badge">{label}</span>;
}
