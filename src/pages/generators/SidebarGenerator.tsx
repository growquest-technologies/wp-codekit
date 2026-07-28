import { useMemo, useRef, useState } from 'react';
import { GeneratorShell } from '../../components/generator/GeneratorShell';
import { CopyableCodePreview } from '../../components/generator/CopyableCodePreview';
import { RepeatableCard } from '../../components/ui/RepeatableCard';
import { Toggle, ToggleRow } from '../../components/ui/Toggle';
import { useDragReorder } from '../../lib/dragReorder';
import { useEditorState } from '../../lib/useEditorState';
import { useListOps } from '../../lib/useListOps';
import {
  MARKUP_KEYS,
  PRESETS,
  START_PRESETS,
  applyFix,
  applyPreset,
  buildCode,
  buildTemplate,
  derive,
  freshProject,
  validate,
  type MarkupSet,
  type OutputMode,
  type Sidebar,
} from '../../generators/sidebar';
import { escPhp } from '../../lib/codegen';

const OUTPUT_MODES: { id: OutputMode; label: string }[] = [
  { id: 'snippet', label: 'Snippet' },
  { id: 'functions', label: 'functions.php' },
  { id: 'plugin', label: 'Plugin file' },
];

const STYLE_CHIPS: { id: Sidebar['codeStyle']; label: string }[] = [
  { id: 'loop', label: 'Array + loop' },
  { id: 'single', label: 'One call each' },
  { id: 'class', label: 'Class' },
];

function padTo(s: string, w: number): string {
  return s + ' '.repeat(Math.max(0, w - s.length));
}

const REF_ARGS = [
  { name: 'id', type: 'string', description: 'The handle you pass to dynamic_sidebar() and is_active_sidebar(). Run through sanitize_title(), so keep it lowercase with dashes and never change it after launch — widget assignments are stored against it.' },
  { name: 'name', type: 'string', description: 'What the site owner sees under Appearance → Widgets. Translate it.' },
  { name: 'description', type: 'string', description: 'One line of guidance shown under the name. Skipped by most themes and missed by every client.' },
  { name: 'class', type: 'string', description: "Added to the widget's class list. Rarely useful — %2$s already carries widget_text, widget_nav_menu and friends." },
  { name: 'before_widget / after_widget', type: 'string', description: 'The wrapper around each widget. before_widget goes through sprintf(), so %1$s becomes the widget id and %2$s the widget class.' },
  { name: 'before_title / after_title', type: 'string', description: 'The wrapper around the widget title. A heading tag here is what makes a sidebar navigable by screen reader.' },
];

