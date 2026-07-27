import { useMemo, useRef, useState } from 'react';
import { GeneratorShell } from '../../components/generator/GeneratorShell';
import { useEditorState } from '../../lib/useEditorState';
import {
  CORE_BUTTONS,
  POST_TYPES,
  PRESETS,
  applyFix,
  buildCode,
  derive,
  freshProject,
  validate,
  type ButtonType,
  type OutputMode,
  type Quicktags,
} from '../../generators/quicktags';

const ALL_MODES: { id: OutputMode; label: string }[] = [
  { id: 'snippet', label: 'Snippet' },
  { id: 'functions', label: 'functions.php' },
  { id: 'plugin', label: 'Plugin file' },
  { id: 'js', label: 'quicktags.js' },
];

const REF_SIGNATURE = "QTags.addButton(\n\tid,          // 'acme_lead'\n\tdisplay,     // 'lead'\n\targ1,        // opening tag, or a callback function\n\targ2,        // closing tag, ignored for callbacks\n\taccess_key,  // single character, alt+shift+key\n\ttitle,       // tooltip\n\tpriority,    // core uses 10..200 in tens\n\tinstance     // '' for every editor, or 'content'\n);";
const REF_ARGS: { name: string; type: string; description: string }[] = [
  { name: 'id', type: 'string', description: 'Becomes qt_{editor}_{id} in the DOM. Reusing a core id replaces that button instead of adding one.' },
  { name: 'display', type: 'string', description: 'The visible label. Short — the strip wraps quickly on narrow screens.' },
  { name: 'arg1', type: 'string|fn', description: 'Opening tag, or a function ( element, canvas, editorId ) for custom behaviour.' },
  { name: 'arg2', type: 'string', description: 'Closing tag. Leave empty for a one-shot insert; the button then never toggles.' },
  { name: 'access_key', type: 'string', description: 'One character, fired with alt+shift. Core has already claimed b, i, a, q, d, s, m, u, o, l, c and t.' },
  { name: 'title', type: 'string', description: 'The title attribute on the button, shown as a tooltip.' },
  { name: 'priority', type: 'int', description: 'Sort order. 1–9 lands before bold, 205+ after the close button.' },
  { name: 'instance', type: 'string', description: 'Restricts the button to one editor — content, excerpt, comment. Empty means all of them.' },
];

function padTo(s: string, w: number): string {
  return s + ' '.repeat(Math.max(0, w - s.length));
}

const refCoreButtons = CORE_BUTTONS.map((b) => padTo(b[0], 10) + padTo(b[1] ? `alt+shift+${b[1]}` : '—', 16) + b[3]).join('\n');

