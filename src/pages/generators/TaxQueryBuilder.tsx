import { useMemo, useState } from 'react';
import { GeneratorShell } from '../../components/generator/GeneratorShell';
import { Toggle, ToggleRow } from '../../components/ui/Toggle';
import { useEditorState } from '../../lib/useEditorState';
import {
  FIELDS,
  OPERATORS,
  OUTPUT_HINTS,
  REF_ARGS,
  REF_NESTING,
  applyFix,
  buildCode,
  fileNameFor,
  freshProject,
  needsTerms,
  plainEnglish,
  validate,
  type OutputMode,
  type TaxClause,
  type TaxQuery,
} from '../../generators/taxQuery';

const OUTPUT_MODES: { id: OutputMode; label: string }[] = [
  { id: 'query', label: 'WP_Query + loop' },
  { id: 'args', label: 'Args array' },
  { id: 'pre', label: 'pre_get_posts' },
];

export function TaxQueryBuilder() {
  const { state: tq, commit, undo, redo, reset, canUndo, canRedo, savedLabel } = useEditorState<TaxQuery>('tax-query-generator-v1', freshProject);
  const [outputMode, setOutputMode] = useState<OutputMode>('query');

  function updateClause(i: number, patch: Partial<TaxClause>, coalesceKey?: string) {
    commit((p) => Object.assign(p.clauses[i], patch), coalesceKey);
  }

  function addClause() {
    commit((p) => p.clauses.push({ taxonomy: 'category', field: 'slug', operator: 'IN', terms: '', includeChildren: true }));
  }

  function removeClause(i: number) {
    commit((p) => p.clauses.splice(i, 1));
  }

  const code = useMemo(() => buildCode(tq, outputMode), [tq, outputMode]);
  const issues = useMemo(() => validate(tq), [tq]);
  const fileName = fileNameFor(tq);

  function fix(kind: string) {
    commit((draft) => Object.assign(draft, applyFix(draft, kind)));
  }

  return (
    <GeneratorShell
      category="query"
      title="Tax Query Builder"
      description={
        <>
          Taxonomy clauses that mean what you think they mean — the field matching your terms, the operator matching your intent, and one JOIN per clause accounted for.
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
              <div style={{ fontSize: 13, lineHeight: 1.65 }}>{plainEnglish(tq)}</div>
            </div>

            <div className="gfw-mono" style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 4 }}>tax_query</div>
            <div style={{ fontSize: 12, color: 'var(--gfw-text-mutest)', marginBottom: 14 }}>Handled by WP_Tax_Query, one JOIN per clause</div>

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

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>Nesting</div>
            <pre className="gfw-mono" style={{ border: '1px solid var(--gfw-border)', borderRadius: 7, padding: '12px 14px', background: 'var(--gfw-surface-sunken)', fontSize: 11.5, lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: 8 }}>{REF_NESTING}</pre>
            <div style={{ fontSize: 12.5, lineHeight: 1.65, marginBottom: 18 }}>A clause array can contain another clause array with its own relation. That is how you say "in this category, and tagged either of these two".</div>

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>Cost</div>
            <div style={{ fontSize: 12.5, lineHeight: 1.65 }}>Each clause adds a JOIN against wp_term_relationships. Two is unremarkable; five on a large site is a slow query. If you are filtering by one term, category__in and tag__in are cheaper and clearer than a full clause.</div>
          </div>
        ),
      }}
      form={
        <div>
          <div className="field-card field-card-primary">
            <div className="field-card-header">
              <div className="field-card-title">Clauses</div>
              <div className="field-card-desc">
                {tq.clauses.length + (tq.clauses.length === 1 ? ' clause · 1 JOIN' : ' clauses · ' + tq.clauses.length + ' JOINs')}
              </div>
            </div>
            {tq.clauses.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 13 }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)' }}>Match</span>
                {(['AND', 'OR'] as const).map((r) => (
                  <button key={r} type="button" onClick={() => commit((p) => (p.relation = r))} className={`chip${tq.relation === r ? ' is-active' : ''}`}>
                    {r}
                  </button>
                ))}
                <span className="field-hint" style={{ margin: 0 }}>{tq.relation === 'AND' ? 'every clause must match' : 'any clause may match'}</span>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {tq.clauses.map((c, i) => {
                const showTerms = needsTerms(c.operator);
                const numericField = c.field === 'term_id' || c.field === 'term_taxonomy_id';
                return (
                  <div key={i} style={{ border: '1px solid var(--gfw-border)', borderRadius: 7, padding: 11, background: '#fff' }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <input className="input gfw-mono" style={{ flex: 1, minWidth: 120 }} placeholder="category" value={c.taxonomy} onChange={(e) => updateClause(i, { taxonomy: e.target.value }, `taxonomy-${i}`)} />
                      <select className="select" style={{ width: 160 }} value={c.field} onChange={(e) => updateClause(i, { field: e.target.value as TaxClause['field'] })}>
                        {FIELDS.map(([v, l]) => (
                          <option key={v} value={v}>{l}</option>
                        ))}
                      </select>
                      <select className="select" style={{ width: 140 }} value={c.operator} onChange={(e) => updateClause(i, { operator: e.target.value as TaxClause['operator'] })}>
                        {OPERATORS.map(([v, l]) => (
                          <option key={v} value={v}>{l}</option>
                        ))}
                      </select>
                      <button type="button" aria-label="Remove clause" onClick={() => removeClause(i)} className="btn btn-ghost btn-sm" style={{ color: '#B91C1C' }}>Remove</button>
                    </div>
                    {showTerms && (
                      <div style={{ marginTop: 7 }}>
                        <input className="input gfw-mono" placeholder={numericField ? '12, 34' : 'guides, tutorials'} value={c.terms} onChange={(e) => updateClause(i, { terms: e.target.value }, `terms-${i}`)} />
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Toggle
                          checked={c.includeChildren}
                          onChange={(v) => updateClause(i, { includeChildren: v })}
                          ariaLabel="include_children"
                        />
                        <span style={{ fontSize: 12, fontWeight: 650, color: 'var(--gfw-text-strong)' }}>include_children</span>
                      </div>
                      <span className="gfw-mono" style={{ fontSize: 11, color: 'var(--gfw-text-faint)' }}>
                        {(needsTerms(c.operator) && c.terms.split(',').map((t) => t.trim()).filter(Boolean).length) ? c.operator + ' ' + c.terms.split(',').map((t) => t.trim()).filter(Boolean).length + ' × ' + c.field : c.operator}
                      </span>
                    </div>
                  </div>
                );
              })}
              {tq.clauses.length === 0 && <div className="field-hint">No clauses — the query will return everything.</div>}
            </div>
            <button type="button" onClick={addClause} className="btn btn-ghost btn-sm" style={{ marginTop: 11 }}>Add clause</button>
          </div>

          <div className="field-card">
            <div className="field-card-title">The query around it</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12 }}>
              <div>
                <label className="field-label">post_type</label>
                <input className="input gfw-mono" placeholder="post" value={tq.postType} onChange={(e) => commit((p) => (p.postType = e.target.value), 'postType')} />
              </div>
              <div>
                <label className="field-label">posts_per_page</label>
                <input className="input gfw-mono" placeholder="10" value={tq.perPage} onChange={(e) => commit((p) => (p.perPage = e.target.value), 'perPage')} />
              </div>
              <div>
                <label className="field-label">orderby</label>
                <select className="select" value={tq.orderby} onChange={(e) => commit((p) => (p.orderby = e.target.value))}>
                  <option value="date">date</option>
                  <option value="title">title</option>
                  <option value="menu_order">menu_order</option>
                  <option value="rand">rand</option>
                  <option value="none">none</option>
                </select>
              </div>
              <div>
                <label className="field-label">fields</label>
                <select className="select" value={tq.fields} onChange={(e) => commit((p) => (p.fields = e.target.value as TaxQuery['fields']))}>
                  <option value="all">all — full post objects</option>
                  <option value="ids">ids — just IDs</option>
                </select>
              </div>
            </div>
            <div style={{ marginTop: 13 }}>
              <ToggleRow
                label="no_found_rows"
                help="Skips the COUNT query, correct whenever you are not paginating."
                checked={tq.noFoundRows}
                onChange={(v) => commit((p) => (p.noFoundRows = v))}
              />
              <ToggleRow
                label="Skip the meta cache"
                help="Right when the loop never touches post meta."
                checked={tq.skipMetaCache}
                onChange={(v) => commit((p) => (p.skipMetaCache = v))}
              />
            </div>
          </div>
        </div>
      }
    />
  );
}