export function SidebarGenerator() {
  const { state: sb, commit, undo, redo, reset, canUndo, canRedo, savedLabel } = useEditorState<Sidebar>('sidebar-generator-v1', freshProject);
  const drag = useDragReorder();
  const areas = useListOps<Sidebar>(commit)((p) => p.areas);
  const [outputMode, setOutputMode] = useState<OutputMode>('snippet');
  const [templateArea, setTemplateArea] = useState('');
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});

  const d = useMemo(() => derive(sb), [sb]);
  const code = useMemo(() => buildCode(sb, outputMode), [sb, outputMode]);
  const issues = useMemo(() => validate(sb), [sb]);
  const fileName = (sb.prefix.replace(/[^a-z0-9_]+/gi, '_').toLowerCase() || 'theme').replace(/_/g, '-') + '-widget-areas.php';

  const activeArea = d.areas.find((a) => a.id === templateArea) || d.areas[0] || null;
  const templateCode = useMemo(() => buildTemplate(sb, activeArea), [sb, activeArea]);

  const refSignature = `register_sidebar(\n\tarray(\n\t\t'id'            => '${activeArea ? activeArea.id : 'sidebar-1'}',\n\t\t'name'          => __( '${activeArea ? escPhp(activeArea.name) : 'Sidebar'}', '${d.td}' ),\n\t\t'description'   => '',\n\t\t'before_widget' => '',\n\t\t'after_widget'  => '',\n\t\t'before_title'  => '',\n\t\t'after_title'   => '',\n\t)\n);`;
  const refRegistered = d.areas.length
    ? d.areas.map((a) => padTo(a.id, 16) + ' ' + a.name).join('\n')
    : 'Nothing registered yet.';

  function focusField(id: string) {
    fieldRefs.current[id]?.focus();
  }
  function fix(kind: string) {
    commit((draft) => Object.assign(draft, applyFix(draft, kind)));
  }

  function addArea(preset?: [string, { id: string; name: string; description: string }[]]) {
    if (preset) {
      commit((p) => { p.areas = preset[1].map((a) => ({ id: a.id, name: a.name, description: a.description })); });
      return;
    }
  }

  function setAreaMarkup(i: number, key: keyof MarkupSet, value: string) {
    commit((p) => {
      p.areas[i].markup = { ...p.markup, ...(p.areas[i].markup || {}) };
      p.areas[i].markup![key] = value;
    }, `area-markup-${i}-${key}`);
  }

  return (
    <GeneratorShell
      category="design"
      title="Sidebar Generator"
      description="Widget areas with the wrapper markup your theme actually needs — placeholders intact, tags closed, and the template call that renders them."
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
        label: 'Template',
        content: (
          <>
            <div style={{ display: 'flex', gap: 7, marginBottom: 14, flexWrap: 'wrap' }}>
              {d.areas.map((a) => (
                <button key={a.id} onClick={() => setTemplateArea(a.id)} className={`chip gfw-mono${(activeArea && activeArea.id === a.id) ? ' is-active' : ''}`}>
                  {a.id}
                </button>
              ))}
            </div>
            <CopyableCodePreview code={templateCode} filename={activeArea ? activeArea.id + '.php' : 'sidebar.php'} />
          </>
        ),
      }}
      extraSecondaryTabs={[
        {
          label: 'Reference',
          content: (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <div className="gfw-mono" style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 4 }}>register_sidebar()</div>
              <div style={{ fontSize: 12, color: 'var(--gfw-text-mutest)', marginBottom: 14 }}>Runs on widgets_init — earlier and the Widgets screen never sees it.</div>
              <pre className="gfw-mono" style={{ border: '1px solid var(--gfw-border)', borderRadius: 7, padding: '12px 14px', background: 'var(--gfw-surface-sunken)', fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginBottom: 18 }}>{refSignature}</pre>

              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>Arguments</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 18 }}>
                {REF_ARGS.map((ra) => (
                  <div key={ra.name} style={{ borderBottom: '1px solid var(--gfw-border)', paddingBottom: 9 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                      <span className="gfw-mono" style={{ fontSize: 12.5, fontWeight: 700 }}>{ra.name}</span>
                      <span className="type-badge">{ra.type}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--gfw-text-muted)', lineHeight: 1.5, marginTop: 4 }}>{ra.description}</div>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>The two placeholders</div>
              <div style={{ fontSize: 12.5, color: 'var(--gfw-text-strong)', lineHeight: 1.65, marginBottom: 18 }}>
                before_widget is run through sprintf() with the widget's id and its class name. Drop <span className="gfw-mono" style={{ background: '#F3F1EC', padding: '1px 4px', borderRadius: 3 }}>%1$s</span> where the id goes and <span className="gfw-mono" style={{ background: '#F3F1EC', padding: '1px 4px', borderRadius: 3 }}>%2$s</span> where the class goes. Lose them and every widget renders with no id and no widget_* class — CSS and JS that target widgets both stop working.
              </div>

              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>Registered areas</div>
              <pre className="gfw-mono" style={{ border: '1px solid var(--gfw-border)', borderRadius: 7, padding: '12px 14px', background: 'var(--gfw-surface-sunken)', fontSize: 11.5, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginBottom: 18 }}>{refRegistered}</pre>

              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>Block themes</div>
              <div style={{ fontSize: 12.5, color: 'var(--gfw-text-strong)', lineHeight: 1.65 }}>A block theme has no sidebar.php. Widget areas still register and still appear under Appearance → Widgets, but a block theme normally uses a template part with a Widget Area block instead. Classic themes, child themes and plugins are where this code belongs.</div>
            </div>
          ),
        },
      ]}
      form={
        <div>
          <div className="field-card field-card-primary">
            <div className="field-card-title">Widget areas</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 10 }}>
              {START_PRESETS.map(([label, areas]) => (
                <button key={label} type="button" onClick={() => addArea([label, areas])} className="chip">
                  {label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {sb.areas.map((a, i) => (
                <RepeatableCard
                  key={i}
                  index={i}
                  count={sb.areas.length}
                  title={a.name || 'Untitled area'}
                  subtitle={a.id.trim() || 'widget-area'}
                  drag={drag.bind('areas', i, areas.reorder)}
                  onMoveUp={() => areas.moveUp(i)}
                  onMoveDown={() => areas.moveDown(i)}
                  onRemove={() => areas.remove(i)}
                >
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                      className="input"
                      style={{ flex: '1.2 1 120px' }}
                      placeholder="Footer 1"
                      value={a.name}
                      onChange={(e) => commit((p) => (p.areas[i].name = e.target.value), `area-name-${i}`)}
                    />
                    <input
                      className="input gfw-mono"
                      style={{ width: 130 }}
                      spellCheck={false}
                      placeholder="footer-1"
                      value={a.id}
                      onChange={(e) => commit((p) => (p.areas[i].id = e.target.value), `area-id-${i}`)}
                    />
                    <input
                      className="input"
                      style={{ flex: '1.6 1 150px' }}
                      placeholder="Shown in the first footer column."
                      value={a.description}
                      onChange={(e) => commit((p) => (p.areas[i].description = e.target.value), `area-desc-${i}`)}
                    />
                  </div>
                  {!sb.sharedMarkup && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8, paddingTop: 9, borderTop: '1px dashed var(--gfw-border)' }}>
                      {MARKUP_KEYS.map(([key, label]) => (
                        <div key={key}>
                          <label className="field-label gfw-mono" style={{ fontSize: 10.5 }}>{label}</label>
                          <input
                            className="input gfw-mono"
                            style={{ fontSize: 11.5 }}
                            spellCheck={false}
                            value={(a.markup ? a.markup[key] : sb.markup[key]) ?? ''}
                            onChange={(e) => setAreaMarkup(i, key, e.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </RepeatableCard>
              ))}
              {!sb.areas.length && <div className="field-hint">No widget areas — the Widgets screen will show nothing to drop into.</div>}
            </div>
            <button type="button" onClick={() => commit((p) => p.areas.push({ id: 'widget-area-' + (p.areas.length + 1), name: 'Widget Area ' + (p.areas.length + 1), description: '' }))} className="btn btn-ghost btn-sm repeatable-add" style={{ marginTop: 11 }}>
              Add widget area
            </button>
          </div>

          <div className="field-card">
            <div className="field-card-title">Wrapper markup</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {Object.keys(PRESETS).map((k) => (
                <button key={k} type="button" onClick={() => commit((draft) => Object.assign(draft, applyPreset(draft, k)))} className={`chip${sb.preset === k ? ' is-active' : ''}`}>
                  {PRESETS[k].label}
                </button>
              ))}
            </div>
            {sb.sharedMarkup && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 11 }}>
                {MARKUP_KEYS.map(([key, label, help]) => (
                  <div key={key}>
                    <label className="field-label gfw-mono" style={{ fontSize: 11 }}>{label}</label>
                    <input
                      className="input gfw-mono"
                      spellCheck={false}
                      value={sb.markup[key]}
                      onChange={(e) => commit((p) => { p.markup[key] = e.target.value; p.preset = 'custom'; }, `markup-${key}`)}
                    />
                    <div className="field-hint">{help}</div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--gfw-border)' }}>
              <Toggle
                checked={sb.sharedMarkup}
                onChange={(v) => commit((p) => (p.sharedMarkup = v))}
                ariaLabel="One set of markup for every area"
              />
              <span style={{ fontSize: 13.5, fontWeight: 650, color: 'var(--gfw-text-strong)' }}>One set of markup for every area</span>
            </div>
            <div className="field-hint">Off lets each area carry its own wrappers — useful when the footer columns and the main sidebar look nothing alike.</div>
          </div>

          <div className="field-card">
            <div className="field-card-title">Naming &amp; shape</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>function prefix</label>
                <input className="input gfw-mono" value={sb.prefix} onChange={(e) => commit((p) => (p.prefix = e.target.value), 'prefix')} />
              </div>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>text domain</label>
                <input className="input gfw-mono" value={sb.textDomain} onChange={(e) => commit((p) => (p.textDomain = e.target.value), 'textDomain')} />
              </div>
            </div>
            <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span className="field-label" style={{ margin: 0 }}>Shape</span>
              {STYLE_CHIPS.map((c) => (
                <button key={c.id} type="button" onClick={() => commit((p) => (p.codeStyle = c.id))} className={`chip${sb.codeStyle === c.id ? ' is-active' : ''}`}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="toggle-card">
            <div className="toggle-card-title">Template output</div>
            <ToggleRow
              label="is_active_sidebar() guard"
              checked={sb.activeGuard}
              onChange={(v) => commit((p) => (p.activeGuard = v))}
            />
            <ToggleRow
              label="Fallback content"
              checked={sb.fallback}
              onChange={(v) => commit((p) => (p.fallback = v))}
            />
            <ToggleRow
              label="get_sidebar() note"
              checked={sb.getSidebar}
              onChange={(v) => commit((p) => (p.getSidebar = v))}
            />
          </div>
        </div>
      }
    />
  );
}
