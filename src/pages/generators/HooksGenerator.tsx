import { useMemo, useRef, useState } from 'react';
import { GeneratorShell } from '../../components/generator/GeneratorShell';
import { ToggleRow } from '../../components/ui/Toggle';
import { useEditorState } from '../../lib/useEditorState';
import {
  HOOKS,
  PRIORITY_NOTES,
  SUGGESTED,
  activeParams,
  applyFix,
  buildCode,
  freshProject,
  maxArgsFor,
  onHookNameChange,
  pickHook,
  referenceInfo,
  setAcceptedArgs,
  setKind,
  validate,
  type Hook,
  type OutputMode,
} from '../../generators/hooks';

const OUTPUT_MODES: { id: OutputMode; label: string }[] = [
  { id: 'snippet', label: 'Snippet' },
  { id: 'functions', label: 'functions.php' },
  { id: 'plugin', label: 'Plugin file' },
];

const OUTPUT_HINTS: Record<OutputMode, string> = {
  snippet: 'Paste into a plugin, an mu-plugin, or a functionality plugin.',
  functions: "Ready for your theme's functions.php.",
  plugin: 'A complete single-file plugin with a header.',
};

export function HooksGenerator() {
  const { state: hk, commit, undo, redo, reset, canUndo, canRedo, savedLabel } = useEditorState<Hook>('hooks-generator-v1', freshProject);
  const [outputMode, setOutputMode] = useState<OutputMode>('snippet');
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});

  const known = HOOKS[String(hk.hook || '').trim()];
  const params = activeParams(hk);
  const isFilter = hk.kind === 'filter';
  const maxArgs = maxArgsFor(hk);
  const code = useMemo(() => buildCode(hk, outputMode), [hk, outputMode]);
  const issues = useMemo(() => validate(hk), [hk]);
  const ref = useMemo(() => referenceInfo(hk), [hk]);
  const fileName = (hk.hook ? hk.hook.toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '') : 'hook').replace(/_/g, '-') + '.php';

  function focusField(id: string) {
    fieldRefs.current[id]?.focus();
  }
  function fix(kind: string) {
    commit((draft) => Object.assign(draft, applyFix(draft, kind)));
  }

  return (
    <GeneratorShell
      category="core"
      title="Hooks Generator"
      description="Pick a hook and get a callback with the right signature — the parameter count, the priority and, for filters, the return value that stops you white-screening the site."
      code={code}
      filename={fileName}
      editor={{ canUndo, canRedo, onUndo: undo, onRedo: redo, onNew: reset, savedLabel }}
      issues={issues}
      onFix={fix}
      onFocusField={focusField}
      outputModes={OUTPUT_MODES}
      activeOutputMode={outputMode}
      onOutputModeChange={(id) => setOutputMode(id as OutputMode)}
      outputHint={OUTPUT_HINTS[outputMode]}
      secondaryTab={{
        label: 'Reference',
        content: (
          <>
            <div style={{ fontFamily: 'var(--gfw-font-mono)', fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{hk.hook}</div>
            <div style={{ fontSize: 12, color: 'var(--gfw-text-mutest)', marginBottom: 10 }}>{ref.kindLabel}</div>
            <div style={{ fontSize: 12.5, lineHeight: 1.6, marginBottom: 12 }}>{ref.description}</div>
            <div className="field-label">Signature</div>
            <pre className="gfw-mono" style={{ border: '1px solid var(--gfw-border)', borderRadius: 7, padding: '10px 12px', background: 'var(--gfw-surface-muted)', fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginBottom: 12 }}>{ref.signature}</pre>
            <div className="field-label">Removing it later</div>
            <pre className="gfw-mono" style={{ border: '1px solid var(--gfw-border)', borderRadius: 7, padding: '10px 12px', background: 'var(--gfw-surface-muted)', fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{ref.removeSnippet}</pre>
          </>
        ),
      }}
      form={
        <div>
          <div className="field-card field-card-primary">
            <div className="field-card-title">The hook</div>
            <label className="field-label" htmlFor="hk-hook">Hook name</label>
            <input
              id="hk-hook"
              ref={(el) => (fieldRefs.current.hook = el)}
              className="input gfw-mono"
              value={hk.hook}
              onChange={(e) => commit((draft) => Object.assign(draft, onHookNameChange(draft, e.target.value)), 'hook')}
              placeholder="the_content"
              spellCheck={false}
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 9 }}>
              {SUGGESTED.map((h) => (
                <button key={h} type="button" onClick={() => commit((draft) => Object.assign(draft, pickHook(draft, h)))} className={`chip gfw-mono${hk.hook === h ? ' is-active' : ''}`}>
                  {h}
                </button>
              ))}
            </div>
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)' }}>Kind</span>
              {(['action', 'filter'] as const).map((k) => (
                <button key={k} type="button" onClick={() => commit((draft) => Object.assign(draft, setKind(draft, k)))} className={`chip gfw-mono${hk.kind === k ? ' is-active' : ''}`}>
                  {k}
                </button>
              ))}
              {known && <span style={{ fontSize: 11.5, color: 'var(--gfw-success)', fontWeight: 600 }}>Known core hook — signature filled in below</span>}
            </div>
            <div className="field-hint">{known ? known.desc : 'Not in the reference — the generator will still build a correctly shaped callback, but check the parameter list in the codex.'}</div>
          </div>

          <div className="field-card">
            <div className="field-card-title">Callback</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="field-label">Function name</label>
                <input
                  className="input gfw-mono"
                  value={hk.fnName}
                  onChange={(e) => commit((p) => (p.fnName = e.target.value), 'fnName')}
                  placeholder={(hk.hook || 'hook') + '_callback'}
                  spellCheck={false}
                />
              </div>
              <div>
                <label className="field-label">Priority</label>
                <input className="input gfw-mono" value={hk.priority} onChange={(e) => commit((p) => (p.priority = e.target.value), 'priority')} placeholder="10" spellCheck={false} />
                <div className="field-hint">{PRIORITY_NOTES[String(hk.priority)] || (parseInt(hk.priority, 10) < 10 ? 'Earlier than the default.' : 'Later than the default.')}</div>
              </div>
              <div>
                <label className="field-label">Accepted args</label>
                <select className="select" value={hk.acceptedArgs} onChange={(e) => commit((draft) => Object.assign(draft, setAcceptedArgs(draft, e.target.value)))}>
                  {Array.from({ length: maxArgs + 1 }).map((_, i) => (
                    <option key={i} value={String(i)}>{i === 0 ? '0 — none' : i + (i === 1 ? ' argument' : ' arguments')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">Style</label>
                <select className="select" value={hk.callbackStyle} onChange={(e) => commit((p) => (p.callbackStyle = e.target.value as Hook['callbackStyle']))}>
                  <option value="named">Named function</option>
                  <option value="closure">Anonymous closure</option>
                  <option value="method">Class method</option>
                </select>
              </div>
              {hk.callbackStyle === 'method' && (
                <div>
                  <label className="field-label">Class name</label>
                  <input className="input gfw-mono" value={hk.className} onChange={(e) => commit((p) => (p.className = e.target.value), 'className')} placeholder="My_Plugin" spellCheck={false} />
                </div>
              )}
            </div>

            <div style={{ marginTop: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span className="field-label" style={{ marginBottom: 0 }}>Parameters</span>
                <span style={{ fontSize: 11.5, color: 'var(--gfw-text-mutest)' }}>{params.length ? params.length + ' passed to the callback' : 'None passed'}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {params.map((p, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className="gfw-mono" style={{ width: 22, flexShrink: 0, fontSize: 11.5, color: 'var(--gfw-text-faint)', textAlign: 'right' }}>{i + 1}</span>
                    <input className="input gfw-mono" style={{ flex: 1 }} value={p.name} onChange={(e) => commit((d) => (d.params[i].name = e.target.value), 'param-name-' + i)} placeholder="$value" spellCheck={false} />
                    <input className="input gfw-mono" style={{ width: 110 }} value={p.type} onChange={(e) => commit((d) => (d.params[i].type = e.target.value), 'param-type-' + i)} placeholder="string" spellCheck={false} />
                    <input className="input" style={{ flex: 1.4 }} value={p.description} onChange={(e) => commit((d) => (d.params[i].description = e.target.value), 'param-desc-' + i)} placeholder="What it holds." />
                  </div>
                ))}
                {params.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--gfw-text-mutest)' }}>This callback takes no parameters.</div>}
              </div>
            </div>
          </div>

          <div className="field-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span className="field-card-title" style={{ marginBottom: 0 }}>Body</span>
              <span style={{ fontSize: 11.5, color: 'var(--gfw-text-mutest)' }}>{isFilter ? 'Modify the value, then let the generator return it.' : 'Runs when the hook fires. Nothing is returned.'}</span>
            </div>
            <textarea className="textarea gfw-mono" rows={6} value={hk.body} onChange={(e) => commit((p) => (p.body = e.target.value), 'body')} placeholder="// Your code here." spellCheck={false} />
            {isFilter && (
              <div className="field-hint gfw-mono" style={{ color: 'var(--gfw-success)' }}>
                return {params.length ? params[0].name.replace(/^\$*/, '$') : '$value'}; is appended automatically — a filter that returns nothing wipes the value.
              </div>
            )}
          </div>

          <div className="toggle-card">
            <div className="toggle-card-title">Extras</div>
            <ToggleRow
              label="Include the remove_ call"
              help="Adds a commented remove_action/remove_filter with the matching priority."
              checked={hk.includeRemove}
              onChange={(v) => commit((p) => (p.includeRemove = v))}
            />
            <ToggleRow
              label="Skip in the admin"
              help="Adds an is_admin() early return so the callback only runs on the front end."
              checked={hk.guardAdmin}
              onChange={(v) => commit((p) => (p.guardAdmin = v))}
            />
          </div>
        </div>
      }
    />
  );
}
