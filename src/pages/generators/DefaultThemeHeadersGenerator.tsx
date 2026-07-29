import { useMemo, useRef, useState } from 'react';
import { GeneratorShell } from '../../components/generator/GeneratorShell';
import { RepeatableCard } from '../../components/ui/RepeatableCard';
import { ToggleRow } from '../../components/ui/Toggle';
import { useDragReorder } from '../../lib/dragReorder';
import { useEditorState } from '../../lib/useEditorState';
import { useListOps } from '../../lib/useListOps';
import {
  applyFix,
  buildCode,
  derive,
  freshProject,
  validate,
  type DefaultThemeHeaders,
  type OutputMode,
} from '../../generators/defaultThemeHeaders';

const OUTPUT_MODES: { id: OutputMode; label: string }[] = [
  { id: 'functions', label: 'functions.php' },
  { id: 'child', label: 'Child theme' },
  { id: 'template', label: 'header.php' },
];

const REF_ARGS: { name: string; type: string; description: string }[] = [
  { name: 'array key', type: 'string', description: 'How core remembers the selection. Changing it later resets every site that picked that image.' },
  { name: 'url', type: 'string', description: 'Run through vsprintf(): %1$s is the parent theme URI, %2$s the child theme URI.' },
  { name: 'thumbnail_url', type: 'string', description: 'The Customiser tile. Same placeholders. Point it at a small crop, not the full image.' },
  { name: 'description', type: 'string', description: 'Translatable name. Used as the accessible label in the Customiser and as alt text.' },
];

function padTo(s: string, w: number): string {
  return s + ' '.repeat(Math.max(0, w - s.length));
}

const REF_SUPPORT_ARGS = [
  [padTo('default-image', 22), 'Full URL, not a placeholder — build it with get_template_directory_uri().'],
  [padTo('width / height', 22), 'The size core crops uploads to when flex is off.'],
  [padTo('flex-width', 22), 'Allow any width. Turns the crop step into a suggestion.'],
  [padTo('flex-height', 22), 'Allow any height.'],
  [padTo('header-text', 22), 'false removes the title and tagline controls entirely.'],
  [padTo('default-text-color', 22), 'Bare hex, no leading hash.'],
  [padTo('uploads', 22), 'false limits the user to the images you registered.'],
  [padTo('video', 22), 'Adds the video header control, front page only by default.'],
  [padTo('wp-head-callback', 22), 'Prints the colour CSS. Without it the colour control does nothing.'],
  [padTo('admin-preview-callback', 22), 'Legacy, for the pre-Customiser admin screen. Rarely needed.'],
].map(([label, desc]) => label + desc).join('\n');

const TOGGLES: { key: 'flexWidth' | 'flexHeight' | 'headerText' | 'uploads' | 'video' | 'headCallback'; label: string; help: string }[] = [
  { key: 'flexWidth', label: 'flex-width', help: 'Let the user keep an image wider or narrower than the declared width, with no crop step.' },
  { key: 'flexHeight', label: 'flex-height', help: 'The same for height — the usual choice for a single-column theme.' },
  { key: 'headerText', label: 'header-text', help: 'Show the site title and tagline over the header, with a colour control in the Customiser.' },
  { key: 'uploads', label: 'uploads', help: 'Allow the user to upload their own image as well as picking from yours.' },
  { key: 'video', label: 'video', help: 'Accept an MP4 or a YouTube URL as the header. Core hides it below 900px wide.' },
  { key: 'headCallback', label: 'wp-head-callback', help: 'Print the chosen text colour in wp_head, and hide the title when the user turns it off.' },
];

