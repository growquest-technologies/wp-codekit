import { useMemo, useRef, useState } from 'react';
import { GeneratorShell } from '../../components/generator/GeneratorShell';
import { Collapsible } from '../../components/ui/Collapsible';
import { Toggle, ToggleRow } from '../../components/ui/Toggle';
import { CheckboxChip } from '../../components/ui/CheckboxChip';
import { useEditorState } from '../../lib/useEditorState';
import {
  BUILTIN_TAX,
  DASHICONS,
  MENU_POSITIONS,
  SUPPORTS_OPTIONS,
  applyFix,
  autoLabels,
  buildCode,
  effective,
  freshProject,
  validate,
  type OutputMode,
  type PostType,
} from '../../generators/postType';
import { slugify } from '../../lib/codegen';

const OUTPUT_MODES: { id: OutputMode; label: string }[] = [
  { id: 'snippet', label: 'Snippet' },
  { id: 'functions', label: 'functions.php' },
  { id: 'plugin', label: 'Plugin file' },
];

const sampleDomain = 'example.com';

export function PostTypeGenerator() {
  const { state: pt, commit, undo, redo, reset, canUndo, canRedo, savedLabel } = useEditorState<PostType>('post-type-generator-v1', freshProject);
  const [outputMode, setOutputMode] = useState<OutputMode>('snippet');
  const [customTaxDraft, setCustomTaxDraft] = useState('');
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});

  function onSingularChange(value: string) {
    commit((p) => {
      const wasAuto = !p.pluralEdited;
      const wasKeyAuto = !p.keyEdited;
      p.singular = value;
      if (wasAuto) p.plural = value ? value + 's' : '';
      if (wasKeyAuto) p.key = slugify(value, 20);
    }, 'singular');
  }

  const code = useMemo(() => buildCode(pt, outputMode), [pt, outputMode]);
  const issues = useMemo(() => validate(pt), [pt]);
  const fileName = (pt.key || 'post-type').replace(/_/g, '-') + '.php';
  const eff = useMemo(() => effective(pt), [pt]);

  const permalinkRows = useMemo(() => {
    const key = pt.key || 'item';
    const rows: { label: string; url: string; state: string; stateColor: string; accent: string; bg: string; urlColor: string; note?: string }[] = [];

    const single = eff.rewriteOn ? `https://${sampleDomain}/${eff.slug}/sample-${key}/` : `https://${sampleDomain}/?${key}=sample-${key}`;
    rows.push({
      label: 'Single', url: single, state: eff.publiclyQueryable ? 'Reachable' : 'Not queryable',
      stateColor: eff.publiclyQueryable ? '#1F7A4C' : '#B45309', accent: eff.publiclyQueryable ? '#1F7A4C' : '#D9D4C8',
      bg: eff.publiclyQueryable ? '#fff' : '#FCFBF9', urlColor: eff.publiclyQueryable ? '#26221C' : 'var(--gfw-text-faint)',
      note: !pt.adv.withFront ? 'with_front is off, so the permalink base (e.g. /blog) is not prepended.' : undefined,
    });

    rows.push({
      label: 'Archive', url: pt.hasArchive ? `https://${sampleDomain}/${eff.archiveSlug}/` : '— has_archive is off',
      state: pt.hasArchive ? (eff.rewriteOn ? 'Enabled' : 'Query string only') : 'Disabled',
      stateColor: pt.hasArchive ? (eff.rewriteOn ? '#1F7A4C' : '#B45309') : 'var(--gfw-text-mutest)',
      accent: pt.hasArchive ? '#1F7A4C' : '#D9D4C8', bg: pt.hasArchive ? '#fff' : '#FCFBF9',
      urlColor: pt.hasArchive ? '#26221C' : 'var(--gfw-text-faint)',
      note: pt.hasArchive && !eff.rewriteOn ? `Reachable at ?post_type=${key} while rewrite is false.` : undefined,
    });

    rows.push({
      label: 'Query var', url: eff.queryVar === false ? '— query_var is false' : `https://${sampleDomain}/?${eff.queryVar}=sample-${key}`,
      state: eff.queryVar === false ? 'Disabled' : 'Enabled', stateColor: eff.queryVar === false ? 'var(--gfw-text-mutest)' : '#1F7A4C',
      accent: eff.queryVar === false ? '#D9D4C8' : '#1F7A4C', bg: eff.queryVar === false ? '#FCFBF9' : '#fff',
      urlColor: eff.queryVar === false ? 'var(--gfw-text-faint)' : '#26221C',
    });

    rows.push({
      label: 'REST', url: pt.showInRest ? `https://${sampleDomain}/wp-json/${eff.restNamespace}/${eff.restBase}` : '— show_in_rest is false',
      state: pt.showInRest ? 'Block editor ready' : 'Classic editor only', stateColor: pt.showInRest ? '#1F7A4C' : '#B45309',
      accent: pt.showInRest ? '#1F7A4C' : '#D9D4C8', bg: pt.showInRest ? '#fff' : '#FCFBF9',
      urlColor: pt.showInRest ? '#26221C' : 'var(--gfw-text-faint)',
    });

    rows.push({
      label: 'Admin', url: eff.showUi ? `https://${sampleDomain}/wp-admin/edit.php?post_type=${key}` : '— show_ui is false',
      state: eff.showUi ? 'Listed in admin' : 'No admin screen', stateColor: eff.showUi ? '#1F7A4C' : '#B45309',
      accent: eff.showUi ? '#1F7A4C' : '#D9D4C8', bg: eff.showUi ? '#fff' : '#FCFBF9',
      urlColor: eff.showUi ? '#26221C' : 'var(--gfw-text-faint)',
      note: pt.adv.showInMenuString ? `Nested under ${pt.adv.showInMenuString} rather than a top-level menu.` : undefined,
    });

    return rows;
  }, [pt, eff]);

  function focusField(id: string) {
    fieldRefs.current[id]?.focus();
  }

  function fix(kind: string) {
    commit((draft) => Object.assign(draft, applyFix(draft, kind)));
  }

  function toggleSupport(s: string) {
    commit((p) => {
      const i = p.supports.indexOf(s);
      if (i === -1) p.supports.push(s);
      else p.supports.splice(i, 1);
    });
  }

  function toggleBuiltinTax(id: string) {
    commit((p) => {
      const i = p.taxonomies.indexOf(id);
      if (i === -1) p.taxonomies.push(id);
      else p.taxonomies.splice(i, 1);
    });
  }

  function addCustomTax() {
    const v = slugify(customTaxDraft);
    if (!v || pt.customTax.includes(v)) return;
    commit((p) => p.customTax.push(v));
    setCustomTaxDraft('');
  }

  function removeCustomTax(v: string) {
    commit((p) => {
      p.customTax = p.customTax.filter((t) => t !== v);
    });
  }

  return (
    <GeneratorShell
      category="content"
      title="Custom Post Type Generator"
      description={
        <>
          Name it, pick what it supports, copy the <span className="gfw-mono" style={{ fontSize: 12 }}>register_post_type()</span> call. Everything else stays out of your way until you ask for it.
        </>
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
        label: 'Permalinks',
        content: (
          <div>
            <div style={{ fontSize: 11.5, color: 'var(--gfw-text-mutest)', lineHeight: 1.5, marginBottom: 12 }}>
              URLs this registration produces on <span className="gfw-mono" style={{ fontSize: 11 }}>{sampleDomain}</span>. Flush rewrite rules once after registering.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {permalinkRows.map((pl) => (
                <div key={pl.label} style={{ border: '1px solid #E7E2D9', borderLeft: `3px solid ${pl.accent}`, borderRadius: 6, padding: '10px 12px', background: pl.bg }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)' }}>{pl.label}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: pl.stateColor }}>{pl.state}</span>
                  </div>
                  <div className="gfw-mono" style={{ fontSize: 12, lineHeight: 1.5, color: pl.urlColor, wordBreak: 'break-all' }}>{pl.url}</div>
                  {pl.note && <div style={{ fontSize: 11, color: 'var(--gfw-text-mutest)', marginTop: 5, lineHeight: 1.45 }}>{pl.note}</div>}
                </div>
              ))}
            </div>
          </div>
        ),
      }}
      form={
        <div>
          <div className="field-card field-card-primary">
            <div className="field-card-title">Naming</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 16px' }}>
              <div>
                <label className="field-label" htmlFor="pt-singular">Singular name</label>
                <input
                  id="pt-singular"
                  ref={(el) => (fieldRefs.current.singular = el)}
                  className="input"
                  value={pt.singular}
                  onChange={(e) => onSingularChange(e.target.value)}
                  placeholder="Book"
                />
              </div>
              <div>
                <label className="field-label" htmlFor="pt-plural">Plural name</label>
                <input
                  id="pt-plural"
                  ref={(el) => (fieldRefs.current.plural = el)}
                  className="input"
                  value={pt.plural}
                  onChange={(e) => commit((p) => { p.plural = e.target.value; p.pluralEdited = true; }, 'plural')}
                  placeholder="Books"
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="field-label" htmlFor="pt-key">Post type key</label>
                <input
                  id="pt-key"
                  ref={(el) => (fieldRefs.current.key = el)}
                  className="input gfw-mono"
                  spellCheck={false}
                  value={pt.key}
                  onChange={(e) => commit((p) => { p.key = e.target.value; p.keyEdited = true; }, 'key')}
                  placeholder="book"
                />
                <div className="field-hint">Used in the database and in code. Max 20 characters, lowercase letters/numbers/dashes/underscores only.</div>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="field-label" htmlFor="pt-desc">
                  Description <span style={{ fontWeight: 600, color: 'var(--gfw-text-faint)' }}>optional</span>
                </label>
                <textarea
                  id="pt-desc"
                  rows={2}
                  className="textarea"
                  value={pt.description}
                  onChange={(e) => commit((p) => (p.description = e.target.value), 'description')}
                  placeholder="A short summary of what this post type holds."
                />
              </div>
            </div>
          </div>

          <div className="toggle-card">
            <div className="toggle-card-title">Behaviour</div>
            <ToggleRow
              label="Public"
              help="Visible on the front end and in the admin. Off means an internal-only type."
              checked={pt.public}
              onChange={(v) => commit((p) => (p.public = v))}
            />
            <ToggleRow
              label="Hierarchical (page-like)"
              help="Allows a parent to be set. Heavy on sites with thousands of entries."
              checked={pt.hierarchical}
              onChange={(v) => commit((p) => (p.hierarchical = v))}
            />
            <ToggleRow
              label="Block editor (show_in_rest)"
              help="Required for Gutenberg and the REST API."
              checked={pt.showInRest}
              onChange={(v) => commit((p) => (p.showInRest = v))}
              toggleRef={(el) => (fieldRefs.current.rest = el)}
            />
            <ToggleRow
              label="Archive page"
              help="Generates /slug/ listing every entry of this type."
              checked={pt.hasArchive}
              onChange={(v) => commit((p) => (p.hasArchive = v))}
            />
            {pt.hasArchive && (
              <div style={{ borderTop: '1px solid #F0ECE4', padding: '12px 0 2px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <label className="field-label" style={{ marginBottom: 0 }}>Archive slug</label>
                <input
                  className="input gfw-mono"
                  spellCheck={false}
                  style={{ flex: 1, minWidth: 160 }}
                  value={pt.archiveSlug}
                  onChange={(e) => commit((p) => (p.archiveSlug = e.target.value))}
                  placeholder={eff.slug}
                />
                <span className="gfw-mono" style={{ fontSize: 11.5, color: 'var(--gfw-text-mutest)' }}>/{eff.archiveSlug}/</span>
              </div>
            )}
          </div>

          <div className="field-card" ref={(el) => (fieldRefs.current.supports = el)}>
            <div className="field-card-header">
              <div className="field-card-title">Supports</div>
              <div className="field-card-desc">Editor panels and features this type gets.</div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {SUPPORTS_OPTIONS.map((s) => (
                <CheckboxChip key={s} active={pt.supports.includes(s)} onClick={() => toggleSupport(s)}>
                  {s}
                </CheckboxChip>
              ))}
            </div>
          </div>

          <div className="field-card">
            <div className="field-card-header">
              <div className="field-card-title">Taxonomies</div>
              <div className="field-card-desc">Attach at registration so query filters stay consistent.</div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 10 }}>
              {BUILTIN_TAX.map(([id, label]) => (
                <CheckboxChip key={id} active={pt.taxonomies.includes(id)} onClick={() => toggleBuiltinTax(id)}>
                  {label}
                </CheckboxChip>
              ))}
            </div>
            <div style={{ border: '1px solid var(--gfw-border)', borderRadius: 6, padding: 6, display: 'flex', flexWrap: 'wrap', gap: 6, background: '#fff' }}>
              {pt.customTax.map((t) => (
                <span key={t} className="gfw-mono" style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--gfw-accent-tint)', color: 'var(--gfw-accent)', borderRadius: 5, padding: '3px 6px', fontSize: 12 }}>
                  {t}
                  <button type="button" aria-label={`Remove ${t}`} title={`Remove ${t}`} onClick={() => removeCustomTax(t)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'inherit', padding: 0, display: 'flex', alignItems: 'center' }}>
                    ×
                  </button>
                </span>
              ))}
              <input
                aria-label="Add custom taxonomy slug"
                placeholder="custom taxonomy slug…"
                value={customTaxDraft}
                onChange={(e) => setCustomTaxDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomTax())}
                onBlur={addCustomTax}
                style={{ border: 'none', outline: 'none', fontSize: 12, flex: 1, minWidth: 120 }}
              />
            </div>
            <div className="field-card-desc" style={{ marginTop: 8, lineHeight: 1.5 }}>
              Custom taxonomies still need their own <span className="gfw-mono" style={{ fontSize: 11 }}>register_taxonomy()</span> call — the Taxonomy generator is next up.
            </div>
          </div>

          <Collapsible title="Labels (auto-generated from singular/plural — override any of them)">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {autoLabels(pt).slice(0, 10).map(([key, def]) => (
                <div key={key} style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 10, alignItems: 'center' }}>
                  <span className="gfw-mono" style={{ fontSize: 11.5, color: 'var(--gfw-text-mutest)' }}>{key}</span>
                  <input
                    className="input"
                    placeholder={def}
                    value={pt.labelOverrides[key] || ''}
                    onChange={(e) => commit((p) => (p.labelOverrides[key] = e.target.value))}
                  />
                </div>
              ))}
            </div>
          </Collapsible>

          <Collapsible title="Advanced">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="field-subcard">
                <div className="field-subcard-title">Admin menu</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="field-label" htmlFor="pt-menu-pos">menu_position</label>
                    <select id="pt-menu-pos" className="select" value={pt.adv.menuPosition} onChange={(e) => commit((p) => (p.adv.menuPosition = e.target.value))}>
                      {MENU_POSITIONS.map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="field-label" htmlFor="pt-menu-icon">menu_icon</label>
                    <select id="pt-menu-icon" className="select gfw-mono" value={pt.adv.menuIcon} onChange={(e) => commit((p) => (p.adv.menuIcon = e.target.value))}>
                      {DASHICONS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="field-subcard">
                <div className="field-subcard-title">REST API</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="field-label" htmlFor="pt-rest-base">rest_base</label>
                    <input id="pt-rest-base" className="input gfw-mono" spellCheck={false} placeholder={pt.key || 'post-type'} value={pt.adv.restBase} onChange={(e) => commit((p) => (p.adv.restBase = e.target.value))} />
                  </div>
                  <div>
                    <label className="field-label" htmlFor="pt-rest-ns">rest_namespace</label>
                    <input id="pt-rest-ns" className="input gfw-mono" spellCheck={false} placeholder="wp/v2" value={pt.adv.restNamespace} onChange={(e) => commit((p) => (p.adv.restNamespace = e.target.value))} />
                  </div>
                </div>
              </div>

              <div className="field-subcard">
                <div className="field-subcard-title">Permalinks &amp; rewrite</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <Toggle
                    checked={pt.adv.rewriteMode !== 'off'}
                    onChange={(v) => commit((p) => (p.adv.rewriteMode = v ? 'on' : 'off'))}
                    ariaLabel="Rewrite permalinks"
                  />
                  <span
                    ref={(el) => (fieldRefs.current.rewrite = el)}
                    tabIndex={-1}
                    className="gfw-mono"
                    style={{ fontSize: 12, color: 'var(--gfw-text-body)' }}
                  >
                    rewrite
                  </span>
                </div>
                {pt.adv.rewriteMode !== 'off' && (
                  <input className="input gfw-mono" spellCheck={false} placeholder={pt.key || 'post-type'} value={pt.adv.rewriteSlug} onChange={(e) => commit((p) => (p.adv.rewriteSlug = e.target.value))} />
                )}
              </div>

              <div className="field-subcard">
                <div className="field-subcard-title">Capabilities</div>
                <label className="field-label">capability_type</label>
                <div style={{ display: 'flex', gap: 7, marginBottom: 12 }}>
                  {(['post', 'page', 'custom'] as const).map((m) => (
                    <button key={m} type="button" onClick={() => commit((p) => (p.adv.capMode = m))} className={`chip${pt.adv.capMode === m ? ' is-active' : ''}`}>
                      {m}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{ flex: 1 }}>
                    <div className="gfw-mono" style={{ fontSize: 12, fontWeight: 500, color: 'var(--gfw-text-body)' }}>map_meta_cap</div>
                    <div className="field-card-desc" style={{ marginTop: 2 }}>Let core map edit/read/delete meta caps to the primitive ones. Recommended with custom capability types.</div>
                  </div>
                  <Toggle checked={pt.adv.mapMetaCap} onChange={(v) => commit((p) => (p.adv.mapMetaCap = v))} ariaLabel="map_meta_cap" />
                </div>
              </div>

              <div className="field-subcard">
                <div className="field-subcard-title">Misc &amp; code output</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="field-label" htmlFor="pt-fnprefix">function prefix</label>
                    <input id="pt-fnprefix" className="input gfw-mono" spellCheck={false} value={pt.adv.fnPrefix} onChange={(e) => commit((p) => (p.adv.fnPrefix = e.target.value))} />
                  </div>
                  <div>
                    <label className="field-label" htmlFor="pt-textdomain">text domain</label>
                    <input id="pt-textdomain" className="input gfw-mono" spellCheck={false} value={pt.adv.textDomain} onChange={(e) => commit((p) => (p.adv.textDomain = e.target.value))} />
                  </div>
                </div>
              </div>
            </div>
          </Collapsible>
        </div>
      }
    />
  );
}
