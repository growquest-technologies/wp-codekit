import { useMemo, useState } from 'react';
import { GeneratorShell } from '../../components/generator/GeneratorShell';
import { useEditorState } from '../../lib/useEditorState';
import {
  CORE_ITEMS,
  applyFix,
  buildCode,
  derive,
  freshProject,
  validate,
  type AccountEndpoint,
  type ContentType,
  type OutputMode,
} from '../../generators/wcAccountEndpoint';

const OUTPUT_MODES: { id: OutputMode; label: string }[] = [
  { id: 'snippet', label: 'Snippet' },
  { id: 'functions', label: 'functions.php' },
  { id: 'plugin', label: 'Plugin file' },
];

export function WcAccountEndpointGenerator() {
  const { state: ae, commit, undo, redo, reset, canUndo, canRedo, savedLabel } = useEditorState<AccountEndpoint>('wc-account-endpoint-generator-v1', freshProject);
  const [outputMode, setOutputMode] = useState<OutputMode>('plugin');

  const d = useMemo(() => derive(ae), [ae]);
  const code = useMemo(() => buildCode(ae, outputMode), [ae, outputMode]);
  const issues = useMemo(() => validate(ae), [ae]);
  const fileName = d.slug + '-account-endpoint.php';

  function fix(kind: string) {
    commit((draft) => Object.assign(draft, applyFix(draft, kind)));
  }

  return (
    <GeneratorShell
      category="woocommerce"
      title="My Account Endpoint Generator"
      description="A new tab in the customer's My Account area — the endpoint, the menu entry, the content, and the once-only rewrite-rule flush wired to activation so the tab doesn't 404 on first load."
      code={code}
      filename={fileName}
      editor={{ canUndo, canRedo, onUndo: undo, onRedo: redo, onNew: reset, savedLabel }}
      issues={issues}
      onFix={fix}
      outputModes={OUTPUT_MODES}
      activeOutputMode={outputMode}
      onOutputModeChange={(id) => setOutputMode(id as OutputMode)}
      form={
        <div>
          <div className="field-card field-card-primary">
            <div className="field-card-title">The tab</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label className="field-label">Menu label</label>
                <input className="input" value={ae.menuLabel} onChange={(e) => commit((p) => (p.menuLabel = e.target.value), 'menuLabel')} placeholder="Loyalty Points" />
              </div>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>slug</label>
                <input className="input gfw-mono" value={ae.slug} onChange={(e) => commit((p) => (p.slug = e.target.value), 'slug')} placeholder="loyalty-points" spellCheck={false} />
                <div className="field-hint gfw-mono">/my-account/{d.slug}/</div>
              </div>
            </div>
            <div className="field-group">
              <label className="field-label">Position</label>
              <select className="select" value={ae.insertAfter} onChange={(e) => commit((p) => (p.insertAfter = e.target.value))}>
                {CORE_ITEMS.map(([v, l]) => (
                  <option key={v} value={v}>{v === 'end' ? l : 'After ' + l}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 13 }}>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>function prefix</label>
                <input className="input gfw-mono" value={ae.prefix} onChange={(e) => commit((p) => (p.prefix = e.target.value), 'prefix')} placeholder="acme" />
              </div>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>text domain</label>
                <input className="input gfw-mono" value={ae.textDomain} onChange={(e) => commit((p) => (p.textDomain = e.target.value), 'textDomain')} placeholder="acme" />
              </div>
            </div>
          </div>

          <div className="field-card">
            <div className="field-card-title">Content</div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 11 }}>
              {(['text', 'callback'] as ContentType[]).map((c) => (
                <button key={c} type="button" onClick={() => commit((p) => (p.contentType = c))} className={`chip${ae.contentType === c ? ' is-active' : ''}`}>
                  {c === 'text' ? 'Static text' : 'PHP stub'}
                </button>
              ))}
            </div>
            {ae.contentType === 'text' ? (
              <textarea
                className="input"
                style={{ width: '100%', minHeight: 90, resize: 'vertical', fontFamily: 'inherit' }}
                value={ae.content}
                onChange={(e) => commit((p) => (p.content = e.target.value), 'content')}
                placeholder="You have earned 0 points so far."
              />
            ) : (
              <div className="field-hint">Generates an empty callback with $customer_id already resolved, ready for your own query and markup.</div>
            )}
          </div>
        </div>
      }
    />
  );
}
