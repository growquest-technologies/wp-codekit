import type { Ref } from 'react';
import type { Block } from '../../generators/readmeStudio';
import { RichTextEditor } from './RichTextEditor';
import { RepeatableCard } from '../ui/RepeatableCard';
import type { DragBind } from '../../lib/dragReorder';

const TYPE_LABELS: Record<Block['type'], string> = {
  paragraph: 'Paragraph', subheading: 'Subheading', blockquote: 'Blockquote', code: 'Code Block', video: 'Video',
};

interface BlockEditorProps {
  block: Block;
  index: number;
  count: number;
  dragBind: DragBind;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  onChangeText: (text: string) => void;
  onChangeVideoUrl: (url: string) => void;
  /** Registers the block's own text control (subheading/code/paragraph/blockquote) for validation "jump to issue". */
  registerRef?: (el: HTMLElement | null) => void;
}

/** One block row in the Description/Installation section editor — the shared RepeatableCard
 * chrome (drag handle, move/delete, collapse) wrapping the type-specific control (rich text
 * with real bulleted/numbered lists, plain input, textarea…). Bulleted/numbered lists are
 * authored directly inside a paragraph's rich text editor (Tiptap), not as a separate block type. */
export function BlockEditor({
  block, index, count, dragBind, onMoveUp, onMoveDown, onDelete, onChangeText, onChangeVideoUrl, registerRef,
}: BlockEditorProps) {
  return (
    <RepeatableCard
      index={index}
      count={count}
      title={TYPE_LABELS[block.type]}
      drag={dragBind}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onRemove={onDelete}
    >
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
    </RepeatableCard>
  );
}
