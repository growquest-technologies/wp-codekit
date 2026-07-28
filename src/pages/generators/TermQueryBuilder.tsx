import { useMemo, useState } from 'react';
import { GeneratorShell } from '../../components/generator/GeneratorShell';
import { RepeatableCard } from '../../components/ui/RepeatableCard';
import { ToggleRow } from '../../components/ui/Toggle';
import { useDragReorder } from '../../lib/dragReorder';
import { useEditorState } from '../../lib/useEditorState';
import { useListOps } from '../../lib/useListOps';
import {
  COMPARES,
  ORDERBYS,
  OUTPUT_HINTS,
  REF_ARGS,
  applyFix,
  buildCode,
  fileNameFor,
  freshProject,
  hierarchyNote,
  idList,
  plainEnglish,
  validate,
  type OutputMode,
  type TermMetaClause,
  type TermQuery,
} from '../../generators/termQuery';

const OUTPUT_MODES: { id: OutputMode; label: string }[] = [
  { id: 'query', label: 'WP_Term_Query' },
  { id: 'dropdown', label: 'Filter dropdown' },
  { id: 'args', label: 'Args array' },
];

export function TermQueryBuilder() {
  const { state: tq, commit, undo, redo, reset, canUndo, canRedo, savedLabel } = useEditorState<TermQuery>('term-query-generator-v1', freshProject);
  const drag = useDragReorder();
  const metaOps = useListOps<TermQuery>(commit)((p) => p.meta);
  const [outputMode, setOutputMode] = useState<OutputMode>('query');

  function addMeta() {
    commit((p) => p.meta.push({ key: '', compare: '=', value: '' }));
  }

  function updateMeta(i: number, patch: Partial<TermMetaClause>, coalesceKey?: string) {
    commit((p) => Object.assign(p.meta[i], patch), coalesceKey);
  }

  const code = useMemo(() => buildCode(tq, outputMode), [tq, outputMode]);
  const issues = useMemo(() => validate(tq), [tq]);
  const fileName = fileNameFor(tq);

  function fix(kind: string) {
    commit((draft) => Object.assign(draft, applyFix(draft, kind)));
  }

  const inc = idList(tq.include), exc = idList(tq.exclude);
  const includeBorder = inc.some((v) => !/^\d+$/.test(v)) ? '#B91C1C' : 'var(--gfw-border)';
  const excludeBorder = exc.some((v) => !/^\d+$/.test(v)) ? '#B91C1C' : 'var(--gfw-border)';
  const taxBorder = tq.taxonomy.trim() ? 'var(--gfw-border)' : '#B91C1C';
  const metaNote = tq.meta.length ? tq.meta.length + ' clause' + (tq.meta.length === 1 ? '' : 's') : 'none';

  return (
    <GeneratorShell
      category="query"
      title="Term Query Builder"
      description={
        <>
          Fetch terms with hide_empty, ordering and meta clauses — with the parent/child_of mixup and the pad_counts fix called out before your menu loses a level.
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

            <div className="gfw-mono" style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 4 }}>new WP_Term_Query()</div>
            <div style={{ fontSize: 12, color: 'var(--gfw-text-mutest)', marginBottom: 14 }}>get_terms() is a thin wrapper around this</div>

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

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>hide_empty and hierarchy</div>
            <div style={{ fontSize: 12.5, lineHeight: 1.65, marginBottom: 18 }}>A parent category with no posts of its own but plenty in its children counts as empty — so hide_empty drops it and your menu loses a level. Passing pad_counts makes each parent count include its descendants, which fixes exactly this.</div>

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>count is not per post type</div>
            <div style={{ fontSize: 12.5, lineHeight: 1.65 }}>term-&gt;count counts every object attached to the term, across every post type sharing that taxonomy, published or not in some cases. If your archive shows "12 posts" and lists 8, this is why.</div>
          </div>
        ),
      }}
      form={
        <div>
          <div className="field-card field-card-primary">
            <div className="field-card-title">Which terms</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
              <div>
                <label className="field-label">taxonomy</label>
                <input className="input gfw-mono" placeholder="category" value={tq.taxonomy} onChange={(e) => commit((p) => (p.taxonomy = e.target.value), 'taxonomy')} style={{ borderColor: taxBorder }} />
              </div>
              <div>
                <label className="field-label">parent</label>
                <input className="input gfw-mono" placeholder="0 for top level" value={tq.parent} onChange={(e) => commit((p) => (p.parent = e.target.value), 'parent')} />
              </div>
              <div>
                <label className="field-label">child_of</label>
                <input className="input gfw-mono" placeholder="term id" value={tq.childOf} onChange={(e) => commit((p) => (p.childOf = e.target.value), 'childOf')} />
              </div>
              <div>
                <label className="field-label">name / slug contains</label>
                <input className="input gfw-mono" placeholder="guide" value={tq.search} onChange={(e) => commit((p) => (p.search = e.target.value), 'search')} />
              </div>
              <div>
                <label className="field-label">include ids</label>
                <input className="input gfw-mono" placeholder="4, 12, 19" value={tq.include} onChange={(e) => commit((p) => (p.include = e.target.value), 'include')} style={{ borderColor: includeBorder }} />
              </div>
              <div>
                <label className="field-label">exclude ids</label>
                <input className="input gfw-mono" placeholder="1" value={tq.exclude} onChange={(e) => commit((p) => (p.exclude = e.target.value), 'exclude')} style={{ borderColor: excludeBorder }} />
              </div>
            </div>
            <div style={{ marginTop: 12, fontSize: 12, color: 'var(--gfw-text-muted)', lineHeight: 1.55 }}>{hierarchyNote(tq)}</div>
          </div>

          <div className="field-card">
            <div className="field-card-title">Order and shape</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12 }}>
              <div>
                <label className="field-label">orderby</label>
                <select className="select" value={tq.orderby} onChange={(e) => commit((p) => (p.orderby = e.target.value))}>
                  {ORDERBYS.map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">order</label>
                <select className="select" value={tq.order} onChange={(e) => commit((p) => (p.order = e.target.value as 'ASC' | 'DESC'))}>
                  <option value="ASC">ASC</option>
                  <option value="DESC">DESC</option>
                </select>
              </div>
              <div>
                <label className="field-label">number</label>
                <input className="input gfw-mono" placeholder="0 for all" value={tq.number} onChange={(e) => commit((p) => (p.number = e.target.value), 'number')} />
              </div>
              <div>
                <label className="field-label">fields</label>
                <select className="select" value={tq.fields} onChange={(e) => commit((p) => (p.fields = e.target.value as TermQuery['fields']))}>
                  <option value="all">all — WP_Term objects</option>
                  <option value="ids">ids</option>
                  <option value="names">names</option>
                  <option value="slugs">slugs</option>
                  <option value="id=>name">id=&gt;name pairs</option>
                  <option value="count">count — a number</option>
                </select>
              </div>
            </div>
            <div style={{ marginTop: 13 }}>
              <ToggleRow
                label="hide_empty"
                help="Skip terms with nothing attached."
                checked={tq.hideEmpty}
                onChange={(v) => commit((p) => (p.hideEmpty = v))}
              />
              <ToggleRow
                label="pad_counts"
                help="Roll child counts up into the parent."
                checked={tq.padCounts}
                onChange={(v) => commit((p) => (p.padCounts = v))}
              />
              <ToggleRow
                label="Match the slug exactly"
                help="Use the slug argument instead of a fuzzy name search."
                checked={tq.searchSlug}
                onChange={(v) => commit((p) => (p.searchSlug = v))}
              />
              <ToggleRow
                label="exclude_tree"
                help="Exclude the listed terms and everything beneath them."
                checked={tq.excludeTree}
                onChange={(v) => commit((p) => (p.excludeTree = v))}
              />
              <ToggleRow
                label="Prime the term meta cache"
                help="One query for all term meta instead of one per term."
                checked={tq.updateCache}
                onChange={(v) => commit((p) => (p.updateCache = v))}
              />
            </div>
          </div>

          <div className="field-card">
            <div className="field-card-header">
              <div className="field-card-title">Term meta</div>
              <div className="field-card-desc">{metaNote}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {tq.meta.map((m, i) => {
                const needsValue = m.compare !== 'EXISTS' && m.compare !== 'NOT EXISTS';
                return (
                  <RepeatableCard
                    key={i}
                    index={i}
                    count={tq.meta.length}
                    title={m.key || `Clause ${i + 1}`}
                    subtitle={m.compare}
                    drag={drag.bind('meta', i, metaOps.reorder)}
                    onMoveUp={() => metaOps.moveUp(i)}
                    onMoveDown={() => metaOps.moveDown(i)}
                    onRemove={() => metaOps.remove(i)}
                  >
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <input className="input gfw-mono" style={{ flex: 1, minWidth: 130 }} placeholder="featured" value={m.key} onChange={(e) => updateMeta(i, { key: e.target.value }, `key-${i}`)} />
                      <select className="select" style={{ width: 120 }} value={m.compare} onChange={(e) => updateMeta(i, { compare: e.target.value })}>
                        {COMPARES.map(([v, l]) => (
                          <option key={v} value={v}>{l}</option>
                        ))}
                      </select>
                      <input className="input gfw-mono" style={{ flex: 1, minWidth: 100 }} placeholder="1" value={m.value} disabled={!needsValue} onChange={(e) => updateMeta(i, { value: e.target.value }, `value-${i}`)} />
                    </div>
                  </RepeatableCard>
                );
              })}
              {tq.meta.length === 0 && <div className="field-hint">No term meta clauses.</div>}
            </div>
            <button type="button" onClick={addMeta} className="btn btn-ghost btn-sm repeatable-add" style={{ marginTop: 11 }}>Add meta clause</button>
          </div>
        </div>
      }
    />
  );
}
