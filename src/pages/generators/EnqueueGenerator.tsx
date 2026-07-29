import { useMemo, useState } from 'react';
import { GeneratorShell } from '../../components/generator/GeneratorShell';
import { ToggleRow } from '../../components/ui/Toggle';
import { CheckboxChip } from '../../components/ui/CheckboxChip';
import { RepeatableCard } from '../../components/ui/RepeatableCard';
import { useDragReorder } from '../../lib/dragReorder';
import { useEditorState } from '../../lib/useEditorState';
import { useListOps } from '../../lib/useListOps';
import {
  CONDITIONALS,
  CONTEXTS,
  applyFix,
  buildCode,
  freshProject,
  fullHandle,
  mapRows,
  relPath,
  validate,
  type Asset,
  type AssetKind,
  type ConditionalId,
  type Enqueue,
  type LocalizeKind,
  type OutputMode,
} from '../../generators/enqueue';

const OUTPUT_MODES: { id: OutputMode; label: string }[] = [
  { id: 'snippet', label: 'Snippet' },
  { id: 'functions', label: 'functions.php' },
  { id: 'plugin', label: 'Plugin file' },
];
const OUTPUT_HINTS: Record<OutputMode, string> = {
  snippet: 'Paste into a plugin, an mu-plugin, or a functionality plugin.',
  functions: "Ready for your theme's functions.php.",
  plugin: 'A complete single-file plugin with a version constant.',
};
const ARG_LABELS: Partial<Record<ConditionalId, string>> = { singular: 'post type key', archive: 'post type key', page_template: 'template file', has_shortcode: 'shortcode tag', has_block: 'block name' };
const ARG_PLACEHOLDERS: Partial<Record<ConditionalId, string>> = { singular: 'product', archive: 'product', page_template: 'templates/landing.php', has_shortcode: 'team_grid', has_block: 'core/gallery' };

function freshAsset(kind: AssetKind): Asset {
  return { kind, handle: '', file: '', context: 'front', deps: '', media: 'all', strategy: 'defer', localize: false, localizeName: '', localizeRows: [] };
}

