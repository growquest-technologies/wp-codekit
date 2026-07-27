import { useEffect, useRef, useState } from 'react';

/**
 * Persists state to localStorage under `key`, merged over `initial` so new fields
 * added later don't crash on old saved data. Every generator's "your work is saved
 * locally, nothing is uploaded" promise runs through this one hook.
 */
export function useLocalStorageState<T extends object>(key: string, initial: () => T) {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return { ...initial(), ...JSON.parse(raw) };
    } catch {
      /* ignore corrupt storage */
    }
    return initial();
  });

  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      /* storage full or unavailable — generator still works, just won't persist */
    }
  }, [key, state]);

  return [state, setState] as const;
}
