import { useMemo, useState } from 'react';
import { GeneratorShell } from '../../components/generator/GeneratorShell';
import { ToggleRow } from '../../components/ui/Toggle';
import { CheckboxChip } from '../../components/ui/CheckboxChip';
import { RepeatableCard } from '../../components/ui/RepeatableCard';
import { useDragReorder } from '../../lib/dragReorder';
import { useEditorState } from '../../lib/useEditorState';
import { useListOps } from '../../lib/useListOps';
import {
  METHODS,
  PERMISSIONS,
  PERMISSION_NOTES,
  applyFix,
  buildCode,
  cleanRoute,
  clientExamples,
  freshProject,
  sanitizeFor,
  validate,
  type ArgFormat,
  type ArgType,
  type OutputMode,
  type Permission,
  type RestRoute,
} from '../../generators/restRoute';

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

function routeFnPart(r: string): string {
  return cleanRoute(r).replace(/\(\?P<[a-z_]+>[^)]*\)/gi, '').replace(/[^a-z0-9]+/gi, '_').toLowerCase().replace(/^_+|_+$/g, '') || 'route';
}

export function RestRouteGenerator() {
  const { state: rt, commit, undo, redo, reset, canUndo, canRedo, savedLabel } = useEditorState<RestRoute>('rest-route-generator-v1', freshProject);
  const drag = useDragReorder();
  const args = useListOps<RestRoute>(commit)((p) => p.args);
  const [outputMode, setOutputMode] = useState<OutputMode>('snippet');

  const ns = String(rt.namespace || 'myplugin/v1').trim();
  const path = '/wp-json/' + ns + cleanRoute(rt.route);
  const code = useMemo(() => buildCode(rt, outputMode), [rt, outputMode]);
  const issues = useMemo(() => validate(rt), [rt]);
  const client = useMemo(() => clientExamples(rt), [rt]);
  const fileName = (routeFnPart(rt.route) || 'rest').replace(/_/g, '-') + '-route.php';

  function fix(kind: string) {
    commit((draft) => Object.assign(draft, applyFix(draft, kind)));
  }

  return (
    <GeneratorShell
      category="core"
      title="REST Route Generator"
      description={<>Namespaced endpoints with a real args schema, sanitise and validate callbacks, and a permission callback that is never just <span className="gfw-mono" style={{ fontSize: 12 }}>__return_true</span> by accident.</>}
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
        label: 'Calling it',
        content: (
          <>
            <div className="field-label">Endpoint</div>
            <pre className="gfw-mono" style={{ border: '1px solid var(--gfw-border)', borderRadius: 7, padding: '10px 12px', background: 'var(--gfw-surface-muted)', fontSize: 12.5, whiteSpace: 'pre-wrap', wordBreak: 'break-all', marginBottom: 16 }}>{client.endpointFull}</pre>
            <div className="field-label">From the block editor — apiFetch</div>
            <pre className="gfw-mono" style={{ border: '1px solid var(--gfw-border)', borderRadius: 7, padding: '10px 12px', background: 'var(--gfw-surface-muted)', fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginBottom: 16 }}>{client.apiFetchExample}</pre>
            <div className="field-label">Plain fetch with a nonce</div>
            <pre className="gfw-mono" style={{ border: '1px solid var(--gfw-border)', borderRadius: 7, padding: '10px 12px', background: 'var(--gfw-surface-muted)', fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginBottom: 16 }}>{client.fetchExample}</pre>
            <div className="field-label">curl</div>
            <pre className="gfw-mono" style={{ border: '1px solid var(--gfw-border)', borderRadius: 7, padding: '10px 12px', background: 'var(--gfw-surface-muted)', fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{client.curlExample}</pre>
          </>
        ),
      }}
      form={
        <div>
          <div className="field-card field-card-primary">
            <div className="field-card-title">The endpoint</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '14px 16px' }}>
              <div>
                <label className="field-label">Namespace</label>
                <input className="input gfw-mono" value={rt.namespace} onChange={(e) => commit((p) => (p.namespace = e.target.value), 'namespace')} placeholder="myplugin/v1" spellCheck={false} />
              </div>
              <div>
                <label className="field-label">Route</label>
                <input className="input gfw-mono" value={rt.route} onChange={(e) => commit((p) => (p.route = e.target.value), 'route')} placeholder="/items" spellCheck={false} />
              </div>
              <div className="gfw-mono" style={{ gridColumn: '1 / -1', fontSize: 12.5, background: '#fff', border: '1px solid var(--gfw-border)', borderRadius: 6, padding: '9px 11px', wordBreak: 'break-all' }}>
                {path}
              </div>
              <div>
                <label className="field-label">Function prefix</label>
                <input className="input gfw-mono" value={rt.fnPrefix} onChange={(e) => commit((p) => (p.fnPrefix = e.target.value), 'fnPrefix')} placeholder="myplugin" spellCheck={false} />
              </div>
              <div>
                <label className="field-label">Handler style</label>
                <select className="select" value={rt.handlerStyle} onChange={(e) => commit((p) => (p.handlerStyle = e.target.value as RestRoute['handlerStyle']))}>
                  <option value="posts">Return a list of posts</option>
                  <option value="option">Read / write an option</option>
                  <option value="stub">Empty stub — I will fill it in</option>
                </select>
              </div>
            </div>
          </div>

          <div className="field-card">
            <div className="field-card-header">
              <div className="field-card-title">Methods</div>
              <div className="field-card-desc">Each method gets its own callback.</div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {METHODS.map((m) => (
                <CheckboxChip
                  key={m}
                  active={rt.methods.indexOf(m) !== -1}
                  onClick={() => commit((p) => {
                    const i = p.methods.indexOf(m);
                    if (i === -1) p.methods.push(m);
                    else p.methods.splice(i, 1);
                  })}
                >
                  {m}
                </CheckboxChip>
              ))}
            </div>
          </div>

          <div className="field-card">
            <div className="field-card-header">
              <div className="field-card-title">Who can call it</div>
              <div className="field-card-desc">permission_callback is required — omitting it throws a notice.</div>
            </div>
            <select className="select" value={rt.permission} onChange={(e) => commit((p) => (p.permission = e.target.value as Permission))}>
              {PERMISSIONS.map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            {rt.permission === 'capability' && (
              <div style={{ marginTop: 10 }}>
                <label className="field-label">capability</label>
                <input className="input gfw-mono" value={rt.capability} onChange={(e) => commit((p) => (p.capability = e.target.value), 'capability')} placeholder="edit_posts" spellCheck={false} />
              </div>
            )}
            <div className="field-hint">{PERMISSION_NOTES[rt.permission]}</div>
          </div>

          <div className="field-card">
            <div className="field-card-header">
              <div className="field-card-title">Arguments</div>
              <div className="field-card-desc">Becomes the args schema — WordPress validates before your callback runs.</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {rt.args.map((a, i) => {
                const showExtra = a.format === 'enum' || a.format === 'range';
                const san = sanitizeFor(a);
                return (
                  <RepeatableCard
                    key={i}
                    index={i}
                    count={rt.args.length}
                    title={a.name || `Argument ${i + 1}`}
                    subtitle={a.type}
                    drag={drag.bind('args', i, args.reorder)}
                    onMoveUp={() => args.moveUp(i)}
                    onMoveDown={() => args.moveDown(i)}
                    onRemove={() => args.remove(i)}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 9 }}>
                      <div>
                        <label className="field-label" style={{ fontSize: 10.5 }}>name</label>
                        <input className="input gfw-mono" value={a.name} onChange={(e) => commit((p) => (p.args[i].name = e.target.value), 'arg-name-' + i)} placeholder="per_page" spellCheck={false} />
                      </div>
                      <div>
                        <label className="field-label" style={{ fontSize: 10.5 }}>type</label>
                        <select className="select" value={a.type} onChange={(e) => commit((p) => (p.args[i].type = e.target.value as ArgType))}>
                          <option value="string">string</option>
                          <option value="integer">integer</option>
                          <option value="number">number</option>
                          <option value="boolean">boolean</option>
                          <option value="array">array</option>
                          <option value="object">object</option>
                        </select>
                      </div>
                      <div>
                        <label className="field-label" style={{ fontSize: 10.5 }}>format / enum</label>
                        <select className="select" value={a.format} onChange={(e) => commit((p) => (p.args[i].format = e.target.value as ArgFormat))}>
                          <option value="">none</option>
                          <option value="email">email</option>
                          <option value="uri">uri</option>
                          <option value="date-time">date-time</option>
                          <option value="ip">ip</option>
                          <option value="enum">enum list</option>
                          <option value="range">min / max</option>
                        </select>
                      </div>
                      {showExtra && (
                        <div>
                          <label className="field-label" style={{ fontSize: 10.5 }}>{a.format === 'enum' ? 'allowed values' : 'min, max'}</label>
                          <input className="input gfw-mono" value={a.extra} onChange={(e) => commit((p) => (p.args[i].extra = e.target.value), 'arg-extra-' + i)} placeholder={a.format === 'enum' ? 'draft, publish' : '1, 50'} spellCheck={false} />
                        </div>
                      )}
                      <div>
                        <label className="field-label" style={{ fontSize: 10.5 }}>default</label>
                        <input className="input gfw-mono" value={a.def} onChange={(e) => commit((p) => (p.args[i].def = e.target.value), 'arg-def-' + i)} placeholder="10" spellCheck={false} />
                      </div>
                      <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 9, alignItems: 'flex-end' }}>
                        <div style={{ flex: 1 }}>
                          <label className="field-label" style={{ fontSize: 10.5 }}>description</label>
                          <input className="input" value={a.description} onChange={(e) => commit((p) => (p.args[i].description = e.target.value), 'arg-desc-' + i)} placeholder="How many items to return." />
                        </div>
                        <CheckboxChip active={a.required} onClick={() => commit((p) => (p.args[i].required = !p.args[i].required))}>required</CheckboxChip>
                      </div>
                    </div>
                    <div className="gfw-mono" style={{ fontSize: 11, color: 'var(--gfw-text-soft)' }}>
                      {(san ? san + '() → ' : '') + 'rest_validate_request_arg()' + (a.required ? ' · required' : '') + (a.format === 'enum' ? ' · enum' : a.format === 'range' ? ' · min/max' : a.format ? ' · format ' + a.format : '')}
                    </div>
                  </RepeatableCard>
                );
              })}
              <button
                type="button"
                className="btn btn-ghost btn-sm repeatable-add"
                style={{ alignSelf: 'flex-start' }}
                onClick={() => commit((p) => { p.args.push({ name: '', type: 'string', format: '', extra: '', def: '', required: false, description: '' }); })}
              >
                + Argument
              </button>
            </div>
          </div>

          <div className="toggle-card">
            <div className="toggle-card-title">Extras</div>
            <ToggleRow
              label="Also register a REST field"
              help="Adds a register_rest_field() example that extends the core post response."
              checked={rt.registerField}
              onChange={(v) => commit((p) => (p.registerField = v))}
            />
            <ToggleRow
              label="Send cache headers"
              help="Adds a rest_post_dispatch filter with Cache-Control. Public GET routes only."
              checked={rt.cacheHeaders}
              onChange={(v) => commit((p) => (p.cacheHeaders = v))}
            />
          </div>
        </div>
      }
    />
  );
}
