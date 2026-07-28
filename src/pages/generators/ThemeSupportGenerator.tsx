import { useMemo, useRef, useState } from 'react';
import { GeneratorShell } from '../../components/generator/GeneratorShell';
import { RepeatableCard } from '../../components/ui/RepeatableCard';
import { Toggle, ToggleRow } from '../../components/ui/Toggle';
import { useDragReorder } from '../../lib/dragReorder';
import { useEditorState } from '../../lib/useEditorState';
import { useListOps } from '../../lib/useListOps';
import {
  FEATURES,
  PRESETS,
  applyFix,
  buildCode,
  freshProject,
  validate,
  type OutputMode,
  type ThemeSupport,
} from '../../generators/themeSupport';

const OUTPUT_MODES: { id: OutputMode; label: string }[] = [
  { id: 'functions', label: 'functions.php' },
  { id: 'snippet', label: 'Snippet' },
];

const REF_ARGS: { name: string; description: string }[] = [
  { name: 'title-tag', description: 'Core prints the document title and plugins can filter it. Remove any wp_title() call from your header when you add this.' },
  { name: 'post-thumbnails', description: 'Takes an optional array of post types: add_theme_support( post-thumbnails, array( post, product ) ).' },
  { name: 'html5', description: 'Takes the list of things to modernise. Passing nothing does nothing — the array is required in practice.' },
  { name: 'custom-logo', description: 'height, width, flex-height and flex-width. Without flex the customiser forces a crop.' },
  { name: 'post-formats', description: 'Takes the formats you actually style. Declaring six and styling none is worse than declaring none.' },
  { name: 'editor-styles', description: 'Only enables the feature — you still need add_editor_style() to point at the file.' },
  { name: 'appearance-tools', description: 'A shortcut that turns on border, colour, spacing and typography controls together.' },
  { name: 'woocommerce', description: 'Declares compatibility so WooCommerce stops warning and its templates use your layout.' },
];

