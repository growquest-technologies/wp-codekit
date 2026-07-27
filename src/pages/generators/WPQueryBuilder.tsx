import { useMemo, useState } from 'react';
import { GeneratorShell } from '../../components/generator/GeneratorShell';
import { Collapsible } from '../../components/ui/Collapsible';
import { ToggleRow } from '../../components/ui/Toggle';
import { CheckboxChip } from '../../components/ui/CheckboxChip';
import { useEditorState } from '../../lib/useEditorState';
import {
  BUILTIN_TYPES,
  COMPARES,
  NO_VALUE_COMPARES,
  ORDERBY,
  OUTPUT_HINTS,
  STATUSES,
  applyFix,
  buildCode,
  costProfile,
  fileNameFor,
  freshProject,
  summaryRows,
  summarySentence,
  validate,
  type MetaClause,
  type OutputMode,
  type TaxClause,
  type WPQuery,
} from '../../generators/wpQuery';
import { slugify } from '../../lib/codegen';

const OUTPUT_MODES: { id: OutputMode; label: string }[] = [
  { id: 'loop', label: 'Query + loop' },
  { id: 'pre_get_posts', label: 'pre_get_posts' },
  { id: 'shortcode', label: 'Shortcode' },
];

export function WPQueryBuilder() {
  const { state: q, commit, undo, redo, reset, canUndo, canRedo, savedLabel } = useEditorState<WPQuery>('wp-query-generator-v1', freshProject);
  const [outputMode, setOutputMode] = useState<OutputMode>('loop');
  const [typeDraft, setTypeDraft] = useState('');

  const code = useMemo(() => buildCode(q, outputMode), [q, outputMode]);
  const issues = useMemo(() => validate(q), [q]);
  const cost = useMemo(() => costProfile(q), [q]);
  const fileName = fileNameFor(q, outputMode);

  function fix(kind: string) {
    commit((draft) => Object.assign(draft, applyFix(draft, kind)));
  }

  function togglePostType(t: string) {
    commit((p) => {
      const i = p.postTypes.indexOf(t);
      if (i === -1) p.postTypes.push(t);
      else p.postTypes.splice(i, 1);
    });
  }

  function toggleStatus(t: string) {
    commit((p) => {
      const i = p.statuses.indexOf(t);
      if (i === -1) p.statuses.push(t);
      else p.statuses.splice(i, 1);
    });
  }

  function addCustomType() {
    const v = slugify(typeDraft, 20);
    if (!v) return;
    commit((p) => {
      if (p.customTypes.indexOf(v) === -1) p.customTypes.push(v);
    });
    setTypeDraft('');
  }

  function removeCustomType(i: number) {
    commit((p) => p.customTypes.splice(i, 1));
  }

  function addTaxClause() {
    commit((p) => p.taxClauses.push({ taxonomy: '', field: 'slug', operator: 'IN', terms: '', includeChildren: true }));
  }

  function updateTaxClause(i: number, patch: Partial<TaxClause>, coalesceKey?: string) {
    commit((p) => Object.assign(p.taxClauses[i], patch), coalesceKey);
  }

  function removeTaxClause(i: number) {
    commit((p) => p.taxClauses.splice(i, 1));
  }

  function addMetaClause() {
    commit((p) => p.metaClauses.push({ key: '', compare: '=', type: 'CHAR', value: '' }));
  }

  function updateMetaClause(i: number, patch: Partial<MetaClause>, coalesceKey?: string) {
    commit((p) => Object.assign(p.metaClauses[i], patch), coalesceKey);
  }

  function removeMetaClause(i: number) {
    commit((p) => p.metaClauses.splice(i, 1));
  }

  return (
    <GeneratorShell
      category="query"
      title="WP_Query Builder"
      description={
        <>
          Pick the posts you want; get the query, the loop and a plain-English summary — plus warnings for the arguments that quietly kill performance.
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
        label: 'Summary',
        content: (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <div style={{ fontSize: 14.5, lineHeight: 1.6, color: 'var(--gfw-text-strong)', marginBottom: 16 }}>{summarySentence(q)}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {summaryRows(q).map((r) => (
                <div key={r.key} style={{ display: 'flex', gap: 12, alignItems: 'baseline', borderBottom: '1px solid var(--gfw-border)', paddingBottom: 7 }}>
                  <span className="gfw-mono" style={{ width: 120, flexShrink: 0, fontSize: 11.5, color: 'var(--gfw-text-mutest)' }}>{r.key}</span>
                  <span style={{ flex: 1, fontSize: 12.5, lineHeight: 1.5 }}>{r.value}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 18, border: '1px solid var(--gfw-border)', borderRadius: 7, padding: '12px 14px', background: 'var(--gfw-surface-sunken)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 7 }}>Cost profile</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ flex: 1, height: 7, borderRadius: 4, background: 'var(--gfw-border)', overflow: 'hidden' }}>
                  <div style={{ width: cost.pct + '%', height: '100%', background: cost.color }} />
                </div>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: cost.color }}>{cost.label}</span>
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--gfw-text-muted)', lineHeight: 1.5 }}>{cost.note}</div>
            </div>
          </div>
        ),
      }}
      form={
        <div>
          <div className="field-card field-card-primary">
            <div className="field-card-title">What to fetch</div>
            <label className="field-label">Post types</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 8 }}>
              {BUILTIN_TYPES.map((t) => (
                <CheckboxChip key={t} active={q.postTypes.includes(t)} onClick={() => togglePostType(t)}>
                  {t}
                </CheckboxChip>
              ))}
            </div>
            <div style={{ border: '1px solid var(--gfw-border)', borderRadius: 6, padding: 6, display: 'flex', flexWrap: 'wrap', gap: 6, background: '#fff', marginBottom: 14 }}>
              {q.customTypes.map((t, i) => (
                <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--gfw-accent-tint)', color: 'var(--gfw-accent-strong)', borderRadius: 5, padding: '3px 6px', fontSize: 12 }} className="gfw-mono">
                  {t}
                  <button type="button" aria-label={`Remove ${t}`} title={`Remove ${t}`} onClick={() => removeCustomType(i)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'inherit', padding: 0 }}>×</button>
                </span>
              ))}
              <input
                aria-label="Add custom post type key"
                placeholder="custom post type key…"
                value={typeDraft}
                onChange={(e) => setTypeDraft(e.target.value)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ',') && (e.preventDefault(), addCustomType())}
                onBlur={addCustomType}
                style={{ border: 'none', outline: 'none', fontSize: 12, flex: 1, minWidth: 140 }}
              />
            </div>

            <label className="field-label">Post status</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 14 }}>
              {STATUSES.map((t) => (
                <CheckboxChip key={t} active={q.statuses.includes(t)} onClick={() => toggleStatus(t)}>
                  {t}
                </CheckboxChip>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="field-label" htmlFor="wpq-perpage">Posts per page</label>
                <input id="wpq-perpage" className="input gfw-mono" placeholder="10" value={q.perPage} onChange={(e) => commit((p) => (p.perPage = e.target.value), 'perPage')} />
                <div className="field-hint">{q.perPage === '-1' ? 'Unlimited — every matching row is loaded.' : 'Use -1 for no limit.'}</div>
              </div>
              <div>
                <label className="field-label" htmlFor="wpq-offset">Offset</label>
                <input id="wpq-offset" className="input gfw-mono" placeholder="0" value={q.offset} onChange={(e) => commit((p) => (p.offset = e.target.value), 'offset')} />
              </div>
              <div>
                <label className="field-label" htmlFor="wpq-orderby">Order by</label>
                <select id="wpq-orderby" className="select" value={q.orderby} onChange={(e) => commit((p) => (p.orderby = e.target.value))}>
                  {ORDERBY.map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label" htmlFor="wpq-order">Order</label>
                <select id="wpq-order" className="select" value={q.order} onChange={(e) => commit((p) => (p.order = e.target.value as 'DESC' | 'ASC'))}>
                  <option value="DESC">DESC — newest / highest first</option>
                  <option value="ASC">ASC — oldest / lowest first</option>
                </select>
              </div>
              {(q.orderby === 'meta_value' || q.orderby === 'meta_value_num') && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="field-label" htmlFor="wpq-orderby-meta">Meta key to order by</label>
                  <input id="wpq-orderby-meta" className="input gfw-mono" placeholder="_price" value={q.orderbyMetaKey} onChange={(e) => commit((p) => (p.orderbyMetaKey = e.target.value), 'orderbyMetaKey')} />
                </div>
              )}
            </div>
          </div>

          <div className="toggle-card">
            <div className="toggle-card-title">Pagination &amp; behaviour</div>
            <ToggleRow
              label="Paginate"
              help="Reads the paged query var so page 2 and beyond work."
              checked={q.paged}
              onChange={(v) => commit((p) => (p.paged = v))}
            />
            <ToggleRow
              label="Ignore sticky posts"
              help="Stops pinned posts jumping to the top of a secondary query."
              checked={q.ignoreSticky}
              onChange={(v) => commit((p) => (p.ignoreSticky = v))}
            />
          </div>

          <div className="field-card">
            <div className="field-card-header">
              <div className="field-card-title">Taxonomy clauses</div>
              {q.taxClauses.length > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span className="gfw-mono" style={{ fontSize: 11.5, color: 'var(--gfw-text-mutest)' }}>relation</span>
                  <select className="select" style={{ width: 'auto' }} value={q.taxRelation} onChange={(e) => commit((p) => (p.taxRelation = e.target.value as 'AND' | 'OR'))}>
                    <option value="AND">AND</option>
                    <option value="OR">OR</option>
                  </select>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {q.taxClauses.map((c, i) => {
                const noTerms = NO_VALUE_COMPARES.indexOf(c.operator) !== -1;
                const childVisible = c.field === 'slug' || c.field === 'term_id';
                return (
                  <div key={i} style={{ border: '1px solid var(--gfw-border)', borderRadius: 7, padding: 11, background: 'var(--gfw-surface-sunken)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 9 }}>
                      <div>
                        <label className="field-label">taxonomy</label>
                        <input className="input gfw-mono" placeholder="category" value={c.taxonomy} onChange={(e) => updateTaxClause(i, { taxonomy: e.target.value }, `tax-taxonomy-${i}`)} />
                      </div>
                      <div>
                        <label className="field-label">field</label>
                        <select className="select" value={c.field} onChange={(e) => updateTaxClause(i, { field: e.target.value as TaxClause['field'] })}>
                          <option value="slug">slug</option>
                          <option value="term_id">term_id</option>
                          <option value="name">name</option>
                          <option value="term_taxonomy_id">term_taxonomy_id</option>
                        </select>
                      </div>
                      <div>
                        <label className="field-label">operator</label>
                        <select className="select" value={c.operator} onChange={(e) => updateTaxClause(i, { operator: e.target.value as TaxClause['operator'] })}>
                          <option value="IN">IN</option>
                          <option value="NOT IN">NOT IN</option>
                          <option value="AND">AND</option>
                          <option value="EXISTS">EXISTS</option>
                          <option value="NOT EXISTS">NOT EXISTS</option>
                        </select>
                      </div>
                      <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 9, alignItems: 'flex-end' }}>
                        <div style={{ flex: 1 }}>
                          <label className="field-label">terms — comma separated</label>
                          <input className="input gfw-mono" placeholder="news, updates" disabled={noTerms} value={c.terms} onChange={(e) => updateTaxClause(i, { terms: e.target.value }, `tax-terms-${i}`)} />
                        </div>
                        <button type="button" aria-label="Remove clause" onClick={() => removeTaxClause(i)} className="btn btn-ghost btn-sm" style={{ color: '#B91C1C' }}>Remove</button>
                      </div>
                    </div>
                    {childVisible && (
                      <div style={{ marginTop: 9 }}>
                        <CheckboxChip active={c.includeChildren !== false} onClick={() => updateTaxClause(i, { includeChildren: c.includeChildren === false })}>
                          include_children
                        </CheckboxChip>
                      </div>
                    )}
                  </div>
                );
              })}
              <button type="button" onClick={addTaxClause} className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }}>+ Taxonomy clause</button>
            </div>
          </div>

          <div className="field-card">
            <div className="field-card-header">
              <div className="field-card-title">Meta clauses</div>
              {q.metaClauses.length > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span className="gfw-mono" style={{ fontSize: 11.5, color: 'var(--gfw-text-mutest)' }}>relation</span>
                  <select className="select" style={{ width: 'auto' }} value={q.metaRelation} onChange={(e) => commit((p) => (p.metaRelation = e.target.value as 'AND' | 'OR'))}>
                    <option value="AND">AND</option>
                    <option value="OR">OR</option>
                  </select>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {q.metaClauses.map((c, i) => {
                const noValue = NO_VALUE_COMPARES.indexOf(c.compare) !== -1;
                const multi = ['IN', 'NOT IN', 'BETWEEN', 'NOT BETWEEN'].indexOf(c.compare) !== -1;
                return (
                  <div key={i} style={{ border: '1px solid var(--gfw-border)', borderRadius: 7, padding: 11, background: 'var(--gfw-surface-sunken)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 9 }}>
                      <div>
                        <label className="field-label">key</label>
                        <input className="input gfw-mono" placeholder="_price" value={c.key} onChange={(e) => updateMetaClause(i, { key: e.target.value }, `meta-key-${i}`)} />
                      </div>
                      <div>
                        <label className="field-label">compare</label>
                        <select className="select" value={c.compare} onChange={(e) => updateMetaClause(i, { compare: e.target.value })}>
                          {COMPARES.map((cmp) => (
                            <option key={cmp} value={cmp}>{cmp}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="field-label">type</label>
                        <select className="select" value={c.type} onChange={(e) => updateMetaClause(i, { type: e.target.value as MetaClause['type'] })}>
                          <option value="CHAR">CHAR</option>
                          <option value="NUMERIC">NUMERIC</option>
                          <option value="DECIMAL">DECIMAL</option>
                          <option value="DATE">DATE</option>
                          <option value="DATETIME">DATETIME</option>
                          <option value="BINARY">BINARY</option>
                        </select>
                      </div>
                      <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 9, alignItems: 'flex-end' }}>
                        <div style={{ flex: 1 }}>
                          <label className="field-label">{multi ? 'value — comma separated' : 'value'}</label>
                          <input className="input gfw-mono" placeholder={noValue ? `not used with ${c.compare}` : multi ? '10, 20' : '10'} disabled={noValue} value={c.value} onChange={(e) => updateMetaClause(i, { value: e.target.value }, `meta-value-${i}`)} />
                        </div>
                        <button type="button" aria-label="Remove clause" onClick={() => removeMetaClause(i)} className="btn btn-ghost btn-sm" style={{ color: '#B91C1C' }}>Remove</button>
                      </div>
                    </div>
                  </div>
                );
              })}
              <button type="button" onClick={addMetaClause} className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }}>+ Meta clause</button>
            </div>
          </div>

          <Collapsible title="Authors, dates, search & IDs">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              <div>
                <label className="field-label">s — search term</label>
                <input className="input" placeholder="keyword" value={q.search} onChange={(e) => commit((p) => (p.search = e.target.value), 'search')} />
              </div>
              <div>
                <label className="field-label">author__in — IDs</label>
                <input className="input gfw-mono" placeholder="1, 4" value={q.authors} onChange={(e) => commit((p) => (p.authors = e.target.value), 'authors')} />
              </div>
              <div>
                <label className="field-label">post__in — IDs</label>
                <input className="input gfw-mono" placeholder="12, 34" value={q.include} onChange={(e) => commit((p) => (p.include = e.target.value), 'include')} />
              </div>
              <div>
                <label className="field-label">post__not_in — IDs</label>
                <input className="input gfw-mono" placeholder="56" value={q.exclude} onChange={(e) => commit((p) => (p.exclude = e.target.value), 'exclude')} />
              </div>
              <div>
                <label className="field-label">post_parent</label>
                <input className="input gfw-mono" placeholder="7" value={q.postParent} onChange={(e) => commit((p) => (p.postParent = e.target.value), 'postParent')} />
              </div>
              <div>
                <label className="field-label">date_query — after</label>
                <input className="input" placeholder="1 month ago" value={q.dateAfter} onChange={(e) => commit((p) => (p.dateAfter = e.target.value), 'dateAfter')} />
              </div>
              <div>
                <label className="field-label">date_query — before</label>
                <input className="input" placeholder="today" value={q.dateBefore} onChange={(e) => commit((p) => (p.dateBefore = e.target.value), 'dateBefore')} />
              </div>
            </div>
          </Collapsible>

          <Collapsible title="Performance & output">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12, marginBottom: 14 }}>
              <div>
                <label className="field-label">fields</label>
                <select className="select" value={q.fields} onChange={(e) => commit((p) => (p.fields = e.target.value as WPQuery['fields']))}>
                  <option value="">all — full post objects</option>
                  <option value="ids">ids — post IDs only</option>
                  <option value="id=>parent">id=&gt;parent</option>
                </select>
              </div>
              <div>
                <label className="field-label">variable name</label>
                <input className="input gfw-mono" placeholder="query" value={q.varName} onChange={(e) => commit((p) => (p.varName = e.target.value), 'varName')} />
              </div>
              <div>
                <label className="field-label">function prefix</label>
                <input className="input gfw-mono" placeholder="mytheme" value={q.fnPrefix} onChange={(e) => commit((p) => (p.fnPrefix = e.target.value), 'fnPrefix')} />
              </div>
              <div>
                <label className="field-label">shortcode tag</label>
                <input className="input gfw-mono" placeholder="recent_posts" value={q.shortcodeTag} onChange={(e) => commit((p) => (p.shortcodeTag = e.target.value), 'shortcodeTag')} />
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              <CheckboxChip active={q.noFoundRows} onClick={() => commit((p) => (p.noFoundRows = !p.noFoundRows))}>no_found_rows</CheckboxChip>
              <CheckboxChip active={q.updateMetaCache} onClick={() => commit((p) => (p.updateMetaCache = !p.updateMetaCache))}>update_post_meta_cache</CheckboxChip>
              <CheckboxChip active={q.updateTermCache} onClick={() => commit((p) => (p.updateTermCache = !p.updateTermCache))}>update_post_term_cache</CheckboxChip>
              <CheckboxChip active={q.suppressFilters} onClick={() => commit((p) => (p.suppressFilters = !p.suppressFilters))}>suppress_filters</CheckboxChip>
            </div>
          </Collapsible>
        </div>
      }
    />
  );
}
