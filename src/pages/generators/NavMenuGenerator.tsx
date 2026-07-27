import { useMemo, useRef, useState } from 'react';
import { GeneratorShell } from '../../components/generator/GeneratorShell';
import { CopyableCodePreview } from '../../components/generator/CopyableCodePreview';
import { ToggleRow } from '../../components/ui/Toggle';
import { useEditorState } from '../../lib/useEditorState';
import {
  START_PRESETS,
  applyFix,
  buildCode,
  buildTemplate,
  derive,
  freshProject,
  validate,
  type NavMenu,
  type OutputMode,
} from '../../generators/navMenu';
import { escPhp } from '../../lib/codegen';

const OUTPUT_MODES: { id: OutputMode; label: string }[] = [
  { id: 'snippet', label: 'Snippet' },
  { id: 'functions', label: 'functions.php' },
  { id: 'plugin', label: 'Plugin file' },
];

function padTo(s: string, w: number): string {
  return s + ' '.repeat(Math.max(0, w - s.length));
}

const REF_ARGS = [
  { name: 'theme_location', type: 'string', description: "The registered location slug. Without it wp_nav_menu() falls back to the first menu it can find, which is why menus sometimes appear in the wrong place." },
  { name: 'menu', type: 'int|string|WP_Term', description: 'A specific menu by id, slug or name. Use it only when the menu must not be swappable by the site owner.' },
  { name: 'container / container_class', type: 'string|false', description: 'The wrapper element. false lets you write your own markup — usually cleaner than fighting the default div.' },
  { name: 'items_wrap', type: 'string', description: 'The ul template. %1$s is the id, %2$s the class, %3$s the items themselves.' },
  { name: 'depth', type: 'int', description: '0 is unlimited, 1 flattens the menu, 2 allows one dropdown level.' },
  { name: 'fallback_cb', type: 'callable|false', description: 'Runs when no menu is assigned. Defaults to wp_page_menu, which lists every page — almost never what you want on a live site.' },
  { name: 'walker', type: 'Walker', description: 'A custom walker rewrites the markup entirely. Try the core classes first: most needs are covered by CSS on menu-item-has-children.' },
];

