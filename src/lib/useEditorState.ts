import { useCallback, useRef, useState } from 'react';

const COALESCE_MS = 900;
const HISTORY_LIMIT = 60;

interface Snapshot<T> {
  state: T;
  savedLabel: string;
}

/**
 * Drop-in replacement for useLocalStorageState that adds undo/redo history and a
 * "Saved just now" label — the editor chrome every generator's toolbar needs.
 * Mirrors the commit()/undo()/redo() shape from the original design's DCLogic base class.
 */
export function useEditorState<T extends object>(key: string, initial: () => T) {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return { ...initial(), ...JSON.parse(raw) };
    } catch {
      /* ignore corrupt storage */
    }
    return initial();
  });
  const [past, setPast] = useState<T[]>([]);
  const [future, setFuture] = useState<T[]>([]);
  const [savedLabel, setSavedLabel] = useState('Saved just now');
  const lastCommit = useRef<{ field: string | null; at: number }>({ field: null, at: 0 });

  const persist = useCallback(
    (next: T) => {
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* storage full or unavailable — editor still works, just won't persist */
      }
      setSavedLabel('Saved just now');
    },
    [key],
  );

  const commit = useCallback(
    (mutate: (draft: T) => void, coalesceField?: string | null) => {
      setState((prev) => {
        const next: T = JSON.parse(JSON.stringify(prev));
        mutate(next);
        const now = Date.now();
        const coalesce = !!coalesceField && lastCommit.current.field === coalesceField && now - lastCommit.current.at < COALESCE_MS;
        lastCommit.current = { field: coalesceField ?? null, at: now };
        if (!coalesce) {
          setPast((p) => [...p, prev].slice(-HISTORY_LIMIT));
          setFuture([]);
        }
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const undo = useCallback(() => {
    setPast((p) => {
      if (!p.length) return p;
      const prevState = p[p.length - 1];
      setState((cur) => {
        setFuture((f) => [cur, ...f]);
        persist(prevState);
        return prevState;
      });
      return p.slice(0, -1);
    });
  }, [persist]);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (!f.length) return f;
      const nextState = f[0];
      setState((cur) => {
        setPast((p) => [...p, cur]);
        persist(nextState);
        return nextState;
      });
      return f.slice(1);
    });
  }, [persist]);

  const reset = useCallback(() => {
    commit((draft) => {
      const fresh = initial();
      Object.keys(draft).forEach((k) => delete (draft as Record<string, unknown>)[k]);
      Object.assign(draft, fresh);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commit]);

  return {
    state,
    commit,
    undo,
    redo,
    reset,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    savedLabel,
  };
}

/** Snapshot type export kept for tools that want to type their own history arrays. */
export type { Snapshot };
