import { useMemo, useState } from 'react';
import { GeneratorShell } from '../../components/generator/GeneratorShell';
import { ToggleRow } from '../../components/ui/Toggle';
import { useEditorState } from '../../lib/useEditorState';
import {
  COLUMNS,
  MODES,
  OUTPUT_HINTS,
  REF_ARGS,
  REF_COLUMNS,
  applyFix,
  buildCode,
  fileNameFor,
  freshProject,
  isYmd,
  numList,
  plainEnglish,
  validate,
  type DateColumn,
  type DateMode,
  type DateQuery,
  type OutputMode,
} from '../../generators/dateQuery';

const OUTPUT_MODES: { id: OutputMode; label: string }[] = [
  { id: 'query', label: 'WP_Query + loop' },
  { id: 'args', label: 'Args array' },
  { id: 'pre', label: 'pre_get_posts' },
];

const PART_FIELDS: { key: 'year' | 'month' | 'day' | 'dayofweek' | 'hour'; label: string; placeholder: string; help: string; range?: [number, number] }[] = [
  { key: 'year', label: 'year', placeholder: '2026', help: 'Four digits. Comma separate for several.' },
  { key: 'month', label: 'month', placeholder: '12', help: '1 to 12.', range: [1, 12] },
  { key: 'day', label: 'day', placeholder: '25', help: '1 to 31.', range: [1, 31] },
  { key: 'dayofweek', label: 'dayofweek', placeholder: '2', help: '1 is Sunday, 7 is Saturday.', range: [1, 7] },
  { key: 'hour', label: 'hour', placeholder: '9', help: '0 to 23.', range: [0, 23] },
];

