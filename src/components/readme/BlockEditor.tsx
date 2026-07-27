import type { CSSProperties, Ref } from 'react';
import type { Block } from '../../generators/readmeStudio';
import { RichTextEditor } from './RichTextEditor';
import type { DragBind } from './dragReorder';
import { ChevronDownIcon, ChevronUpIcon, DragHandleIcon, TrashIcon } from './icons';

const iconBtnStyle: CSSProperties = {
  width: 28, height: 28, border: '1px solid var(--gfw-border)', background: '#fff', borderRadius: 6,
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gfw-text-body)',
};

const TYPE_LABELS: Record<Block['type'], string> = {
  paragraph: 'Paragraph', subheading: 'Subheading', blockquote: 'Blockquote', code: 'Code Block', video: 'Video',
};

interface BlockEditorProps {
  block: Block;
  dragBind: DragBind;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  onChangeText: (text: string) => void;
  onChangeVideoUrl: (url: string) => void;
  /** Registers the block's own text control (subheading/code/paragraph/blockquote) for validation "jump to issue". */
  registerRef?: (el: HTMLElement | null) => void;
}

/** One block row in the Description/Installation section editor — drag handle, move/delete,
 * and the type-specific control (rich text with real bulleted/numbered lists, plain input,
 * textarea…). Bulleted/numbered lists are authored directly inside a paragraph's rich text
 * editor (Tiptap), not as a separate block type. */
export function BlockEditor({
  block, dragBind, onMoveUp, onMoveDown, onDelete, onChangeText, onChangeVideoUrl, registerRef,
}: BlockEditorProps) {
  return (
    <div
      draggable={dragBind.draggable}
      onDragStart={dragBind.onDragStart}
      onDragOver={dragBind.onDragOver}
      onDrop={dragBind.onDrop}
      style={{ border: `1px dashed ${dragBind.isOver ? 'var(--gfw-accent)' : 'var(--gfw-border)'}`, borderRadius: 6, padding: 10, background: 'var(--gfw-surface-muted)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ cursor: 'grab', color: 'var(--gfw-border-dashed)', display: 'flex' }}>
          <DragHandleIcon />
        </span>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--gfw-text-mutest)', flex: 1 }}>
          {TYPE_LABELS[block.type]}
        </span>
        <button type="button" aria-label="Move block up" title="Move block up" onClick={onMoveUp} style={iconBtnStyle}>
          <ChevronUpIcon />
        </button>
        <button type="button" aria-label="Move block down" title="Move block down" onClick={onMoveDown} style={iconBtnStyle}>
          <ChevronDownIcon />
        </button>
        <button type="button" aria-label="Delete block" title="Delete block" onClick={onDelete} style={{ ...iconBtnStyle, color: 'var(--gfw-danger)' }}>
          <TrashIcon />
        </button>
      </div>

      {block.type === 'paragraph' && <RichTextEditor value={block.data.text} onChange={onChangeText} placeholder="Paragraph text…" registerRef={registerRef} />}
      {block.type === 'blockquote' && <RichTextEditor value={block.data.text} onChange={onChangeText} placeholder="Quoted text…" minHeight={36} blockquote registerRef={registerRef} />}
      {block.type === 'subheading' && (
        <input
          ref={registerRef as Ref<HTMLInputElement>}
          className="input"
          value={block.data.text}
          onChange={(e) => onChangeText(e.target.value)}
          placeholder="Subheading text"
          style={{ fontWeight: 700 }}
        />
      )}
      {block.type === 'code' && (
        <textarea
          ref={registerRef as Ref<HTMLTextAreaElement>}
          className="textarea gfw-mono"
          rows={4}
          spellCheck={false}
          value={block.data.text}
          onChange={(e) => onChangeText(e.target.value)}
          placeholder="  code, indentation preserved"
          style={{ whiteSpace: 'pre', fontSize: 12, background: '#FBFAF7' }}
        />
      )}
      {block.type === 'video' && (
        <input className="input gfw-mono" value={block.data.url} onChange={(e) => onChangeVideoUrl(e.target.value)} placeholder="https://youtu.be/…" />
      )}
    </div>
  );
}
