"use client";

import { useEffect, useState } from "react";
import {
  emptyPersonalState,
  hydratePersonalStateFromBackend,
  isReadLater,
  isSaved,
  readPersonalState,
  setBackendReadLaterItem,
  setBackendReadStatus,
  setBackendSavedItem,
  syncPersonalStateFromBackend,
  toggleReadLater,
  toggleSaved,
  writePersonalState,
  type PersonalItemSnapshot,
  type PersonalState
} from "./personalState";

export function PersonalControls({
  item,
  markReadOnView = false
}: {
  item: PersonalItemSnapshot;
  markReadOnView?: boolean;
}) {
  const [state, setState] = useState<PersonalState>(emptyPersonalState);

  useEffect(() => {
    let cancelled = false;
    const localState = readPersonalState(window.localStorage);
    setState(localState);

    void syncPersonalStateFromBackend(window.localStorage, [item])
      .then((syncedState) => {
        if (!cancelled) {
          setState(syncedState);
        }
      })
      .catch(() => {
        // Keep anonymous/offline local state usable.
      });

    if (markReadOnView) {
      void setBackendReadStatus(item.id, "read").catch(() => {
        // Read status is account-backed only; anonymous/offline readers stay local.
      });
    }

    return () => {
      cancelled = true;
    };
  }, [item, markReadOnView]);

  const saved = isSaved(state, item.id);
  const queued = isReadLater(state, item.id);

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

  async function syncSaved(next: PersonalState): Promise<void> {
    const backend = await setBackendSavedItem(item.id, isSaved(next, item.id));
    await applyBackendState(backend, next);
  }

  async function syncReadLater(next: PersonalState): Promise<void> {
    const backend = await setBackendReadLaterItem(item.id, isReadLater(next, item.id));
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
      item,
      ...localState.saved,
      ...localState.readLater
    ]);
    writePersonalState(window.localStorage, synced);
    setState(synced);
  }

  return (
    <div className="personal-actions">
      <button
        type="button"
        aria-pressed={saved}
        onClick={() => updateState((current) => toggleSaved(current, item), syncSaved)}
      >
        {saved ? "Saved" : "Save"}
      </button>
      <button
        type="button"
        aria-pressed={queued}
        onClick={() => updateState((current) => toggleReadLater(current, item), syncReadLater)}
      >
        {queued ? "Queued" : "Read later"}
      </button>
    </div>
  );
}