export function NavMenuGenerator() {
  const { state: nm, commit, undo, redo, reset, canUndo, canRedo, savedLabel } = useEditorState<NavMenu>('nav-menu-generator-v1', freshProject);
  const [outputMode, setOutputMode] = useState<OutputMode>('snippet');
  const [activeLocation, setActiveLocation] = useState('');
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});

  const d = useMemo(() => derive(nm), [nm]);
  const code = useMemo(() => buildCode(nm, outputMode), [nm, outputMode]);
  const issues = useMemo(() => validate(nm), [nm]);
  const fileName = (nm.prefix.replace(/[^a-z0-9_]+/gi, '_').toLowerCase() || 'theme').replace(/_/g, '-') + '-nav-menus.php';

  const activeLoc = d.locations.find((l) => l.slug === activeLocation) || d.locations[0] || null;
  const templateCode = useMemo(() => buildTemplate(nm, activeLoc), [nm, activeLoc]);

  const refHookLabel = `Registered on ${d.hook} · read by Appearance → Menus`;
  const refSignature = `register_nav_menus(\n\tarray(\n${d.locations.map((l) => `\t\t'${l.slug}' => __( '${escPhp(l.name)}', '${d.td}' ),`).join('\n')}\n\t)\n);`;
  const refRegistered = d.locations.length
    ? d.locations.map((l) => padTo(l.slug, 14) + ' ' + l.name + '  ·  ' + l.where).join('\n')
    : 'Nothing registered yet.';

  function focusField(id: string) {
    fieldRefs.current[id]?.focus();
  }
  function fix(kind: string) {
    commit((draft) => Object.assign(draft, applyFix(draft, kind)));
  }

  function moveLocation(i: number, dir: -1 | 1) {
    commit((p) => {
      const j = i + dir;
      if (j < 0 || j >= p.locations.length) return;
      const t = p.locations[j];
      p.locations[j] = p.locations[i];
      p.locations[i] = t;
    });
  }

  return (
    <GeneratorShell
      category="design"
      title="Nav Menu Generator"
      description="Menu locations for Appearance → Menus, plus the wp_nav_menu() call with a fallback that stays quiet instead of listing every page you have."
      code={code}
      filename={fileName}
      primaryTabLabel="Register"
      editor={{ canUndo, canRedo, onUndo: undo, onRedo: redo, onNew: reset, savedLabel }}
      issues={issues}
      onFix={fix}
      onFocusField={focusField}
      outputModes={OUTPUT_MODES}
      activeOutputMode={outputMode}
      onOutputModeChange={(id) => setOutputMode(id as OutputMode)}
      secondaryTab={{
        label: 'Template',
        content: <CopyableCodePreview code={templateCode} filename={activeLoc ? activeLoc.where : 'header.php'} />,
      }}
      extraSecondaryTabs={[
        {
          label: 'Reference',
          content: (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <div className="gfw-mono" style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 4 }}>register_nav_menus()</div>
              <div style={{ fontSize: 12, color: 'var(--gfw-text-mutest)', marginBottom: 14 }}>{refHookLabel}</div>
              <pre className="gfw-mono" style={{ border: '1px solid var(--gfw-border)', borderRadius: 7, padding: '12px 14px', background: 'var(--gfw-surface-sunken)', fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginBottom: 18 }}>{refSignature}</pre>

              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>wp_nav_menu() arguments worth knowing</div>
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

              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>Registered locations</div>
              <pre className="gfw-mono" style={{ border: '1px solid var(--gfw-border)', borderRadius: 7, padding: '12px 14px', background: 'var(--gfw-surface-sunken)', fontSize: 11.5, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginBottom: 18 }}>{refRegistered}</pre>

              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>The classes core adds</div>
              <div style={{ fontSize: 12.5, color: 'var(--gfw-text-strong)', lineHeight: 1.65 }}>Each item gets menu-item, menu-item-{'{id}'} and menu-item-object-{'{page|post|category}'}. The current page carries current-menu-item, its ancestors current-menu-ancestor, and items with children menu-item-has-children. Style those rather than adding your own walker — most "I need a custom walker" problems are one CSS rule.</div>
            </div>
          ),
        },
      ]}
      form={
        <div>
          <div className="field-card field-card-primary">
            <div className="field-card-title">Menu locations</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 10 }}>
              {START_PRESETS.map(([label, locations]) => (
                <button key={label} type="button" onClick={() => commit((p) => (p.locations = locations.map((l) => ({ ...l }))))} className="chip">
                  {label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {nm.locations.map((l, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    className="input"
                    style={{ flex: '1.2 1 120px' }}
                    placeholder="Primary Menu"
                    value={l.name}
                    onChange={(e) => commit((p) => (p.locations[i].name = e.target.value), `loc-name-${i}`)}
                  />
                  <input
                    className="input gfw-mono"
                    style={{ width: 130 }}
                    spellCheck={false}
                    placeholder="primary"
                    value={l.slug}
                    onChange={(e) => commit((p) => (p.locations[i].slug = e.target.value), `loc-slug-${i}`)}
                  />
                  <input
                    className="input gfw-mono"
                    style={{ width: 130 }}
                    placeholder="header.php"
                    value={l.where}
                    onChange={(e) => commit((p) => (p.locations[i].where = e.target.value), `loc-where-${i}`)}
                  />
                  <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                    <button type="button" aria-label="Move up" title="Move up" onClick={() => moveLocation(i, -1)} className="btn btn-ghost btn-sm">↑</button>
                    <button type="button" aria-label="Move down" title="Move down" onClick={() => moveLocation(i, 1)} className="btn btn-ghost btn-sm">↓</button>
                    <button type="button" aria-label="Remove location" title="Remove location" onClick={() => commit((p) => p.locations.splice(i, 1))} className="btn btn-ghost btn-sm">×</button>
                  </div>
                </div>
              ))}
              {!nm.locations.length && <div className="field-hint">No locations — Appearance → Menus will have nowhere to assign a menu.</div>}
            </div>
            <button type="button" onClick={() => commit((p) => p.locations.push({ slug: 'menu-' + (p.locations.length + 1), name: 'Menu ' + (p.locations.length + 1), where: 'header.php' }))} className="btn btn-ghost btn-sm" style={{ marginTop: 11 }}>
              Add location
            </button>
          </div>

          <div className="field-card">
            <div className="field-card-title">The wp_nav_menu() call</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
              {d.locations.map((l) => (
                <button key={l.slug} type="button" onClick={() => setActiveLocation(l.slug)} className={`chip gfw-mono${activeLoc && activeLoc.slug === l.slug ? ' is-active' : ''}`}>
                  {l.slug}
                </button>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>container</label>
                <select className="select" value={nm.container} onChange={(e) => commit((p) => (p.container = e.target.value as NavMenu['container']))}>
                  <option value="false">false — no wrapper</option>
                  <option value="nav">nav</option>
                  <option value="div">div</option>
                </select>
              </div>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>menu_class</label>
                <input className="input gfw-mono" spellCheck={false} placeholder="menu" value={nm.menuClass} onChange={(e) => commit((p) => (p.menuClass = e.target.value), 'menuClass')} />
              </div>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>menu_id</label>
                <input className="input gfw-mono" spellCheck={false} placeholder="primary-menu" value={nm.menuId} onChange={(e) => commit((p) => (p.menuId = e.target.value), 'menuId')} />
              </div>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>depth</label>
                <select className="select" value={nm.depth} onChange={(e) => commit((p) => (p.depth = e.target.value))}>
                  <option value="0">0 — unlimited</option>
                  <option value="1">1 — flat, no children</option>
                  <option value="2">2 — one dropdown level</option>
                  <option value="3">3 — two dropdown levels</option>
                </select>
              </div>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>fallback_cb</label>
                <select className="select" value={nm.fallback} onChange={(e) => commit((p) => (p.fallback = e.target.value as NavMenu['fallback']))}>
                  <option value="false">false — print nothing</option>
                  <option value="page_menu">wp_page_menu — list pages</option>
                  <option value="custom">Your own callback</option>
                </select>
              </div>
              {nm.fallback === 'custom' && (
                <div>
                  <label className="field-label gfw-mono" style={{ fontSize: 11 }}>callback name</label>
                  <input className="input gfw-mono" spellCheck={false} placeholder="mytheme_menu_fallback" value={nm.fallbackName} onChange={(e) => commit((p) => (p.fallbackName = e.target.value), 'fallbackName')} />
                </div>
              )}
            </div>
            <div style={{ marginTop: 12 }}>
              <label className="field-label gfw-mono" style={{ fontSize: 11 }}>items_wrap</label>
              <input className="input gfw-mono" spellCheck={false} value={nm.itemsWrap} onChange={(e) => commit((p) => (p.itemsWrap = e.target.value), 'itemsWrap')} />
              <div className="field-hint">%1$s is the menu_id, %2$s the menu_class, %3$s the items. Drop %3$s and the menu renders empty.</div>
            </div>
          </div>

          <div className="field-card">
            <div className="field-card-title">Naming &amp; shape</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>function prefix</label>
                <input className="input gfw-mono" value={nm.prefix} onChange={(e) => commit((p) => (p.prefix = e.target.value), 'prefix')} />
              </div>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>text domain</label>
                <input className="input gfw-mono" value={nm.textDomain} onChange={(e) => commit((p) => (p.textDomain = e.target.value), 'textDomain')} />
              </div>
            </div>
            <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span className="field-label" style={{ margin: 0 }}>Registration</span>
              {(['after_setup_theme', 'init'] as const).map((h) => (
                <button key={h} type="button" onClick={() => commit((p) => (p.hook = h))} className={`chip gfw-mono${nm.hook === h ? ' is-active' : ''}`}>
                  {h}
                </button>
              ))}
            </div>
          </div>

          <div className="toggle-card">
            <div className="toggle-card-title">Template output</div>
            <ToggleRow
              label="has_nav_menu() guard"
              checked={nm.hasMenuGuard}
              onChange={(v) => commit((p) => (p.hasMenuGuard = v))}
            />
            <ToggleRow
              label="Wrap in a labelled nav"
              checked={nm.ariaWrapper}
              onChange={(v) => commit((p) => (p.ariaWrapper = v))}
            />
          </div>
        </div>
      }
    />
  );
}
