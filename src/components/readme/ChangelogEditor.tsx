import type { CSSProperties, Ref } from 'react';
import type { ChangelogVersion, UpgradeNotice } from '../../generators/readmeStudio';
import { RichTextEditor } from './RichTextEditor';
import type { DragBind } from './dragReorder';
import { ChevronDownIcon, ChevronUpIcon, DragHandleIcon, TrashIcon } from './icons';

const iconBtnStyle: CSSProperties = {
  width: 28, height: 28, border: '1px solid var(--gfw-border)', background: '#fff', borderRadius: 6,
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gfw-text-body)',
};

interface VersionedEntryRowProps {
  entry: ChangelogVersion | UpgradeNotice;
  dragBind: DragBind;
  onChangeVersion: (value: string) => void;
  onChangeDescription: (value: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  descriptionPlaceholder: string;
  /** Registers the version number input (targetId `{id}-version` — e.g. "notice references
   * a version not in the changelog" points here). */
  registerVersionRef?: (el: HTMLElement | null) => void;
  /** Registers the rich-text description field (targetId `{id}-description` — content
   * validation like "placeholder text found" points here). */
  registerDescriptionRef?: (el: HTMLElement | null) => void;
}

/** Shared row shape for Changelog versions and Upgrade Notice entries — both are just
 * `{ version, description }` with move/delete/reorder, so one component covers both. */
export function VersionedEntryRow({
  entry, dragBind, onChangeVersion, onChangeDescription, onMoveUp, onMoveDown, onDelete, descriptionPlaceholder, registerVersionRef, registerDescriptionRef,
}: VersionedEntryRowProps) {
  return (
    <div
      draggable={dragBind.draggable}
      onDragStart={dragBind.onDragStart}
      onDragOver={dragBind.onDragOver}
      onDrop={dragBind.onDrop}
      style={{ border: `1px solid ${dragBind.isOver ? 'var(--gfw-accent)' : 'var(--gfw-border)'}`, borderRadius: 6, padding: 10, background: 'var(--gfw-bg)' }}
    >
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <span style={{ cursor: 'grab', color: 'var(--gfw-border-dashed)', display: 'flex' }}>
          <DragHandleIcon />
        </span>
        <input
          ref={registerVersionRef as Ref<HTMLInputElement>}
          className="input gfw-mono"
          value={entry.version}
          onChange={(e) => onChangeVersion(e.target.value)}
          placeholder="1.2.0"
          style={{ width: 120, fontSize: 14, fontWeight: 700 }}
        />
        <div style={{ flex: 1 }} />
        <button type="button" aria-label="Move up" title="Move up" onClick={onMoveUp} style={iconBtnStyle}><ChevronUpIcon /></button>
        <button type="button" aria-label="Move down" title="Move down" onClick={onMoveDown} style={iconBtnStyle}><ChevronDownIcon /></button>
        <button type="button" aria-label="Delete" title="Delete" onClick={onDelete} style={{ ...iconBtnStyle, color: 'var(--gfw-danger)' }}><TrashIcon /></button>
      </div>
      <RichTextEditor value={entry.description} onChange={onChangeDescription} placeholder={descriptionPlaceholder} fontSize={14} minHeight={40} registerRef={registerDescriptionRef} />
    </div>
  );
}
