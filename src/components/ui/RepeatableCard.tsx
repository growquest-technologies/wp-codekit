import { useState, type ReactNode } from 'react';
import { Icon } from './Icon';
import type { DragBind } from '../../lib/dragReorder';

interface RepeatableCardProps {
  /** Shown in the header bar. Falls back to "Item {index + 1}" when omitted. */
  title?: ReactNode;
  /** Optional muted text after the title — a computed key, type badge, summary, etc. */
  subtitle?: ReactNode;
  index: number;
  /** Total rows in this list — disables Move down on the last row. */
  count: number;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onRemove: () => void;
  /** Bind from `useDragReorder().bind(listKey, index, onReorder)`. Omit for no drag. */
  drag?: DragBind;
  /** Optional left-edge accent colour (e.g. fee vs discount). */
  accent?: string;
  /** Rows start expanded; pass true for lists that are long by nature. */
  defaultCollapsed?: boolean;
  /** Extra header controls rendered just before the move/remove group. */
  headerExtra?: ReactNode;
  children: ReactNode;
}

/**
 * The one card every repeatable/add-remove row in every generator renders through:
 * a header bar carrying drag handle, title, move up, move down, remove and collapse,
 * over a muted-beige body. Kept deliberately generic — a tool's own fields go in
 * `children`; only the row chrome lives here, so the chrome stays identical sitewide.
 */
export function RepeatableCard({
  title,
  subtitle,
  index,
  count,
  onMoveUp,
  onMoveDown,
  onRemove,
  drag,
  accent,
  defaultCollapsed = false,
  headerExtra,
  children,
}: RepeatableCardProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <div
      className={`repeatable-card${drag?.isOver ? ' is-drag-over' : ''}`}
      style={accent ? { borderLeft: `3px solid ${accent}` } : undefined}
      draggable={drag?.draggable}
      onDragStart={drag?.onDragStart}
      onDragOver={drag?.onDragOver}
      onDrop={drag?.onDrop}
    >
      <div className="repeatable-card-header">
        {drag && (
          <span className="repeatable-card-grip" aria-hidden="true" title="Drag to reorder">
            <Icon name="dragHandle" size={14} />
          </span>
        )}
        <div className="repeatable-card-title">
          {title ?? `Item ${index + 1}`}
          {subtitle && <span className="repeatable-card-subtitle">{subtitle}</span>}
        </div>
        {headerExtra}
        <div className="repeatable-card-actions">
          {onMoveUp && (
            <button type="button" aria-label="Move up" title="Move up" onClick={onMoveUp} disabled={index === 0} className="repeatable-card-btn">
              <Icon name="arrowUp" size={13} />
            </button>
          )}
          {onMoveDown && (
            <button type="button" aria-label="Move down" title="Move down" onClick={onMoveDown} disabled={index === count - 1} className="repeatable-card-btn">
              <Icon name="arrowDown" size={13} />
            </button>
          )}
          <button type="button" aria-label="Remove" title="Remove" onClick={onRemove} className="repeatable-card-btn is-danger">
            <Icon name="trash" size={13} />
          </button>
          <button
            type="button"
            aria-label={collapsed ? 'Expand' : 'Collapse'}
            title={collapsed ? 'Expand' : 'Collapse'}
            aria-expanded={!collapsed}
            onClick={() => setCollapsed((c) => !c)}
            className="repeatable-card-btn"
          >
            <Icon name={collapsed ? 'chevronDown' : 'chevronUp'} size={13} />
          </button>
        </div>
      </div>
      {!collapsed && <div className="repeatable-card-body">{children}</div>}
    </div>
  );
}
