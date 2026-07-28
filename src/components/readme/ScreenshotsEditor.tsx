import type { Ref } from 'react';
import type { Screenshot } from '../../generators/readmeStudio';
import { RepeatableCard } from '../ui/RepeatableCard';
import type { DragBind } from '../../lib/dragReorder';

interface ScreenshotRowProps {
  screenshot: Screenshot;
  number: number;
  index: number;
  count: number;
  dragBind: DragBind;
  onChangeDescription: (value: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  registerRef?: (el: HTMLElement | null) => void;
}

/** One row in the Screenshots section editor — description, suggested filename, reorder/delete. */
export function ScreenshotRow({ screenshot, number, index, count, dragBind, onChangeDescription, onMoveUp, onMoveDown, onDelete, registerRef }: ScreenshotRowProps) {
  return (
    <RepeatableCard
      index={index}
      count={count}
      title={screenshot.description.trim() || `Screenshot ${index + 1}`}
      subtitle={`screenshot-${number}.png`}
      drag={dragBind}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onRemove={onDelete}
    >
      <input
        ref={registerRef as Ref<HTMLInputElement>}
        className="input"
        value={screenshot.description}
        onChange={(e) => onChangeDescription(e.target.value)}
        placeholder="Description"
      />
    </RepeatableCard>
  );
}
