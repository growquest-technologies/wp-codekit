import { useMemo, useState } from 'react';
import { GeneratorShell } from '../../components/generator/GeneratorShell';
import { CheckboxChip } from '../../components/ui/CheckboxChip';
import { ToggleRow } from '../../components/ui/Toggle';
import { useEditorState } from '../../lib/useEditorState';
import {
  ROLES,
  applyFix,
  buildCode,
  derive,
  freshProject,
  validate,
  type AmountType,
  type CartFee,
  type Kind,
  type OutputMode,
  type SubtotalOp,
} from '../../generators/wcCartFee';

const OUTPUT_MODES: { id: OutputMode; label: string }[] = [
  { id: 'snippet', label: 'Snippet' },
  { id: 'functions', label: 'functions.php' },
  { id: 'plugin', label: 'Plugin file' },
];

export function WcCartFeeGenerator() {
  const { state: cf, commit, undo, redo, reset, canUndo, canRedo, savedLabel } = useEditorState<CartFee>('wc-cart-fee-generator-v1', freshProject);
  const [outputMode, setOutputMode] = useState<OutputMode>('plugin');

  const d = useMemo(() => derive(cf), [cf]);
  const code = useMemo(() => buildCode(cf, outputMode), [cf, outputMode]);
  const issues = useMemo(() => validate(cf), [cf]);
  const fileName = (d.pre || 'acme').replace(/_/g, '-') + '-cart-' + cf.kind + '.php';

  function fix(kind: string) {
    commit((draft) => Object.assign(draft, applyFix(draft, kind)));
  }
  function toggleRole(r: string) {
    commit((p) => {
      const i = p.roles.indexOf(r);
      if (i >= 0) p.roles.splice(i, 1);
      else p.roles.push(r);
    });
  }

  const condCount = [cf.condSubtotal, cf.condProduct, cf.condCategory, cf.condRole, cf.condMinQty].filter(Boolean).length;

  return (
    <GeneratorShell
      category="woocommerce"
      title="Cart Fee & Discount Generator"
      description="A conditional fee or discount added at cart calculation — with the is_admin() guard WooCommerce's own cookbook examples always include and this hook always needs."
      code={code}
      filename={fileName}
      editor={{ canUndo, canRedo, onUndo: undo, onRedo: redo, onNew: reset, savedLabel }}
      issues={issues}
      onFix={fix}
      outputModes={OUTPUT_MODES}
      activeOutputMode={outputMode}
      onOutputModeChange={(id) => setOutputMode(id as OutputMode)}
      form={
        <div>
          <div className="field-card field-card-primary">
            <div className="field-card-title">The line item</div>
            <div className="field-group">
              <label className="field-label">Label</label>
              <input className="input" value={cf.label} onChange={(e) => commit((p) => (p.label = e.target.value), 'label')} placeholder="Loyalty discount" />
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 11 }}>
              {(['discount', 'fee'] as Kind[]).map((k) => (
                <button key={k} type="button" onClick={() => commit((p) => (p.kind = k))} className={`chip${cf.kind === k ? ' is-active' : ''}`}>
                  {k === 'discount' ? 'Discount (negative)' : 'Fee (positive)'}
                </button>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
              <div>
                <label className="field-label">amount type</label>
                <select className="select" value={cf.amountType} onChange={(e) => commit((p) => (p.amountType = e.target.value as AmountType))}>
                  <option value="percent">% of subtotal</option>
                  <option value="fixed">Fixed amount</option>
                </select>
              </div>
              <div>
                <label className="field-label">amount</label>
                <input className="input gfw-mono" value={cf.amount} onChange={(e) => commit((p) => (p.amount = e.target.value), 'amount')} placeholder={cf.amountType === 'percent' ? '10' : '5.00'} />
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <ToggleRow label="Taxable" help="Runs the fee through the cart's own tax calculation." checked={cf.taxable} onChange={(v) => commit((p) => (p.taxable = v))} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 13 }}>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>function prefix</label>
                <input className="input gfw-mono" value={cf.prefix} onChange={(e) => commit((p) => (p.prefix = e.target.value), 'prefix')} placeholder="acme" />
              </div>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>text domain</label>
                <input className="input gfw-mono" value={cf.textDomain} onChange={(e) => commit((p) => (p.textDomain = e.target.value), 'textDomain')} placeholder="acme" />
              </div>
            </div>
          </div>

          <div className="field-card">
            <div className="field-card-header">
              <div className="field-card-title">Conditions</div>
              <div className="field-card-desc">{condCount ? condCount + ' active' : 'always applies'}</div>
            </div>

            <ToggleRow label="Cart subtotal" checked={cf.condSubtotal} onChange={(v) => commit((p) => (p.condSubtotal = v))} />
            {cf.condSubtotal && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 13, marginTop: -4 }}>
                <select className="select" style={{ width: 130 }} value={cf.subtotalOp} onChange={(e) => commit((p) => (p.subtotalOp = e.target.value as SubtotalOp))}>
                  <option value="gte">at least</option>
                  <option value="lte">at most</option>
                </select>
                <input className="input gfw-mono" value={cf.subtotalValue} onChange={(e) => commit((p) => (p.subtotalValue = e.target.value), 'subtotalValue')} placeholder="100" />
              </div>
            )}

            <ToggleRow label="Specific products in cart" checked={cf.condProduct} onChange={(v) => commit((p) => (p.condProduct = v))} />
            {cf.condProduct && (
              <div style={{ marginBottom: 13, marginTop: -4 }}>
                <input className="input gfw-mono" value={cf.productIds} onChange={(e) => commit((p) => (p.productIds = e.target.value), 'productIds')} placeholder="123, 456" />
              </div>
            )}

            <ToggleRow label="Products from a category" checked={cf.condCategory} onChange={(v) => commit((p) => (p.condCategory = v))} />
            {cf.condCategory && (
              <div style={{ marginBottom: 13, marginTop: -4 }}>
                <input className="input gfw-mono" value={cf.categorySlugs} onChange={(e) => commit((p) => (p.categorySlugs = e.target.value), 'categorySlugs')} placeholder="clearance, seasonal" />
              </div>
            )}

            <ToggleRow label="Customer role" checked={cf.condRole} onChange={(v) => commit((p) => (p.condRole = v))} />
            {cf.condRole && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 13, marginTop: -4 }}>
                {ROLES.map((r) => (
                  <CheckboxChip key={r} active={cf.roles.includes(r)} onClick={() => toggleRole(r)}>
                    {r}
                  </CheckboxChip>
                ))}
              </div>
            )}

            <ToggleRow label="Minimum cart quantity" checked={cf.condMinQty} onChange={(v) => commit((p) => (p.condMinQty = v))} />
            {cf.condMinQty && (
              <div style={{ marginTop: -4 }}>
                <input className="input gfw-mono" value={cf.minQty} onChange={(e) => commit((p) => (p.minQty = e.target.value), 'minQty')} placeholder="3" />
              </div>
            )}
          </div>
        </div>
      }
    />
  );
}
