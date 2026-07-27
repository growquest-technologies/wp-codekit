import type { CSSProperties, Ref } from 'react';
import type { FAQ } from '../../generators/readmeStudio';
import { RichTextEditor } from './RichTextEditor';
import type { DragBind } from './dragReorder';
import { ChevronDownIcon, ChevronUpIcon, DragHandleIcon, DuplicateIcon, TrashIcon } from './icons';

const iconBtnStyle: CSSProperties = {
  width: 28, height: 28, border: '1px solid var(--gfw-border)', background: '#fff', borderRadius: 6,
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gfw-text-body)',
};

interface FaqEditorProps {
  faq: FAQ;
  dragBind: DragBind;
  onChangeQuestion: (value: string) => void;
  onChangeAnswer: (value: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  registerRef?: (el: HTMLElement | null) => void;
}

export function FaqEditor({ faq, dragBind, onChangeQuestion, onChangeAnswer, onMoveUp, onMoveDown, onDuplicate, onDelete, registerRef }: FaqEditorProps) {
  return (
    <div
      draggable={dragBind.draggable}
      onDragStart={dragBind.onDragStart}
      onDragOver={dragBind.onDragOver}
      onDrop={dragBind.onDrop}
      style={{ border: `1px solid ${dragBind.isOver ? 'var(--gfw-accent)' : 'var(--gfw-border)'}`, borderRadius: 6, padding: 10, background: 'var(--gfw-bg)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ cursor: 'grab', color: 'var(--gfw-border-dashed)', display: 'flex' }}>
          <DragHandleIcon />
        </span>
        <input
          ref={registerRef as Ref<HTMLInputElement>}
          className="input"
          value={faq.question}
          onChange={(e) => onChangeQuestion(e.target.value)}
          placeholder="Question"
          style={{ flex: 1, fontSize: 14, fontWeight: 700 }}
        />
        <button type="button" aria-label="Move up" title="Move up" onClick={onMoveUp} style={iconBtnStyle}><ChevronUpIcon /></button>
        <button type="button" aria-label="Move down" title="Move down" onClick={onMoveDown} style={iconBtnStyle}><ChevronDownIcon /></button>
        <button type="button" aria-label="Duplicate" title="Duplicate" onClick={onDuplicate} style={iconBtnStyle}><DuplicateIcon /></button>
        <button type="button" aria-label="Delete" title="Delete" onClick={onDelete} style={{ ...iconBtnStyle, color: 'var(--gfw-danger)' }}><TrashIcon /></button>
      </div>
      <RichTextEditor value={faq.answer} onChange={onChangeAnswer} placeholder="Answer…" minHeight={40} />
    </div>
  );
}
