import { useMemo, useState } from 'react';
import { GeneratorShell } from '../../components/generator/GeneratorShell';
import { useEditorState } from '../../lib/useEditorState';
import {
  REF_ARGS,
  applyFix,
  buildCode,
  derive,
  freshProject,
  validate,
  type FieldType,
  type OutputMode,
  type ShippingMethod,
  type TaxStatus,
} from '../../generators/wcShippingMethod';

const OUTPUT_MODES: { id: OutputMode; label: string }[] = [
  { id: 'snippet', label: 'Snippet' },
  { id: 'functions', label: 'functions.php' },
  { id: 'plugin', label: 'Plugin file' },
];

const TYPES: [FieldType, string][] = [
  ['text', 'Text'],
  ['number', 'Number'],
  ['checkbox', 'Checkbox'],
  ['select', 'Select'],
];

export function WcShippingMethodGenerator() {
  const { state: sm, commit, undo, redo, reset, canUndo, canRedo, savedLabel } = useEditorState<ShippingMethod>('wc-shipping-method-generator-v1', freshProject);
  const [outputMode, setOutputMode] = useState<OutputMode>('plugin');

  const d = useMemo(() => derive(sm), [sm]);
  const code = useMemo(() => buildCode(sm, outputMode), [sm, outputMode]);
  const issues = useMemo(() => validate(sm), [sm]);
  const fileName = 'class-' + d.methodId.replace(/_/g, '-') + '-shipping-method.php';

  function fix(kind: string) {
    commit((draft) => Object.assign(draft, applyFix(draft, kind)));
  }
  function addField() {
    commit((p) => p.extraFields.push({ key: 'field_' + (p.extraFields.length + 1), label: 'Field ' + (p.extraFields.length + 1), type: 'text', def: '', description: '', choices: '' }));
  }
  function removeField(i: number) {
    commit((p) => p.extraFields.splice(i, 1));
  }

  return (
    <GeneratorShell
      category="woocommerce"
      title="Shipping Method Generator"
      description="A WC_Shipping_Method subclass — settings fields, rate calculation, and the class-exists guard that stops it fataling on a site without WooCommerce active."
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
            <div className="gfw-mono" style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 4 }}>extends WC_Shipping_Method</div>
            <div style={{ fontSize: 12, color: 'var(--gfw-text-mutest)', marginBottom: 14 }}>Declared inside woocommerce_shipping_init, the one hook guaranteed to fire after the base class loads</div>

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>What matters</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 18 }}>
              {REF_ARGS.map((r) => (
                <div key={r.name} style={{ borderBottom: '1px solid var(--gfw-border)', paddingBottom: 9 }}>
                  <div className="gfw-mono" style={{ fontSize: 12.5, fontWeight: 700 }}>{r.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--gfw-text-muted)', lineHeight: 1.5, marginTop: 3 }}>{r.description}</div>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>Why the guard is not optional</div>
            <div style={{ fontSize: 12.5, color: 'var(--gfw-text-strong)', lineHeight: 1.65 }}>WC_Shipping_Method does not exist until WooCommerce itself has loaded. Declaring the class at the top level of a plugin file — instead of inside a function hooked to woocommerce_shipping_init — fatals the entire site the moment WooCommerce is deactivated, not just this feature.</div>
          </div>
        ),
      }}
      form={
        <div>
          <div className="field-card field-card-primary">
            <div className="field-card-title">The method</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label className="field-label">Method title</label>
                <input className="input" value={sm.methodTitle} onChange={(e) => commit((p) => (p.methodTitle = e.target.value), 'methodTitle')} placeholder="Flat Rate Extra" />
              </div>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>method id</label>
                <input className="input gfw-mono" value={sm.methodId} onChange={(e) => commit((p) => (p.methodId = e.target.value), 'methodId')} placeholder="flat_extra" spellCheck={false} />
              </div>
            </div>
            <div className="field-group">
              <label className="field-label">Description</label>
              <input className="input" value={sm.methodDescription} onChange={(e) => commit((p) => (p.methodDescription = e.target.value), 'methodDescription')} placeholder="Shown when adding the method to a zone." />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>default cost</label>
                <input className="input gfw-mono" value={sm.defaultCost} onChange={(e) => commit((p) => (p.defaultCost = e.target.value), 'defaultCost')} placeholder="5.00" />
              </div>
              <div>
                <label className="field-label">tax</label>
                <select className="select" value={sm.taxStatus} onChange={(e) => commit((p) => (p.taxStatus = e.target.value as TaxStatus))}>
                  <option value="taxable">Taxable — let WooCommerce calculate it</option>
                  <option value="none">None</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 13 }}>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>function prefix</label>
                <input className="input gfw-mono" value={sm.prefix} onChange={(e) => commit((p) => (p.prefix = e.target.value), 'prefix')} placeholder="acme" />
              </div>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>text domain</label>
                <input className="input gfw-mono" value={sm.textDomain} onChange={(e) => commit((p) => (p.textDomain = e.target.value), 'textDomain')} placeholder="acme" />
              </div>
            </div>
            <div className="field-hint" style={{ marginTop: 12 }}>{d.className}</div>
          </div>

          <div className="field-card">
            <div className="field-card-header">
              <div className="field-card-title">Extra settings fields</div>
              <div className="field-card-desc">{d.fields.length} {d.fields.length === 1 ? 'field' : 'fields'}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {sm.extraFields.map((f, i) => (
                <div key={i} className="card" style={{ padding: 11 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input className="input" style={{ flex: 1.4, minWidth: 120 }} placeholder="Free shipping threshold" value={f.label} onChange={(e) => commit((p) => (p.extraFields[i].label = e.target.value), `label-${i}`)} />
                    <input className="input gfw-mono" style={{ width: 110 }} placeholder="free_threshold" value={f.key} onChange={(e) => commit((p) => (p.extraFields[i].key = e.target.value), `key-${i}`)} />
                    <select
                      className="select"
                      style={{ width: 110 }}
                      value={f.type}
                      onChange={(e) => commit((p) => {
                        const v = e.target.value as FieldType;
                        p.extraFields[i].type = v;
                        if (v === 'select' && !p.extraFields[i].choices) p.extraFields[i].choices = 'first:First, second:Second';
                      })}
                    >
                      {TYPES.map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                    <button type="button" aria-label="Remove field" title="Remove field" onClick={() => removeField(i)} className="btn btn-ghost btn-sm">✕</button>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 7 }}>
                    <input className="input gfw-mono" style={{ width: 110 }} placeholder={f.type === 'checkbox' ? '1 or 0' : 'default'} value={f.def} onChange={(e) => commit((p) => (p.extraFields[i].def = e.target.value), `def-${i}`)} />
                    <input className="input" style={{ flex: 1, minWidth: 150 }} placeholder="desc_tip text." value={f.description} onChange={(e) => commit((p) => (p.extraFields[i].description = e.target.value), `description-${i}`)} />
                  </div>
                  {f.type === 'select' && (
                    <div style={{ marginTop: 7 }}>
                      <input className="input gfw-mono" placeholder="first:First, second:Second" value={f.choices} onChange={(e) => commit((p) => (p.extraFields[i].choices = e.target.value), `choices-${i}`)} />
                    </div>
                  )}
                </div>
              ))}
              {sm.extraFields.length === 0 && <div className="field-hint">No extra fields — just title and cost.</div>}
            </div>
            <button type="button" onClick={addField} className="btn btn-ghost btn-sm" style={{ marginTop: 11, borderStyle: 'dashed' }}>Add field</button>
          </div>
        </div>
      }
    />
  );
}
