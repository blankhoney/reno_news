"use client";

import { useEffect, useState } from "react";
import {
  emptyPersonalState,
  isReadLater,
  isSaved,
  readPersonalState,
  toggleReadLater,
  toggleSaved,
  writePersonalState,
  type PersonalItemSnapshot,
  type PersonalState
} from "./personalState";

export function PersonalControls({ item }: { item: PersonalItemSnapshot }) {
  const [state, setState] = useState<PersonalState>(emptyPersonalState);

  useEffect(() => {
    setState(readPersonalState(window.localStorage));
  }, []);

  const saved = isSaved(state, item.id);
  const queued = isReadLater(state, item.id);

  function updateState(updater: (current: PersonalState) => PersonalState) {
    setState((current) => {
      const next = updater(current);
      writePersonalState(window.localStorage, next);
      return next;
    });
  }

  return (
    <div className="personal-actions">
      <button
        type="button"
        aria-pressed={saved}
        onClick={() => updateState((current) => toggleSaved(current, item))}
      >
        {saved ? "Saved" : "Save"}
      </button>
      <button
        type="button"
        aria-pressed={queued}
        onClick={() => updateState((current) => toggleReadLater(current, item))}
      >
        {queued ? "Queued" : "Read later"}
      </button>
    </div>
  );
}
