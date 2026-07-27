import type { CSSProperties, Ref } from 'react';
import type { Screenshot } from '../../generators/readmeStudio';
import type { DragBind } from './dragReorder';
import { ChevronDownIcon, ChevronUpIcon, DragHandleIcon, TrashIcon } from './icons';

const iconBtnStyle: CSSProperties = {
  width: 28, height: 28, border: '1px solid var(--gfw-border)', background: '#fff', borderRadius: 6,
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gfw-text-body)',
};

interface ScreenshotRowProps {
  screenshot: Screenshot;
  number: number;
  dragBind: DragBind;
  onChangeDescription: (value: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  registerRef?: (el: HTMLElement | null) => void;
}

/** One row in the Screenshots section editor — number, description, suggested filename, reorder/delete. */
export function ScreenshotRow({ screenshot, number, dragBind, onChangeDescription, onMoveUp, onMoveDown, onDelete, registerRef }: ScreenshotRowProps) {
  return (
    <div
      draggable={dragBind.draggable}
      onDragStart={dragBind.onDragStart}
      onDragOver={dragBind.onDragOver}
      onDrop={dragBind.onDrop}
      style={{ display: 'flex', gap: 8, alignItems: 'center', border: `1px solid ${dragBind.isOver ? 'var(--gfw-accent)' : 'var(--gfw-border)'}`, borderRadius: 6, padding: '8px 10px', background: 'var(--gfw-bg)' }}
    >
      <span style={{ cursor: 'grab', color: 'var(--gfw-border-dashed)', display: 'flex' }}>
        <DragHandleIcon />
      </span>
      <span className="gfw-mono" style={{ fontSize: 14, fontWeight: 700, color: 'var(--gfw-text-mutest)', width: 20 }}>{number}.</span>
      <input
        ref={registerRef as Ref<HTMLInputElement>}
        className="input"
        value={screenshot.description}
        onChange={(e) => onChangeDescription(e.target.value)}
        placeholder="Description"
        style={{ flex: 1.4 }}
      />
      <span className="gfw-mono" style={{ fontSize: 12, color: 'var(--gfw-text-faint)' }}>screenshot-{number}.png</span>
      <button type="button" aria-label="Move up" title="Move up" onClick={onMoveUp} style={iconBtnStyle}><ChevronUpIcon /></button>
      <button type="button" aria-label="Move down" title="Move down" onClick={onMoveDown} style={iconBtnStyle}><ChevronDownIcon /></button>
      <button type="button" aria-label="Delete" title="Delete" onClick={onDelete} style={{ ...iconBtnStyle, color: 'var(--gfw-danger)' }}><TrashIcon /></button>
    </div>
  );
}
