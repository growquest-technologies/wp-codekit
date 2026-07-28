import type { Ref } from 'react';
import type { FAQ } from '../../generators/readmeStudio';
import { RichTextEditor } from './RichTextEditor';
import { RepeatableCard } from '../ui/RepeatableCard';
import type { DragBind } from '../../lib/dragReorder';
import { DuplicateIcon } from './icons';

interface FaqEditorProps {
  faq: FAQ;
  index: number;
  count: number;
  dragBind: DragBind;
  onChangeQuestion: (value: string) => void;
  onChangeAnswer: (value: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  registerRef?: (el: HTMLElement | null) => void;
}

export function FaqEditor({ faq, index, count, dragBind, onChangeQuestion, onChangeAnswer, onMoveUp, onMoveDown, onDuplicate, onDelete, registerRef }: FaqEditorProps) {
  return (
    <RepeatableCard
      index={index}
      count={count}
      title={faq.question.trim() || `Question ${index + 1}`}
      drag={dragBind}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onRemove={onDelete}
      headerExtra={
        <button type="button" aria-label="Duplicate" title="Duplicate" onClick={onDuplicate} className="repeatable-card-btn">
          <DuplicateIcon size={13} />
        </button>
      }
    >
      <input
        ref={registerRef as Ref<HTMLInputElement>}
        className="input"
        value={faq.question}
        onChange={(e) => onChangeQuestion(e.target.value)}
        placeholder="Question"
        style={{ fontSize: 14, fontWeight: 700 }}
      />
      <RichTextEditor value={faq.answer} onChange={onChangeAnswer} placeholder="Answer…" minHeight={40} />
    </RepeatableCard>
  );
}