export function ThemeSupportGenerator() {
  const { state: ts, commit, undo, redo, reset, canUndo, canRedo, savedLabel } = useEditorState<ThemeSupport>('theme-support-generator-v1', freshProject);
  const drag = useDragReorder();
  const sizes = useListOps<ThemeSupport>(commit)((p) => p.sizes);
  const [outputMode, setOutputMode] = useState<OutputMode>('functions');
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});

  const code = useMemo(() => buildCode(ts, outputMode), [ts, outputMode]);
  const issues = useMemo(() => validate(ts), [ts]);
  const fileName = (ts.prefix.replace(/[^a-z0-9_]+/gi, '_').toLowerCase() || 'theme').replace(/_/g, '-') + '-setup.php';
  const refEnabled = (ts.enabled || []).length
    ? (ts.enabled || []).map((f) => `add_theme_support( '${f}' );`).join('\n')
    : 'Nothing enabled yet.';

  function focusField(id: string) {
    fieldRefs.current[id]?.focus();
  }
  function fix(kind: string) {
    commit((draft) => Object.assign(draft, applyFix(draft, kind)));
  }

  function toggleFeature(f: string) {
    commit((p) => {
      p.enabled = p.enabled || [];
      const i = p.enabled.indexOf(f);
      if (i >= 0) p.enabled.splice(i, 1);
      else p.enabled.push(f);
      p.preset = 'custom';
    });
  }

  return (
    <GeneratorShell
      category="design"
      title="Theme Support Generator"
      description="The setup block every theme needs, with the feature flags you chose and the arguments each one really accepts — plus the image sizes and menus that belong beside them."
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
            <div className="gfw-mono" style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 4 }}>add_theme_support()</div>
            <div style={{ fontSize: 12, color: 'var(--gfw-text-mutest)', marginBottom: 14 }}>Called on after_setup_theme, before init</div>

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>Features you turned on</div>
            <pre className="gfw-mono" style={{ border: '1px solid var(--gfw-border)', borderRadius: 7, padding: '12px 14px', background: 'var(--gfw-surface-sunken)', fontSize: 11.5, lineHeight: 1.7, whiteSpace: 'pre-wrap', marginBottom: 18 }}>{refEnabled}</pre>

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>Timing</div>
            <div style={{ fontSize: 12.5, color: 'var(--gfw-text-strong)', lineHeight: 1.65, marginBottom: 18 }}>after_setup_theme is the only safe hook: core checks several of these flags before init runs. A theme that calls add_theme_support() on init finds post thumbnails half-working and block styles ignored.</div>

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>Every flag, in short</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 18 }}>
              {REF_ARGS.map((ra) => (
                <div key={ra.name} style={{ borderBottom: '1px solid var(--gfw-border-muted)', paddingBottom: 9 }}>
                  <div className="gfw-mono" style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--gfw-text-strong)' }}>{ra.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--gfw-text-muted)', lineHeight: 1.5, marginTop: 3 }}>{ra.description}</div>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>Block themes</div>
            <div style={{ fontSize: 12.5, color: 'var(--gfw-text-strong)', lineHeight: 1.65 }}>A theme with a theme.json gets appearance-tools, block templates and most editor settings from that file instead. Declaring them twice is not an error, but theme.json wins — keep the flags here for the classic features it does not cover.</div>
          </div>
        ),
      }}
      form={
        <div>
          <div className="field-card field-card-primary">
            <div className="field-card-title">Theme kind</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
              {Object.keys(PRESETS).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => commit((p) => { p.preset = k; p.enabled = PRESETS[k].on.slice(); })}
                  className={`chip${ts.preset === k ? ' is-active' : ''}`}
                >
                  {PRESETS[k].label}
                </button>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>function prefix</label>
                <input className="input gfw-mono" value={ts.prefix} onChange={(e) => commit((p) => (p.prefix = e.target.value), 'prefix')} />
              </div>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>text domain</label>
                <input className="input gfw-mono" value={ts.textDomain} onChange={(e) => commit((p) => (p.textDomain = e.target.value), 'textDomain')} />
              </div>
            </div>
          </div>

          <div className="field-card">
            <div className="field-card-title">Features</div>
            {FEATURES.map(([key, label, items]) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <div className="field-label" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 11 }}>{label}</div>
                {items.map(([name, help]) => (
                  <ToggleRow
                    key={name}
                    label={name}
                    help={help}
                    checked={ts.enabled.includes(name)}
                    onChange={() => toggleFeature(name)}
                  />
                ))}
              </div>
            ))}
          </div>

          <div className="field-card">
            <div className="field-card-title">Image sizes</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {ts.sizes.map((s, i) => (
                <RepeatableCard
                  key={i}
                  index={i}
                  count={ts.sizes.length}
                  title={s.name || `Image size ${i + 1}`}
                  subtitle={`${s.width || '?'}×${s.height || '?'}`}
                  drag={drag.bind('sizes', i, sizes.reorder)}
                  onMoveUp={() => sizes.moveUp(i)}
                  onMoveDown={() => sizes.moveDown(i)}
                  onRemove={() => sizes.remove(i)}
                >
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input className="input" style={{ flex: '1 1 120px' }} placeholder="size-name" value={s.name} onChange={(e) => commit((p) => (p.sizes[i].name = e.target.value), `size-name-${i}`)} />
                    <input className="input gfw-mono" style={{ width: 90 }} placeholder="w" value={s.width} onChange={(e) => commit((p) => (p.sizes[i].width = e.target.value), `size-width-${i}`)} />
                    <input className="input gfw-mono" style={{ width: 90 }} placeholder="h" value={s.height} onChange={(e) => commit((p) => (p.sizes[i].height = e.target.value), `size-height-${i}`)} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <Toggle checked={s.crop} onChange={(v) => commit((p) => (p.sizes[i].crop = v))} ariaLabel="crop" />
                      <span style={{ fontSize: 12.5 }}>crop</span>
                    </div>
                  </div>
                </RepeatableCard>
              ))}
              {!ts.sizes.length && <div className="field-hint">No custom sizes. Every size you add is another file per upload — add them deliberately.</div>}
            </div>
            <button type="button" className="btn btn-ghost btn-sm repeatable-add" style={{ marginTop: 11 }} onClick={() => commit((p) => p.sizes.push({ name: 'size-' + (p.sizes.length + 1), width: '800', height: '600', crop: true }))}>
              Add image size
            </button>
            <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>post thumbnail size</label>
                <input className="input gfw-mono" value={ts.thumbSize} onChange={(e) => commit((p) => (p.thumbSize = e.target.value), 'thumbSize')} placeholder="1200, 675, true" />
                <div className="field-hint">width, height, crop — leave empty to skip set_post_thumbnail_size().</div>
              </div>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>content_width</label>
                <input className="input gfw-mono" value={ts.contentWidth} onChange={(e) => commit((p) => (p.contentWidth = e.target.value), 'contentWidth')} placeholder="1200" />
              </div>
            </div>
          </div>
        </div>
      }
    />
  );
}
