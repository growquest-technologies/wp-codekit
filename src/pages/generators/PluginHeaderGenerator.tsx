import { useMemo, useState } from 'react';
import { GeneratorShell } from '../../components/generator/GeneratorShell';
import { ToggleRow } from '../../components/ui/Toggle';
import { useEditorState } from '../../lib/useEditorState';
import {
  REF_ARGS,
  applyFix,
  buildCode,
  derivePluginHeader,
  freshProject,
  treeText,
  validate,
  type License,
  type OutputMode,
  type PluginHeader,
} from '../../generators/pluginHeader';

const OUTPUT_HINTS: Record<OutputMode, (slug: string) => string> = {
  plugin: (slug) => `Save as ${slug}/${slug}.php — the folder name must match the text domain.`,
  readme: () => 'The directory readme, seeded from the header. Readme Studio is the full editor for it.',
};

export function PluginHeaderGenerator() {
  const { state: ph, commit, undo, redo, reset, canUndo, canRedo, savedLabel } = useEditorState<PluginHeader>('plugin-header-generator-v1', freshProject);
  const [outputMode, setOutputMode] = useState<OutputMode>('plugin');

  const d = useMemo(() => derivePluginHeader(ph), [ph]);
  const code = useMemo(() => buildCode(ph, outputMode), [ph, outputMode]);
  const issues = useMemo(() => validate(ph), [ph]);
  const fileName = outputMode === 'readme' ? 'readme.txt' : d.slug + '.php';

  function fix(kind: string) {
    commit((draft) => Object.assign(draft, applyFix(draft, kind)));
  }

  return (
    <GeneratorShell
      category="core"
      title="Plugin Header Generator"
      description="Fourteen header fields, a guard clause, path constants and — if you want it — a singleton bootstrap. The file every plugin starts from, written properly once."
      code={code}
      filename={fileName}
      editor={{ canUndo, canRedo, onUndo: undo, onRedo: redo, onNew: reset, savedLabel }}
      issues={issues}
      onFix={fix}
      outputModes={[
        { id: 'plugin', label: d.slug + '.php' },
        { id: 'readme', label: 'readme.txt' },
      ]}
      activeOutputMode={outputMode}
      onOutputModeChange={(id) => setOutputMode(id as OutputMode)}
      outputHint={OUTPUT_HINTS[outputMode](d.slug)}
      secondaryTab={{
        label: 'Structure',
        content: (
          <div>
            <div className="field-hint" style={{ marginBottom: 11 }}>A structure that survives growing past one file.</div>
            <pre className="gfw-mono" style={{ margin: 0, fontSize: 12, lineHeight: 1.8, whiteSpace: 'pre' }}>{treeText(ph)}</pre>
            <div style={{ marginTop: 14, fontSize: 12.5, lineHeight: 1.65 }}>The main file stays a header, a guard, constants and a require. Everything else lives in includes/ — which is what makes the plugin readable a year later.</div>
          </div>
        ),
      }}
      extraSecondaryTabs={[
        {
          label: 'Reference',
          content: (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <div className="gfw-mono" style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 4 }}>Plugin file header</div>
              <div style={{ fontSize: 12, color: 'var(--gfw-text-mutest)', marginBottom: 14 }}>Parsed from the first 8 kB of the main file</div>
              <div className="field-label">Fields</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 16 }}>
                {REF_ARGS.map(([name, description]) => (
                  <div key={name} style={{ borderBottom: '1px solid var(--gfw-border-muted)', paddingBottom: 9 }}>
                    <div className="gfw-mono" style={{ fontWeight: 700, fontSize: 12.5 }}>{name}</div>
                    <div style={{ fontSize: 12, color: 'var(--gfw-text-muted)', marginTop: 3 }}>{description}</div>
                  </div>
                ))}
              </div>
              <div className="field-label">Only the first block counts</div>
              <div style={{ fontSize: 12.5, lineHeight: 1.65, marginBottom: 16 }}>WordPress reads the first 8 kB of the main file and stops at the first matching field. A second Plugin Name later in the file is ignored — and a Plugin Name in any other PHP file in the folder makes WordPress list that file as a separate plugin.</div>
              <div className="field-label">Update URI</div>
              <div style={{ fontSize: 12.5, lineHeight: 1.65 }}>Since 5.8, setting Update URI to false — or to a domain you control — stops wordpress.org offering an update for a plugin whose slug happens to match something in the directory. Essential for private client plugins.</div>
            </div>
          ),
        },
      ]}
      form={
        <div>
          <div style={{ background: 'var(--gfw-surface-sunken)', border: '1px solid var(--gfw-border)', borderRadius: 8, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 10 }}>How the Plugins screen reads</div>
            <div style={{ background: '#fff', border: '1px solid #C3C4C7', borderRadius: 2, padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#2271B1' }}>{ph.name}</span>
                <span style={{ fontSize: 12.5, color: '#787C82' }}>Deactivate | Settings</span>
              </div>
              <div style={{ fontSize: 13, color: '#2C3338', lineHeight: 1.6, marginTop: 6 }}>{ph.description}</div>
              <div style={{ fontSize: 12.5, color: '#787C82', marginTop: 6 }}>
                Version {ph.version || '1.0.0'} | By {ph.author || '—'}{String(ph.minPhp || '').trim() ? ` | Requires PHP ${ph.minPhp}` : ''}
              </div>
            </div>
          </div>

          <div className="field-card field-card-primary">
            <div className="field-card-title">Identity</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="field-label">Plugin Name</label>
                <input className="input" value={ph.name} onChange={(e) => commit((p) => (p.name = e.target.value), 'name')} placeholder="Acme Toolkit" />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="field-label">Description</label>
                <input className="input" value={ph.description} onChange={(e) => commit((p) => (p.description = e.target.value), 'description')} placeholder="What it does, in one sentence a client would understand." />
                <div className="field-hint">{String(ph.description || '').length} characters — the Plugins screen truncates around 140.</div>
              </div>
              <div>
                <label className="field-label">plugin folder / slug</label>
                <input className="input gfw-mono" value={ph.slug} onChange={(e) => commit((p) => (p.slug = e.target.value), 'slug')} placeholder="acme-toolkit" spellCheck={false} />
              </div>
              <div>
                <label className="field-label">Version</label>
                <input className="input gfw-mono" value={ph.version} onChange={(e) => commit((p) => (p.version = e.target.value), 'version')} placeholder="1.0.0" spellCheck={false} />
              </div>
              <div>
                <label className="field-label">Author</label>
                <input className="input" value={ph.author} onChange={(e) => commit((p) => (p.author = e.target.value), 'author')} placeholder="GrowQuest" />
              </div>
              <div>
                <label className="field-label">Author URI</label>
                <input className="input gfw-mono" value={ph.authorUri} onChange={(e) => commit((p) => (p.authorUri = e.target.value), 'authorUri')} placeholder="https://growquest.io" spellCheck={false} />
              </div>
              <div>
                <label className="field-label">Plugin URI</label>
                <input className="input gfw-mono" value={ph.pluginUri} onChange={(e) => commit((p) => (p.pluginUri = e.target.value), 'pluginUri')} placeholder="https://example.com/acme-toolkit" spellCheck={false} />
              </div>
            </div>
          </div>

          <div className="field-card">
            <div className="field-card-title">Requirements and licence</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12 }}>
              <div>
                <label className="field-label">Requires at least</label>
                <input className="input gfw-mono" value={ph.minWp} onChange={(e) => commit((p) => (p.minWp = e.target.value), 'minWp')} placeholder="6.0" spellCheck={false} />
              </div>
              <div>
                <label className="field-label">Tested up to</label>
                <input className="input gfw-mono" value={ph.testedUp} onChange={(e) => commit((p) => (p.testedUp = e.target.value), 'testedUp')} placeholder="6.8" spellCheck={false} />
              </div>
              <div>
                <label className="field-label">Requires PHP</label>
                <input className="input gfw-mono" value={ph.minPhp} onChange={(e) => commit((p) => (p.minPhp = e.target.value), 'minPhp')} placeholder="7.4" spellCheck={false} />
              </div>
              <div>
                <label className="field-label">License</label>
                <select className="select" value={ph.license} onChange={(e) => commit((p) => (p.license = e.target.value as License))}>
                  <option value="GPL-2.0-or-later">GPL-2.0-or-later</option>
                  <option value="GPL-3.0-or-later">GPL-3.0-or-later</option>
                  <option value="MIT">MIT</option>
                  <option value="proprietary">Proprietary — not for the directory</option>
                </select>
              </div>
              <div>
                <label className="field-label">Text Domain</label>
                <input className="input gfw-mono" value={ph.textDomain} onChange={(e) => commit((p) => (p.textDomain = e.target.value), 'textDomain')} placeholder="acme-toolkit" spellCheck={false} />
              </div>
              <div>
                <label className="field-label">Update URI</label>
                <input className="input gfw-mono" value={ph.updateUri} onChange={(e) => commit((p) => (p.updateUri = e.target.value), 'updateUri')} placeholder="false for private plugins" spellCheck={false} />
              </div>
            </div>
          </div>

          <div className="toggle-card">
            <div className="toggle-card-title">What else goes in the file</div>
            <ToggleRow
              label="Domain Path"
              help="Points core at /languages for your own translation files."
              checked={ph.domainPath}
              onChange={(v) => commit((p) => (p.domainPath = v))}
            />
            <ToggleRow
              label="load_plugin_textdomain()"
              help="Loads the .mo files you ship, which core does not do for you."
              checked={ph.textdomainLoad}
              onChange={(v) => commit((p) => (p.textdomainLoad = v))}
            />
            <ToggleRow
              label="Bootstrap class"
              help="A single-instance entry object with includes() and hooks()."
              checked={ph.bootstrap}
              onChange={(v) => commit((p) => (p.bootstrap = v))}
            />
            <ToggleRow
              label="Network only"
              help="Network: true — activatable network-wide on multisite only."
              checked={ph.networkOnly}
              onChange={(v) => commit((p) => (p.networkOnly = v))}
            />
          </div>
        </div>
      }
    />
  );
}
