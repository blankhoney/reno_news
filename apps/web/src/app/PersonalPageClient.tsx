"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  emptyPersonalState,
  readPersonalState,
  removeReadLater,
  removeSaved,
  writePersonalState,
  type PersonalItemSnapshot,
  type PersonalState
} from "./personalState";
import { readerItemPath } from "./readerApi";

export function PersonalPageClient() {
  const [state, setState] = useState<PersonalState>(emptyPersonalState);

  useEffect(() => {
    setState(readPersonalState(window.localStorage));
  }, []);

  function updateState(updater: (current: PersonalState) => PersonalState) {
    setState((current) => {
      const next = updater(current);
      writePersonalState(window.localStorage, next);
      return next;
    });
  }

  return (
    <div className="personal-grid">
      <PersonalList
        title="Saved"
        emptyText="No saved items yet."
        items={state.saved}
        removeLabel="Remove saved"
        onRemove={(id) => updateState((current) => removeSaved(current, id))}
      />
      <PersonalList
        title="Read later"
        emptyText="No read-later items yet."
        items={state.readLater}
        removeLabel="Remove read later"
        onRemove={(id) => updateState((current) => removeReadLater(current, id))}
      />
    </div>
  );
}

function PersonalList({
  title,
  emptyText,
  items,
  removeLabel,
  onRemove
}: {
  title: string;
  emptyText: string;
  items: PersonalItemSnapshot[];
  removeLabel: string;
  onRemove(id: number): void;
}) {
  return (
    <section className="personal-section">
      <h2>{title}</h2>
      {items.length === 0 ? <p className="empty-state">{emptyText}</p> : null}
      <div className="reader-list">
        {items.map((item) => (
          <article key={item.id} className="reader-card">
            <div>
              <span>{item.boardName}</span>
              <span>{item.sourceTitle}</span>
            </div>
            <h3>
              <Link href={readerItemPath(item.id)}>{item.title}</Link>
            </h3>
            {item.summary ? <p>{item.summary}</p> : null}
            <time dateTime={item.publishedAt ?? item.createdAt}>
              {(item.publishedAt ?? item.createdAt).slice(0, 10)}
            </time>
            <div className="personal-actions">
              <button type="button" onClick={() => onRemove(item.id)}>
                {removeLabel}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
