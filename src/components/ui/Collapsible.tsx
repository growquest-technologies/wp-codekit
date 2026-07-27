import { useState, type ReactNode } from 'react';

export function Collapsible({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="field-group" style={{ border: '1px solid var(--gfw-border)', borderRadius: 9 }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'none',
          border: 'none',
          padding: '11px 14px',
          font: 'inherit',
          fontSize: 13,
          fontWeight: 650,
          color: 'var(--gfw-text-body)',
          cursor: 'pointer',
        }}
        aria-expanded={open}
      >
        {title}
        <span style={{ color: 'var(--gfw-text-faint)', fontSize: 11 }}>{open ? '−' : '+'}</span>
      </button>
      {open && <div style={{ padding: '4px 14px 16px' }}>{children}</div>}
    </div>
  );
}
