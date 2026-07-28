import { useMemo, useRef, useState } from 'react';
import { GeneratorShell } from '../../components/generator/GeneratorShell';
import { ToggleRow } from '../../components/ui/Toggle';
import { useEditorState } from '../../lib/useEditorState';
import {
  CAPS,
  CORE_WIDGETS,
  SOURCES,
  SOURCE_NOTES,
  applyFix,
  buildCode,
  freshProject,
  placementNote,
  validate,
  type DashboardWidget,
  type OutputMode,
} from '../../generators/dashboardWidget';
import { slugify } from '../../lib/codegen';

const OUTPUT_MODES: { id: OutputMode; label: string }[] = [
  { id: 'snippet', label: 'Snippet' },
  { id: 'functions', label: 'functions.php' },
  { id: 'plugin', label: 'Plugin file' },
];

const PREVIEW_ROWS: { title: string; date: string }[] = [
  { title: 'Spring campaign landing copy', date: 'Yesterday' },
  { title: 'Pricing page rewrite', date: '3 days ago' },
  { title: 'Untitled', date: 'Last week' },
  { title: 'Case study — Northwind', date: 'Last week' },
];
const PREVIEW_STATS: { value: string; label: string }[] = [
  { value: '1,284', label: 'Sessions' },
  { value: '38', label: 'Orders' },
  { value: '£4,102', label: 'Revenue' },
];

const REF_SIGNATURE = "wp_add_dashboard_widget(\n\t$widget_id,\n\t$widget_name,\n\t$callback,\n\t$control_callback = null,\n\t$callback_args = null,\n\t$context = 'normal',\n\t$priority = 'core'\n);";
const REF_ARGS: { name: string; type: string; description: string }[] = [
  { name: '$widget_id', type: 'string', description: 'Becomes the box’s HTML id and the key remove_meta_box() needs. It is also what each user’s hidden-box preference stores, so changing it later un-hides the widget for everyone.' },
  { name: '$widget_name', type: 'string', description: 'The heading. Translate it.' },
  { name: '$callback', type: 'callable', description: 'Prints the body. Nothing is escaped for you — every value you echo is yours to escape.' },
  { name: '$control_callback', type: 'callable|null', description: 'Adds the Configure link. It runs on both render and save, so check your nonce inside it.' },
  { name: '$context', type: 'string', description: 'normal, side, column3 or column4. WordPress 5.6 and up.' },
  { name: '$priority', type: 'string', description: 'high, core, default or low — the order within a column, until a user drags things around.' },
];

function padTo(s: string, w: number): string {
  return s + ' '.repeat(Math.max(0, w - s.length));
}

