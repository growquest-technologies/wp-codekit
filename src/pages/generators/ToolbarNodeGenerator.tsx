import { useMemo, useRef, useState } from 'react';
import { GeneratorShell } from '../../components/generator/GeneratorShell';
import { Toggle } from '../../components/ui/Toggle';
import { useEditorState } from '../../lib/useEditorState';
import {
  CAPS,
  CORE_NODES,
  PARENTS,
  applyFix,
  buildCode,
  derive,
  freshProject,
  validate,
  type ToolbarNode,
  type OutputMode,
} from '../../generators/toolbarNode';
import { escPhp, slugify } from '../../lib/codegen';

const OUTPUT_MODES: { id: OutputMode; label: string }[] = [
  { id: 'snippet', label: 'Snippet' },
  { id: 'functions', label: 'functions.php' },
  { id: 'plugin', label: 'Plugin file' },
];

function padTo(s: string, w: number): string {
  return s + ' '.repeat(Math.max(0, w - s.length));
}

const REF_ARGS = [
  { name: 'id', type: 'string', description: 'Unique across the whole toolbar, not just your plugin. Becomes wp-admin-bar-{id} in the markup.' },
  { name: 'title', type: 'string', description: 'Printed as HTML — the only place to add a count bubble or an icon. Escape anything dynamic.' },
  { name: 'parent', type: 'string', description: 'Another node id. Omit for a top-level item; top-secondary puts it on the right.' },
  { name: 'href', type: 'string', description: 'The link. false renders unclickable text, which is right for a group heading.' },
  { name: 'group', type: 'bool', description: 'Makes the node a container that visually separates its children instead of a link.' },
  { name: 'meta', type: 'array', description: 'html, class, rel, onclick, target, tabindex, title — the tooltip lives in meta title, not the node title.' },
];

const REF_CORE_IDS =
  CORE_NODES.map(([id, help]) => padTo(id, 22) + help).join('\n') +
  '\n' +
  padTo('site-name', 22) + 'The site title menu.\n' +
  padTo('my-account', 22) + 'The Howdy, user menu.\n' +
  padTo('edit', 22) + 'The Edit link on a single view.';