export function DefaultThemeHeadersGenerator() {
  const { state: dh, commit, undo, redo, reset, canUndo, canRedo, savedLabel } = useEditorState<DefaultThemeHeaders>('default-theme-headers-generator-v1', freshProject);
  const drag = useDragReorder();
  const headers = useListOps<DefaultThemeHeaders>(commit)((p) => p.headers);
  const [outputMode, setOutputMode] = useState<OutputMode>('functions');
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});

  const code = useMemo(() => buildCode(dh, outputMode), [dh, outputMode]);
  const issues = useMemo(() => validate(dh), [dh]);
  const fileName = outputMode === 'template' ? 'header-image.php' : (dh.prefix.replace(/[^a-z0-9_]+/gi, '_').toLowerCase() || 'acme').replace(/_/g, '-') + '-custom-header.php';
  const d = useMemo(() => derive(dh), [dh]);
  const refSignature = "register_default_headers(\n\tarray(\n\t\t'dunes' => array(\n\t\t\t'url'           => '%1$s/" + d.path + "/dunes.jpg',\n\t\t\t'thumbnail_url' => '%1$s/" + d.path + "/dunes-thumb.jpg',\n\t\t\t'description'   => __( 'Dunes at dawn', '" + d.td + "' ),\n\t\t),\n\t)\n);";

  function focusField(id: string) {
    fieldRefs.current[id]?.focus();
  }
  function fix(kind: string) {
    commit((draft) => Object.assign(draft, applyFix(draft, kind)));
  }

  return (
    <GeneratorShell
      category="design"
      title="Default Theme Headers Generator"
      description="The header images you ship with the theme, the custom-header support that makes them selectable, and the header.php markup that puts one on the page."
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
          <div>
            <div className="gfw-mono" style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--gfw-text-strong)', marginBottom: 4 }}>register_default_headers()</div>
            <div style={{ fontSize: 12, color: 'var(--gfw-text-mutest)', marginBottom: 14 }}>Call on after_setup_theme, alongside the custom-header support</div>
            <pre className="gfw-mono" style={{ border: '1px solid var(--gfw-border)', borderRadius: 7, padding: '12px 14px', background: 'var(--gfw-surface-muted)', fontSize: 12, lineHeight: 1.6, color: 'var(--gfw-text-strong)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginBottom: 18 }}>
              {refSignature}
            </pre>

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>Header entry keys</div>
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

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>custom-header arguments</div>
            <pre className="gfw-mono" style={{ border: '1px solid var(--gfw-border)', borderRadius: 7, padding: '12px 14px', background: 'var(--gfw-surface-muted)', fontSize: 11.5, lineHeight: 1.7, color: 'var(--gfw-text-strong)', whiteSpace: 'pre-wrap', marginBottom: 18 }}>
              {REF_SUPPORT_ARGS}
            </pre>

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>%1$s and %2$s are not typos</div>
            <div style={{ fontSize: 12.5, color: 'var(--gfw-text-body)', lineHeight: 1.65, marginBottom: 18 }}>
              Core runs each url through vsprintf() with the parent theme URI as the first argument and the child theme URI as the second. Hardcoding get_template_directory_uri() works until a child theme wants its own headers; the placeholder never breaks.
            </div>

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>Flex changes the crop UI</div>
            <div style={{ fontSize: 12.5, color: 'var(--gfw-text-body)', lineHeight: 1.65 }}>
              With both flex flags false, the Customiser forces every uploaded image to the exact width and height and offers a crop step. Turning on flex-height lets tall images through untouched — which is what most single-column themes actually want.
            </div>
          </div>
        ),
      }}
      form={
        <div>
          <div className="field-card">
            <div className="field-card-title">Bundled headers</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {dh.headers.map((h, i) => (
                <RepeatableCard
                  key={i}
                  index={i}
                  count={dh.headers.length}
                  title={h.description || 'Untitled header'}
                  subtitle={h.key.trim() || 'header'}
                  drag={drag.bind('headers', i, headers.reorder)}
                  onMoveUp={() => headers.moveUp(i)}
                  onMoveDown={() => headers.moveDown(i)}
                  onRemove={() => headers.remove(i)}
                >
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input className="input gfw-mono" style={{ width: 110 }} spellCheck={false} placeholder="key" value={h.key} onChange={(e) => commit((p) => (p.headers[i].key = e.target.value), `header-key-${i}`)} />
                    <input className="input" style={{ flex: '1.2 1 130px' }} placeholder="Description" value={h.description} onChange={(e) => commit((p) => (p.headers[i].description = e.target.value), `header-desc-${i}`)} />
                    <button
                      type="button"
                      onClick={() => commit((p) => (p.defaultKey = p.headers[i].key))}
                      className={`chip${dh.defaultKey && h.key && dh.defaultKey === h.key ? ' is-active' : ''}`}
                    >
                      {dh.defaultKey && h.key && dh.defaultKey === h.key ? 'Default' : 'Set default'}
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, paddingTop: 9, borderTop: '1px dashed var(--gfw-border)' }}>
                    <div>
                      <label className="field-label gfw-mono" style={{ fontSize: 11 }}>file</label>
                      <input className="input gfw-mono" style={{ fontSize: 11.5 }} spellCheck={false} placeholder="header.jpg" value={h.file} onChange={(e) => commit((p) => (p.headers[i].file = e.target.value), `header-file-${i}`)} />
                    </div>
                    <div>
                      <label className="field-label gfw-mono" style={{ fontSize: 11 }}>thumbnail</label>
                      <input className="input gfw-mono" style={{ fontSize: 11.5 }} spellCheck={false} placeholder="header-thumb.jpg" value={h.thumb} onChange={(e) => commit((p) => (p.headers[i].thumb = e.target.value), `header-thumb-${i}`)} />
                    </div>
                    <div>
                      <label className="field-label gfw-mono" style={{ fontSize: 11 }}>width</label>
                      <input className="input gfw-mono" style={{ fontSize: 11.5 }} value={h.width} onChange={(e) => commit((p) => (p.headers[i].width = e.target.value), `header-width-${i}`)} />
                    </div>
                    <div>
                      <label className="field-label gfw-mono" style={{ fontSize: 11 }}>height</label>
                      <input className="input gfw-mono" style={{ fontSize: 11.5 }} value={h.height} onChange={(e) => commit((p) => (p.headers[i].height = e.target.value), `header-height-${i}`)} />
                    </div>
                  </div>
                </RepeatableCard>
              ))}
              {!dh.headers.length && <div className="field-hint">No headers registered — the Customiser shows an empty Suggested list.</div>}
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm repeatable-add"
              style={{ marginTop: 11 }}
              onClick={() => commit((p) => {
                const n = p.headers.length + 1;
                p.headers.push({ key: 'header-' + n, file: 'header-' + n + '.jpg', thumb: 'header-' + n + '-thumb.jpg', description: 'Header ' + n, width: p.width, height: p.height });
              })}
            >
              Add header
            </button>
          </div>

          <div className="field-card field-card-primary">
            <div className="field-card-title">add_theme_support( 'custom-header' )</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>width</label>
                <input className="input gfw-mono" value={dh.width} onChange={(e) => commit((p) => (p.width = e.target.value), 'width')} />
              </div>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>height</label>
                <input className="input gfw-mono" value={dh.height} onChange={(e) => commit((p) => (p.height = e.target.value), 'height')} />
              </div>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>base URI</label>
                <select className="select" value={dh.base} onChange={(e) => commit((p) => (p.base = e.target.value as DefaultThemeHeaders['base']))}>
                  <option value="%1$s">%1$s — parent theme</option>
                  <option value="%2$s">%2$s — child theme</option>
                </select>
              </div>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>images path</label>
                <input className="input gfw-mono" value={dh.path} onChange={(e) => commit((p) => (p.path = e.target.value), 'path')} placeholder="assets/headers" />
              </div>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>default-text-color</label>
                <input className="input gfw-mono" value={dh.textColor} onChange={(e) => commit((p) => (p.textColor = e.target.value), 'textColor')} placeholder="1c1a15" />
              </div>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>function prefix</label>
                <input className="input gfw-mono" value={dh.prefix} onChange={(e) => commit((p) => (p.prefix = e.target.value), 'prefix')} />
              </div>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>text domain</label>
                <input className="input gfw-mono" value={dh.textDomain} onChange={(e) => commit((p) => (p.textDomain = e.target.value), 'textDomain')} />
              </div>
            </div>
            <div className="toggle-card" style={{ marginTop: 14 }}>
              <div className="toggle-card-title">Support options</div>
              {TOGGLES.map((t) => (
                <ToggleRow
                  key={t.key}
                  label={t.label}
                  help={t.help}
                  checked={dh[t.key]}
                  onChange={(v) => commit((p) => { p[t.key] = v; })}
                />
              ))}
            </div>
          </div>
        </div>
      }
    />
  );
}
