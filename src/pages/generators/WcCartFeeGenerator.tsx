import { useMemo, useState } from 'react';
import { GeneratorShell } from '../../components/generator/GeneratorShell';
import { CheckboxChip } from '../../components/ui/CheckboxChip';
import { RepeatableCard } from '../../components/ui/RepeatableCard';
import { ToggleRow } from '../../components/ui/Toggle';
import { useDragReorder } from '../../lib/dragReorder';
import { useEditorState } from '../../lib/useEditorState';
import { useListOps } from '../../lib/useListOps';
import {
  BASIS_LABEL,
  CALCS,
  COND_MAP,
  CONDITIONS,
  COUNTRY_SAMPLES,
  CURRENCIES,
  PAYMENT_SAMPLES,
  REF_COUPON_POINTS,
  REF_FLOW,
  ROLE_SAMPLES,
  SHIPPING_COST,
  SHIPPING_SAMPLES,
  TAX_CLASSES,
  applyFix,
  basisValue,
  buildCode,
  derive,
  evaluateRules,
  freshProject,
  freshSample,
  money,
  num,
  refFees,
  refSignature,
  summariseRule,
  trimNum,
  validate,
  type Basis,
  type CalcType,
  type CartFee,
  type ConditionKey,
  type OutputMode,
  type RuleMode,
  type SampleCart,
  type TaxClass,
} from '../../generators/wcCartFee';

const OUTPUT_MODES: { id: OutputMode; label: string }[] = [
  { id: 'snippet', label: 'Snippet' },
  { id: 'functions', label: 'functions.php' },
  { id: 'plugin', label: 'Plugin file' },
];

const OUTPUT_HINT: Record<OutputMode, string> = {
  snippet: 'Guarded with a WooCommerce active-check — safe to drop in anywhere.',
  functions: "Add to your theme's functions.php — note that fees vanish the moment the theme changes.",
  plugin: 'A complete single-file plugin that declares WooCommerce as a dependency.',
};

const BASIS_CHOICES: [Basis, string][] = [
  ['subtotal', 'get_subtotal() — items, before coupons'],
  ['after_discount', 'get_cart_contents_total() — after coupons'],
  ['subtotal_incl_tax', 'get_subtotal() + tax — items incl. tax'],
];

const OUTPUT_TOGGLES: { key: keyof CartFee; label: string; help: string }[] = [
  { key: 'guardAdmin', label: 'Skip the admin', help: 'is_admin() && ! DOING_AJAX — keeps the callback out of order-edit screens where there is no session.' },
  { key: 'hideZero', label: 'Only add fees above zero', help: 'Guards each add_fee() with $amount > 0 so an empty row never reaches the cart totals.' },
  { key: 'paymentRefreshJs', label: 'Refresh checkout on gateway change', help: 'wc_enqueue_js() that triggers update_checkout — required for any payment-method condition.' },
  { key: 'feeHtmlFilter', label: 'Style negative fee rows', help: 'A woocommerce_cart_totals_fee_html filter that wraps discount amounts in their own span.' },
  { key: 'couponAlternative', label: 'Include the coupon alternative', help: 'Appends the commented programmatic-coupon approach when the file adds a discount.' },
];