export function EnqueueGenerator() {
  const { state: en, commit, undo, redo, reset, canUndo, canRedo, savedLabel } = useEditorState<Enqueue>('enqueue-generator-v1', freshProject);
  const drag = useDragReorder();
  const listOf = useListOps<Enqueue>(commit);
  const assets = listOf((p) => p.assets);
  const [outputMode, setOutputMode] = useState<OutputMode>('snippet');

  const code = useMemo(() => buildCode(en, outputMode), [en, outputMode]);
  const issues = useMemo(() => validate(en), [en]);
  const rows = useMemo(() => mapRows(en), [en]);
  const fileName = (en.prefix ? en.prefix.toLowerCase().replace(/[^a-z0-9-]+/g, '-') : 'theme') + '-assets.php';

  function fix(kind: string) {
    commit((draft) => Object.assign(draft, applyFix(draft, kind)));
  }

  return (
    <GeneratorShell
      category="core"
      title="Scripts &amp; Styles Generator"
      description={<>The right hook for every context, <span className="gfw-mono" style={{ fontSize: 12 }}>filemtime()</span> cache busting and conditional loading — so assets only ship where they are used.</>}
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
        label: 'Load map',
        content: (
          <>
            <div className="field-hint" style={{ marginBottom: 12 }}>Every asset, the hook it rides on and where it ends up in the page.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {rows.map((r, i) => (
                <div key={i} style={{ border: '1px solid var(--gfw-border)', borderLeft: `3px solid ${r.kind === 'script' ? '#8A5B00' : '#3B6FB0'}`, borderRadius: 6, padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
                    <span className="gfw-mono" style={{ fontWeight: 700, fontSize: 12.5 }}>{r.handle}</span>
                    <span className="badge" style={{ background: r.kind === 'script' ? '#FFF3DE' : 'var(--gfw-accent-tint)', color: r.kind === 'script' ? '#8A5B00' : 'var(--gfw-accent-strong)' }}>{r.kind}</span>
                  </div>
                  <div className="gfw-mono" style={{ fontSize: 11.5, color: 'var(--gfw-text-muted)' }}>{r.hook}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--gfw-text-soft)', marginTop: 4 }}>{r.position}</div>
                </div>
              ))}
              {!rows.length && <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--gfw-text-mutest)', fontSize: 13 }}>No assets yet.</div>}
            </div>
          </>
        ),
      }}
      form={
        <div>
          <div className="field-card field-card-primary">
            <div className="field-card-title">Where the files live</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              {(['theme', 'plugin'] as const).map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => commit((p) => (p.base = b))}
                  className="card"
                  style={{ textAlign: 'left', borderColor: en.base === b ? 'var(--gfw-accent)' : undefined, background: en.base === b ? 'var(--gfw-accent-tint)' : undefined }}
                >
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>{b === 'theme' ? 'Theme' : 'Plugin'}</div>
                  <div className="gfw-mono" style={{ fontSize: 11, color: 'var(--gfw-text-soft)' }}>{b === 'theme' ? 'get_theme_file_uri()' : 'plugins_url( …, __FILE__ )'}</div>
                </button>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="field-label">Handle prefix</label>
                <input className="input gfw-mono" value={en.prefix} onChange={(e) => commit((p) => (p.prefix = e.target.value), 'prefix')} placeholder="mytheme" spellCheck={false} />
              </div>
              <div>
                <label className="field-label">Asset folder</label>
                <input className="input gfw-mono" value={en.folder} onChange={(e) => commit((p) => (p.folder = e.target.value), 'folder')} placeholder="assets" spellCheck={false} />
              </div>
              <div>
                <label className="field-label">Version strategy</label>
                <select className="select" value={en.versionMode} onChange={(e) => commit((p) => (p.versionMode = e.target.value as Enqueue['versionMode']))}>
                  <option value="filemtime">filemtime() — busts on every save</option>
                  <option value="theme">Theme / plugin version constant</option>
                  <option value="manual">Fixed string</option>
                  <option value="none">null — falls back to the WP version</option>
                </select>
              </div>
              {en.versionMode === 'manual' && (
                <div>
                  <label className="field-label">Version string</label>
                  <input className="input gfw-mono" value={en.versionString} onChange={(e) => commit((p) => (p.versionString = e.target.value), 'versionString')} placeholder="1.0.0" spellCheck={false} />
                </div>
              )}
            </div>
          </div>

          <div className="field-card">
            <div className="field-card-header">
              <div className="field-card-title">Assets</div>
              <div className="field-card-desc">Handles are prefixed automatically.</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {en.assets.map((a, i) => {
                const localizeRows = listOf((p) => p.assets[i].localizeRows);
                return (
                <RepeatableCard
                  key={i}
                  index={i}
                  count={en.assets.length}
                  title={a.handle || `Asset ${i + 1}`}
                  subtitle={`${fullHandle(en, a)} → ${relPath(en, a) || '—'}`}
                  accent={a.kind === 'script' ? '#8A5B00' : '#3B6FB0'}
                  drag={drag.bind('assets', i, assets.reorder)}
                  onMoveUp={() => assets.moveUp(i)}
                  onMoveDown={() => assets.moveDown(i)}
                  onRemove={() => assets.remove(i)}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 9 }}>
                    <div>
                      <label className="field-label" style={{ fontSize: 11 }}>kind</label>
                      <select className="select" value={a.kind} onChange={(e) => commit((p) => (p.assets[i].kind = e.target.value as AssetKind))}>
                        <option value="script">script — .js</option>
                        <option value="style">style — .css</option>
                      </select>
                    </div>
                    <div>
                      <label className="field-label" style={{ fontSize: 11 }}>handle</label>
                      <input className="input gfw-mono" value={a.handle} onChange={(e) => commit((p) => (p.assets[i].handle = e.target.value), 'asset-handle-' + i)} placeholder="main" spellCheck={false} />
                    </div>
                    <div>
                      <label className="field-label" style={{ fontSize: 11 }}>file</label>
                      <input className="input gfw-mono" value={a.file} onChange={(e) => commit((p) => (p.assets[i].file = e.target.value), 'asset-file-' + i)} placeholder={a.kind === 'script' ? 'js/main.js' : 'css/main.css'} spellCheck={false} />
                    </div>
                    <div>
                      <label className="field-label" style={{ fontSize: 11 }}>context</label>
                      <select className="select" value={a.context} onChange={(e) => commit((p) => (p.assets[i].context = e.target.value))}>
                        {CONTEXTS.map(([id, label]) => (
                          <option key={id} value={id}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="field-label" style={{ fontSize: 11 }}>dependencies</label>
                      <input className="input gfw-mono" value={a.deps} onChange={(e) => commit((p) => (p.assets[i].deps = e.target.value), 'asset-deps-' + i)} placeholder={a.kind === 'script' ? 'wp-element, jquery' : 'another-handle'} spellCheck={false} />
                    </div>
                    {a.kind === 'script' ? (
                      <div>
                        <label className="field-label" style={{ fontSize: 11 }}>loading</label>
                        <select className="select" value={a.strategy} onChange={(e) => commit((p) => (p.assets[i].strategy = e.target.value as Asset['strategy']))}>
                          <option value="defer">footer + defer</option>
                          <option value="async">footer + async</option>
                          <option value="footer">footer, blocking</option>
                          <option value="head">head, blocking</option>
                        </select>
                      </div>
                    ) : (
                      <div>
                        <label className="field-label" style={{ fontSize: 11 }}>media</label>
                        <select className="select" value={a.media} onChange={(e) => commit((p) => (p.assets[i].media = e.target.value))}>
                          <option value="all">all</option>
                          <option value="screen">screen</option>
                          <option value="print">print</option>
                          <option value="(prefers-color-scheme: dark)">prefers-color-scheme: dark</option>
                        </select>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
                    {a.kind === 'script' && (
                      <CheckboxChip
                        active={a.localize}
                        onClick={() => commit((p) => {
                          const asset = p.assets[i];
                          asset.localize = !asset.localize;
                          if (asset.localize && !asset.localizeRows.length) asset.localizeRows = [{ key: 'ajaxUrl', kind: 'ajax', value: '' }];
                        })}
                      >
                        localize
                      </CheckboxChip>
                    )}
                  </div>
                  {a.localize && (
                    <div style={{ borderTop: '1px dashed var(--gfw-border)', paddingTop: 10 }}>
                      <div style={{ marginBottom: 8 }}>
                        <label className="field-label" style={{ fontSize: 11 }}>JS object name</label>
                        <input className="input gfw-mono" value={a.localizeName} onChange={(e) => commit((p) => (p.assets[i].localizeName = e.target.value), 'asset-localizeName-' + i)} placeholder="mythemeData" spellCheck={false} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {a.localizeRows.map((r, j) => (
                          <RepeatableCard
                            key={j}
                            index={j}
                            count={a.localizeRows.length}
                            title={r.key || `Data entry ${j + 1}`}
                            subtitle={r.kind}
                            drag={drag.bind('localize-' + i, j, localizeRows.reorder)}
                            onMoveUp={() => localizeRows.moveUp(j)}
                            onMoveDown={() => localizeRows.moveDown(j)}
                            onRemove={() => localizeRows.remove(j)}
                          >
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              <input className="input gfw-mono" style={{ width: '34%' }} value={r.key} onChange={(e) => commit((p) => (p.assets[i].localizeRows[j].key = e.target.value), 'asset-localizeKey-' + i + '-' + j)} placeholder="ajaxUrl" spellCheck={false} />
                              <select className="select" style={{ width: '26%' }} value={r.kind} onChange={(e) => commit((p) => (p.assets[i].localizeRows[j].kind = e.target.value as LocalizeKind))}>
                                <option value="ajax">admin_url</option>
                                <option value="nonce">nonce</option>
                                <option value="rest">rest_url</option>
                                <option value="text">text</option>
                                <option value="raw">raw PHP</option>
                              </select>
                              <input
                                className="input gfw-mono"
                                style={{ flex: 1, minWidth: 0 }}
                                value={r.value}
                                onChange={(e) => commit((p) => (p.assets[i].localizeRows[j].value = e.target.value), 'asset-localizeValue-' + i + '-' + j)}
                                placeholder={r.kind === 'ajax' ? 'admin-ajax.php (automatic)' : r.kind === 'nonce' ? 'nonce action' : r.kind === 'rest' ? 'wp/v2/posts' : r.kind === 'raw' ? 'get_the_ID()' : 'Loading…'}
                                spellCheck={false}
                              />
                            </div>
                          </RepeatableCard>
                        ))}
                        <button type="button" className="btn btn-ghost btn-sm repeatable-add" style={{ alignSelf: 'flex-start' }} onClick={() => commit((p) => { p.assets[i].localizeRows.push({ key: '', kind: 'text', value: '' }); })}>+ Data entry</button>
                      </div>
                    </div>
                  )}
                </RepeatableCard>
                );
              })}
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn btn-ghost btn-sm repeatable-add" onClick={() => commit((p) => { p.assets.push(freshAsset('script')); })}>+ Script</button>
                <button type="button" className="btn btn-ghost btn-sm repeatable-add" onClick={() => commit((p) => { p.assets.push(freshAsset('style')); })}>+ Stylesheet</button>
              </div>
            </div>
          </div>

          <div className="field-card">
            <div className="field-card-header">
              <div className="field-card-title">Only load when…</div>
              <div className="field-card-desc">Applies to front-end assets.</div>
            </div>
            <select className="select" value={en.conditional} onChange={(e) => commit((p) => (p.conditional = e.target.value as ConditionalId))}>
              {CONDITIONALS.map(([id, label]) => (
                <option key={id} value={id}>{label}</option>
              ))}
            </select>
            {ARG_LABELS[en.conditional] && (
              <div style={{ marginTop: 10 }}>
                <label className="field-label">{ARG_LABELS[en.conditional]}</label>
                <input className="input gfw-mono" value={en.conditionalArg} onChange={(e) => commit((p) => (p.conditionalArg = e.target.value), 'conditionalArg')} placeholder={ARG_PLACEHOLDERS[en.conditional]} spellCheck={false} />
              </div>
            )}
          </div>

          <div className="toggle-card">
            <div className="toggle-card-title">Extras</div>
            <ToggleRow
              label="Script translations"
              help="Adds wp_set_script_translations() so JS strings can be translated."
              checked={en.scriptTranslations}
              onChange={(v) => commit((p) => (p.scriptTranslations = v))}
            />
            <ToggleRow
              label="Move jQuery to the footer"
              help="Stops the bundled jQuery blocking the head on the front end."
              checked={en.jqueryFooter}
              onChange={(v) => commit((p) => (p.jqueryFooter = v))}
            />
            <ToggleRow
              label="Dequeue core block styles"
              help="Removes wp-block-library and global styles. Only when your theme styles every block."
              checked={en.dequeueBlockLibrary}
              onChange={(v) => commit((p) => (p.dequeueBlockLibrary = v))}
            />
          </div>
        </div>
      }
    />
  );
}
