import { useMemo, useState } from 'react';
import { GeneratorShell } from '../../components/generator/GeneratorShell';
import { ToggleRow } from '../../components/ui/Toggle';
import { useEditorState } from '../../lib/useEditorState';
import {
  BLOCK_TYPES,
  CORE_CATEGORIES,
  STARTERS,
  applyFix,
  blockTags,
  buildCode,
  derive,
  freshProject,
  validate,
  type BlockPattern,
  type OutputMode,
} from '../../generators/blockPattern';

const OUTPUT_MODES: { id: OutputMode; label: string }[] = [
  { id: 'file', label: '/patterns file' },
  { id: 'snippet', label: 'register call' },
  { id: 'plugin', label: 'Plugin file' },
];

const REF_ARGS: { name: string; type: string; description: string }[] = [
  { name: 'title', type: 'string', description: 'The inserter label. Translated in the PHP form; in a /patterns file WordPress translates it for you.' },
  { name: 'content', type: 'string', description: 'Valid block markup. Not HTML — the block comments are the structure.' },
  { name: 'description', type: 'string', description: 'Announced to assistive technology in the inserter. Describe what the pattern is, not why it is good.' },
  { name: 'categories', type: 'array', description: 'Category slugs. A category that does not exist is ignored silently, so register custom ones.' },
  { name: 'blockTypes', type: 'array', description: 'Where the pattern is offered as a transform or starting point — core/post-content drives the new-page dialog.' },
  { name: 'viewportWidth', type: 'int', description: 'The width the inserter previews at. Wide layouts need 1280 or more to look right.' },
  { name: 'inserter', type: 'bool', description: 'false keeps it out of the inserter while leaving it usable through blockTypes.' },
  { name: 'keywords', type: 'array', description: 'Extra search terms for the inserter.' },
];

function padTo(s: string, w: number): string {
  return s + new Array(Math.max(0, w - s.length) + 1).join(' ');
}

