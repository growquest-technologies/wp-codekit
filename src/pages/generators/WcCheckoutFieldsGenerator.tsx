import { useMemo, useState } from 'react';
import { GeneratorShell } from '../../components/generator/GeneratorShell';
import { ToggleRow } from '../../components/ui/Toggle';
import { useEditorState } from '../../lib/useEditorState';
import {
  BLOCKS_LOCATIONS,
  CLASSIC_LOCATIONS,
  applyFix,
  buildCode,
  derive,
  freshProject,
  validate,
  type CheckoutFields,
  type FieldType,
  type OutputMode,
} from '../../generators/wcCheckoutFields';

const OUTPUT_MODES: { id: OutputMode; label: string }[] = [
  { id: 'classic', label: 'Classic checkout' },
  { id: 'blocks', label: 'Blocks checkout' },
];

const OUTPUT_HINTS: Record<OutputMode, string> = {
  classic: 'The woocommerce_checkout_fields filter — for the [woocommerce_checkout] shortcode.',
  blocks: 'woocommerce_register_additional_checkout_field() — for the block-based Checkout, WC 8.9+.',
};

const TYPES: [FieldType, string][] = [
  ['text', 'Text'],
  ['select', 'Select'],
  ['checkbox', 'Checkbox'],
];

export function WcCheckoutFieldsGenerator() {
  const { state: cf, commit, undo, redo, reset, canUndo, canRedo, savedLabel } = useEditorState<CheckoutFields>('wc-checkout-fields-generator-v1', freshProject);
  const [outputMode, setOutputMode] = useState<OutputMode>('classic');

  const d = useMemo(() => derive(cf), [cf]);
  const code = useMemo(() => buildCode(cf, outputMode), [cf, outputMode]);
  const issues = useMemo(() => validate(cf), [cf]);
  const fileName = (d.pre || 'acme').replace(/_/g, '-') + '-checkout-fields.php';
  const locations = outputMode === 'classic' ? CLASSIC_LOCATIONS : BLOCKS_LOCATIONS;

  function changeOutputMode(next: OutputMode) {
    setOutputMode(next);
    const remap: Record<string, string> = next === 'blocks'
      ? { billing: 'address', shipping: 'address', order: 'order' }
      : { address: 'billing', contact: 'billing', order: 'order' };
    commit((p) => {
      p.fields.forEach((f) => {
        f.location = remap[f.location] || f.location;
      });
    });
  }

  function fix(kind: string) {
    commit((draft) => Object.assign(draft, applyFix(draft, kind)));
  }
  function addField() {
    commit((p) => p.fields.push({ key: 'field_' + (p.fields.length + 1), label: 'Field ' + (p.fields.length + 1), type: 'text', location: locations[0][0], required: false, placeholder: '', choices: '' }));
  }
  function removeField(i: number) {
    commit((p) => p.fields.splice(i, 1));
  }

  return (
    <GeneratorShell
      category="woocommerce"
      title="Checkout Fields Generator"
      description="Extra checkout fields for whichever checkout renderer this site uses — the classic woocommerce_checkout_fields filter, or the Blocks Checkout's own field-registration API."
      code={code}
      filename={fileName}
      editor={{ canUndo, canRedo, onUndo: undo, onRedo: redo, onNew: reset, savedLabel }}
      issues={issues}
      onFix={fix}
      outputModes={OUTPUT_MODES}
      activeOutputMode={outputMode}
      onOutputModeChange={(id) => changeOutputMode(id as OutputMode)}
      outputHint={OUTPUT_HINTS[outputMode]}
      form={
        <div>
          <div className="field-card field-card-primary">
            <div className="field-card-header">
              <div className="field-card-title">Fields</div>
              <div className="field-card-desc">{d.fields.length} {d.fields.length === 1 ? 'field' : 'fields'}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {cf.fields.map((f, i) => (
                <div key={i} className="card" style={{ padding: 11 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input className="input" style={{ flex: 1.4, minWidth: 120 }} placeholder="VAT number" value={f.label} onChange={(e) => commit((p) => (p.fields[i].label = e.target.value), `label-${i}`)} />
                    <input className="input gfw-mono" style={{ width: 100 }} placeholder="vat_id" value={f.key} onChange={(e) => commit((p) => (p.fields[i].key = e.target.value), `key-${i}`)} />
                    <select
                      className="select"
                      style={{ width: 100 }}
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
                    <select className="select" style={{ width: 150 }} value={f.location} onChange={(e) => commit((p) => (p.fields[i].location = e.target.value))}>
                      {locations.map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                    <button type="button" aria-label="Remove field" title="Remove field" onClick={() => removeField(i)} className="btn btn-ghost btn-sm">✕</button>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 7 }}>
                    <input className="input" style={{ flex: 1, minWidth: 150 }} placeholder="Placeholder text" value={f.placeholder} onChange={(e) => commit((p) => (p.fields[i].placeholder = e.target.value), `placeholder-${i}`)} disabled={f.type !== 'text'} />
                    <ToggleRow label="Required" checked={f.required} onChange={(v) => commit((p) => (p.fields[i].required = v))} />
                  </div>
                  {f.type === 'select' && (
                    <div style={{ marginTop: 7 }}>
                      <input className="input gfw-mono" placeholder="first:First, second:Second" value={f.choices} onChange={(e) => commit((p) => (p.fields[i].choices = e.target.value), `choices-${i}`)} />
                    </div>
                  )}
                </div>
              ))}
              {cf.fields.length === 0 && <div className="field-hint">No fields yet.</div>}
            </div>
            <button type="button" onClick={addField} className="btn btn-ghost btn-sm" style={{ marginTop: 11, borderStyle: 'dashed' }}>Add field</button>
          </div>

          <div className="field-card">
            <div className="field-card-title">Naming</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>function prefix</label>
                <input className="input gfw-mono" value={cf.prefix} onChange={(e) => commit((p) => (p.prefix = e.target.value), 'prefix')} placeholder="acme" />
              </div>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>text domain</label>
                <input className="input gfw-mono" value={cf.textDomain} onChange={(e) => commit((p) => (p.textDomain = e.target.value), 'textDomain')} placeholder="acme" />
              </div>
            </div>
            <div className="field-hint" style={{ marginTop: 12 }}>
              {outputMode === 'blocks'
                ? `Blocks Checkout requires a namespaced field id — generated automatically as ${d.pre}/field-key.`
                : 'Classic checkout keys are prefixed by location automatically — billing_' + (d.fields[0]?.key || 'field') + ', shipping_' + (d.fields[0]?.key || 'field') + ', and so on.'}
            </div>
          </div>
        </div>
      }
    />
  );
}
