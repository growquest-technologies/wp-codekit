import { useMemo, useState } from 'react';
import { GeneratorShell } from '../../components/generator/GeneratorShell';
import { ToggleRow } from '../../components/ui/Toggle';
import { useEditorState } from '../../lib/useEditorState';
import {
  REF_ARGS,
  TYPES,
  applyFix,
  buildCode,
  derive,
  freshProject,
  validate,
  type FieldType,
  type OutputMode,
  type ProductFields,
  type ProductTab,
} from '../../generators/wcProductFields';

const OUTPUT_MODES: { id: OutputMode; label: string }[] = [
  { id: 'snippet', label: 'Snippet' },
  { id: 'functions', label: 'functions.php' },
  { id: 'plugin', label: 'Plugin file' },
];

const TAB_NOTE: Record<ProductTab, string> = {
  general: 'Fields render at the bottom of the General tab, after price and SKU.',
  inventory: 'Fields render at the bottom of the Inventory tab.',
  shipping: 'Fields render at the bottom of the Shipping tab, after weight and dimensions.',
  custom: 'A brand-new tab in the strip, with its own panel.',
};

export function WcProductFieldsGenerator() {
  const { state: pf, commit, undo, redo, reset, canUndo, canRedo, savedLabel } = useEditorState<ProductFields>('wc-product-fields-generator-v1', freshProject);
  const [outputMode, setOutputMode] = useState<OutputMode>('plugin');

  const d = useMemo(() => derive(pf), [pf]);
  const code = useMemo(() => buildCode(pf, outputMode), [pf, outputMode]);
  const issues = useMemo(() => validate(pf), [pf]);
  const fileName = (d.pre || 'acme').replace(/_/g, '-') + '-product-fields.php';

  function fix(kind: string) {
    commit((draft) => Object.assign(draft, applyFix(draft, kind)));
  }
  function addField() {
    commit((p) => {
      p.fields.push({ key: 'field_' + (p.fields.length + 1), label: 'Field ' + (p.fields.length + 1), type: 'text', def: '', description: '', choices: '' });
    });
  }
  function removeField(i: number) {
    commit((p) => p.fields.splice(i, 1));
  }

  const fieldsNote = `${d.fields.length} ${d.fields.length === 1 ? 'field' : 'fields'} in ${pf.tab === 'custom' ? (pf.customTabLabel || 'the custom tab') : pf.tab}`;

  return (
    <GeneratorShell
      category="woocommerce"
      title="Product Fields Generator"
      description="Fields in the Product Data metabox — General, Inventory, Shipping, or a tab of your own — saved with WooCommerce's own sanitisers and exposed to REST on request."
      code={code}
      filename={fileName}
      editor={{ canUndo, canRedo, onUndo: undo, onRedo: redo, onNew: reset, savedLabel }}
      issues={issues}
      onFix={fix}
      outputModes={OUTPUT_MODES}
      activeOutputMode={outputMode}
      onOutputModeChange={(id) => setOutputMode(id as OutputMode)}
      secondaryTab={{
        label: 'Reference',
        content: (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <div className="gfw-mono" style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 4 }}>woocommerce_process_product_meta</div>
            <div style={{ fontSize: 12, color: 'var(--gfw-text-mutest)', marginBottom: 14 }}>Fires once per save, from inside WooCommerce's own Product Data metabox</div>

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>The hooks involved</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 18 }}>
              {REF_ARGS.map((r) => (
                <div key={r.name} style={{ borderBottom: '1px solid var(--gfw-border)', paddingBottom: 9 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                    <span className="gfw-mono" style={{ fontSize: 12.5, fontWeight: 700 }}>{r.name}</span>
                    <span className="type-badge">{r.type}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--gfw-text-muted)', lineHeight: 1.5, marginTop: 4 }}>{r.description}</div>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>No extra nonce needed</div>
            <div style={{ fontSize: 12.5, color: 'var(--gfw-text-strong)', lineHeight: 1.65, marginBottom: 18 }}>WC_Meta_Box_Product_Data::save() verifies its own woocommerce_meta_nonce before it fires woocommerce_process_product_meta at all. A custom save callback hooked here runs after that check already passed — adding a second one is redundant, which is why the generated handler goes straight to update_post_meta().</div>

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>WooCommerce's own sanitisers</div>
            <div style={{ fontSize: 12.5, color: 'var(--gfw-text-strong)', lineHeight: 1.65 }}>wc_clean() and wc_format_decimal() are what WooCommerce's own core fields use — prefer them over sanitize_text_field()/floatval() so a price-like value formats the same way everywhere on the product screen. Checkboxes are stored as the strings 'yes'/'no', matching WooCommerce's own internal convention (_manage_stock, _virtual and friends), not core's 1/0.</div>
          </div>
        ),
      }}
      form={
        <div>
          <div className="field-card field-card-primary">
            <div className="field-card-title">Where it lives</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {(['general', 'inventory', 'shipping', 'custom'] as ProductTab[]).map((t) => (
                <button key={t} type="button" onClick={() => commit((p) => (p.tab = t))} className={`chip${pf.tab === t ? ' is-active' : ''}`}>
                  {t === 'custom' ? 'New tab' : t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
            {pf.tab === 'custom' && (
              <div className="field-group">
                <label className="field-label">Tab label</label>
                <input className="input" value={pf.customTabLabel} onChange={(e) => commit((p) => (p.customTabLabel = e.target.value), 'customTabLabel')} placeholder="Extra details" />
              </div>
            )}
            <div className="field-hint">{TAB_NOTE[pf.tab]}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 13 }}>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>key prefix</label>
                <input className="input gfw-mono" value={pf.metaPrefix} onChange={(e) => commit((p) => (p.metaPrefix = e.target.value), 'metaPrefix')} placeholder="acme_" />
              </div>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>function prefix</label>
                <input className="input gfw-mono" value={pf.prefix} onChange={(e) => commit((p) => (p.prefix = e.target.value), 'prefix')} placeholder="acme" />
              </div>
            </div>
          </div>

          <div className="field-card">
            <div className="field-card-header">
              <div className="field-card-title">Fields</div>
              <div className="field-card-desc">{fieldsNote}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pf.fields.map((f, i) => (
                <div key={i} className="card" style={{ padding: 11 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input className="input" style={{ flex: 1.4, minWidth: 130 }} placeholder="Warranty (months)" value={f.label} onChange={(e) => commit((p) => (p.fields[i].label = e.target.value), `label-${i}`)} />
                    <input className="input gfw-mono" style={{ width: 120 }} placeholder="warranty_months" value={f.key} onChange={(e) => commit((p) => (p.fields[i].key = e.target.value), `key-${i}`)} />
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
                      {TYPES.map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                    <button type="button" aria-label="Remove field" title="Remove field" onClick={() => removeField(i)} className="btn btn-ghost btn-sm">✕</button>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 7 }}>
                    <span className="gfw-mono" style={{ fontSize: 11, color: 'var(--gfw-text-faint)', whiteSpace: 'nowrap' }}>{d.metaPrefix + (f.key.trim() || 'field')}</span>
                    <input className="input gfw-mono" style={{ width: 110 }} placeholder={f.type === 'checkbox' ? '1 or 0' : 'default'} value={f.def} onChange={(e) => commit((p) => (p.fields[i].def = e.target.value), `def-${i}`)} />
                    <input className="input" style={{ flex: 1, minWidth: 150 }} placeholder="Shown as the field's desc_tip." value={f.description} onChange={(e) => commit((p) => (p.fields[i].description = e.target.value), `description-${i}`)} />
                  </div>
                  {f.type === 'select' && (
                    <div style={{ marginTop: 7 }}>
                      <input className="input gfw-mono" placeholder="first:First, second:Second" value={f.choices} onChange={(e) => commit((p) => (p.fields[i].choices = e.target.value), `choices-${i}`)} />
                    </div>
                  )}
                </div>
              ))}
              {pf.fields.length === 0 && <div className="field-hint">No fields yet.</div>}
            </div>
            <button type="button" onClick={addField} className="btn btn-ghost btn-sm" style={{ marginTop: 11, borderStyle: 'dashed' }}>Add field</button>
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
