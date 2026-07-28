import { useMemo, useRef } from 'react';
import { GeneratorShell } from '../../components/generator/GeneratorShell';
import { CopyableCodePreview } from '../../components/generator/CopyableCodePreview';
import { RepeatableCard } from '../../components/ui/RepeatableCard';
import { ToggleRow } from '../../components/ui/Toggle';
import { useDragReorder } from '../../lib/dragReorder';
import { useEditorState } from '../../lib/useEditorState';
import { useListOps } from '../../lib/useListOps';
import {
  CONTROLS,
  applyFix,
  buildJSON,
  cssVarList,
  freshProject,
  scaleSizes,
  validate,
  type ThemeJson,
} from '../../generators/themeJson';

export function ThemeJsonGenerator() {
  const { state: tj, commit, undo, redo, reset, canUndo, canRedo, savedLabel } = useEditorState<ThemeJson>('theme-json-generator-v1', freshProject);
  const drag = useDragReorder();
  const colors = useListOps<ThemeJson>(commit)((p) => p.colors);
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});

  const json = useMemo(() => buildJSON(tj), [tj]);
  const vars = useMemo(() => cssVarList(tj), [tj]);
  const issues = useMemo(() => validate(tj), [tj]);
  const sizes = useMemo(() => scaleSizes(tj), [tj]);
  const on = tj.controls || [];

  function focusField(id: string) {
    fieldRefs.current[id]?.focus();
  }
  function fix(kind: string) {
    commit((draft) => Object.assign(draft, applyFix(draft, kind)));
  }

  function toggleControl(key: string) {
    commit((p) => {
      p.controls = p.controls || [];
      const i = p.controls.indexOf(key);
      if (i >= 0) p.controls.splice(i, 1);
      else p.controls.push(key);
    });
  }

  function toggleBool(key: 'appearanceTools' | 'fluidType' | 'keepCorePalette' | 'headingStyles' | 'buttonStyles' | 'templateParts' | 'customTokens') {
    commit((p) => {
      p[key] = !p[key];
    });
  }

  const extraToggles: { key: 'appearanceTools' | 'fluidType' | 'keepCorePalette' | 'headingStyles' | 'buttonStyles' | 'templateParts' | 'customTokens'; label: string; help: string }[] = [
    { key: 'appearanceTools', label: 'appearanceTools', help: 'Turns on border, colour, spacing and typography controls in one line.' },
    { key: 'fluidType', label: 'Fluid typography', help: 'Font sizes interpolate between viewports automatically.' },
    { key: 'keepCorePalette', label: 'Keep core’s palette', help: 'Leaves WordPress’s default colours in the picker alongside yours.' },
    { key: 'headingStyles', label: 'Heading style layer', help: 'Sets the heading font, weight and per-level sizes from your scale.' },
    { key: 'buttonStyles', label: 'Button style layer', help: 'Colours, radius and padding for the button element.' },
    { key: 'templateParts', label: 'Declare template parts', help: 'header and footer parts, as a block theme expects.' },
    { key: 'customTokens', label: 'settings.custom examples', help: 'Two custom tokens, to show how --wp--custom-- names are built.' },
  ];

  const refArgs = [
    { name: 'version', description: 'Schema version. 3 is current; the number changes how some defaults are interpreted, so do not bump it casually.' },
    { name: 'settings', description: 'What the editor offers: palettes, font sizes, spacing steps, and which controls appear at all. Presets here become CSS custom properties.' },
    { name: 'styles', description: 'What the site actually renders by default — the values, not the options. Supports element and block-level layers.' },
    { name: 'templateParts / customTemplates', description: 'Declares the parts and templates a block theme ships, with their areas.' },
  ];

  return (
    <GeneratorShell
      category="design"
      title="theme.json Generator"
      description="Palette, type scale, spacing and layout in one file — and the CSS custom properties WordPress generates from them, so you know what to write in your stylesheet."
      code={json}
      filename="theme.json"
      language="plain"
      primaryTabLabel="JSON"
      editor={{ canUndo, canRedo, onUndo: undo, onRedo: redo, onNew: reset, savedLabel }}
      issues={issues}
      onFix={fix}
      onFocusField={focusField}
      secondaryTab={{
        label: 'CSS vars',
        content: <CopyableCodePreview code={vars} filename="vars.css" language="plain" />,
      }}
      extraSecondaryTabs={[
        {
          label: 'Reference',
          content: (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <div className="gfw-mono" style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 4 }}>theme.json</div>
              <div style={{ fontSize: 12, color: 'var(--gfw-text-mutest)', marginBottom: 14 }}>Read once, at the theme root. No hook, no PHP.</div>

              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>The four top-level keys</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 18 }}>
                {refArgs.map((ra) => (
                  <div key={ra.name} style={{ borderBottom: '1px solid var(--gfw-border)', paddingBottom: 9 }}>
                    <div className="gfw-mono" style={{ fontSize: 12.5, fontWeight: 700 }}>{ra.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--gfw-text-muted)', lineHeight: 1.5, marginTop: 3 }}>{ra.description}</div>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>settings turn controls on, styles set values</div>
              <div style={{ fontSize: 12.5, color: 'var(--gfw-text-strong)', lineHeight: 1.65, marginBottom: 18 }}>A colour in settings.color.palette appears as a swatch a user can pick. The same colour under styles.color.background is what the site actually renders by default. Confusing the two is why themes ship palettes that nothing uses.</div>

              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>Custom properties are predictable</div>
              <div style={{ fontSize: 12.5, color: 'var(--gfw-text-strong)', lineHeight: 1.65, marginBottom: 18 }}>Every preset becomes --wp--preset--{'{category}'}--{'{slug}'}, and everything under settings.custom becomes --wp--custom--{'{path}'}. That naming is stable, which makes theme.json a design-token file you can rely on from plain CSS.</div>

              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>Specificity</div>
              <div style={{ fontSize: 12.5, color: 'var(--gfw-text-strong)', lineHeight: 1.65 }}>Styles generated from theme.json land in a stylesheet core prints in the head, before your theme's style.css. That means your CSS wins — but a user's change in the Site Editor is stored separately and beats both.</div>
            </div>
          ),
        },
      ]}
      form={
        <div>
          <div className="field-card field-card-primary">
            <div className="field-card-title">Colour palette</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {tj.colors.map((c, i) => (
                <RepeatableCard
                  key={i}
                  index={i}
                  count={tj.colors.length}
                  title={c.name || `Colour ${i + 1}`}
                  subtitle={c.slug}
                  drag={drag.bind('colors', i, colors.reorder)}
                  onMoveUp={() => colors.moveUp(i)}
                  onMoveDown={() => colors.moveDown(i)}
                  onRemove={() => colors.remove(i)}
                >
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ width: 30, height: 30, borderRadius: 5, border: '1px solid var(--gfw-border)', background: /^#|rgb|hsl|oklch/.test(c.color || '') ? c.color : '#fff', flexShrink: 0 }} />
                    <input className="input" style={{ flex: '1 1 110px' }} placeholder="Primary" value={c.name} onChange={(e) => commit((p) => (p.colors[i].name = e.target.value), `color-name-${i}`)} />
                    <input className="input gfw-mono" style={{ width: 110 }} spellCheck={false} placeholder="primary" value={c.slug} onChange={(e) => commit((p) => (p.colors[i].slug = e.target.value), `color-slug-${i}`)} />
                    <input className="input gfw-mono" style={{ width: 110 }} spellCheck={false} placeholder="#3858E9" value={c.color} onChange={(e) => commit((p) => (p.colors[i].color = e.target.value), `color-color-${i}`)} />
                  </div>
                </RepeatableCard>
              ))}
            </div>
            <button type="button" className="btn btn-ghost btn-sm repeatable-add" style={{ marginTop: 11 }} onClick={() => commit((p) => p.colors.push({ slug: 'colour-' + (p.colors.length + 1), name: 'Colour ' + (p.colors.length + 1), color: '#000000' }))}>
              Add colour
            </button>
          </div>

          <div className="field-card">
            <div className="field-card-title">Typography</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12, marginBottom: 13 }}>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>body font family</label>
                <input className="input" spellCheck={false} placeholder="Instrument Sans, sans-serif" value={tj.bodyFont} onChange={(e) => commit((p) => (p.bodyFont = e.target.value), 'bodyFont')} />
              </div>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>heading font family</label>
                <input className="input" spellCheck={false} placeholder="Same as body" value={tj.headingFont} onChange={(e) => commit((p) => (p.headingFont = e.target.value), 'headingFont')} />
              </div>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>base size</label>
                <input className="input gfw-mono" spellCheck={false} placeholder="1rem" value={tj.baseSize} onChange={(e) => commit((p) => (p.baseSize = e.target.value), 'baseSize')} />
              </div>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>scale ratio</label>
                <select className="select" value={tj.scale} onChange={(e) => commit((p) => (p.scale = e.target.value))}>
                  <option value="1.125">1.125 — major second</option>
                  <option value="1.2">1.2 — minor third</option>
                  <option value="1.25">1.25 — major third</option>
                  <option value="1.333">1.333 — perfect fourth</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end', padding: '11px 13px', background: 'var(--gfw-bg-subtle, #FBFAF7)', border: '1px solid var(--gfw-border)', borderRadius: 7 }}>
              {sizes.map((s) => (
                <div key={s.slug} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: Math.min(38, Math.max(11, s.px)), fontWeight: 600, lineHeight: 1.1 }}>Aa</div>
                  <div className="gfw-mono" style={{ fontSize: 10, color: 'var(--gfw-text-faint)', marginTop: 4 }}>{s.slug}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="field-card">
            <div className="field-card-title">Layout and spacing</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12 }}>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>contentSize</label>
                <input className="input gfw-mono" spellCheck={false} placeholder="720px" value={tj.contentSize} onChange={(e) => commit((p) => (p.contentSize = e.target.value), 'contentSize')} />
              </div>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>wideSize</label>
                <input className="input gfw-mono" spellCheck={false} placeholder="1200px" value={tj.wideSize} onChange={(e) => commit((p) => (p.wideSize = e.target.value), 'wideSize')} />
              </div>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>spacing scale steps</label>
                <select className="select" value={tj.spacingSteps} onChange={(e) => commit((p) => (p.spacingSteps = e.target.value))}>
                  <option value="0">none — custom values only</option>
                  <option value="5">5 steps</option>
                  <option value="7">7 steps — core default</option>
                  <option value="9">9 steps</option>
                </select>
              </div>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>root padding</label>
                <input className="input gfw-mono" spellCheck={false} placeholder="clamp(1rem, 4vw, 2rem)" value={tj.rootPadding} onChange={(e) => commit((p) => (p.rootPadding = e.target.value), 'rootPadding')} />
              </div>
            </div>
          </div>

          <div className="field-card">
            <div className="field-card-title">Editor controls</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {CONTROLS.map(([key, help]) => (
                <button key={key} type="button" title={help} onClick={() => toggleControl(key)} className={`chip gfw-mono${on.includes(key) ? ' is-active' : ''}`}>
                  {key}
                </button>
              ))}
            </div>
            <div className="field-hint" style={{ marginTop: 11 }}>Off means the control is hidden from the editor entirely — the fastest way to stop a client changing every colour on the site.</div>
          </div>

          <div className="toggle-card">
            <div className="toggle-card-title">Style layers</div>
            {extraToggles.map((tg) => (
              <ToggleRow
                key={tg.key}
                label={tg.label}
                help={tg.help}
                checked={!!tj[tg.key]}
                onChange={() => toggleBool(tg.key)}
              />
            ))}
          </div>
        </div>
      }
    />
  );
}
