import { useMemo, useState } from 'react';
import { GeneratorShell } from '../../components/generator/GeneratorShell';
import { CheckboxChip } from '../../components/ui/CheckboxChip';
import { RepeatableCard } from '../../components/ui/RepeatableCard';
import { ToggleRow } from '../../components/ui/Toggle';
import { useDragReorder } from '../../lib/dragReorder';
import { useEditorState } from '../../lib/useEditorState';
import { useListOps } from '../../lib/useListOps';
import {
  BASE_TABS,
  FIELD_TYPES,
  PLACEMENT_LABEL,
  PRODUCT_TYPES,
  REF_FLOW,
  applyFix,
  buildCode,
  derive,
  freshProject,
  parseChoices,
  refKeys,
  refSignature,
  refTitle,
  validate,
  type FieldType,
  type FrontendPlacement,
  type OutputMode,
  type Placement,
  type ProductFields,
  type ProductType,
  type SaveMethod,
} from '../../generators/wcProductFields';

const OUTPUT_MODES: { id: OutputMode; label: string }[] = [
  { id: 'snippet', label: 'Snippet' },
  { id: 'functions', label: 'functions.php' },
  { id: 'plugin', label: 'Plugin file' },
];

const OUTPUT_HINT: Record<OutputMode, string> = {
  snippet: 'Guarded with a WooCommerce active-check — safe to drop in anywhere.',
  functions: "Add to your theme's functions.php — fine short-term, but product fields should outlive a theme switch.",
  plugin: 'A complete single-file plugin that declares WooCommerce as a dependency.',
};

const PLACEMENT_CHOICES: [Placement, string][] = [
  ['general', 'General'],
  ['inventory', 'Inventory'],
  ['shipping', 'Shipping'],
  ['custom', 'New tab'],
];

const SAVE_METHOD_CHOICES: [SaveMethod, string][] = [
  ['crud', 'CRUD (recommended)'],
  ['legacy', 'Legacy update_post_meta()'],
];