export function DateQueryBuilder() {
  const { state: dq, commit, undo, redo, reset, canUndo, canRedo, savedLabel } = useEditorState<DateQuery>('date-query-generator-v1', freshProject);
  const [outputMode, setOutputMode] = useState<OutputMode>('query');

  const code = useMemo(() => buildCode(dq, outputMode), [dq, outputMode]);
  const issues = useMemo(() => validate(dq), [dq]);
  const fileName = fileNameFor(dq);

  function fix(kind: string) {
    commit((draft) => Object.assign(draft, applyFix(draft, kind)));
  }

  const after = String(dq.after || '').trim();
  const before = String(dq.before || '').trim();
  const afterBorder = dq.mode === 'range' && !after && !before ? '#B91C1C' : 'var(--gfw-border)';
  const beforeBorder = dq.mode === 'range' && after && before && isYmd(after) && isYmd(before) && after > before ? '#B91C1C' : 'var(--gfw-border)';
  const relativeBorder = parseInt(dq.relativeCount, 10) ? 'var(--gfw-border)' : '#B91C1C';

  return (
    <GeneratorShell
      category="query"
      title="Date Query Builder"
      description={
        <>
          Date ranges, rolling windows and calendar parts — with the column, timezone and off-by-one boundary gotchas called out before they bite.
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
              <div style={{ fontSize: 13, lineHeight: 1.65 }}>{plainEnglish(dq)}</div>
            </div>

            <div className="gfw-mono" style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 4 }}>date_query</div>
            <div style={{ fontSize: 12, color: 'var(--gfw-text-mutest)', marginBottom: 14 }}>Handled by WP_Date_Query — no JOIN, it filters wp_posts directly</div>

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

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>Columns</div>
            <pre className="gfw-mono" style={{ border: '1px solid var(--gfw-border)', borderRadius: 7, padding: '12px 14px', background: 'var(--gfw-surface-sunken)', fontSize: 11.5, lineHeight: 1.7, whiteSpace: 'pre-wrap', marginBottom: 18 }}>{REF_COLUMNS}</pre>

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>post_date or post_date_gmt</div>
            <div style={{ fontSize: 12.5, lineHeight: 1.65, marginBottom: 18 }}>post_date is the site's local time; post_date_gmt is UTC. A date_query compares against whichever column you name, using the literal numbers you gave it — no conversion happens. If your dates come from an API in UTC, query the GMT column, or you will be off by your timezone offset twice a year.</div>

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>inclusive</div>
            <div style={{ fontSize: 12.5, lineHeight: 1.65 }}>With inclusive false, before {'=>'} '2026-06-30' means everything up to midnight on the 30th — so nothing published that day matches. With it true, the boundary day is included. This is the single most common off-by-one in WordPress date filtering.</div>
          </div>
        ),
      }}
      form={
        <div>
          <div className="field-card field-card-primary">
            <div className="field-card-title">Shape of the range</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
              {MODES.map(([v, l]) => (
                <button key={v} type="button" onClick={() => commit((p) => (p.mode = v as DateMode))} className={`chip${dq.mode === v ? ' is-active' : ''}`}>
                  {l}
                </button>
              ))}
            </div>

            {dq.mode === 'range' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12 }}>
                  <div>
                    <label className="field-label">after</label>
                    <input className="input gfw-mono" placeholder="2026-01-01" value={dq.after} onChange={(e) => commit((p) => (p.after = e.target.value), 'after')} style={{ borderColor: afterBorder }} />
                  </div>
                  <div>
                    <label className="field-label">before</label>
                    <input className="input gfw-mono" placeholder="2026-06-30" value={dq.before} onChange={(e) => commit((p) => (p.before = e.target.value), 'before')} style={{ borderColor: beforeBorder }} />
                  </div>
                </div>
                <div className="field-hint">Either an absolute date or a strtotime phrase — "1 January 2026", "-30 days", "last monday". Leave one empty for an open-ended range.</div>
              </>
            )}

            {dq.mode === 'relative' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12 }}>
                <div>
                  <label className="field-label">last</label>
                  <input className="input gfw-mono" placeholder="30" value={dq.relativeCount} onChange={(e) => commit((p) => (p.relativeCount = e.target.value), 'relativeCount')} style={{ borderColor: relativeBorder }} />
                </div>
                <div>
                  <label className="field-label">unit</label>
                  <select className="select" value={dq.relativeUnit} onChange={(e) => commit((p) => (p.relativeUnit = e.target.value as DateQuery['relativeUnit']))}>
                    <option value="hours">hours</option>
                    <option value="days">days</option>
                    <option value="weeks">weeks</option>
                    <option value="months">months</option>
                    <option value="years">years</option>
                  </select>
                </div>
              </div>
            )}

            {dq.mode === 'parts' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
                {PART_FIELDS.map((f) => {
                  const vals = numList(dq[f.key]);
                  const bad = f.range ? vals.some((v) => !/^\d+$/.test(v) || +v < f.range![0] || +v > f.range![1]) : false;
                  return (
                    <div key={f.key}>
                      <label className="field-label">{f.label}</label>
                      <input className="input gfw-mono" placeholder={f.placeholder} value={dq[f.key]} onChange={(e) => commit((p) => (p[f.key] = e.target.value), f.key)} style={{ borderColor: bad ? '#B91C1C' : 'var(--gfw-border)' }} />
                      <div className="field-hint">{f.help}</div>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12, marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--gfw-border)' }}>
              <div>
                <label className="field-label">column</label>
                <select className="select gfw-mono" value={dq.column} onChange={(e) => commit((p) => (p.column = e.target.value as DateColumn))}>
                  {COLUMNS.map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">post_type</label>
                <input className="input gfw-mono" placeholder="post" value={dq.postType} onChange={(e) => commit((p) => (p.postType = e.target.value), 'postType')} />
              </div>
              <div>
                <label className="field-label">posts_per_page</label>
                <input className="input gfw-mono" placeholder="10" value={dq.perPage} onChange={(e) => commit((p) => (p.perPage = e.target.value), 'perPage')} />
              </div>
              <div>
                <label className="field-label">post_status</label>
                <select className="select" value={dq.postStatus} onChange={(e) => commit((p) => (p.postStatus = e.target.value as DateQuery['postStatus']))}>
                  <option value="publish">publish</option>
                  <option value="future">future — scheduled</option>
                  <option value="draft">draft</option>
                  <option value="any">any</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: 13 }}>
              <ToggleRow
                label="Inclusive boundaries"
                help="Includes the after and before dates themselves."
                checked={dq.inclusive}
                onChange={(v) => commit((p) => (p.inclusive = v))}
              />
              <ToggleRow
                label="Oldest first"
                help="Order ASC, the right default for an events list."
                checked={dq.orderAsc}
                onChange={(v) => commit((p) => (p.orderAsc = v))}
              />
              <ToggleRow
                label="no_found_rows"
                help="Skips the COUNT query when you are not paginating."
                checked={dq.noFoundRows}
                onChange={(v) => commit((p) => (p.noFoundRows = v))}
              />
            </div>
          </div>
        </div>
      }
    />
  );
}