export function ToolbarNodeGenerator() {
  const { state: tb, commit, undo, redo, reset, canUndo, canRedo, savedLabel } = useEditorState<ToolbarNode>('toolbar-node-generator-v1', freshProject);
  const [outputMode, setOutputMode] = useState<OutputMode>('plugin');
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});

  const d = useMemo(() => derive(tb), [tb]);
  const code = useMemo(() => buildCode(tb, outputMode), [tb, outputMode]);
  const issues = useMemo(() => validate(tb), [tb]);
  const fileName = (slugify(tb.id) || 'toolbar-node') + '.php';

  function focusField(id: string) {
    fieldRefs.current[id]?.focus();
  }
  function fix(kind: string) {
    commit((draft) => Object.assign(draft, applyFix(draft, kind)));
  }
  function toggleRemoval(id: string) {
    commit((p) => {
      p.removals = p.removals || [];
      const i = p.removals.indexOf(id);
      if (i >= 0) p.removals.splice(i, 1);
      else p.removals.push(id);
    });
  }
  function addChild() {
    commit((p) => {
      p.children = p.children || [];
      const n = p.children.length + 1;
      p.children.push({ title: 'Item ' + n, id: slugify(p.prefix) + '-item-' + n, href: '', nonce: false });
    });
  }

  const childrenNote = `${tb.children.length} ${tb.children.length === 1 ? 'item' : 'items'}`;
  const removeNote = d.removals.length ? `${d.removals.length} node${d.removals.length === 1 ? '' : 's'} removed` : 'nothing removed';

  const refSignature = `$wp_admin_bar->add_node(\n\tarray(\n\t\t'id'     => '${d.id}',\n\t\t'title'  => '${escPhp(tb.title || 'Acme')}',\n\t\t'parent' => ${tb.parent ? `'${tb.parent}'` : 'false'},\n\t\t'href'   => '#',\n\t\t'group'  => false,\n\t\t'meta'   => array(),\n\t)\n);`;

  return (
    <GeneratorShell
      category="admin"
      title="Toolbar Node Generator"
      description={<>Add a custom node to the admin bar, wire up its dropdown children, and clear the core nodes this site does not use.</>}
      form={
        <div>
          <div className="field-card field-card-primary">
            <div className="field-card-title">The parent node</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label className="field-label" htmlFor="tb-title">Title</label>
                <input id="tb-title" ref={(el) => (fieldRefs.current.title = el)} className="input" value={tb.title} onChange={(e) => commit((p) => (p.title = e.target.value), 'title')} placeholder="Acme" />
              </div>
              <div>
                <label className="field-label" htmlFor="tb-id">Node id</label>
                <input id="tb-id" ref={(el) => (fieldRefs.current.id = el)} className="input gfw-mono" value={tb.id} onChange={(e) => commit((p) => (p.id = e.target.value), 'id')} placeholder="acme-tools" />
              </div>
            </div>
            <div className="field-group" ref={(el) => (fieldRefs.current.href = el as unknown as HTMLElement)}>
              <label className="field-label" htmlFor="tb-href">Link</label>
              <input id="tb-href" className="input gfw-mono" value={tb.href} onChange={(e) => commit((p) => (p.href = e.target.value), 'href')} placeholder="options-general.php?page=acme-toolkit" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div ref={(el) => (fieldRefs.current.parent = el as unknown as HTMLElement)}>
                <label className="field-label" htmlFor="tb-parent">Parent</label>
                <select id="tb-parent" className="select" value={tb.parent} onChange={(e) => commit((p) => (p.parent = e.target.value))}>
                  {PARENTS.map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div ref={(el) => (fieldRefs.current.capability = el as unknown as HTMLElement)}>
                <label className="field-label" htmlFor="tb-cap">Capability</label>
                <select id="tb-cap" className="select" value={tb.capability} onChange={(e) => commit((p) => (p.capability = e.target.value))}>
                  {CAPS.map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <div ref={(el) => (fieldRefs.current.scope = el as unknown as HTMLElement)}>
                <label className="field-label" htmlFor="tb-scope">Show on</label>
                <select id="tb-scope" className="select" value={tb.scope} onChange={(e) => commit((p) => (p.scope = e.target.value as ToolbarNode['scope']))}>
                  <option value="both">Admin and front end</option>
                  <option value="admin">Admin only</option>
                  <option value="front">Front end only</option>
                </select>
              </div>
              <div ref={(el) => (fieldRefs.current.priority = el as unknown as HTMLElement)}>
                <label className="field-label" htmlFor="tb-priority">Priority</label>
                <input id="tb-priority" className="input gfw-mono" value={tb.priority} onChange={(e) => commit((p) => (p.priority = e.target.value), 'priority')} placeholder="80" />
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Toggle checked={tb.showCount} onChange={(v) => commit((p) => (p.showCount = v))} ariaLabel="Show a count bubble" />
                  <span
                    ref={(el) => (fieldRefs.current.showCount = el)}
                    tabIndex={-1}
                    style={{ fontSize: 13.5, fontWeight: 650, color: 'var(--gfw-text-strong)' }}
                  >
                    Show a count bubble
                  </span>
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label className="field-label" htmlFor="tb-prefix">Prefix</label>
                <input id="tb-prefix" className="input gfw-mono" value={tb.prefix} onChange={(e) => commit((p) => (p.prefix = e.target.value), 'prefix')} placeholder="acme" />
              </div>
              <div>
                <label className="field-label" htmlFor="tb-td">Text domain</label>
                <input id="tb-td" className="input gfw-mono" value={tb.textDomain} onChange={(e) => commit((p) => (p.textDomain = e.target.value), 'textDomain')} placeholder="acme" />
              </div>
            </div>
          </div>

          <div className="field-card">
            <div className="field-card-header">
              <div className="field-card-title">Child nodes</div>
              <div className="field-card-desc">{childrenNote}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {tb.children.map((c, i) => (
                <div key={i} style={{ border: '1px solid var(--gfw-border)', borderRadius: 7, padding: 11, display: 'flex', flexDirection: 'column', gap: 7 }}>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <input className="input" style={{ flex: 1, minWidth: 130 }} placeholder="Settings" value={c.title} onChange={(e) => commit((p) => (p.children[i].title = e.target.value))} />
                    <input className="input gfw-mono" style={{ width: 150 }} placeholder="acme-settings" value={c.id} onChange={(e) => commit((p) => (p.children[i].id = e.target.value))} />
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => commit((p) => p.children.splice(i, 1))}>Remove</button>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <input
                      className="input gfw-mono"
                      style={{ flex: 1, minWidth: 200 }}
                      placeholder="options-general.php?page=acme-toolkit"
                      value={c.href}
                      onChange={(e) => {
                        const v = e.target.value;
                        commit((p) => {
                          p.children[i].href = v;
                          if (v.indexOf('admin-post.php') === 0) p.children[i].nonce = true;
                        });
                      }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
                      <Toggle checked={c.nonce} onChange={(v) => commit((p) => (p.children[i].nonce = v))} ariaLabel="Nonce" />
                      <span style={{ fontSize: 13.5, fontWeight: 650, color: 'var(--gfw-text-strong)' }}>Nonce</span>
                    </div>
                  </div>
                </div>
              ))}
              {tb.children.length === 0 && <div className="field-hint">No children yet — this is a single link node.</div>}
            </div>
            <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={addChild}>Add child</button>
          </div>

          <div className="field-card" ref={(el) => (fieldRefs.current.removals = el as unknown as HTMLElement)}>
            <div className="field-card-header">
              <div className="field-card-title">Remove core nodes</div>
              <div className="field-card-desc">{removeNote}</div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {CORE_NODES.map(([id, help]) => (
                <button
                  key={id}
                  type="button"
                  title={help}
                  onClick={() => toggleRemoval(id)}
                  className={`chip${d.removals.includes(id) ? ' is-active' : ''}`}
                  style={d.removals.includes(id) ? { borderColor: '#B91C1C', background: '#FBEBEB', color: '#B91C1C' } : undefined}
                >
                  {id}
                </button>
              ))}
            </div>
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
        label: 'Reference',
        content: (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <div className="gfw-mono" style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 4 }}>$wp_admin_bar-&gt;add_node()</div>
            <div style={{ fontSize: 12, color: 'var(--gfw-text-mutest)', marginBottom: 14 }}>Called on admin_bar_menu, priority decides position</div>
            <pre className="gfw-mono" style={{ border: '1px solid var(--gfw-border)', borderRadius: 7, padding: '12px 14px', background: 'var(--gfw-surface-sunken)', fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginBottom: 18 }}>{refSignature}</pre>

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>Node arguments</div>
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

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>Core node ids</div>
            <pre className="gfw-mono" style={{ border: '1px solid var(--gfw-border)', borderRadius: 7, padding: '12px 14px', background: 'var(--gfw-surface-sunken)', fontSize: 11.5, lineHeight: 1.7, whiteSpace: 'pre-wrap', marginBottom: 18 }}>{REF_CORE_IDS}</pre>

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>Title is markup</div>
            <div style={{ fontSize: 12.5, color: 'var(--gfw-text-strong)', lineHeight: 1.65, marginBottom: 18 }}>The title field is printed as HTML, so it is the one place you can add a count bubble or an icon — and the one place an unescaped value becomes an XSS hole. Escape everything dynamic before it goes in.</div>

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>Nothing runs when the bar is hidden</div>
            <div style={{ fontSize: 12.5, color: 'var(--gfw-text-strong)', lineHeight: 1.65 }}>Logged-out visitors and users who disabled the toolbar in their profile never fire admin_bar_menu. Anything important — a cache purge, a status check — needs a real home as well as a toolbar shortcut.</div>
          </div>
        ),
      }}
    />
  );
}