export function WcProductFieldsGenerator() {
  const { state: pf, commit, undo, redo, reset, canUndo, canRedo, savedLabel } = useEditorState<ProductFields>('wc-product-fields-generator-v2', freshProject);
  const drag = useDragReorder();
  const fields = useListOps<ProductFields>(commit)((p) => p.fields);
  const [outputMode, setOutputMode] = useState<OutputMode>('plugin');

  const d = useMemo(() => derive(pf), [pf]);
  const code = useMemo(() => buildCode(pf, outputMode), [pf, outputMode]);
  const issues = useMemo(() => validate(pf), [pf]);
  const fileName = (d.isCustomTab ? d.tabId : pf.placement + '-fields').replace(/_/g, '-') + '.php';

  function fix(kind: string) {
    commit((draft) => Object.assign(draft, applyFix(draft, kind)));
  }
  function addField() {
    commit((p) => {
      const n = p.fields.length + 1;
      p.fields.push({ id: 'field_' + n, label: 'Field ' + n, type: 'text', description: '', tooltip: false, choices: '' });
    });
  }
  function toggleProductType(t: ProductType) {
    commit((p) => {
      p.productTypes = p.productTypes || [];
      const i = p.productTypes.indexOf(t);
      if (i >= 0) p.productTypes.splice(i, 1);
      else p.productTypes.push(t);
    });
  }

  const placementNote = (pf.placement === 'custom' ? `Adds a new “${pf.customTabLabel || 'Untitled'}” tab.` : `Adds to the existing ${PLACEMENT_LABEL[pf.placement]} tab.`)
    + (d.types.length ? ` Limited to ${d.types.join(', ')} products — hidden elsewhere and skipped on save.` : ' Visible and saved for every product type.');

  const fieldsNote = `${d.fields.length} ${d.fields.length === 1 ? 'field' : 'fields'} · keys prefixed ${d.metaPrefix}`;

  const previewTabs = useMemo(() => {
    const list = BASE_TABS.slice();
    if (d.isCustomTab) {
      const idx = list.findIndex((t) => t[0] === 'advanced');
      list.splice(idx, 0, ['custom', pf.customTabLabel || 'Custom']);
    }
    return list.map(([id, label]) => ({ id, label, active: d.isCustomTab ? id === 'custom' : id === pf.placement }));
  }, [d.isCustomTab, pf.placement, pf.customTabLabel]);

  const previewProductTypeLabel = d.types.length ? d.types.map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join(' / ') + ' product' : 'Simple product';

  const crudNote = pf.saveMethod === 'legacy'
    ? 'This build writes with update_post_meta() directly. It works — products are posts under the hood — but it bypasses the in-memory product object WooCommerce may already be holding for this save. The CRUD toggle avoids that.'
    : "update_meta_data() queues the value on the product object; save() writes it in one pass — the same path core and every extension use. Reading back with get_post_meta() would still work either way; it's only the write path that differs.";

  return (
    <GeneratorShell
      category="woocommerce"
      title="Product Fields Generator"
      description="Fields in an existing Product Data tab or a new one, plus the save handler that writes them — through the product's own CRUD methods, not a raw postmeta write."
      code={code}
      filename={fileName}
      editor={{ canUndo, canRedo, onUndo: undo, onRedo: redo, onNew: reset, savedLabel }}
      issues={issues}
      onFix={fix}
      outputModes={OUTPUT_MODES}
      activeOutputMode={outputMode}
      onOutputModeChange={(id) => setOutputMode(id as OutputMode)}
      outputHint={OUTPUT_HINT[outputMode]}
      secondaryTab={{
        label: 'Preview',
        content: (
          <div style={{ background: '#F0F0F1', margin: '-14px -16px -18px', padding: '16px 18px 40px', minWidth: 420 }}>
            <div style={{ fontSize: 11, color: '#787C82', marginBottom: 10 }}>
              Product data metabox · {pf.placement === 'custom' ? `“${pf.customTabLabel || 'Untitled'}” tab (new)` : `${PLACEMENT_LABEL[pf.placement]} tab`}
            </div>
            <div style={{ background: '#fff', border: '1px solid #C3C4C7', borderRadius: 2 }}>
              <div style={{ padding: '9px 12px', borderBottom: '1px solid #F0F0F1', display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#1D2327' }}>Product data</span>
                <span style={{ fontSize: 12, color: '#2271B1', fontWeight: 500 }}>{previewProductTypeLabel}</span>
              </div>
              <div style={{ display: 'flex', minHeight: 230 }}>
                <div style={{ width: 148, flexShrink: 0, background: '#FAFAFA', borderRight: '1px solid #E2E4E7', padding: '10px 0' }}>
                  {previewTabs.map((t) => (
                    <div key={t.id} style={{ padding: '9px 12px', fontSize: 12, fontWeight: t.active ? 700 : 500, color: t.active ? '#2271B1' : '#50575E', background: t.active ? '#fff' : 'transparent', borderLeft: `3px solid ${t.active ? '#2271B1' : 'transparent'}` }}>
                      {t.label}
                    </div>
                  ))}
                </div>
                <div style={{ flex: 1, padding: '14px 18px', minWidth: 0 }}>
                  {d.fields.map((f) => {
                    const choices = f.type === 'select' ? (f.parsed.length ? f.parsed : parseChoices('a:Option A, b:Option B')) : [];
                    const hasInlineDescription = !!f.description && !f.tooltip;
                    return (
                      <div key={f.key} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '9px 0', borderTop: '1px dashed #E2E4E7' }}>
                        <div style={{ width: 140, flexShrink: 0, fontSize: 13, fontWeight: 600, color: '#1D2327', paddingTop: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                          {f.label || f.id}
                          {f.tooltip && (
                            <span title={f.description} style={{ width: 15, height: 15, borderRadius: '50%', background: '#DCDCDE', color: '#50575E', fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'help' }}>?</span>
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {(f.type === 'text' || f.type === 'number' || f.type === 'price' || f.type === 'url') && (
                            <input value="" readOnly placeholder="" style={{ width: '100%', maxWidth: 280, fontSize: 13.5, padding: '5px 8px', border: '1px solid #8C8F94', borderRadius: 3, background: '#fff' }} />
                          )}
                          {f.type === 'textarea' && (
                            <textarea value="" readOnly rows={3} style={{ width: '100%', fontSize: 13, padding: '6px 8px', border: '1px solid #8C8F94', borderRadius: 3, background: '#fff', resize: 'vertical' }} />
                          )}
                          {f.type === 'checkbox' && (
                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5, color: '#2C3338' }}>
                              <input type="checkbox" readOnly style={{ width: 16, height: 16, accentColor: '#2271B1' }} />
                            </label>
                          )}
                          {f.type === 'select' && (
                            <select style={{ fontSize: 13.5, padding: '4px 8px', border: '1px solid #8C8F94', borderRadius: 3, background: '#fff', minWidth: 160 }}>
                              {choices.map((c) => (
                                <option key={c.value} value={c.value}>{c.label}</option>
                              ))}
                            </select>
                          )}
                          {hasInlineDescription && <p style={{ margin: '5px 0 0', fontSize: 12.5, color: '#646970', fontStyle: 'italic', lineHeight: 1.5 }}>{f.description}</p>}
                        </div>
                      </div>
                    );
                  })}
                  {d.fields.length === 0 && <div style={{ padding: '30px 10px', textAlign: 'center', color: '#787C82', fontSize: 13 }}>No fields yet.</div>}
                </div>
              </div>
            </div>
            <div style={{ marginTop: 12, fontSize: 11.5, color: '#787C82', lineHeight: 1.6 }}>
              {pf.showFrontend
                ? `Shown on the single product page, ${pf.frontendPlacement === 'after_summary' ? 'after the short description (priority 25)' : 'in the meta row under Add to cart'}${pf.hideIfEmpty ? ', only when a value is set.' : ', even when empty.'}`
                : 'Admin-only for now — turn on “Show on the single product page” to add a frontend hook.'}
            </div>
          </div>
        ),
      }}
      extraSecondaryTabs={[
        {
          label: 'Reference',
          content: (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <div className="gfw-mono" style={{ fontSize: 13, fontWeight: 700, marginBottom: 4, wordBreak: 'break-word' }}>{refTitle(pf.placement, d)}</div>
              <div style={{ fontSize: 12, color: 'var(--gfw-text-mutest)', marginBottom: 14 }}>Registered on init, saved on woocommerce_process_product_meta</div>
              <pre className="gfw-mono" style={{ border: '1px solid var(--gfw-border)', borderRadius: 7, padding: '12px 14px', background: 'var(--gfw-surface-sunken)', fontSize: 11.5, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginBottom: 18 }}>{refSignature(pf.placement, d)}</pre>

              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>Why there's no nonce or capability check here</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 18 }}>
                {REF_FLOW.map((text, i) => (
                  <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                    <span style={{ flexShrink: 0, width: 19, height: 19, borderRadius: '50%', background: 'var(--gfw-accent-tint)', color: 'var(--gfw-accent-strong)', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span>
                    <span style={{ flex: 1, fontSize: 12.5, lineHeight: 1.55, color: 'var(--gfw-text-strong)' }}>{text}</span>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>Meta keys written</div>
              <pre className="gfw-mono" style={{ border: '1px solid var(--gfw-border)', borderRadius: 7, padding: '12px 14px', background: 'var(--gfw-surface-sunken)', fontSize: 11.5, lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: 18 }}>{refKeys(d)}</pre>

              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>Checkboxes save “yes” / “no”</div>
              <div style={{ fontSize: 12.5, color: 'var(--gfw-text-strong)', lineHeight: 1.65, marginBottom: 18 }}>woocommerce_wp_checkbox() follows WooCommerce's own convention: the stored value is the string yes or no, never 1 or 0. Check it with === 'yes' — a loose truthy test also passes on '0', which is a non-empty string.</div>

              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>CRUD vs. update_post_meta()</div>
              <div style={{ fontSize: 12.5, color: 'var(--gfw-text-strong)', lineHeight: 1.65, marginBottom: 18 }}>{crudNote}</div>

              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>Need this per variation instead?</div>
              <div style={{ fontSize: 12.5, color: 'var(--gfw-text-strong)', lineHeight: 1.65 }}>A field added here lives on the product itself, shared by every variation. A field that varies per variation is a different box entirely — woocommerce_variation_options_pricing (or _product_after_variable_attributes) to render it, woocommerce_save_product_variation to save it.</div>
            </div>
          ),
        },
      ]}
      form={
        <div>
          <div className="field-card field-card-primary">
            <div className="field-card-title">Placement</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
              {PLACEMENT_CHOICES.map(([v, l]) => (
                <button key={v} type="button" onClick={() => commit((p) => (p.placement = v))} className={`chip${pf.placement === v ? ' is-active' : ''}`}>
                  {l}
                </button>
              ))}
            </div>
            {pf.placement === 'custom' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12, marginBottom: 14 }}>
                <div>
                  <label className="field-label">tab label</label>
                  <input className="input" value={pf.customTabLabel} onChange={(e) => commit((p) => (p.customTabLabel = e.target.value), 'customTabLabel')} placeholder="Product Details" />
                </div>
                <div>
                  <label className="field-label gfw-mono" style={{ fontSize: 11 }}>tab id</label>
                  <input className="input gfw-mono" value={pf.customTabId} onChange={(e) => commit((p) => (p.customTabId = e.target.value), 'customTabId')} placeholder="product_details" spellCheck={false} />
                </div>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>meta key prefix</label>
                <input className="input gfw-mono" value={pf.metaPrefix} onChange={(e) => commit((p) => (p.metaPrefix = e.target.value), 'metaPrefix')} placeholder="_acme_" spellCheck={false} />
              </div>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>function prefix</label>
                <input className="input gfw-mono" value={pf.prefix} onChange={(e) => commit((p) => (p.prefix = e.target.value), 'prefix')} placeholder="acme" spellCheck={false} />
              </div>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>text domain</label>
                <input className="input gfw-mono" value={pf.textDomain} onChange={(e) => commit((p) => (p.textDomain = e.target.value), 'textDomain')} placeholder="acme" spellCheck={false} />
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 7 }}>Limit to product types</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {PRODUCT_TYPES.map((t) => (
                  <button key={t} type="button" onClick={() => toggleProductType(t)} className={`chip${(pf.productTypes || []).includes(t) ? ' is-active' : ''}`} style={{ fontFamily: 'var(--gfw-font-mono)', fontSize: 11.5 }}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="field-hint" style={{ marginTop: 12 }}>{placementNote}</div>
          </div>

          <div className="field-card">
            <div className="field-card-header">
              <div className="field-card-title">Fields</div>
              <div className="field-card-desc">{fieldsNote}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pf.fields.map((f, i) => (
                <RepeatableCard
                  key={i}
                  index={i}
                  count={pf.fields.length}
                  title={f.label || 'Untitled field'}
                  subtitle={d.metaPrefix + (f.id.trim() || 'field')}
                  drag={drag.bind('fields', i, fields.reorder)}
                  onMoveUp={() => fields.moveUp(i)}
                  onMoveDown={() => fields.moveDown(i)}
                  onRemove={() => fields.remove(i)}
                >
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input className="input" style={{ flex: 1.5, minWidth: 130 }} placeholder="Warranty length" value={f.label} onChange={(e) => commit((p) => (p.fields[i].label = e.target.value), `label-${i}`)} />
                    <input className="input gfw-mono" style={{ width: 140 }} placeholder="warranty_length" value={f.id} onChange={(e) => commit((p) => (p.fields[i].id = e.target.value), `id-${i}`)} spellCheck={false} />
                    <select
                      className="select"
                      style={{ width: 118 }}
                      value={f.type}
                      onChange={(e) => commit((p) => {
                        const v = e.target.value as FieldType;
                        p.fields[i].type = v;
                        if (v === 'select' && !p.fields[i].choices) p.fields[i].choices = 'first:First, second:Second';
                      })}
                    >
                      {FIELD_TYPES.map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                    <CheckboxChip active={f.tooltip} onClick={() => commit((p) => (p.fields[i].tooltip = !p.fields[i].tooltip))}>tooltip</CheckboxChip>
                  </div>
                  <input className="input" placeholder="Shown as a tooltip or helper text." value={f.description} onChange={(e) => commit((p) => (p.fields[i].description = e.target.value), `description-${i}`)} />
                  {f.type === 'select' && (
                    <input className="input gfw-mono" placeholder="easy:Easy, moderate:Moderate, advanced:Advanced" value={f.choices} onChange={(e) => commit((p) => (p.fields[i].choices = e.target.value), `choices-${i}`)} spellCheck={false} />
                  )}
                </RepeatableCard>
              ))}
              {pf.fields.length === 0 && <div className="field-hint">No fields — the tab will render an empty panel.</div>}
            </div>
            <button type="button" onClick={addField} className="btn btn-ghost btn-sm repeatable-add" style={{ marginTop: 11 }}>Add field</button>
          </div>

          <div className="field-card">
            <div className="field-card-title">Save method</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
              {SAVE_METHOD_CHOICES.map(([v, l]) => (
                <button key={v} type="button" onClick={() => commit((p) => (p.saveMethod = v))} className={`chip${pf.saveMethod === v ? ' is-active' : ''}`}>
                  {l}
                </button>
              ))}
            </div>
            <ToggleRow
              label="Show on the single product page"
              help="Prints the values on the frontend, read back through $product->get_meta()."
              checked={pf.showFrontend}
              onChange={(v) => commit((p) => (p.showFrontend = v))}
            />
            {pf.showFrontend && (
              <ToggleRow
                label="Hide the row when empty"
                help="Skips the frontend output for a field with no saved value."
                checked={pf.hideIfEmpty}
                onChange={(v) => commit((p) => (p.hideIfEmpty = v))}
              />
            )}
            {pf.showFrontend && (
              <div style={{ padding: '11px 0', borderTop: '1px solid var(--gfw-border)' }}>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>where on the page</label>
                <select className="select" style={{ width: '100%', maxWidth: 320 }} value={pf.frontendPlacement} onChange={(e) => commit((p) => (p.frontendPlacement = e.target.value as FrontendPlacement))}>
                  <option value="meta_end">After SKU / categories / tags row</option>
                  <option value="after_summary">After the short description</option>
                </select>
              </div>
            )}
            <ToggleRow
              label="Clean up on uninstall"
              help="delete_post_meta_by_key() for each key, as an uninstall.php comment."
              checked={pf.uninstallCleanup}
              onChange={(v) => commit((p) => (p.uninstallCleanup = v))}
            />
          </div>

          <div className="toggle-card">
            <div className="toggle-card-title">REST</div>
            <ToggleRow
              label="Expose to REST and the block editor"
              help="Registers every field with register_post_meta() on the product post type, authorised per-product."
              checked={pf.exposeRest}
              onChange={(v) => commit((p) => (p.exposeRest = v))}
            />
          </div>
        </div>
      }
    />
  );
}
