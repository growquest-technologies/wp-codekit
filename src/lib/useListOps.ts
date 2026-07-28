import { useCallback } from 'react';

type Commit<T> = (mutate: (draft: T) => void, coalesceField?: string | null) => void;

export interface ListOps {
  moveUp: (i: number) => void;
  moveDown: (i: number) => void;
  remove: (i: number) => void;
  reorder: (from: number, to: number) => void;
}

/**
 * Move/remove/reorder handlers for a repeatable list, built from a generator's
 * `commit` and a selector onto the array inside the draft. Every generator's
 * add-remove rows share these so the ordering semantics (and the undo entries
 * they produce) are identical everywhere — see RepeatableCard.
 *
 *   const listOf = useListOps(commit);
 *   const fields = listOf((p) => p.fields);
 *   <RepeatableCard onMoveUp={() => fields.moveUp(i)} ... />
 */
export function useListOps<T extends object>(commit: Commit<T>) {
  return useCallback(
    (select: (draft: T) => unknown[]): ListOps => ({
      moveUp: (i) => commit((d) => {
        const a = select(d);
        if (i <= 0) return;
        const t = a[i - 1];
        a[i - 1] = a[i];
        a[i] = t;
      }),
      moveDown: (i) => commit((d) => {
        const a = select(d);
        if (i >= a.length - 1) return;
        const t = a[i + 1];
        a[i + 1] = a[i];
        a[i] = t;
      }),
      remove: (i) => commit((d) => {
        select(d).splice(i, 1);
      }),
      reorder: (from, to) => commit((d) => {
        const a = select(d);
        if (from === to) return;
        const [item] = a.splice(from, 1);
        a.splice(from < to ? to - 1 : to, 0, item);
      }),
    }),
    [commit],
  );
}