export function WcCartFeeGenerator() {
  const { state: cf, commit, undo, redo, reset, canUndo, canRedo, savedLabel } = useEditorState<CartFee>('wc-cart-fee-generator-v2', freshProject);
  const drag = useDragReorder();
  const rules = useListOps<CartFee>(commit)((p) => p.rules);
  const [outputMode, setOutputMode] = useState<OutputMode>('plugin');
  const [sample, setSample] = useState<SampleCart>(freshSample);

  const d = useMemo(() => derive(cf), [cf]);
  const code = useMemo(() => buildCode(cf, outputMode), [cf, outputMode]);
  const issues = useMemo(() => validate(cf), [cf]);
  const evaluated = useMemo(() => evaluateRules(cf, sample), [cf, sample]);

  function fix(kind: string) {
    commit((draft) => Object.assign(draft, applyFix(draft, kind)));
  }
  function setSampleField(key: keyof SampleCart, value: string | boolean) {
    setSample((s) => ({ ...s, [key]: value }));
  }
  function addFee() {
    commit((p) => {
      p.rules.push({ label: 'Fee ' + (p.rules.length + 1), mode: 'fee', calc: 'fixed', amount: '2.50', taxable: false, taxClass: 'standard', cap: '', cond: {} });
    });
  }
  function addDiscount() {
    commit((p) => {
      p.rules.push({ label: 'Discount ' + (p.rules.length + 1), mode: 'discount', calc: 'percent', amount: '5', taxable: false, taxClass: 'standard', cap: '50', cond: { minSubtotal: '100' } });
    });
  }
  function toggleCondition(i: number, key: ConditionKey, def: string) {
    commit((p) => {
      const rr = p.rules[i];
      rr.cond = rr.cond || {};
      if (Object.prototype.hasOwnProperty.call(rr.cond, key)) delete rr.cond[key];
      else rr.cond[key] = def;
    });
  }

  const sym = sample.currency || '£';
  const fmt = (n: number) => (n < 0 ? '-' : '') + sym + money(Math.abs(n));

  const applied = evaluated.filter((e) => e.matched);
  const skipped = evaluated.filter((e) => !e.matched);
  const basis = basisValue(sample, cf);
  const feeTotal = applied.reduce((t, e) => t + e.signed, 0);
  const taxableTotal = applied.filter((e) => e.taxable).reduce((t, e) => t + e.signed, 0);
  const feeTax = Math.round(taxableTotal * num(sample.taxRate)) / 100;
  const ship = SHIPPING_COST[sample.shipping];
  const rawTotal = num(sample.subtotal) - num(sample.coupon) + feeTotal + feeTax + (ship == null ? 0 : ship);

  interface TotalRow { label: string; value: string; valueColor: string; note?: string }
  const totalRows: TotalRow[] = [{ label: 'Subtotal', value: fmt(num(sample.subtotal)), valueColor: '#1D2327' }];
  if (num(sample.coupon) > 0) totalRows.push({ label: 'Coupon discount', value: fmt(-num(sample.coupon)), valueColor: '#1F7A4C' });
  applied.forEach((e) => {
    totalRows.push({
      label: e.label, value: fmt(e.signed), valueColor: e.signed < 0 ? '#1F7A4C' : '#1D2327',
      note: e.calcNote + (e.capped ? ' — capped' : '') + (e.taxable ? ' — taxable' : ''),
    });
  });
  if (ship != null) totalRows.push({ label: 'Shipping', value: ship === 0 ? 'Free' : fmt(ship), valueColor: '#1D2327', note: sample.shipping });
  if (Math.abs(feeTax) > 0.004) totalRows.push({ label: 'Tax on fees', value: fmt(feeTax), valueColor: '#1D2327', note: 'at ' + trimNum(num(sample.taxRate)) + '% — item tax not shown' });

  const basisNote = 'Percentage fees read ' + BASIS_LABEL[cf.basis] + '. '
    + (cf.basis === 'after_discount' ? 'Coupons shrink the fee with the cart.' : cf.basis === 'subtotal_incl_tax' ? 'Only use a tax-inclusive basis for non-taxable fees.' : 'Coupons do not affect it.')
    + ' Fees never compound — they are not part of the subtotal, so a second percentage fee is taken from the same figure as the first.';

  const rulesNote = `${d.rules.length} ${d.rules.length === 1 ? 'rule' : 'rules'} · ${d.rules.filter((r) => r.mode === 'discount').length} negative`;

  const sampleSelects: { key: keyof SampleCart; label: string; options: [string, string][] }[] = [
    { key: 'currency', label: 'currency', options: CURRENCIES },
    { key: 'country', label: 'ship to', options: COUNTRY_SAMPLES.map((c) => [c, c]) },
    { key: 'shipping', label: 'shipping', options: SHIPPING_SAMPLES },
    { key: 'payment', label: 'gateway', options: PAYMENT_SAMPLES.map((c) => [c, c]) },
    { key: 'role', label: 'shopper', options: ROLE_SAMPLES.map((c) => [c, c]) },
  ];
  const sampleInputs: { key: keyof SampleCart; label: string }[] = [
    { key: 'subtotal', label: 'subtotal' },
    { key: 'coupon', label: 'coupon off' },
    { key: 'items', label: 'items' },
    { key: 'weight', label: 'weight' },
    { key: 'taxRate', label: 'tax rate %' },
  ];

  return (
    <GeneratorShell
      category="woocommerce"
      title="Cart Fee & Discount Generator"
      description={<>Conditional surcharges and negative-fee discounts on <span className="gfw-mono" style={{ fontSize: 12 }}>woocommerce_cart_calculate_fees</span> — with a sample cart to prove the arithmetic before it reaches a shopper.</>}
      code={code}
      filename="cart-fees.php"
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
          <div style={{ background: '#F0F0F1', margin: '-14px -16px -18px', padding: '16px 18px 40px', minWidth: 380 }}>
            <div style={{ background: '#fff', border: '1px solid #C3C4C7', borderRadius: 2, padding: '12px 14px', marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: '#787C82', marginBottom: 9 }}>Sample cart</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(112px, 1fr))', gap: 9 }}>
                {sampleSelects.slice(0, 1).map((sf) => (
                  <div key={sf.key}>
                    <label style={{ display: 'block', fontSize: 10.5, color: '#787C82', marginBottom: 3 }}>{sf.label}</label>
                    <select
                      value={String(sample[sf.key])}
                      onChange={(e) => setSampleField(sf.key, e.target.value)}
                      style={{ width: '100%', fontSize: 12, padding: '4px 5px', border: '1px solid #8C8F94', borderRadius: 3, background: '#fff' }}
                    >
                      {sf.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                ))}
                {sampleInputs.map((sf) => (
                  <div key={sf.key}>
                    <label style={{ display: 'block', fontSize: 10.5, color: '#787C82', marginBottom: 3 }}>{sf.label}</label>
                    <input
                      className="gfw-mono"
                      value={String(sample[sf.key])}
                      onChange={(e) => setSampleField(sf.key, e.target.value)}
                      spellCheck={false}
                      style={{ width: '100%', fontSize: 12, padding: '4px 6px', border: '1px solid #8C8F94', borderRadius: 3, background: '#fff' }}
                    />
                  </div>
                ))}
                {sampleSelects.slice(1).map((sf) => (
                  <div key={sf.key}>
                    <label style={{ display: 'block', fontSize: 10.5, color: '#787C82', marginBottom: 3 }}>{sf.label}</label>
                    <select
                      value={String(sample[sf.key])}
                      onChange={(e) => setSampleField(sf.key, e.target.value)}
                      style={{ width: '100%', fontSize: 12, padding: '4px 5px', border: '1px solid #8C8F94', borderRadius: 3, background: '#fff' }}
                    >
                      {sf.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              {!!d.usedCond.category && (
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#2C3338', marginTop: 10 }}>
                  <input type="checkbox" checked={sample.hasCategory} onChange={() => setSampleField('hasCategory', !sample.hasCategory)} style={{ width: 15, height: 15, accentColor: '#2271B1' }} />
                  cart contains a product in the tested category
                </label>
              )}
            </div>

            <div style={{ background: '#fff', border: '1px solid #C3C4C7', borderRadius: 2 }}>
              <div style={{ padding: '10px 14px', borderBottom: '1px solid #F0F0F1', fontSize: 14, fontWeight: 600, color: '#1D2327' }}>Cart totals</div>
              <div style={{ padding: '4px 14px 12px' }}>
                {totalRows.map((tr, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'baseline', padding: '9px 0', borderBottom: '1px solid #F0F0F1' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#1D2327' }}>{tr.label}</div>
                      {tr.note && <div style={{ fontSize: 11, color: '#787C82', marginTop: 2, lineHeight: 1.45 }}>{tr.note}</div>}
                    </div>
                    <div className="gfw-mono" style={{ fontSize: 13, fontWeight: 500, color: tr.valueColor, whiteSpace: 'nowrap' }}>{tr.value}</div>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'baseline', padding: '11px 0 4px' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#1D2327' }}>Total</div>
                  <div className="gfw-mono" style={{ fontSize: 16, fontWeight: 700, color: '#1D2327' }}>{fmt(Math.max(0, rawTotal))}</div>
                </div>
                {rawTotal < 0 && (
                  <div style={{ fontSize: 11.5, color: '#B91C1C', lineHeight: 1.5, paddingTop: 4 }}>
                    The fees take this cart to {fmt(rawTotal)}. WooCommerce clamps the order total at zero, but the negative fee row is still shown to the shopper at its full value.
                  </div>
                )}
              </div>
            </div>

            {skipped.length > 0 && (
              <div style={{ marginTop: 14, background: '#fff', border: '1px solid #C3C4C7', borderRadius: 2 }}>
                <div style={{ padding: '9px 14px', borderBottom: '1px solid #F0F0F1', fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: '#787C82' }}>Not applied to this cart</div>
                <div style={{ padding: '6px 14px 11px' }}>
                  {skipped.map((sr, i) => (
                    <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid #F6F7F7' }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: '#1D2327' }}>{sr.label}</div>
                      <div style={{ fontSize: 11.5, color: '#787C82', lineHeight: 1.5, marginTop: 2 }}>Skipped — {sr.reason}.</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginTop: 12, fontSize: 11.5, color: '#787C82', lineHeight: 1.6 }}>
              Basis for percentages: {fmt(basis)} ({BASIS_LABEL[cf.basis]}). Tax is shown on fees only — item and shipping tax depend on your store’s rates and the customer address.
            </div>
          </div>
        ),
      }}
      extraSecondaryTabs={[
        {
          label: 'Reference',
          content: (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <div className="gfw-mono" style={{ fontSize: 13, fontWeight: 700, marginBottom: 4, wordBreak: 'break-word' }}>woocommerce_cart_calculate_fees</div>
              <div style={{ fontSize: 12, color: 'var(--gfw-text-mutest)', marginBottom: 14 }}>Fires inside WC_Cart::calculate_totals() on every recalculation</div>
              <pre className="gfw-mono" style={{ border: '1px solid var(--gfw-border)', borderRadius: 7, padding: '12px 14px', background: 'var(--gfw-surface-sunken)', fontSize: 11.5, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginBottom: 18 }}>{refSignature(d.pre)}</pre>

              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>What happens on every calculation</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 18 }}>
                {REF_FLOW.map((text, i) => (
                  <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                    <span style={{ flexShrink: 0, width: 19, height: 19, borderRadius: '50%', background: 'var(--gfw-accent-tint)', color: 'var(--gfw-accent-strong)', fontSize: 10.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span>
                    <span style={{ flex: 1, fontSize: 12.5, lineHeight: 1.55, color: 'var(--gfw-text-strong)' }}>{text}</span>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>Fee ids this file adds</div>
              <pre className="gfw-mono" style={{ border: '1px solid var(--gfw-border)', borderRadius: 7, padding: '12px 14px', background: 'var(--gfw-surface-sunken)', fontSize: 11.5, lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: 18 }}>{refFees(d)}</pre>

              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>The id comes from the name</div>
              <div style={{ fontSize: 12.5, color: 'var(--gfw-text-strong)', lineHeight: 1.65, marginBottom: 18 }}>WC_Cart_Fees::add_fee() runs the name through sanitize_title() to get the fee id. Two fees whose names sanitise to the same string are a collision: WooCommerce keeps the first, drops the second and logs a doing_it_wrong notice. Rename the fee, don't try to add it twice.</div>

              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>A negative fee is not a coupon</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 18 }}>
                {REF_COUPON_POINTS.map((t, i) => (
                  <div key={i} style={{ fontSize: 12.5, color: 'var(--gfw-text-strong)', lineHeight: 1.6 }}>{t}</div>
                ))}
              </div>

              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>Order of calculation</div>
              <div style={{ fontSize: 12.5, color: 'var(--gfw-text-strong)', lineHeight: 1.65, marginBottom: 18 }}>Item totals, then shipping, then fees, then taxes, then the order total. Shipping is already resolved when your callback runs, which is why a chosen-shipping-method condition works — but a fee can never change the shipping cost, and free-shipping thresholds are measured on the subtotal, never on the subtotal plus fees.</div>

              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>Where the shopper sees it</div>
              <div style={{ fontSize: 12.5, color: 'var(--gfw-text-strong)', lineHeight: 1.65 }}>Cart totals, the checkout review table, the thank-you page, both order emails, and the admin order screen as an editable fee line item. Once the order exists the fee is frozen on it — changing this file later does not rewrite past orders.</div>
            </div>
          ),
        },
      ]}
      form={
        <div>
          <div className="field-card field-card-primary">
            <div className="field-card-title">Setup</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>function prefix</label>
                <input className="input gfw-mono" value={cf.prefix} onChange={(e) => commit((p) => (p.prefix = e.target.value), 'prefix')} placeholder="acme" spellCheck={false} />
              </div>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>text domain</label>
                <input className="input gfw-mono" value={cf.textDomain} onChange={(e) => commit((p) => (p.textDomain = e.target.value), 'textDomain')} placeholder="acme" spellCheck={false} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 12, marginTop: 12 }}>
              <div>
                <label className="field-label">percentages are taken from</label>
                <select className="select" value={cf.basis} onChange={(e) => commit((p) => (p.basis = e.target.value as Basis))}>
                  {BASIS_CHOICES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="field-label">country conditions read</label>
                <select className="select" value={cf.addressSource} onChange={(e) => commit((p) => (p.addressSource = e.target.value as 'shipping' | 'billing'))}>
                  <option value="shipping">the shipping country</option>
                  <option value="billing">the billing country</option>
                </select>
              </div>
            </div>
            <div className="field-hint" style={{ marginTop: 14 }}>{basisNote}</div>
          </div>

          <div className="field-card">
            <div className="field-card-header">
              <div className="field-card-title">Fees &amp; discounts</div>
              <div className="field-card-desc">{rulesNote}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {d.rules.map((r, i) => {
                const dupe = d.rules.filter((o) => o.feeId === r.feeId).length > 1;
                const labelBad = !String(r.label || '').trim() || dupe;
                const amountUnit = r.calc === 'percent' ? '%' : r.calc === 'per_item' ? 'per item' : r.calc === 'per_weight' ? 'per unit' : sym;
                return (
                  <RepeatableCard
                    key={i}
                    index={i}
                    count={d.rules.length}
                    title={r.label || `Rule ${i + 1}`}
                    subtitle={`fee id: ${r.feeId || '(empty)'}`}
                    accent={r.mode === 'discount' ? 'var(--gfw-success)' : 'var(--gfw-accent)'}
                    drag={drag.bind('rules', i, rules.reorder)}
                    onMoveUp={() => rules.moveUp(i)}
                    onMoveDown={() => rules.moveDown(i)}
                    onRemove={() => rules.remove(i)}
                  >
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <input
                        className="input"
                        style={{ flex: 1.4, minWidth: 140, fontWeight: 600, borderColor: labelBad ? '#B91C1C' : undefined }}
                        value={r.label}
                        onChange={(e) => commit((p) => (p.rules[i].label = e.target.value), `r-${i}-l`)}
                        placeholder="Handling fee"
                      />
                      <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                        {(['fee', 'discount'] as RuleMode[]).map((m) => (
                          <button key={m} type="button" onClick={() => commit((p) => (p.rules[i].mode = m))} className={`chip${r.mode === m ? ' is-active' : ''}`}>
                            {m === 'fee' ? 'Fee' : 'Discount'}
                          </button>
                        ))}
                      </div>
                      <select
                        className="select"
                        style={{ width: 128 }}
                        value={r.calc}
                        onChange={(e) => commit((p) => {
                          const v = e.target.value as CalcType;
                          p.rules[i].calc = v;
                          if (v === 'percent' && num(p.rules[i].amount) > 100) p.rules[i].amount = '10';
                        })}
                      >
                        {CALCS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                        <input
                          className="input gfw-mono"
                          style={{ width: 74, borderColor: r.amountNum > 0 ? undefined : '#B45309' }}
                          value={r.amount}
                          onChange={(e) => commit((p) => (p.rules[i].amount = e.target.value), `r-${i}-a`)}
                          placeholder="4.50"
                          spellCheck={false}
                        />
                        <span style={{ fontSize: 11, color: 'var(--gfw-text-mutest)', whiteSpace: 'nowrap' }}>{amountUnit}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                      <CheckboxChip active={r.taxable} onClick={() => commit((p) => (p.rules[i].taxable = !p.rules[i].taxable))}>taxable</CheckboxChip>
                      {r.taxable && (
                        <select className="select" style={{ width: 132, fontSize: 11.5 }} value={r.taxClass} onChange={(e) => commit((p) => (p.rules[i].taxClass = e.target.value as TaxClass))}>
                          {TAX_CLASSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                      )}
                      {r.calc !== 'fixed' && (
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--gfw-text-muted)', whiteSpace: 'nowrap' }}>
                          cap at
                          <input
                            className="input gfw-mono"
                            style={{ width: 64, fontSize: 11.5, padding: '5px 7px' }}
                            value={r.cap}
                            onChange={(e) => commit((p) => (p.rules[i].cap = e.target.value), `r-${i}-c`)}
                            placeholder="none"
                            spellCheck={false}
                          />
                        </label>
                      )}
                    </div>

                    <div style={{ paddingTop: 9, borderTop: '1px dashed var(--gfw-border)' }}>
                      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-faint)', marginBottom: 6 }}>Apply only when</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {CONDITIONS.map((c) => (
                          <button
                            key={c.key}
                            type="button"
                            onClick={() => toggleCondition(i, c.key, c.def)}
                            className={`chip${Object.prototype.hasOwnProperty.call(r.cond, c.key) ? ' is-active' : ''}`}
                            style={{ fontSize: 11, padding: '4px 10px' }}
                          >
                            {c.chip}
                          </button>
                        ))}
                      </div>
                      {r.condKeys.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 9 }}>
                          {r.condKeys.map((k) => {
                            const c = COND_MAP[k];
                            return (
                              <div key={k}>
                                <label style={{ display: 'block', fontSize: 10.5, color: 'var(--gfw-text-mutest)', marginBottom: 3 }}>{c.label}</label>
                                <input
                                  className="input gfw-mono"
                                  style={{ width: c.width, fontSize: 11.5, padding: '5px 7px', borderColor: String(r.cond[k] || '').trim() ? undefined : '#B91C1C' }}
                                  value={r.cond[k] ?? ''}
                                  onChange={(e) => commit((p) => { p.rules[i].cond[k] = e.target.value; }, `c-${i}-${k}`)}
                                  placeholder={c.ph}
                                  spellCheck={false}
                                />
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <div style={{ marginTop: 8, fontSize: 11.5, color: 'var(--gfw-text-mutest)', lineHeight: 1.5 }}>{summariseRule(r, cf)}</div>
                    </div>
                  </RepeatableCard>
                );
              })}
              {d.rules.length === 0 && <div className="field-hint">No fees yet — the callback will run on every cart calculation and do nothing.</div>}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 11, flexWrap: 'wrap' }}>
              <button type="button" onClick={addFee} className="btn btn-ghost btn-sm repeatable-add" style={{ borderStyle: 'dashed' }}>Add fee</button>
              <button type="button" onClick={addDiscount} className="btn btn-ghost btn-sm repeatable-add" style={{ borderStyle: 'dashed' }}>Add discount</button>
            </div>
          </div>

          <div className="field-card">
            <div className="field-card-title">Output</div>
            {OUTPUT_TOGGLES.map((t) => (
              <ToggleRow
                key={t.key}
                label={t.label}
                help={t.help}
                checked={!!cf[t.key]}
                onChange={(v) => commit((p) => { (p[t.key] as boolean) = v; })}
              />
            ))}
          </div>
        </div>
      }
    />
  );
}