export function DashboardWidgetGenerator() {
  const { state: dw, commit, undo, redo, reset, canUndo, canRedo, savedLabel } = useEditorState<DashboardWidget>('dashboard-widget-generator-v1', freshProject);
  const [outputMode, setOutputMode] = useState<OutputMode>('snippet');
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});

  const code = useMemo(() => buildCode(dw, outputMode), [dw, outputMode]);
  const issues = useMemo(() => validate(dw), [dw]);
  const fileName = (slugify(dw.id) || 'dashboard-widget').replace(/_/g, '-') + '.php';

  function focusField(id: string) {
    fieldRefs.current[id]?.focus();
  }
  function fix(kind: string) {
    commit((draft) => Object.assign(draft, applyFix(draft, kind)));
  }
  function toggleRemoved(id: string) {
    commit((p) => {
      p.removeWidgets = p.removeWidgets || [];
      const i = p.removeWidgets.indexOf(id);
      if (i >= 0) p.removeWidgets.splice(i, 1);
      else p.removeWidgets.push(id);
    });
  }

  const removeNote = (dw.removeWidgets || []).length ? `${(dw.removeWidgets || []).length} will be removed` : 'nothing removed';
  const removed = dw.removeWidgets || [];

  const screenNote = `Dashboard · ${dw.context === 'side' ? 'right column' : 'left column'} · ${dw.priority} priority`;
  const previewRows = PREVIEW_ROWS.slice(0, Math.max(1, Math.min(6, parseInt(dw.count, 10) || 5)));
  const cacheNote = `Cached for ${parseInt(dw.cacheMinutes, 10) || 15} minutes.`;
  const previewCoreBoxes = CORE_WIDGETS.filter(([id, , context]) => context === dw.context || removed.includes(id)).map(([id, label]) => ({
    id,
    label,
    gone: removed.includes(id),
  }));

  const refCoreIds = CORE_WIDGETS.map(([id, label, context]) => `${padTo(id, 24)}${label}  (${context})`).join('\n');

  return (
    <GeneratorShell
      category="admin"
      title="Dashboard Widget Generator"
      description={<>The widget your client actually looks at: gated by capability, filled by a real callback, and — optionally — the calls that clear the core boxes around it.</>}
      form={
        <div>
          <div className="field-card field-card-primary">
            <div className="field-card-title">The widget</div>
            <div className="field-group">
              <label className="field-label" htmlFor="dw-title">Title</label>
              <input id="dw-title" ref={(el) => (fieldRefs.current.title = el)} className="input" value={dw.title} onChange={(e) => commit((p) => (p.title = e.target.value), 'title')} placeholder="Acme Overview" />
            </div>
            <div className="field-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label className="field-label" htmlFor="dw-id">Widget id</label>
                <input id="dw-id" ref={(el) => (fieldRefs.current.id = el)} className="input gfw-mono" value={dw.id} onChange={(e) => commit((p) => (p.id = e.target.value), 'id')} placeholder="acme_overview" />
              </div>
              <div ref={(el) => (fieldRefs.current.capability = el as unknown as HTMLElement)}>
                <label className="field-label" htmlFor="dw-cap">Capability</label>
                <select id="dw-cap" className="select" value={dw.capability} onChange={(e) => commit((p) => (p.capability = e.target.value))}>
                  {CAPS.map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label" htmlFor="dw-context">Context</label>
                <select id="dw-context" className="select" value={dw.context} onChange={(e) => commit((p) => (p.context = e.target.value as DashboardWidget['context']))}>
                  <option value="normal">normal — left column</option>
                  <option value="side">side — right column</option>
                  <option value="column3">column3</option>
                  <option value="column4">column4</option>
                </select>
              </div>
              <div>
                <label className="field-label" htmlFor="dw-priority">Priority</label>
                <select id="dw-priority" className="select" value={dw.priority} onChange={(e) => commit((p) => (p.priority = e.target.value as DashboardWidget['priority']))}>
                  <option value="high">high — above core boxes</option>
                  <option value="core">core</option>
                  <option value="default">default</option>
                  <option value="low">low</option>
                </select>
              </div>
              <div>
                <label className="field-label" htmlFor="dw-prefix">Prefix</label>
                <input id="dw-prefix" className="input gfw-mono" value={dw.prefix} onChange={(e) => commit((p) => (p.prefix = e.target.value), 'prefix')} placeholder="acme" />
              </div>
              <div>
                <label className="field-label" htmlFor="dw-td">Text domain</label>
                <input id="dw-td" className="input gfw-mono" value={dw.textDomain} onChange={(e) => commit((p) => (p.textDomain = e.target.value), 'textDomain')} placeholder="acme" />
              </div>
            </div>
            <div className="field-hint">{placementNote(dw)}</div>
          </div>

          <div className="field-card">
            <div className="field-card-title">What it shows</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {SOURCES.map(([v, l]) => (
                <button key={v} type="button" onClick={() => commit((p) => (p.source = v))} className={`chip${dw.source === v ? ' is-active' : ''}`}>
                  {l}
                </button>
              ))}
            </div>
            <div className="field-hint" style={{ marginBottom: 12 }}>{SOURCE_NOTES[dw.source]}</div>
            {dw.source === 'static' && (
              <div className="field-group">
                <label className="field-label" htmlFor="dw-body">Body copy</label>
                <textarea id="dw-body" rows={3} className="textarea" value={dw.body} onChange={(e) => commit((p) => (p.body = e.target.value), 'body')} placeholder="One useful sentence beats a widget nobody reads." />
              </div>
            )}
            {dw.source === 'query' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label className="field-label" htmlFor="dw-posttype">Post type</label>
                  <input id="dw-posttype" className="input gfw-mono" value={dw.postType} onChange={(e) => commit((p) => (p.postType = e.target.value), 'postType')} placeholder="post" />
                </div>
                <div>
                  <label className="field-label" htmlFor="dw-count">How many</label>
                  <input id="dw-count" ref={(el) => (fieldRefs.current.count = el)} className="input gfw-mono" value={dw.count} onChange={(e) => commit((p) => (p.count = e.target.value), 'count')} placeholder="5" />
                </div>
                <div>
                  <label className="field-label" htmlFor="dw-status">Status</label>
                  <select id="dw-status" className="select" value={dw.postStatus} onChange={(e) => commit((p) => (p.postStatus = e.target.value))}>
                    <option value="publish">publish</option>
                    <option value="draft">draft</option>
                    <option value="pending">pending</option>
                    <option value="future">future</option>
                  </select>
                </div>
              </div>
            )}
            {dw.source === 'remote' && (
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                <div>
                  <label className="field-label" htmlFor="dw-endpoint">Endpoint</label>
                  <input id="dw-endpoint" ref={(el) => (fieldRefs.current.endpoint = el)} className="input gfw-mono" value={dw.endpoint} onChange={(e) => commit((p) => (p.endpoint = e.target.value), 'endpoint')} placeholder="https://api.example.com/stats" />
                </div>
                <div>
                  <label className="field-label" htmlFor="dw-cache">Cache (minutes)</label>
                  <input id="dw-cache" ref={(el) => (fieldRefs.current.cacheMinutes = el)} className="input gfw-mono" value={dw.cacheMinutes} onChange={(e) => commit((p) => (p.cacheMinutes = e.target.value), 'cacheMinutes')} placeholder="15" />
                </div>
              </div>
            )}
          </div>

          <div className="field-card" ref={(el) => (fieldRefs.current.removeWidgets = el as unknown as HTMLElement)}>
            <div className="field-card-header">
              <div className="field-card-title">Clear core widgets</div>
              <div className="field-card-desc">{removeNote}</div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {CORE_WIDGETS.map(([id, label]) => (
                <button key={id} type="button" onClick={() => toggleRemoved(id)} className={`chip${(dw.removeWidgets || []).includes(id) ? ' is-active' : ''}`} style={(dw.removeWidgets || []).includes(id) ? { borderColor: '#B91C1C', background: '#FBEBEB', color: '#B91C1C' } : undefined}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="toggle-card">
            <div className="toggle-card-title">Extras</div>
            <ToggleRow
              label="Capability gate"
              help="A current_user_can() check before the widget registers at all."
              checked={dw.capGate}
              onChange={(v) => commit((p) => (p.capGate = v))}
            />
            <ToggleRow
              label="Configure form"
              help="The Configure link with a nonced save handler."
              checked={dw.configCallback}
              onChange={(v) => commit((p) => (p.configCallback = v))}
            />
            <ToggleRow
              label="Force to the top"
              help="Rewrites $wp_meta_boxes so this box comes first for everyone."
              checked={dw.forceTop}
              onChange={(v) => commit((p) => (p.forceTop = v))}
              toggleRef={(el) => (fieldRefs.current.forceTop = el)}
            />
            <ToggleRow
              label="Network dashboard"
              help="Registers on wp_network_dashboard_setup instead of the site dashboard."
              checked={dw.network}
              onChange={(v) => commit((p) => (p.network = v))}
            />
          </div>
        </div>
      }
      code={code}
      filename={fileName}
      editor={{ canUndo, canRedo, onUndo: undo, onRedo: redo, onNew: reset, savedLabel }}
      issues={issues}
      onFix={fix}
      onFocusField={focusField}
      outputModes={OUTPUT_MODES}
      activeOutputMode={outputMode}
      onOutputModeChange={(id) => setOutputMode(id as OutputMode)}
      secondaryTab={{
        label: 'Preview',
        content: (
          <div style={{ background: '#F0F0F1', margin: '-14px -16px -18px', padding: '16px 18px 40px' }}>
            <div style={{ fontSize: 10.5, color: '#787C82', marginBottom: 10 }}>{screenNote}</div>
            <div style={{ background: '#fff', border: '1px solid #C3C4C7', borderRadius: 2, marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 12px', borderBottom: '1px solid #F0F0F1' }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#1D2327' }}>{dw.title || 'Widget title'}</span>
                {dw.configCallback && <span style={{ fontSize: 13, color: '#2271B1' }}>Configure</span>}
              </div>
              <div style={{ padding: 12 }}>
                {dw.source === 'static' && <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: '#2C3338' }}>{dw.body}</p>}
                {dw.source === 'query' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {previewRows.map((pr, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 13, borderBottom: '1px solid #F0F0F1', paddingBottom: 6 }}>
                        <span style={{ color: '#2271B1' }}>{pr.title}</span>
                        <span style={{ color: '#646970', whiteSpace: 'nowrap' }}>{pr.date}</span>
                      </div>
                    ))}
                  </div>
                )}
                {dw.source === 'remote' && (
                  <>
                    <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
                      {PREVIEW_STATS.map((ps) => (
                        <div key={ps.label}>
                          <div style={{ fontSize: 20, fontWeight: 600, color: '#1D2327' }}>{ps.value}</div>
                          <div style={{ fontSize: 12, color: '#646970' }}>{ps.label}</div>
                        </div>
                      ))}
                    </div>
                    <p style={{ margin: '10px 0 0', fontSize: 12, color: '#787C82' }}>{cacheNote}</p>
                  </>
                )}
              </div>
            </div>
            {previewCoreBoxes.map((pb) => (
              <div key={pb.id} style={{ background: '#fff', border: '1px solid #C3C4C7', borderRadius: 2, marginBottom: 8, opacity: pb.gone ? 0.4 : 1 }}>
                <div style={{ padding: '8px 12px', borderBottom: '1px solid #F0F0F1', display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#1D2327', textDecoration: pb.gone ? 'line-through' : 'none' }}>{pb.label}</span>
                  <span style={{ fontSize: 11, color: '#787C82' }}>{pb.gone ? 'removed' : ''}</span>
                </div>
              </div>
            ))}
          </div>
        ),
      }}
      extraSecondaryTabs={[
        {
          label: 'Reference',
          content: (
            <div>
              <div className="gfw-mono" style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--gfw-text-strong)', marginBottom: 4 }}>wp_add_dashboard_widget()</div>
              <div style={{ fontSize: 12, color: 'var(--gfw-text-mutest)', marginBottom: 14 }}>Called on wp_dashboard_setup</div>
              <pre className="gfw-mono" style={{ border: '1px solid var(--gfw-border)', borderRadius: 7, padding: '12px 14px', background: 'var(--gfw-surface-muted)', fontSize: 12, lineHeight: 1.6, color: 'var(--gfw-text-strong)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginBottom: 18 }}>
                {REF_SIGNATURE}
              </pre>

              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>Arguments</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 18 }}>
                {REF_ARGS.map((ra) => (
                  <div key={ra.name} style={{ borderBottom: '1px solid #F0ECE4', paddingBottom: 9 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                      <span className="gfw-mono" style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--gfw-text-strong)' }}>{ra.name}</span>
                      <span className="type-badge">{ra.type}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--gfw-text-body)', lineHeight: 1.5, marginTop: 4 }}>{ra.description}</div>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>Core widget ids</div>
              <pre className="gfw-mono" style={{ border: '1px solid var(--gfw-border)', borderRadius: 7, padding: '12px 14px', background: 'var(--gfw-surface-muted)', fontSize: 11.5, lineHeight: 1.6, color: 'var(--gfw-text-strong)', whiteSpace: 'pre-wrap', marginBottom: 18 }}>
                {refCoreIds}
              </pre>

              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>Ordering</div>
              <div style={{ fontSize: 12.5, color: 'var(--gfw-text-body)', lineHeight: 1.65 }}>
                Dashboard order is per user: once someone drags a box, their own arrangement wins and your priority is ignored. Forcing position means rewriting $wp_meta_boxes on every load — visible in the generated code if you turn it on, and worth avoiding unless the client asked.
              </div>
            </div>
          ),
        },
      ]}
    />
  );
}