export function QuicktagsGenerator() {
  const { state: qt, commit, undo, redo, reset, canUndo, canRedo, savedLabel } = useEditorState<Quicktags>('quicktags-generator-v1', freshProject);
  const [outputMode, setOutputMode] = useState<OutputMode>('plugin');
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});

  const d = useMemo(() => derive(qt), [qt]);
  const modes = qt.delivery === 'file' ? ALL_MODES : ALL_MODES.filter((m) => m.id !== 'js');
  const activeMode: OutputMode = qt.delivery !== 'file' && outputMode === 'js' ? 'plugin' : outputMode;
  const code = useMemo(() => buildCode(qt, activeMode), [qt, activeMode]);
  const issues = useMemo(() => validate(qt), [qt]);
  const fileName = activeMode === 'js' ? 'quicktags.js' : (d.pre || 'acme').replace(/_/g, '-') + '-quicktags.php';

  function focusField(id: string) {
    fieldRefs.current[id]?.focus();
  }
  function fix(kind: string) {
    commit((draft) => Object.assign(draft, applyFix(draft, kind)));
  }
  function togglePostType(p: string) {
    commit((pr) => {
      pr.postTypes = pr.postTypes || [];
      const i = pr.postTypes.indexOf(p);
      if (i >= 0) pr.postTypes.splice(i, 1);
      else pr.postTypes.push(p);
    });
  }
  function toggleCore(id: string) {
    commit((p) => {
      p.removedCore = p.removedCore || [];
      const i = p.removedCore.indexOf(id);
      if (i >= 0) p.removedCore.splice(i, 1);
      else p.removedCore.push(id);
    });
  }
  function addButton() {
    commit((p) => {
      p.buttons = p.buttons || [];
      const n = p.buttons.length + 1;
      p.buttons.push({ label: 'btn' + n, id: 'btn_' + n, type: 'wrap', open: '<span>', close: '</span>', accessKey: '', priority: String(200 + n * 5), title: '' });
    });
  }
  function addPreset(i: number) {
    commit((p) => {
      p.buttons = (p.buttons || []).concat([JSON.parse(JSON.stringify(PRESETS[i].b))]);
    });
  }

  const buttonsNote = `${d.buttons.length} ${d.buttons.length === 1 ? 'button' : 'buttons'}`;
  const coreNote = d.prunes.length ? `${d.prunes.length} removed` : 'all kept';

  return (
    <GeneratorShell
      category="admin"
      title="Quicktags Generator"
      description={<>Custom buttons for the Text tab of the classic editor, plus which core buttons to drop through the quicktags_settings filter.</>}
      form={
        <div>
          <div className="field-card field-card-primary">
            <div className="field-card-title">Where the buttons load</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label className="field-label" htmlFor="qt-delivery">How the JS loads</label>
                <select
                  id="qt-delivery"
                  className="select"
                  value={qt.delivery}
                  onChange={(e) => {
                    const v = e.target.value as Quicktags['delivery'];
                    commit((p) => (p.delivery = v));
                    if (v !== 'file' && outputMode === 'js') setOutputMode('plugin');
                  }}
                >
                  <option value="inline">Inline, printed in the admin footer</option>
                  <option value="file">Enqueued from a separate js/quicktags.js</option>
                </select>
              </div>
              <div>
                <label className="field-label" htmlFor="qt-instance">Editor instance</label>
                <input id="qt-instance" className="input gfw-mono" value={qt.instance} onChange={(e) => commit((p) => (p.instance = e.target.value), 'instance')} placeholder="content (blank = every editor)" />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label className="field-label" htmlFor="qt-prefix">Prefix</label>
                <input id="qt-prefix" className="input gfw-mono" value={qt.prefix} onChange={(e) => commit((p) => (p.prefix = e.target.value), 'prefix')} placeholder="acme" />
              </div>
              <div>
                <label className="field-label" htmlFor="qt-td">Text domain</label>
                <input id="qt-td" className="input gfw-mono" value={qt.textDomain} onChange={(e) => commit((p) => (p.textDomain = e.target.value), 'textDomain')} placeholder="acme" />
              </div>
            </div>
            <div className="field-group" ref={(el) => (fieldRefs.current.postTypes = el as unknown as HTMLElement)}>
              <div className="field-label">Limit to post types</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {POST_TYPES.map((p) => (
                  <button key={p} type="button" onClick={() => togglePostType(p)} className={`chip${(qt.postTypes || []).includes(p) ? ' is-active' : ''}`}>
                    {p}
                  </button>
                ))}
              </div>
              <div className="field-hint">{(qt.postTypes || []).length ? 'only on ' + qt.postTypes.join(', ') : 'every editor screen'}</div>
            </div>
          </div>

          <div className="field-card" ref={(el) => (fieldRefs.current.buttons = el as unknown as HTMLElement)}>
            <div className="field-card-header">
              <div className="field-card-title">Your buttons</div>
              <div className="field-card-desc">{buttonsNote}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {qt.buttons.map((b, i) => (
                <div key={i} style={{ border: '1px solid var(--gfw-border)', borderRadius: 7, padding: 11, display: 'flex', flexDirection: 'column', gap: 7 }}>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <input className="input" style={{ flex: 1, minWidth: 100 }} placeholder="lead" value={b.label} onChange={(e) => commit((p) => (p.buttons[i].label = e.target.value))} />
                    <input className="input gfw-mono" style={{ width: 110 }} placeholder="lead" value={b.id} onChange={(e) => commit((p) => (p.buttons[i].id = e.target.value))} />
                    <select className="select" style={{ width: 110 }} value={b.type} onChange={(e) => commit((p) => (p.buttons[i].type = e.target.value as ButtonType))}>
                      <option value="wrap">Wrap selection</option>
                      <option value="insert">Insert</option>
                      <option value="prompt">Prompt</option>
                    </select>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => commit((p) => p.buttons.splice(i, 1))}>Remove</button>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <input
                      className="input gfw-mono"
                      style={{ flex: 1, minWidth: 140 }}
                      placeholder={b.type === 'prompt' ? '<sup>%s</sup>' : b.type === 'insert' ? '[gallery]' : '<p class="lead">'}
                      value={b.open}
                      onChange={(e) => commit((p) => (p.buttons[i].open = e.target.value))}
                    />
                    {b.type === 'wrap' && (
                      <input className="input gfw-mono" style={{ flex: 1, minWidth: 100 }} placeholder="</p>" value={b.close} onChange={(e) => commit((p) => (p.buttons[i].close = e.target.value))} />
                    )}
                    {b.type === 'prompt' && (
                      <input className="input" style={{ flex: 1, minWidth: 140 }} placeholder="Footnote number" value={b.promptLabel || ''} onChange={(e) => commit((p) => (p.buttons[i].promptLabel = e.target.value))} />
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <input className="input gfw-mono" style={{ width: 70 }} placeholder="key" value={b.accessKey} onChange={(e) => commit((p) => (p.buttons[i].accessKey = e.target.value))} />
                    <input className="input gfw-mono" style={{ width: 90 }} placeholder="priority" value={b.priority} onChange={(e) => commit((p) => (p.buttons[i].priority = e.target.value))} />
                    <input className="input" style={{ flex: 1, minWidth: 140 }} placeholder="tooltip title" value={b.title} onChange={(e) => commit((p) => (p.buttons[i].title = e.target.value))} />
                  </div>
                </div>
              ))}
              {qt.buttons.length === 0 && <div className="field-hint">No custom buttons yet.</div>}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={addButton}>Add button</button>
              {PRESETS.map((p, i) => (
                <button key={p.label} type="button" className="btn btn-ghost btn-sm" onClick={() => addPreset(i)}>+ {p.label}</button>
              ))}
            </div>
          </div>

          <div className="field-card" ref={(el) => (fieldRefs.current.removedCore = el as unknown as HTMLElement)}>
            <div className="field-card-header">
              <div className="field-card-title">Core buttons</div>
              <div className="field-card-desc">{coreNote}</div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {CORE_BUTTONS.map(([id, , , help]) => (
                <button
                  key={id}
                  type="button"
                  title={help}
                  onClick={() => toggleCore(id)}
                  className={`chip${(qt.removedCore || []).includes(id) ? ' is-active' : ''}`}
                  style={(qt.removedCore || []).includes(id) ? { borderColor: '#B91C1C', background: '#FBEBEB', color: '#B91C1C' } : undefined}
                >
                  {id}
                </button>
              ))}
            </div>
            <div className="field-hint">Click a button to drop it from the toolbar through the quicktags_settings filter.</div>
          </div>
        </div>
      }
      code={code}
      filename={fileName}
      language={activeMode === 'js' ? 'plain' : 'php'}
      editor={{ canUndo, canRedo, onUndo: undo, onRedo: redo, onNew: reset, savedLabel }}
      issues={issues}
      onFix={fix}
      onFocusField={focusField}
      outputModes={modes}
      activeOutputMode={activeMode}
      onOutputModeChange={(id) => setOutputMode(id as OutputMode)}
      secondaryTab={{
        label: 'Reference',
        content: (
          <div>
            <div className="gfw-mono" style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--gfw-text-strong)', marginBottom: 4 }}>QTags.addButton()</div>
            <div style={{ fontSize: 12, color: 'var(--gfw-text-mutest)', marginBottom: 14 }}>Global from wp-includes/js/quicktags.js</div>
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

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>Core buttons and their keys</div>
            <pre className="gfw-mono" style={{ border: '1px solid var(--gfw-border)', borderRadius: 7, padding: '12px 14px', background: 'var(--gfw-surface-muted)', fontSize: 11.5, lineHeight: 1.7, color: 'var(--gfw-text-strong)', whiteSpace: 'pre-wrap', marginBottom: 18 }}>
              {refCoreButtons}
            </pre>

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>The block editor never sees these</div>
            <div style={{ fontSize: 12.5, color: 'var(--gfw-text-body)', lineHeight: 1.65, marginBottom: 18 }}>
              Quicktags are the classic editor's Text tab, the comment reply box, and any wp_editor() field rendered in quicktags mode. If your authors write in the block editor, a custom block or a format is the equivalent — this toolbar will never appear for them.
            </div>

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>Priority decides position</div>
            <div style={{ fontSize: 12.5, color: 'var(--gfw-text-body)', lineHeight: 1.65 }}>
              Core numbers its own buttons 10 through 200 in tens. Anything you register lands between them by number, and equal numbers fall back to registration order. Use 1 to sit before b, 205 to sit after close.
            </div>
          </div>
        ),
      }}
    />
  );
}
