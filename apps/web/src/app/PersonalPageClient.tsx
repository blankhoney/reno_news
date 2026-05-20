"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  emptyPersonalState,
  hydratePersonalStateFromBackend,
  readPersonalState,
  removeReadLater,
  removeSaved,
  setBackendReadLaterItem,
  setBackendSavedItem,
  syncPersonalStateFromBackend,
  writePersonalState,
  type PersonalItemSnapshot,
  type PersonalState
} from "./personalState";
import { readerItemPath } from "./readerApi";

export function PersonalPageClient() {
  const [state, setState] = useState<PersonalState>(emptyPersonalState);

  useEffect(() => {
    let cancelled = false;
    const localState = readPersonalState(window.localStorage);
    setState(localState);

    void syncPersonalStateFromBackend(window.localStorage)
      .then((syncedState) => {
        if (!cancelled) {
          setState(syncedState);
        }
      })
      .catch(() => {
        // Keep anonymous/offline local state usable.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function updateState(
    updater: (current: PersonalState) => PersonalState,
    syncBackend: (next: PersonalState) => Promise<void>
  ) {
    setState((current) => {
      const next = updater(current);
      writePersonalState(window.localStorage, next);
      void syncBackend(next).catch(() => {
        // Keep anonymous/offline local state usable.
      });
      return next;
    });
  }

  async function syncSavedRemoval(id: number, next: PersonalState): Promise<void> {
    const backend = await setBackendSavedItem(id, false);
    await applyBackendState(backend, next);
  }

  async function syncReadLaterRemoval(id: number, next: PersonalState): Promise<void> {
    const backend = await setBackendReadLaterItem(id, false);
    await applyBackendState(backend, next);
  }

  async function applyBackendState(
    backend: Awaited<ReturnType<typeof setBackendSavedItem>>,
    localState: PersonalState
  ): Promise<void> {
    if (!backend) {
      return;
    }
    const synced = await hydratePersonalStateFromBackend(backend, [
      ...localState.saved,
      ...localState.readLater
    ]);
    writePersonalState(window.localStorage, synced);
    setState(synced);
  }

  return (
    <div className="personal-grid">
      <PersonalList
        title="Saved"
        emptyText="No saved items yet."
        items={state.saved}
        removeLabel="Remove saved"
        onRemove={(id) =>
          updateState((current) => removeSaved(current, id), (next) => syncSavedRemoval(id, next))
        }
      />
      <PersonalList
        title="Read later"
        emptyText="No read-later items yet."
        items={state.readLater}
        removeLabel="Remove read later"
        onRemove={(id) =>
          updateState((current) => removeReadLater(current, id), (next) =>
            syncReadLaterRemoval(id, next)
          )
        }
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