export function BlockPatternGenerator() {
  const { state: bp, commit, undo, redo, reset, canUndo, canRedo, savedLabel } = useEditorState<BlockPattern>('block-pattern-generator-v1', freshProject);
  const [outputMode, setOutputMode] = useState<OutputMode>('file');

  const d = useMemo(() => derive(bp), [bp]);
  const code = useMemo(() => buildCode(bp, outputMode), [bp, outputMode]);
  const issues = useMemo(() => validate(bp), [bp]);
  const tags = useMemo(() => blockTags(bp.content), [bp.content]);
  const balanced = tags.open.length - tags.selfClosing === tags.close.length;
  const fileName = outputMode === 'file' ? 'patterns/' + d.name + '.php' : d.name + '-pattern.php';
  const markupNote = (balanced ? 'balanced' : 'unbalanced') + ' · ' + tags.open.length + ' block' + (tags.open.length === 1 ? '' : 's');
  const blockCountNote = balanced
    ? tags.open.length + ' opening tags, ' + tags.close.length + ' closing' + (tags.selfClosing ? ', ' + tags.selfClosing + ' self-closing' : '') + ' — balanced.'
    : 'Unbalanced: ' + (tags.open.length - tags.selfClosing) + ' opening against ' + tags.close.length + ' closing. Paste the markup straight from the editor to be sure.';
  const blockTypeNote = (bp.blockTypes || []).length
    ? 'Offered as a starting point wherever these blocks are used — post-content drives the "start with a pattern" dialog.'
    : 'Optional. Without any, the pattern only appears in the inserter.';
  const refCategories = CORE_CATEGORIES.map((c) => padTo(c, 18) + (c === 'featured' ? 'shown first in the inserter' : '')).join('\n');

  function fix(kind: string) {
    commit((draft) => Object.assign(draft, applyFix(draft, kind)));
  }

  function toggleCategory(c: string) {
    commit((p) => {
      p.categories = p.categories || [];
      const i = p.categories.indexOf(c);
      if (i >= 0) p.categories.splice(i, 1);
      else p.categories.push(c);
    });
  }

  function toggleBlockType(b: string) {
    commit((p) => {
      p.blockTypes = p.blockTypes || [];
      const i = p.blockTypes.indexOf(b);
      if (i >= 0) p.blockTypes.splice(i, 1);
      else p.blockTypes.push(b);
    });
  }

  function pickStarter(key: string) {
    commit((p) => (p.content = STARTERS[key].content));
  }

  return (
    <GeneratorShell
      category="content"
      title="Block Pattern Generator"
      description="Build the pattern from real block markup, then take it either way: a PHP registration call, or the file with the header comment a block theme reads from /patterns."
      code={code}
      filename={fileName}
      primaryTabLabel="Output"
      editor={{ canUndo, canRedo, onUndo: undo, onRedo: redo, onNew: reset, savedLabel }}
      issues={issues}
      onFix={fix}
      outputModes={OUTPUT_MODES}
      activeOutputMode={outputMode}
      onOutputModeChange={(id) => setOutputMode(id as OutputMode)}
      secondaryTab={{
        label: 'Reference',
        content: (
          <div>
            <div className="gfw-mono" style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 4 }}>register_block_pattern()</div>
            <div className="field-hint" style={{ marginBottom: 14 }}>Called on init — or skipped entirely in a block theme</div>

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--gfw-text-faint)', marginBottom: 8 }}>Two ways to ship a pattern</div>
            <div style={{ fontSize: 12.5, lineHeight: 1.65, marginBottom: 18 }}>A block theme with a /patterns directory needs no PHP at all: drop a .php file in there with the header comment and WordPress registers it automatically, including translations. register_block_pattern() is for plugins, classic themes, and patterns built at runtime from data.</div>

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--gfw-text-faint)', marginBottom: 8 }}>Arguments</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 18 }}>
              {REF_ARGS.map((r) => (
                <div key={r.name} style={{ borderBottom: '1px solid var(--gfw-border)', paddingBottom: 9 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                    <span className="gfw-mono" style={{ fontSize: 12.5, fontWeight: 700 }}>{r.name}</span>
                    <span className="type-badge">{r.type}</span>
                  </div>
                  <div style={{ fontSize: 12, lineHeight: 1.5, marginTop: 4 }}>{r.description}</div>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--gfw-text-faint)', marginBottom: 8 }}>Core categories</div>
            <div className="card gfw-mono" style={{ padding: '12px 14px', fontSize: 11.5, lineHeight: 1.7, whiteSpace: 'pre-wrap', marginBottom: 18 }}>{refCategories}</div>

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--gfw-text-faint)', marginBottom: 8 }}>Markup has to be exact</div>
            <div style={{ fontSize: 12.5, lineHeight: 1.65 }}>Block comments are parsed, not rendered loosely: every opening {'<!-- wp:x -->'} needs its {'<!-- /wp:x -->'}, attribute JSON must be valid, and the inner HTML must match what the block would have produced. The fastest way to get it right is to build the layout in the editor, select the blocks, and copy them — then paste here.</div>
          </div>
        ),
      }}
      form={
        <div>
          <div className="field-card field-card-primary">
            <div className="field-card-title">The pattern</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12 }}>
              <div>
                <label className="field-label">Title</label>
                <input className="input" value={bp.title} onChange={(ev) => commit((p) => (p.title = ev.target.value), 'title')} placeholder="Hero with call to action" />
              </div>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>namespace/slug</label>
                <input className="input gfw-mono" value={bp.slug} onChange={(ev) => commit((p) => (p.slug = ev.target.value), 'slug')} placeholder="mytheme/hero-cta" />
              </div>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>viewport width</label>
                <input className="input gfw-mono" value={bp.viewport} onChange={(ev) => commit((p) => (p.viewport = ev.target.value), 'viewport')} placeholder="1280" />
              </div>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>text domain</label>
                <input className="input gfw-mono" value={bp.textDomain} onChange={(ev) => commit((p) => (p.textDomain = ev.target.value), 'textDomain')} placeholder="mytheme" />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="field-label">Description</label>
                <input className="input" value={bp.description} onChange={(ev) => commit((p) => (p.description = ev.target.value), 'description')} placeholder="A full-width heading, a line of copy and two buttons." />
                <div className="field-hint">Read aloud by screen readers in the inserter. Describe the layout, not the marketing.</div>
              </div>
            </div>
            <div style={{ marginTop: 13 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--gfw-text-faint)', marginBottom: 7 }}>Categories</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {CORE_CATEGORIES.map((c) => (
                  <button key={c} type="button" onClick={() => toggleCategory(c)} className={`chip gfw-mono${(bp.categories || []).includes(c) ? ' is-active' : ''}`}>
                    {c}
                  </button>
                ))}
              </div>
              <input
                className="input gfw-mono"
                value={bp.customCategory}
                onChange={(ev) => commit((p) => (p.customCategory = ev.target.value), 'customCategory')}
                placeholder="Or your own category slug — registered for you"
              />
            </div>
            <div style={{ marginTop: 13 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--gfw-text-faint)', marginBottom: 7 }}>Block types it can replace</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {BLOCK_TYPES.map((b) => (
                  <button key={b} type="button" onClick={() => toggleBlockType(b)} className={`chip gfw-mono${(bp.blockTypes || []).includes(b) ? ' is-active' : ''}`}>
                    {b.replace('core/', '')}
                  </button>
                ))}
              </div>
              <div className="field-hint">{blockTypeNote}</div>
            </div>
          </div>

          <div className="field-card">
            <div className="field-card-header">
              <div className="field-card-title">Block markup</div>
              <div className="field-card-desc">{markupNote}</div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {Object.keys(STARTERS).map((k) => (
                <button key={k} type="button" onClick={() => pickStarter(k)} className="btn btn-ghost btn-sm">
                  {STARTERS[k].label}
                </button>
              ))}
            </div>
            <textarea
              aria-label="Block markup"
              rows={12}
              spellCheck={false}
              className="textarea gfw-mono"
              value={bp.content}
              placeholder='<!-- wp:paragraph --><p>Hello</p><!-- /wp:paragraph -->'
              onChange={(ev) => commit((p) => (p.content = ev.target.value), 'content')}
            />
            <div className="field-hint" style={{ marginTop: 9 }}>{blockCountNote}</div>
          </div>

          <div className="toggle-card">
            <div className="toggle-card-title">Options</div>
            <ToggleRow
              label="Heredoc for the markup"
              help="Keeps the block comments readable instead of escaping every quote."
              checked={bp.heredoc}
              onChange={(v) => commit((p) => (p.heredoc = v))}
            />
            <ToggleRow
              label="Show in the inserter"
              help="Off hides it, leaving it available only through blockTypes."
              checked={bp.inserter !== false}
              onChange={(v) => commit((p) => (p.inserter = v))}
            />
          </div>
        </div>
      }
    />
  );
}
