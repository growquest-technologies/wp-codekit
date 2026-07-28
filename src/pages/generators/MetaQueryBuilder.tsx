import { useMemo, useState } from 'react';
import { GeneratorShell } from '../../components/generator/GeneratorShell';
import { RepeatableCard } from '../../components/ui/RepeatableCard';
import { ToggleRow } from '../../components/ui/Toggle';
import { useDragReorder } from '../../lib/dragReorder';
import { useEditorState } from '../../lib/useEditorState';
import { useListOps } from '../../lib/useListOps';
import {
  COMPARES,
  LIST_COMPARES,
  NO_VALUE,
  OUTPUT_HINTS,
  REF_ARGS,
  REF_COMPARE,
  TYPES,
  applyFix,
  buildCode,
  fileNameFor,
  freshProject,
  plainEnglish,
  validate,
  type MetaClause,
  type MetaQuery,
  type OutputMode,
} from '../../generators/metaQuery';

const OUTPUT_MODES: { id: OutputMode; label: string }[] = [
  { id: 'query', label: 'WP_Query + loop' },
  { id: 'args', label: 'Args array' },
  { id: 'pre', label: 'pre_get_posts' },
];

export function MetaQueryBuilder() {
  const { state: mq, commit, undo, redo, reset, canUndo, canRedo, savedLabel } = useEditorState<MetaQuery>('meta-query-generator-v1', freshProject);
  const drag = useDragReorder();
  const clauses = useListOps<MetaQuery>(commit)((p) => p.clauses);
  const [outputMode, setOutputMode] = useState<OutputMode>('query');

  function updateClause(i: number, patch: Partial<MetaClause>, coalesceKey?: string) {
    commit((p) => Object.assign(p.clauses[i], patch), coalesceKey);
  }

  function addClause() {
    commit((p) => p.clauses.push({ key: '', compare: '=', value: '', type: 'CHAR' }));
  }

  const code = useMemo(() => buildCode(mq, outputMode), [mq, outputMode]);
  const issues = useMemo(() => validate(mq), [mq]);
  const fileName = fileNameFor(mq);
  const needsOrderKey = mq.orderby === 'meta_value' || mq.orderby === 'meta_value_num';

  function fix(kind: string) {
    commit((draft) => Object.assign(draft, applyFix(draft, kind)));
  }

  return (
    <GeneratorShell
      category="query"
      title="Meta Query Builder"
      description={
        <>
          Meta comparisons with the right compare operator and the right cast — so "9" does not come out greater than "10".
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
              <div style={{ fontSize: 13, lineHeight: 1.65 }}>{plainEnglish(mq)}</div>
            </div>

            <div className="gfw-mono" style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 4 }}>meta_query</div>
            <div style={{ fontSize: 12, color: 'var(--gfw-text-mutest)', marginBottom: 14 }}>Handled by WP_Meta_Query, one JOIN per clause</div>

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>Clause keys</div>
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

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>Why 9 is greater than 10</div>
            <div style={{ fontSize: 12.5, lineHeight: 1.65, marginBottom: 18 }}>Post meta is stored as text. Without a type, MySQL compares strings, so "9" sorts after "10" and a price filter quietly returns the wrong products. NUMERIC casts to a signed integer, DECIMAL(10,2) keeps the pennies, DATE and DATETIME need the value in Y-m-d form.</div>

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>Compare cheat sheet</div>
            <pre className="gfw-mono" style={{ border: '1px solid var(--gfw-border)', borderRadius: 7, padding: '12px 14px', background: 'var(--gfw-surface-sunken)', fontSize: 11.5, lineHeight: 1.7, whiteSpace: 'pre-wrap', marginBottom: 18 }}>{REF_COMPARE}</pre>

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>Cost</div>
            <div style={{ fontSize: 12.5, lineHeight: 1.65 }}>wp_postmeta is indexed on meta_key, not on meta_value. A LIKE with a leading wildcard scans every row for that key. If you filter on a value constantly, the honest fix is a taxonomy term or a custom table — not a bigger meta_query.</div>
          </div>
        ),
      }}
      form={
        <div>
          <div className="field-card field-card-primary">
            <div className="field-card-header">
              <div className="field-card-title">Clauses</div>
              <div className="field-card-desc">
                {mq.clauses.length + (mq.clauses.length === 1 ? ' clause · 1 JOIN' : ' clauses · ' + mq.clauses.length + ' JOINs')}
              </div>
            </div>
            {mq.clauses.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 13 }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)' }}>Match</span>
                {(['AND', 'OR'] as const).map((r) => (
                  <button key={r} type="button" onClick={() => commit((p) => (p.relation = r))} className={`chip${mq.relation === r ? ' is-active' : ''}`}>
                    {r}
                  </button>
                ))}
                <span className="field-hint" style={{ margin: 0 }}>{mq.relation === 'AND' ? 'every clause must match' : 'any clause may match'}</span>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {mq.clauses.map((c, i) => {
                const needsValue = NO_VALUE.indexOf(c.compare) === -1;
                const numericType = c.type === 'NUMERIC' || c.type.indexOf('DECIMAL') === 0;
                const vals = c.value.split(',').map((v) => v.trim()).filter((v) => v !== '');
                return (
                  <RepeatableCard
                    key={i}
                    index={i}
                    count={mq.clauses.length}
                    title={c.key || `Clause ${i + 1}`}
                    subtitle={c.compare}
                    drag={drag.bind('clauses', i, clauses.reorder)}
                    onMoveUp={() => clauses.moveUp(i)}
                    onMoveDown={() => clauses.moveDown(i)}
                    onRemove={() => clauses.remove(i)}
                  >
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <input className="input gfw-mono" style={{ flex: 1, minWidth: 120 }} placeholder="price" value={c.key} onChange={(e) => updateClause(i, { key: e.target.value }, `key-${i}`)} />
                      <select className="select" style={{ width: 160 }} value={c.compare} onChange={(e) => updateClause(i, { compare: e.target.value })}>
                        {COMPARES.map(([v, l]) => (
                          <option key={v} value={v}>{l}</option>
                        ))}
                      </select>
                      <select className="select" style={{ width: 140 }} value={c.type} onChange={(e) => updateClause(i, { type: e.target.value })}>
                        {TYPES.map(([v, l]) => (
                          <option key={v} value={v}>{l}</option>
                        ))}
                      </select>
                    </div>
                    {needsValue && (
                      <input className="input gfw-mono" placeholder={LIST_COMPARES.indexOf(c.compare) >= 0 ? '1000, 5000' : numericType ? '5000' : 'value'} value={c.value} onChange={(e) => updateClause(i, { value: e.target.value }, `value-${i}`)} />
                    )}
                    <div className="gfw-mono" style={{ fontSize: 11, color: 'var(--gfw-text-faint)' }}>
                      meta_value{numericType ? ' cast to ' + c.type : ''} {c.compare} {vals.length ? vals.join(', ') : '—'}
                    </div>
                  </RepeatableCard>
                );
              })}
              {mq.clauses.length === 0 && <div className="field-hint">No clauses — nothing is filtered by meta.</div>}
            </div>
            <button type="button" onClick={addClause} className="btn btn-ghost btn-sm repeatable-add" style={{ marginTop: 11 }}>Add clause</button>
          </div>

          <div className="field-card">
            <div className="field-card-title">The query around it</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12 }}>
              <div>
                <label className="field-label">post_type</label>
                <input className="input gfw-mono" placeholder="product" value={mq.postType} onChange={(e) => commit((p) => (p.postType = e.target.value), 'postType')} />
              </div>
              <div>
                <label className="field-label">posts_per_page</label>
                <input className="input gfw-mono" placeholder="12" value={mq.perPage} onChange={(e) => commit((p) => (p.perPage = e.target.value), 'perPage')} />
              </div>
              <div>
                <label className="field-label">orderby</label>
                <select className="select" value={mq.orderby} onChange={(e) => commit((p) => (p.orderby = e.target.value))}>
                  <option value="date">date</option>
                  <option value="title">title</option>
                  <option value="meta_value">meta_value — as text</option>
                  <option value="meta_value_num">meta_value_num — as number</option>
                </select>
              </div>
              <div>
                <label className="field-label">order</label>
                <select className="select" value={mq.order} onChange={(e) => commit((p) => (p.order = e.target.value as 'DESC' | 'ASC'))}>
                  <option value="DESC">DESC</option>
                  <option value="ASC">ASC</option>
                </select>
              </div>
              {needsOrderKey && (
                <div>
                  <label className="field-label">order by which key</label>
                  <input className="input gfw-mono" placeholder="price" value={mq.orderKey} onChange={(e) => commit((p) => (p.orderKey = e.target.value), 'orderKey')} />
                </div>
              )}
            </div>
            <div style={{ marginTop: 13 }}>
              <ToggleRow
                label="no_found_rows"
                help="Skips the COUNT query — right whenever you are not paginating."
                checked={mq.noFoundRows}
                onChange={(v) => commit((p) => (p.noFoundRows = v))}
              />
            </div>
          </div>
        </div>
      }
    />
  );
}
