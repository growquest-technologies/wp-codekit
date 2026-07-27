import { useMemo, useRef, useState } from 'react';
import { GeneratorShell } from '../../components/generator/GeneratorShell';
import { Collapsible } from '../../components/ui/Collapsible';
import { ToggleRow } from '../../components/ui/Toggle';
import { CheckboxChip } from '../../components/ui/CheckboxChip';
import { useEditorState } from '../../lib/useEditorState';
import {
  BUILTIN_TYPES,
  CAP_FIELDS,
  VISIBILITY_KEYS,
  applyFix,
  autoLabels,
  buildCode,
  effective,
  freshProject,
  validate,
  type Taxonomy,
  type TaxonomyAdv,
  type OutputMode,
} from '../../generators/taxonomy';
import { slugify } from '../../lib/codegen';

const OUTPUT_MODES: { id: OutputMode; label: string }[] = [
  { id: 'snippet', label: 'Snippet' },
  { id: 'functions', label: 'functions.php' },
  { id: 'plugin', label: 'Plugin file' },
];

export function TaxonomyGenerator() {
  const { state: tx, commit, undo, redo, reset, canUndo, canRedo, savedLabel } = useEditorState<Taxonomy>('taxonomy-generator-v1', freshProject);
  const [outputMode, setOutputMode] = useState<OutputMode>('snippet');
  const [typeDraft, setTypeDraft] = useState('');
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});

  function setAdv<K extends keyof TaxonomyAdv>(field: K, value: TaxonomyAdv[K]) {
    commit((p) => {
      p.adv[field] = value;
    });
  }

  function onSingularChange(value: string) {
    commit((p) => {
      p.singular = value;
      if (!p.keyEdited) p.key = slugify(value, 32);
      if (!p.pluralEdited) p.plural = value ? value + 's' : '';
    }, 'singular');
  }

  const code = useMemo(() => buildCode(tx, outputMode), [tx, outputMode]);
  const issues = useMemo(() => validate(tx), [tx]);
  const e = useMemo(() => effective(tx), [tx]);
  const fileName = (tx.key || 'taxonomy').replace(/_/g, '-') + '.php';
  const domain = 'example.com';
  const sampleTerm = slugify(tx.singular, 20).replace(/_/g, '-') || 'term-slug';

  function focusField(id: string) {
    fieldRefs.current[id]?.focus();
  }

  function fix(kind: string) {
    commit((draft) => Object.assign(draft, applyFix(draft, kind)));
  }

  function toggleObjectType(t: string) {
    commit((p) => {
      const i = p.objectTypes.indexOf(t);
      if (i === -1) p.objectTypes.push(t);
      else p.objectTypes.splice(i, 1);
    });
  }

  function addCustomType() {
    const v = slugify(typeDraft, 20);
    if (!v || tx.customTypes.includes(v)) return;
    commit((p) => p.customTypes.push(v));
    setTypeDraft('');
  }

  function removeCustomType(v: string) {
    commit((p) => {
      p.customTypes = p.customTypes.filter((t) => t !== v);
    });
  }

  const overrideCount = Object.keys(tx.labelOverrides).length;

  const termUrl = e.rewriteOn
    ? 'https://' + domain + '/' + e.slug + '/' + sampleTerm + '/'
    : e.queryVar
      ? 'https://' + domain + '/?' + e.queryVar + '=' + sampleTerm
      : '— not reachable on the front end';

  const permalinkRows: { label: string; url: string; state: string; stateColor: string; accent: string; bg: string; urlColor: string; note?: string }[] = [
    {
      label: 'Term archive',
      url: termUrl,
      state: e.publiclyQueryable ? (e.rewriteOn ? 'Pretty permalink' : 'Query string only') : 'Not queryable',
      stateColor: e.publiclyQueryable ? (e.rewriteOn ? '#1F7A4C' : '#B45309') : '#B45309',
      accent: e.publiclyQueryable ? '#1F7A4C' : '#D9D4C8', bg: e.publiclyQueryable ? '#fff' : '#FCFBF9',
      urlColor: e.publiclyQueryable ? '#26221C' : '#A79F91',
      note: e.rewriteOn && tx.adv.hierarchicalUrls ? 'Hierarchical URLs on: children resolve at /' + e.slug + '/parent/' + sampleTerm + '/.' : undefined,
    },
    {
      label: 'Query var',
      url: e.queryVar === false ? '— query_var is false' : 'https://' + domain + '/?' + e.queryVar + '=' + sampleTerm,
      state: e.queryVar === false ? 'Disabled' : 'Enabled',
      stateColor: e.queryVar === false ? '#948C7E' : '#1F7A4C',
      accent: e.queryVar === false ? '#D9D4C8' : '#1F7A4C', bg: e.queryVar === false ? '#FCFBF9' : '#fff',
      urlColor: e.queryVar === false ? '#A79F91' : '#26221C',
      note: e.queryVar === false ? 'WP_Query can still target it with taxonomy and term arguments.' : undefined,
    },
    {
      label: 'REST',
      url: tx.showInRest ? 'https://' + domain + '/wp-json/' + e.restNamespace + '/' + e.restBase : '— show_in_rest is false',
      state: tx.showInRest ? 'Block editor ready' : 'Classic editor only',
      stateColor: tx.showInRest ? '#1F7A4C' : '#B45309',
      accent: tx.showInRest ? '#1F7A4C' : '#D9D4C8', bg: tx.showInRest ? '#fff' : '#FCFBF9',
      urlColor: tx.showInRest ? '#26221C' : '#A79F91',
    },
    {
      label: 'Admin',
      url: e.showUi ? 'https://' + domain + '/wp-admin/edit-tags.php?taxonomy=' + (tx.key || 'taxonomy') + (e.objectTypes.length ? '&post_type=' + e.objectTypes[0] : '') : '— show_ui is false',
      state: e.showUi ? 'Terms screen' : 'No admin screen',
      stateColor: e.showUi ? '#1F7A4C' : '#B45309',
      accent: e.showUi ? '#1F7A4C' : '#D9D4C8', bg: e.showUi ? '#fff' : '#FCFBF9',
      urlColor: e.showUi ? '#26221C' : '#A79F91',
      note: tx.showAdminColumn ? 'A ' + (tx.plural || 'terms') + ' column also appears in the post list table.' : undefined,
    },
  ];

  return (
    <GeneratorShell
      category="content"
      title="Custom Taxonomy Generator"
      description={
        <>
          Category-style or tag-style, attached to the post types you choose. <span className="gfw-mono" style={{ fontSize: 12 }}>register_taxonomy()</span> with labels that read correctly in the admin.
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
            <div style={{ fontSize: 11.5, color: '#948C7E', lineHeight: 1.5, marginBottom: 12 }}>
              Term URLs on <span className="gfw-mono" style={{ fontSize: 11 }}>{domain}</span>, using <span className="gfw-mono" style={{ fontSize: 11 }}>{sampleTerm}</span> as an example term.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {permalinkRows.map((row) => (
                <div key={row.label} style={{ border: '1px solid #E7E2D9', borderLeft: `3px solid ${row.accent}`, borderRadius: 6, padding: '10px 12px', background: row.bg }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#948C7E' }}>{row.label}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: row.stateColor }}>{row.state}</span>
                  </div>
                  <div className="gfw-mono" style={{ fontSize: 12, lineHeight: 1.5, color: row.urlColor, wordBreak: 'break-all' }}>{row.url}</div>
                  {row.note && <div style={{ fontSize: 11, color: '#948C7E', marginTop: 5, lineHeight: 1.45 }}>{row.note}</div>}
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
                <label className="field-label" htmlFor="tx-singular">Singular name</label>
                <input
                  id="tx-singular"
                  ref={(el) => (fieldRefs.current.singular = el)}
                  className="input"
                  value={tx.singular}
                  onChange={(ev) => onSingularChange(ev.target.value)}
                  placeholder="Genre"
                />
              </div>
              <div>
                <label className="field-label" htmlFor="tx-plural">Plural name</label>
                <input
                  id="tx-plural"
                  ref={(el) => (fieldRefs.current.plural = el)}
                  className="input"
                  value={tx.plural}
                  onChange={(ev) => commit((p) => { p.plural = ev.target.value; p.pluralEdited = true; }, 'plural')}
                  placeholder="Genres"
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="field-label" htmlFor="tx-key">Taxonomy key</label>
                <input
                  id="tx-key"
                  ref={(el) => (fieldRefs.current.key = el)}
                  className="input gfw-mono"
                  value={tx.key}
                  onChange={(ev) => commit((p) => { p.key = ev.target.value; p.keyEdited = true; }, 'key')}
                  placeholder="genre"
                />
                <div className="field-hint">Used in the database and in code. Max 32 characters, lowercase letters/numbers/dashes/underscores only, never a reserved query variable.</div>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="field-label" htmlFor="tx-desc">
                  Description <span style={{ fontWeight: 600, color: 'var(--gfw-text-faint)' }}>optional</span>
                </label>
                <textarea
                  id="tx-desc"
                  rows={2}
                  className="textarea"
                  value={tx.description}
                  onChange={(ev) => commit((p) => (p.description = ev.target.value), 'description')}
                  placeholder="What this taxonomy groups."
                />
              </div>
            </div>
          </div>

          <div className="field-card">
            <div className="field-card-title">Structure</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
              <button
                type="button"
                onClick={() => commit((p) => (p.hierarchical = true))}
                className="card card-link"
                style={{ textAlign: 'left', cursor: 'pointer', padding: 14, borderColor: tx.hierarchical ? 'var(--gfw-accent)' : undefined, background: tx.hierarchical ? 'var(--gfw-accent-tint)' : undefined }}
              >
                <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 4 }}>Hierarchical — like categories</div>
                <div style={{ fontSize: 11.5, color: 'var(--gfw-text-muted)', lineHeight: 1.5 }}>Checkbox list in the editor, parents and children, term archives nest.</div>
              </button>
              <button
                type="button"
                onClick={() => commit((p) => (p.hierarchical = false))}
                className="card card-link"
                style={{ textAlign: 'left', cursor: 'pointer', padding: 14, borderColor: !tx.hierarchical ? 'var(--gfw-accent)' : undefined, background: !tx.hierarchical ? 'var(--gfw-accent-tint)' : undefined }}
              >
                <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 4 }}>Flat — like tags</div>
                <div style={{ fontSize: 11.5, color: 'var(--gfw-text-muted)', lineHeight: 1.5 }}>Free-text field with comma separation, no parents, popular-terms UI.</div>
              </button>
            </div>
          </div>

          <div className="field-card" ref={(el) => (fieldRefs.current.types = el)}>
            <div className="field-card-header">
              <div className="field-card-title">Attach to post types</div>
              <div className="field-card-desc">Registering the pairing here keeps query filters consistent.</div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 10 }}>
              {BUILTIN_TYPES.map((t) => (
                <CheckboxChip key={t} active={tx.objectTypes.includes(t)} onClick={() => toggleObjectType(t)}>
                  {t}
                </CheckboxChip>
              ))}
            </div>
            <div style={{ border: '1px solid var(--gfw-border)', borderRadius: 6, padding: 6, display: 'flex', flexWrap: 'wrap', gap: 6, background: '#fff' }}>
              {tx.customTypes.map((t) => (
                <span key={t} className="gfw-mono" style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--gfw-accent-tint)', color: 'var(--gfw-accent)', borderRadius: 5, padding: '3px 6px', fontSize: 12 }}>
                  {t}
                  <button type="button" aria-label={`Remove ${t}`} title={`Remove ${t}`} onClick={() => removeCustomType(t)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'inherit', padding: 0, display: 'flex', alignItems: 'center' }}>
                    ×
                  </button>
                </span>
              ))}
              <input
                aria-label="Add custom post type key"
                placeholder="custom post type key…"
                value={typeDraft}
                onChange={(ev) => setTypeDraft(ev.target.value)}
                onKeyDown={(ev) => (ev.key === 'Enter' || ev.key === ',') && (ev.preventDefault(), addCustomType())}
                onBlur={addCustomType}
                style={{ border: 'none', outline: 'none', fontSize: 12, flex: 1, minWidth: 140 }}
              />
            </div>
            <div className="field-card-desc" style={{ marginTop: 8, lineHeight: 1.5 }}>
              Register the taxonomy <em>before</em> the post type if you want the post type slug inside the term URL.
            </div>
          </div>

          <div className="toggle-card">
            <div className="toggle-card-title">Behaviour</div>
            <ToggleRow
              label="Public"
              help="Visible on the front end and in the admin."
              checked={tx.public}
              onChange={(v) => commit((p) => (p.public = v))}
            />
            <ToggleRow
              label="Block editor (show_in_rest)"
              checked={tx.showInRest}
              onChange={(v) => commit((p) => (p.showInRest = v))}
              toggleRef={(el) => (fieldRefs.current.rest = el)}
            />
            <ToggleRow
              label="Column in the posts list"
              checked={tx.showAdminColumn}
              onChange={(v) => commit((p) => (p.showAdminColumn = v))}
            />
          </div>

          <Collapsible title="Labels (auto-generated from singular/plural — override any of them)">
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 10 }}>
              <button type="button" onClick={() => commit((p) => (p.outputAllLabels = !p.outputAllLabels))} className={`chip${tx.outputAllLabels ? ' is-active' : ''}`}>
                {tx.outputAllLabels ? 'Writing all labels to PHP' : 'Write only used labels to PHP'}
              </button>
              {overrideCount > 0 && (
                <button type="button" onClick={() => commit((p) => (p.labelOverrides = {}))} className="btn btn-ghost btn-sm">
                  Clear {overrideCount} override(s)
                </button>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {autoLabels(tx).map(([key, def]) => (
                <div key={key} style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 10, alignItems: 'center' }}>
                  <span className="gfw-mono" style={{ fontSize: 11.5, color: 'var(--gfw-text-mutest)' }}>{key}</span>
                  <input
                    className="input"
                    placeholder={def}
                    value={tx.labelOverrides[key] || ''}
                    onChange={(ev) => commit((p) => (p.labelOverrides[key] = ev.target.value))}
                  />
                </div>
              ))}
            </div>
          </Collapsible>

          <Collapsible title="Advanced">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="field-subcard">
                <div className="field-subcard-title" style={{ marginBottom: 3 }}>Visibility</div>
                <div className="field-subcard-desc">Left alone, each of these inherits as WordPress documents it.</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12 }}>
                  {VISIBILITY_KEYS.map(([field, key, inheritLabel]) => (
                    <div key={key}>
                      <label className="field-label gfw-mono" style={{ fontSize: 11 }}>{key}</label>
                      <select className="select" value={tx.adv[field as keyof TaxonomyAdv] as string} onChange={(ev) => setAdv(field as keyof TaxonomyAdv, ev.target.value as never)}>
                        <option value="inherit">{inheritLabel}</option>
                        <option value="true">true</option>
                        <option value="false">false</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div className="field-subcard">
                <div className="field-subcard-title">REST API</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="field-label gfw-mono" style={{ fontSize: 11 }}>rest_base</label>
                    <input className="input gfw-mono" placeholder={tx.key || 'taxonomy'} value={tx.adv.restBase} onChange={(ev) => setAdv('restBase', ev.target.value)} />
                  </div>
                  <div>
                    <label className="field-label gfw-mono" style={{ fontSize: 11 }}>rest_namespace</label>
                    <input className="input gfw-mono" placeholder="wp/v2" value={tx.adv.restNamespace} onChange={(ev) => setAdv('restNamespace', ev.target.value)} />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label className="field-label gfw-mono" style={{ fontSize: 11 }}>rest_controller_class</label>
                    <input className="input gfw-mono" placeholder="WP_REST_Terms_Controller" value={tx.adv.restController} onChange={(ev) => setAdv('restController', ev.target.value)} />
                  </div>
                </div>
              </div>

              <div className="field-subcard" ref={(el) => (fieldRefs.current.rewrite = el)}>
                <div className="field-subcard-title">Permalinks &amp; rewrite</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 10 }}>
                  <div>
                    <label className="field-label gfw-mono" style={{ fontSize: 11 }}>rewrite</label>
                    <select className="select" value={tx.adv.rewriteMode} onChange={(ev) => setAdv('rewriteMode', ev.target.value as 'on' | 'off')}>
                      <option value="on">Pretty permalinks on</option>
                      <option value="off">false — no rewrite rules</option>
                    </select>
                  </div>
                  <div>
                    <label className="field-label gfw-mono" style={{ fontSize: 11 }}>rewrite.slug</label>
                    <input className="input gfw-mono" placeholder={tx.key || 'taxonomy'} value={tx.adv.rewriteSlug} onChange={(ev) => setAdv('rewriteSlug', ev.target.value)} />
                  </div>
                  <div>
                    <label className="field-label gfw-mono" style={{ fontSize: 11 }}>query_var</label>
                    <select className="select" value={tx.adv.queryVarMode} onChange={(ev) => setAdv('queryVarMode', ev.target.value as 'default' | 'custom' | 'false')}>
                      <option value="default">Default — the taxonomy key</option>
                      <option value="custom">Custom string</option>
                      <option value="false">false — disabled</option>
                    </select>
                  </div>
                  {tx.adv.queryVarMode === 'custom' && (
                    <div>
                      <label className="field-label gfw-mono" style={{ fontSize: 11 }}>query_var string</label>
                      <input className="input gfw-mono" placeholder="style" value={tx.adv.queryVarString} onChange={(ev) => setAdv('queryVarString', ev.target.value)} />
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  <CheckboxChip active={tx.adv.withFront} onClick={() => setAdv('withFront', !tx.adv.withFront)}>with_front</CheckboxChip>
                  <CheckboxChip active={tx.adv.hierarchicalUrls} onClick={() => setAdv('hierarchicalUrls', !tx.adv.hierarchicalUrls)}>hierarchical URLs</CheckboxChip>
                </div>
              </div>

              <div className="field-subcard">
                <div className="field-subcard-title" style={{ marginBottom: 3 }}>Capabilities</div>
                <div className="field-subcard-desc">Empty means the WordPress default shown as placeholder text.</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12 }}>
                  {CAP_FIELDS.map(([field, key, placeholder]) => (
                    <div key={key}>
                      <label className="field-label gfw-mono" style={{ fontSize: 11 }}>{key}</label>
                      <input className="input gfw-mono" placeholder={placeholder} value={tx.adv[field as keyof TaxonomyAdv] as string} onChange={(ev) => setAdv(field as keyof TaxonomyAdv, ev.target.value as never)} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="field-subcard">
                <div className="field-subcard-title" style={{ marginBottom: 3 }}>Default term</div>
                <div className="field-subcard-desc">Created on registration and applied when nothing else is chosen. Leave the name empty to skip it.</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="field-label gfw-mono" style={{ fontSize: 11 }}>name</label>
                    <input className="input" placeholder="Uncategorised" value={tx.adv.defaultTermName} onChange={(ev) => setAdv('defaultTermName', ev.target.value)} />
                  </div>
                  <div>
                    <label className="field-label gfw-mono" style={{ fontSize: 11 }}>slug</label>
                    <input className="input gfw-mono" placeholder={slugify(tx.adv.defaultTermName, 40) || 'auto'} value={tx.adv.defaultTermSlug} onChange={(ev) => setAdv('defaultTermSlug', ev.target.value)} />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label className="field-label gfw-mono" style={{ fontSize: 11 }}>description</label>
                    <input className="input" placeholder="optional" value={tx.adv.defaultTermDescription} onChange={(ev) => setAdv('defaultTermDescription', ev.target.value)} />
                  </div>
                </div>
              </div>

              <div className="field-subcard">
                <div className="field-subcard-title">Misc &amp; code output</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="field-label gfw-mono" style={{ fontSize: 11 }}>meta_box_cb</label>
                    <select className="select" value={tx.adv.metaBox} onChange={(ev) => setAdv('metaBox', ev.target.value as 'default' | 'false')}>
                      <option value="default">Default meta box</option>
                      <option value="false">false — no meta box</option>
                    </select>
                  </div>
                  <div>
                    <label className="field-label gfw-mono" style={{ fontSize: 11 }}>update_count_callback</label>
                    <select className="select" value={tx.adv.countCallback} onChange={(ev) => setAdv('countCallback', ev.target.value as 'default' | 'generic')}>
                      <option value="default">Default — published posts only</option>
                      <option value="generic">_update_generic_term_count</option>
                    </select>
                  </div>
                  <div>
                    <label className="field-label gfw-mono" style={{ fontSize: 11 }}>sort</label>
                    <select className="select" value={tx.adv.sort} onChange={(ev) => setAdv('sort', ev.target.value as 'inherit' | 'true')}>
                      <option value="inherit">null (default)</option>
                      <option value="true">true — keep assignment order</option>
                    </select>
                  </div>
                  <div>
                    <label className="field-label gfw-mono" style={{ fontSize: 11 }}>init priority</label>
                    <select className="select" value={tx.adv.priority} onChange={(ev) => setAdv('priority', ev.target.value)}>
                      <option value="0">0 — before post types</option>
                      <option value="9">9 — before block variations</option>
                      <option value="10">10 — default</option>
                    </select>
                  </div>
                  <div>
                    <label className="field-label gfw-mono" style={{ fontSize: 11 }}>function prefix</label>
                    <input className="input gfw-mono" value={tx.adv.fnPrefix} onChange={(ev) => setAdv('fnPrefix', ev.target.value)} />
                  </div>
                  <div>
                    <label className="field-label gfw-mono" style={{ fontSize: 11 }}>text domain</label>
                    <input className="input gfw-mono" value={tx.adv.textDomain} onChange={(ev) => setAdv('textDomain', ev.target.value)} />
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
