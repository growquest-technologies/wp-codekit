import { useState, type DragEvent } from 'react';

export interface DragBind {
  draggable: boolean;
  onDragStart: () => void;
  onDragOver: (e: DragEvent) => void;
  onDrop: (e: DragEvent) => void;
  isOver: boolean;
}

interface DragPos {
  listKey: string;
  index: number;
}

/**
 * Minimal HTML5 drag/drop reordering: one shared drag/over cursor per page, scoped
 * per-list by `listKey` so blocks, list items, FAQs, screenshots, versions, notices
 * and meta chips can each reorder independently without colliding.
 */
export function useDragReorder() {
  const [drag, setDrag] = useState<DragPos | null>(null);
  const [over, setOver] = useState<DragPos | null>(null);

  function bind(listKey: string, index: number, onReorder: (from: number, to: number) => void): DragBind {
    return {
      draggable: true,
      onDragStart: () => setDrag({ listKey, index }),
      onDragOver: (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setOver({ listKey, index });
      },
      onDrop: (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const d = drag;
        setDrag(null);
        setOver(null);
        if (!d || d.listKey !== listKey || d.index === index) return;
        onReorder(d.index, index);
      },
      isOver: !!(over && over.listKey === listKey && over.index === index),
    };
  }

  return { bind };
}

/** Moves the item at `from` to sit at `to`, matching the design source's onBlockDrop math. */
export function reorderArray<T>(arr: T[], from: number, to: number): T[] {
  const copy = arr.slice();
  const [item] = copy.splice(from, 1);
  const insertAt = from < to ? to - 1 : to;
  copy.splice(insertAt, 0, item);
  return copy;
}
