import type { Ref } from 'react';
import type { ChangelogVersion, UpgradeNotice } from '../../generators/readmeStudio';
import { RichTextEditor } from './RichTextEditor';
import { RepeatableCard } from '../ui/RepeatableCard';
import type { DragBind } from '../../lib/dragReorder';

interface VersionedEntryRowProps {
  entry: ChangelogVersion | UpgradeNotice;
  index: number;
  count: number;
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
  entry, index, count, dragBind, onChangeVersion, onChangeDescription, onMoveUp, onMoveDown, onDelete, descriptionPlaceholder, registerVersionRef, registerDescriptionRef,
}: VersionedEntryRowProps) {
  return (
    <RepeatableCard
      index={index}
      count={count}
      title={entry.version.trim() || `Version ${index + 1}`}
      drag={dragBind}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onRemove={onDelete}
    >
      <input
        ref={registerVersionRef as Ref<HTMLInputElement>}
        className="input gfw-mono"
        value={entry.version}
        onChange={(e) => onChangeVersion(e.target.value)}
        placeholder="1.2.0"
        style={{ width: 120, fontSize: 14, fontWeight: 700 }}
      />
      <RichTextEditor value={entry.description} onChange={onChangeDescription} placeholder={descriptionPlaceholder} fontSize={14} minHeight={40} registerRef={registerDescriptionRef} />
    </RepeatableCard>
  );
}
