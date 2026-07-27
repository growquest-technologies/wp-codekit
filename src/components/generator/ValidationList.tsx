import { useState } from 'react';
import type { ValidationIssue } from '../../lib/codegen';

const SEVERITY_STYLE: Record<ValidationIssue['severity'], { bg: string; color: string; label: string }> = {
  error: { bg: '#FBEAE3', color: '#B4451F', label: 'Error' },
  warning: { bg: '#FDF3DC', color: '#8A5B00', label: 'Warning' },
  recommendation: { bg: 'var(--gfw-accent-tint)', color: 'var(--gfw-accent-strong)', label: 'Tip' },
};

type SeverityFilter = 'all' | ValidationIssue['severity'];

interface ValidationListProps {
  issues: ValidationIssue[];
  onFix?: (fix: string) => void;
  onFocusField?: (targetId: string) => void;
}

/** Shared "here's what's wrong and here's the one-click fix" panel used across generators. */
export function ValidationList({ issues, onFix, onFocusField }: ValidationListProps) {
  const [filter, setFilter] = useState<SeverityFilter>('all');

  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  const recCount = issues.filter((i) => i.severity === 'recommendation').length;
  const filtered = issues.filter((i) => filter === 'all' || i.severity === filter);

  const chips: { id: SeverityFilter; label: string }[] = [
    { id: 'all', label: `All (${issues.length})` },
    { id: 'error', label: `Errors (${errorCount})` },
    { id: 'warning', label: `Warnings (${warningCount})` },
    { id: 'recommendation', label: `Tips (${recCount})` },
  ];

  if (!issues.length) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--gfw-success)', fontWeight: 600 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gfw-success)' }} />
        No issues found
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {chips.map((c) => {
          const on = filter === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setFilter(c.id)}
              className="chip"
              style={{
                borderColor: on ? 'var(--gfw-accent)' : 'var(--gfw-border)',
                background: on ? 'var(--gfw-accent-tint)' : '#fff',
                color: on ? 'var(--gfw-accent-strong)' : 'var(--gfw-text-body)',
              }}
            >
              {c.label}
            </button>
          );
        })}
      </div>
      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--gfw-text-mutest)', fontSize: 13 }}>No issues in this filter 🎉</div>
      )}
      {filtered.map((issue, i) => {
        const s = SEVERITY_STYLE[issue.severity];
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: s.bg, borderRadius: 8, padding: '10px 12px' }}>
            <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: s.color, flexShrink: 0, marginTop: 1 }}>
              {s.label}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <button
                type="button"
                onClick={() => issue.targetId && onFocusField?.(issue.targetId)}
                style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', font: 'inherit', fontSize: 12.5, lineHeight: 1.5, color: 'var(--gfw-text-body)', cursor: issue.targetId ? 'pointer' : 'default' }}
              >
                {issue.message}
              </button>
              {issue.fix && (
                <div style={{ marginTop: 6 }}>
                  <button type="button" onClick={() => onFix?.(issue.fix!)} className="btn btn-ghost btn-sm">
                    {issue.fixLabel || 'Fix'}
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
