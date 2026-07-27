import { useMemo, useState } from 'react';
import { GeneratorShell } from '../../components/generator/GeneratorShell';
import { CheckboxChip } from '../../components/ui/CheckboxChip';
import { useEditorState } from '../../lib/useEditorState';
import {
  COMPARES,
  OUTPUT_HINTS,
  REF_ARGS,
  STATUSES,
  applyFix,
  buildCode,
  fileNameFor,
  freshProject,
  plainEnglish,
  validate,
  type OrderMetaClause,
  type OrderQuery,
  type OutputMode,
} from '../../generators/wcOrderQuery';

const OUTPUT_MODES: { id: OutputMode; label: string }[] = [
  { id: 'query', label: 'wc_get_orders()' },
  { id: 'paginated', label: 'Paginated' },
  { id: 'args', label: 'Args array' },
];

export function WcOrderQueryGenerator() {
  const { state: oq, commit, undo, redo, reset, canUndo, canRedo, savedLabel } = useEditorState<OrderQuery>('wc-order-query-generator-v1', freshProject);
  const [outputMode, setOutputMode] = useState<OutputMode>('query');

  function toggleStatus(s: string) {
    commit((p) => {
      const i = p.statuses.indexOf(s);
      if (i >= 0) p.statuses.splice(i, 1);
      else p.statuses.push(s);
    });
  }

  function addMeta() {
    commit((p) => p.meta.push({ key: '', compare: '=', value: '' }));
  }
  function updateMeta(i: number, patch: Partial<OrderMetaClause>, coalesceKey?: string) {
    commit((p) => Object.assign(p.meta[i], patch), coalesceKey);
  }
  function removeMeta(i: number) {
    commit((p) => p.meta.splice(i, 1));
  }

  const code = useMemo(() => buildCode(oq, outputMode), [oq, outputMode]);
  const issues = useMemo(() => validate(oq), [oq]);
  const fileName = fileNameFor();

  function fix(kind: string) {
    commit((draft) => Object.assign(draft, applyFix(draft, kind)));
  }

  const statusNote = oq.statuses.length ? oq.statuses.length + ' status' + (oq.statuses.length === 1 ? '' : 'es') : 'any status';
  const metaNote = oq.meta.length ? oq.meta.length + ' clause' + (oq.meta.length === 1 ? '' : 's') : 'none';

  return (
    <GeneratorShell
      category="woocommerce"
      title="Order Query Generator"
      description={
        <>
          Query orders the HPOS-safe way — wc_get_orders() instead of a raw WP_Query on shop_order, which breaks the moment High-Performance Order Storage is on.
        </>
      }
      code={code}
      filename={fileName}
      editor={{ canUndo, canRedo, onUndo: undo, onRedo: redo, onNew: reset, savedLabel }}
      issues={issues}
      onFix={fix}
      outputModes={OUTPUT_MODES}
      activeOutputMode={outputMode}
      onOutputModeChange={(id) => setOutputMode(id as OutputMode)}
      outputHint={OUTPUT_HINTS[outputMode]}
      secondaryTab={{
        label: 'Reference',
        content: (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <div style={{ border: '1px solid var(--gfw-border)', borderRadius: 8, padding: '16px 18px', background: 'var(--gfw-surface-sunken)', marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>In plain English</div>
              <div style={{ fontSize: 13, lineHeight: 1.65 }}>{plainEnglish(oq)}</div>
            </div>

            <div className="gfw-mono" style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 4 }}>wc_get_orders()</div>
            <div style={{ fontSize: 12, color: 'var(--gfw-text-mutest)', marginBottom: 14 }}>WooCommerce's own query abstraction — works whether orders live in wp_posts or the HPOS tables</div>

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>Arguments</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 18 }}>
              {REF_ARGS.map((r) => (
                <div key={r.name} style={{ borderBottom: '1px solid var(--gfw-border)', paddingBottom: 9 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                    <span className="gfw-mono" style={{ fontSize: 12.5, fontWeight: 700 }}>{r.name}</span>
                    <span className="type-badge">{r.type}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--gfw-text-muted)', lineHeight: 1.5, marginTop: 4 }}>{r.description}</div>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>Why not WP_Query</div>
            <div style={{ fontSize: 12.5, lineHeight: 1.65, marginBottom: 18 }}>Under High-Performance Order Storage, orders move out of wp_posts into dedicated wc_orders tables. A raw WP_Query or get_posts() call against post_type shop_order simply stops finding anything. wc_get_orders() is the abstraction WooCommerce itself maintains — it works identically whichever storage mode a store is running.</div>

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>meta_query under HPOS</div>
            <div style={{ fontSize: 12.5, lineHeight: 1.65 }}>meta_query is still accepted and is translated through WC_Order_Query, but deeply nested relation groups have historically had gaps compared with WP_Query's implementation. Flat, single-level meta_query clauses (the common case) work reliably either way.</div>
          </div>
        ),
      }}
      form={
        <div>
          <div className="field-card field-card-primary">
            <div className="field-card-header">
              <div className="field-card-title">Status</div>
              <div className="field-card-desc">{statusNote}</div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 11 }}>
              {STATUSES.map(([id, label]) => (
                <CheckboxChip key={id} active={oq.statuses.includes(id)} onClick={() => toggleStatus(id)}>
                  {label}
                </CheckboxChip>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
              <div>
                <label className="field-label">customer id(s)</label>
                <input className="input gfw-mono" placeholder="14, 22" value={oq.customer} onChange={(e) => commit((p) => (p.customer = e.target.value), 'customer')} />
              </div>
              <div>
                <label className="field-label">date field</label>
                <select className="select" value={oq.dateField} onChange={(e) => commit((p) => (p.dateField = e.target.value as OrderQuery['dateField']))}>
                  <option value="date_created">date_created</option>
                  <option value="date_modified">date_modified</option>
                  <option value="date_completed">date_completed</option>
                  <option value="date_paid">date_paid</option>
                </select>
              </div>
              <div>
                <label className="field-label">after (yyyy-mm-dd)</label>
                <input className="input gfw-mono" placeholder="2026-01-01" value={oq.dateAfter} onChange={(e) => commit((p) => (p.dateAfter = e.target.value), 'dateAfter')} />
              </div>
              <div>
                <label className="field-label">before (yyyy-mm-dd)</label>
                <input className="input gfw-mono" placeholder="2026-07-01" value={oq.dateBefore} onChange={(e) => commit((p) => (p.dateBefore = e.target.value), 'dateBefore')} />
              </div>
            </div>
          </div>

          <div className="field-card">
            <div className="field-card-header">
              <div className="field-card-title">Meta clauses</div>
              <div className="field-card-desc">{metaNote}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {oq.meta.map((m, i) => {
                const needsValue = m.compare !== 'EXISTS' && m.compare !== 'NOT EXISTS';
                return (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input className="input gfw-mono" style={{ flex: 1, minWidth: 130 }} placeholder="_billing_vat_id" value={m.key} onChange={(e) => updateMeta(i, { key: e.target.value }, `key-${i}`)} />
                    <select className="select" style={{ width: 120 }} value={m.compare} onChange={(e) => updateMeta(i, { compare: e.target.value })}>
                      {COMPARES.map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                    <input className="input gfw-mono" style={{ flex: 1, minWidth: 110 }} placeholder="EU123456" value={m.value} disabled={!needsValue} onChange={(e) => updateMeta(i, { value: e.target.value }, `value-${i}`)} />
                    <button type="button" aria-label="Remove clause" onClick={() => removeMeta(i)} className="btn btn-ghost btn-sm" style={{ color: '#B91C1C' }}>Remove</button>
                  </div>
                );
              })}
              {oq.meta.length === 0 && <div className="field-hint">No meta clauses.</div>}
            </div>
            <button type="button" onClick={addMeta} className="btn btn-ghost btn-sm" style={{ marginTop: 11 }}>Add meta clause</button>
          </div>

          <div className="field-card">
            <div className="field-card-title">Shape of the result</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12 }}>
              <div>
                <label className="field-label">limit</label>
                <input className="input gfw-mono" placeholder="20" value={oq.limit} onChange={(e) => commit((p) => (p.limit = e.target.value), 'limit')} />
              </div>
              <div>
                <label className="field-label">return</label>
                <select className="select" value={oq.returnType} onChange={(e) => commit((p) => (p.returnType = e.target.value as OrderQuery['returnType']))}>
                  <option value="objects">objects — full WC_Order instances</option>
                  <option value="ids">ids — plain integers</option>
                </select>
              </div>
              <div>
                <label className="field-label">orderby</label>
                <select className="select" value={oq.orderby} onChange={(e) => commit((p) => (p.orderby = e.target.value))}>
                  <option value="date">date</option>
                  <option value="ID">ID</option>
                  <option value="meta_value">meta_value</option>
                </select>
              </div>
              <div>
                <label className="field-label">order</label>
                <select className="select" value={oq.order} onChange={(e) => commit((p) => (p.order = e.target.value as 'ASC' | 'DESC'))}>
                  <option value="DESC">DESC</option>
                  <option value="ASC">ASC</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      }
    />
  );
}
