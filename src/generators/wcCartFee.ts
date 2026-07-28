import { escPhp, withCredit, type ValidationIssue } from '../lib/codegen';

export type OutputMode = 'snippet' | 'functions' | 'plugin';
export type RuleMode = 'fee' | 'discount';
export type CalcType = 'fixed' | 'percent' | 'per_item' | 'per_weight';
export type TaxClass = 'standard' | 'reduced-rate' | 'zero-rate';
export type Basis = 'subtotal' | 'after_discount' | 'subtotal_incl_tax';
export type AddressSource = 'shipping' | 'billing';
export type ConditionKey = 'minSubtotal' | 'maxSubtotal' | 'minItems' | 'country' | 'shipping' | 'payment' | 'role' | 'category';

export type Conditions = Partial<Record<ConditionKey, string>>;

export interface FeeRule {
  label: string;
  mode: RuleMode;
  calc: CalcType;
  amount: string;
  taxable: boolean;
  taxClass: TaxClass;
  cap: string;
  cond: Conditions;
}

export interface CartFee {
  prefix: string;
  textDomain: string;
  basis: Basis;
  addressSource: AddressSource;
  guardAdmin: boolean;
  hideZero: boolean;
  paymentRefreshJs: boolean;
  feeHtmlFilter: boolean;
  couponAlternative: boolean;
  rules: FeeRule[];
}

export const CALCS: [CalcType, string][] = [
  ['fixed', 'Fixed amount'],
  ['percent', '% of cart'],
  ['per_item', 'Per item'],
  ['per_weight', 'Per weight unit'],
];

export const TAX_CLASSES: [TaxClass, string][] = [
  ['standard', 'Standard rate'],
  ['reduced-rate', 'Reduced rate'],
  ['zero-rate', 'Zero rate'],
];

export interface ConditionDef {
  key: ConditionKey;
  label: string;
  chip: string;
  def: string;
  num?: boolean;
  width: string;
  ph: string;
}

export const CONDITIONS: ConditionDef[] = [
  { key: 'minSubtotal', label: 'Min subtotal', chip: 'Min subtotal', def: '50', num: true, width: '86px', ph: '50' },
  { key: 'maxSubtotal', label: 'Max subtotal', chip: 'Max subtotal', def: '500', num: true, width: '86px', ph: '500' },
  { key: 'minItems', label: 'Min items', chip: 'Min items', def: '3', num: true, width: '70px', ph: '3' },
  { key: 'country', label: 'Country codes', chip: 'Country', def: 'GB, IE', width: '112px', ph: 'GB, IE' },
  { key: 'shipping', label: 'Shipping method ids', chip: 'Shipping', def: 'local_pickup', width: '148px', ph: 'flat_rate' },
  { key: 'payment', label: 'Gateway ids', chip: 'Payment', def: 'cod', width: '112px', ph: 'cod' },
  { key: 'role', label: 'User roles', chip: 'Role', def: 'wholesale', width: '124px', ph: 'wholesale' },
  { key: 'category', label: 'product_cat slugs', chip: 'Category', def: 'oversized', width: '136px', ph: 'oversized' },
];

export const COND_MAP: Record<string, ConditionDef> = Object.fromEntries(CONDITIONS.map((c) => [c.key, c]));

const BASIS_EXPR: Record<Basis, string> = {
  subtotal: '(float) $cart->get_subtotal()',
  after_discount: '(float) $cart->get_cart_contents_total()',
  subtotal_incl_tax: '(float) $cart->get_subtotal() + (float) $cart->get_subtotal_tax()',
};

export const BASIS_LABEL: Record<Basis, string> = {
  subtotal: 'get_subtotal()',
  after_discount: 'get_cart_contents_total()',
  subtotal_incl_tax: 'get_subtotal() + get_subtotal_tax()',
};

function fnSlug(s: string): string {
  return String(s || '').toLowerCase().trim().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
}
export function slugify(s: string): string {
  return String(s || '').toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
}
function indent(text: string, depth: number): string {
  const p = new Array(depth + 1).join('\t');
  return text.split('\n').map((l) => (l ? p + l : '')).join('\n');
}
function padTo(s: string, w: number): string {
  return s + new Array(Math.max(0, w - s.length) + 1).join(' ');
}
export function num(v: unknown): number {
  const n = parseFloat(String(v == null ? '' : v).replace(/[^0-9.-]/g, ''));
  return isFinite(n) ? n : 0;
}
export function money(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2);
}
export function trimNum(n: number): string {
  return String(Math.round(n * 1000000) / 1000000);
}
export function csv(v: unknown): string[] {
  return String(v == null ? '' : v).split(',').map((p) => p.trim()).filter(Boolean);
}
function phpList(arr: string[]): string {
  return 'array( ' + arr.map((a) => "'" + escPhp(a) + "'").join(', ') + ' )';
}

export interface DerivedRule extends FeeRule {
  condKeys: ConditionKey[];
  amountNum: number;
  capNum: number;
  feeId: string;
}

export interface Derived {
  pre: string;
  td: string;
  rules: DerivedRule[];
  usedCond: Partial<Record<ConditionKey, boolean>>;
  needSubtotal: boolean;
  needItems: boolean;
  needWeight: boolean;
  needCountry: boolean;
  needPayment: boolean;
  needDecimals: boolean;
  hasDiscount: boolean;
}

export function derive(cf: CartFee): Derived {
  const pre = fnSlug(cf.prefix) || 'acme';
  const td = slugify(cf.textDomain) || pre.replace(/_/g, '-');
  const rules: DerivedRule[] = (cf.rules || []).map((r) => {
    const cond = r.cond || {};
    const keys = CONDITIONS.map((c) => c.key).filter((k) => Object.prototype.hasOwnProperty.call(cond, k));
    return {
      label: r.label, mode: r.mode, calc: r.calc, taxable: !!r.taxable, taxClass: r.taxClass || 'standard',
      amount: r.amount, cap: r.cap, cond, condKeys: keys,
      amountNum: num(r.amount), capNum: num(r.cap), feeId: slugify(r.label),
    };
  });
  const usedCond: Partial<Record<ConditionKey, boolean>> = {};
  rules.forEach((r) => r.condKeys.forEach((k) => { usedCond[k] = true; }));
  const calcs: Partial<Record<CalcType, boolean>> = {};
  rules.forEach((r) => { calcs[r.calc] = true; });
  return {
    pre, td, rules, usedCond,
    needSubtotal: !!(calcs.percent || usedCond.minSubtotal || usedCond.maxSubtotal),
    needItems: !!(calcs.per_item || usedCond.minItems),
    needWeight: !!calcs.per_weight,
    needCountry: !!usedCond.country,
    needPayment: !!usedCond.payment,
    needDecimals: !!(calcs.percent || calcs.per_item || calcs.per_weight),
    hasDiscount: rules.some((r) => r.mode === 'discount'),
  };
}

function alignAssign(pairs: [string, string][]): string {
  const w = pairs.reduce((m, p) => Math.max(m, p[0].length), 0);
  return pairs.map((p) => padTo(p[0], w) + ' = ' + p[1] + ';').join('\n');
}

function condExpr(key: ConditionKey, value: string | undefined, d: Derived): string {
  if (key === 'minSubtotal') return '$subtotal >= ' + money(num(value));
  if (key === 'maxSubtotal') return '$subtotal <= ' + money(num(value));
  if (key === 'minItems') return '$items >= ' + Math.max(0, Math.round(num(value)));
  if (key === 'country') return 'in_array( $country, ' + phpList(csv(value).map((c) => c.toUpperCase())) + ', true )';
  if (key === 'payment') return 'in_array( $payment, ' + phpList(csv(value)) + ', true )';
  if (key === 'shipping') return d.pre + '_shipping_method_matches( ' + phpList(csv(value)) + ' )';
  if (key === 'role') return d.pre + '_user_has_role( ' + phpList(csv(value)) + ' )';
  if (key === 'category') return d.pre + '_cart_has_category( $cart, ' + phpList(csv(value).map(slugify)) + ' )';
  return '';
}

export function describeCalc(r: DerivedRule, cf: CartFee): string {
  const a = r.amountNum;
  if (r.calc === 'percent') return trimNum(a) + '% of ' + BASIS_LABEL[cf.basis];
  if (r.calc === 'per_item') return money(a) + ' per item in the cart';
  if (r.calc === 'per_weight') return money(a) + ' per unit of cart weight';
  return 'a flat ' + money(a);
}

function ruleBlock(r: DerivedRule, cf: CartFee, d: Derived): string {
  const lines = ['// ' + (r.label || 'Unnamed') + ' — ' + describeCalc(r, cf) + (r.mode === 'discount' ? ', taken off the total' : '') + '.'];
  if (r.calc === 'fixed') lines.push('$amount = ' + money(r.amountNum) + ';');
  else if (r.calc === 'percent') lines.push('$amount = round( $subtotal * ( ' + trimNum(r.amountNum) + ' / 100 ), $decimals );');
  else if (r.calc === 'per_item') lines.push('$amount = round( ' + money(r.amountNum) + ' * $items, $decimals );');
  else lines.push('$amount = round( ' + money(r.amountNum) + ' * $weight, $decimals );');
  if (r.capNum > 0) lines.push('$amount = min( $amount, ' + money(r.capNum) + ' );');

  const conds: string[] = [];
  if (cf.hideZero) conds.push('$amount > 0');
  r.condKeys.forEach((k) => {
    const e = condExpr(k, r.cond[k], d);
    if (e) conds.push(e);
  });

  const args = ["__( '" + escPhp(r.label || 'Fee') + "', '" + d.td + "' )", r.mode === 'discount' ? '-$amount' : '$amount'];
  if (r.taxable) args.push('true', "'" + (r.taxClass === 'standard' ? '' : r.taxClass) + "'");
  else args.push('false');
  const call = '$cart->add_fee( ' + args.join(', ') + ' );';

  if (!conds.length) {
    lines.push(call);
    return lines.join('\n');
  }
  const oneLine = 'if ( ' + conds.join(' && ') + ' ) {';
  if (oneLine.length <= 80) lines.push('', oneLine + '\n' + indent(call, 1) + '\n}');
  else lines.push('', 'if (\n' + indent(conds[0] + '\n' + conds.slice(1).map((c) => '&& ' + c).join('\n'), 1) + '\n) {\n' + indent(call, 1) + '\n}');
  return lines.join('\n');
}

function feeFunctionBody(cf: CartFee, d: Derived): string {
  const L: string[] = [];
  if (cf.guardAdmin) L.push("if ( is_admin() && ! defined( 'DOING_AJAX' ) ) {\n\treturn;\n}", '');
  L.push('if ( ! $cart instanceof WC_Cart || $cart->is_empty() ) {\n\treturn;\n}', '');
  const decl: [string, string][] = [];
  if (d.needSubtotal) decl.push(['$subtotal', BASIS_EXPR[cf.basis]]);
  if (d.needItems) decl.push(['$items', '$cart->get_cart_contents_count()']);
  if (d.needWeight) decl.push(['$weight', '(float) $cart->get_cart_contents_weight()']);
  if (d.needCountry) decl.push(['$country', 'WC()->customer->get_' + (cf.addressSource === 'billing' ? 'billing' : 'shipping') + '_country()']);
  if (d.needPayment) decl.push(['$payment', "(string) WC()->session->get( 'chosen_payment_method' )"]);
  if (d.needDecimals) decl.push(['$decimals', 'wc_get_price_decimals()']);
  if (decl.length) L.push(alignAssign(decl), '');
  if (!d.rules.length) L.push('// Nothing to add yet.');
  d.rules.forEach((r) => L.push(ruleBlock(r, cf, d), ''));
  while (L.length && L[L.length - 1] === '') L.pop();
  return L.join('\n');
}

interface Block {
  doc: string;
  name: string;
  params: string;
  body: string;
  hook?: string;
  isFilter?: boolean;
  args?: number;
}

function helperBlocks(d: Derived): Block[] {
  const out: Block[] = [];
  if (d.usedCond.shipping) out.push({
    doc: '/**\n * Whether one of the chosen shipping methods matches.\n *\n * @param array $ids Method ids — "flat_rate" matches every instance, "flat_rate:3" only one.\n * @return bool\n */\n',
    name: 'shipping_method_matches', params: '$ids',
    body: "$chosen = (array) WC()->session->get( 'chosen_shipping_methods' );\n\nforeach ( $chosen as $method ) {\n\tif ( in_array( $method, $ids, true ) ) {\n\t\treturn true;\n\t}\n\n\tif ( in_array( current( explode( ':', $method ) ), $ids, true ) ) {\n\t\treturn true;\n\t}\n}\n\nreturn false;",
  });
  if (d.usedCond.role) out.push({
    doc: '/**\n * Whether the current user holds one of the roles. "guest" matches a logged-out visitor.\n *\n * @param array $roles Role slugs.\n * @return bool\n */\n',
    name: 'user_has_role', params: '$roles',
    body: "$user = wp_get_current_user();\n\nif ( ! $user || ! $user->exists() ) {\n\treturn in_array( 'guest', $roles, true );\n}\n\nreturn (bool) array_intersect( (array) $user->roles, $roles );",
  });
  if (d.usedCond.category) out.push({
    doc: '/**\n * Whether the cart holds a product in one of the categories.\n *\n * @param WC_Cart $cart  Cart object.\n * @param array   $slugs product_cat slugs.\n * @return bool\n */\n',
    name: 'cart_has_category', params: '$cart, $slugs',
    body: "foreach ( $cart->get_cart() as $item ) {\n\tif ( has_term( $slugs, 'product_cat', $item['product_id'] ) ) {\n\t\treturn true;\n\t}\n}\n\nreturn false;",
  });
  return out;
}

export function buildCode(cf: CartFee, mode: OutputMode): string {
  const d = derive(cf);
  const pre = d.pre;
  let out = '';
  if (mode === 'plugin') {
    out += '<?php\n/**\n * Plugin Name:       Cart fees and discounts\n * Description:       Conditional fees and negative-fee discounts on the WooCommerce cart.\n * Version:           1.0.0\n * Requires PHP:      7.4\n * Requires Plugins:  woocommerce\n * Text Domain:       ' + d.td + "\n */\n\ndefined( 'ABSPATH' ) || exit;\n\n";
  } else if (mode === 'functions') {
    out += "<?php\n// Add to your theme's functions.php.\n\nif ( ! class_exists( 'WooCommerce' ) ) {\n\treturn;\n}\n\n";
  } else {
    out += "if ( ! class_exists( 'WooCommerce' ) ) {\n\treturn;\n}\n\n";
  }

  const blocks: Block[] = [];
  helperBlocks(d).forEach((h) => blocks.push(h));
  blocks.push({
    doc: '/**\n * Add the cart fees and discounts.\n *\n * @param WC_Cart $cart Cart object, passed by reference.\n */\n',
    name: 'add_cart_fees', params: '$cart', body: feeFunctionBody(cf, d),
    hook: 'woocommerce_cart_calculate_fees',
  });

  if (cf.paymentRefreshJs && d.usedCond.payment) blocks.push({
    doc: '/**\n * Recalculate the checkout totals when the shopper switches payment method.\n */\n',
    name: 'refresh_checkout_on_payment_change', params: '',
    body: "if ( ! is_checkout() ) {\n\treturn;\n}\n\nwc_enqueue_js(\n\t\"jQuery( document.body ).on( 'change', 'input[name=payment_method]', function() {\n\t\tjQuery( document.body ).trigger( 'update_checkout' );\n\t} );\"\n);",
    hook: 'wp_footer',
  });

  if (cf.feeHtmlFilter) blocks.push({
    doc: '/**\n * Mark negative fees up as a discount line.\n *\n * @param string $html Fee amount HTML.\n * @param object $fee  Fee object.\n * @return string\n */\n',
    name: 'cart_fee_html', params: '$html, $fee',
    body: "if ( $fee->total < 0 ) {\n\treturn '<span class=\"" + pre.replace(/_/g, '-') + "-fee-discount\">' . $html . '</span>';\n}\n\nreturn $html;",
    hook: 'woocommerce_cart_totals_fee_html', isFilter: true, args: 2,
  });

  out += blocks.map((b) => {
    let s = b.doc + 'function ' + pre + '_' + b.name + '(' + (b.params ? ' ' + b.params + ' ' : '') + ') {\n' + indent(b.body, 1) + '\n}\n';
    if (b.hook) s += (b.isFilter ? 'add_filter' : 'add_action') + "( '" + b.hook + "', '" + pre + '_' + b.name + "'" + (b.args ? ', 10, ' + b.args : '') + ' );\n';
    return s;
  }).join('\n');

  if (cf.couponAlternative && d.hasDiscount) {
    const dash = pre.replace(/_/g, '-');
    out += '\n/*\n * A negative fee is the blunt instrument. Anything the shopper should read as a\n * discount — reported, restricted, removable — belongs in a coupon:\n *\n * add_filter( \'woocommerce_get_shop_coupon_data\', function ( $data, $code ) {\n * \tif ( \'' + dash + '-auto\' !== $code ) {\n * \t\treturn $data;\n * \t}\n *\n * \treturn array(\n * \t\t\'id\'            => -1,\n * \t\t\'amount\'        => 10,\n * \t\t\'discount_type\' => \'percent\',\n * \t);\n * }, 10, 2 );\n *\n * Then apply it from woocommerce_before_calculate_totals when the cart qualifies:\n * $cart->apply_coupon( \'' + dash + '-auto\' );\n */\n';
  }

  return withCredit(out);
}

// ---------------------------------------------------------------------------
// Sample-cart evaluation (drives the "Sample cart" preview tab)

export interface SampleCart {
  subtotal: string;
  items: string;
  weight: string;
  coupon: string;
  country: string;
  shipping: string;
  payment: string;
  role: string;
  hasCategory: boolean;
  taxRate: string;
  currency: string;
}

export function basisValue(sample: SampleCart, cf: CartFee): number {
  const st = num(sample.subtotal);
  if (cf.basis === 'subtotal_incl_tax') return st * (1 + num(sample.taxRate) / 100);
  if (cf.basis === 'after_discount') return Math.max(0, st - num(sample.coupon));
  return st;
}

export interface EvaluatedRule {
  label: string;
  mode: RuleMode;
  taxable: boolean;
  capped: boolean;
  signed: number;
  matched: boolean;
  reason: string;
  calcNote: string;
}

export function evaluateRules(cf: CartFee, sample: SampleCart): EvaluatedRule[] {
  const d = derive(cf);
  const basis = basisValue(sample, cf);
  const items = Math.max(0, Math.round(num(sample.items)));
  const weight = num(sample.weight);
  return d.rules.map((r) => {
    let amount = r.calc === 'fixed' ? r.amountNum
      : r.calc === 'percent' ? (basis * r.amountNum) / 100
        : r.calc === 'per_item' ? r.amountNum * items
          : r.amountNum * weight;
    amount = Math.round(amount * 100) / 100;
    let capped = false;
    if (r.capNum > 0 && amount > r.capNum) { amount = r.capNum; capped = true; }
    let reason = '';
    if (cf.hideZero && amount <= 0) reason = 'the amount computes to ' + money(amount) + ', and zero-amount fees are skipped';
    r.condKeys.forEach((k) => {
      if (reason) return;
      const v = r.cond[k];
      if (k === 'minSubtotal' && basis < num(v)) reason = 'the ' + money(basis) + ' basis is under the ' + money(num(v)) + ' minimum';
      if (k === 'maxSubtotal' && basis > num(v)) reason = 'the ' + money(basis) + ' basis is over the ' + money(num(v)) + ' maximum';
      if (k === 'minItems' && items < num(v)) reason = items + ' items is under the ' + Math.round(num(v)) + ' item minimum';
      if (k === 'country' && csv(v).map((c) => c.toUpperCase()).indexOf(String(sample.country).toUpperCase()) < 0) reason = sample.country + ' is not in ' + csv(v).join(', ');
      if (k === 'shipping' && csv(v).filter((id) => id === sample.shipping || id === String(sample.shipping).split(':')[0]).length === 0) reason = 'the chosen shipping method is ' + (sample.shipping || 'none') + ', not ' + csv(v).join(' or ');
      if (k === 'payment' && csv(v).indexOf(sample.payment) < 0) reason = 'the chosen gateway is ' + sample.payment + ', not ' + csv(v).join(' or ');
      if (k === 'role' && csv(v).indexOf(sample.role) < 0) reason = 'the shopper is ' + sample.role + ', not ' + csv(v).join(' or ');
      if (k === 'category' && !sample.hasCategory) reason = 'no cart item is in ' + csv(v).join(' or ');
    });
    return {
      label: r.label || 'Unnamed fee', mode: r.mode, taxable: r.taxable, capped,
      signed: r.mode === 'discount' ? -amount : amount, matched: !reason, reason,
      calcNote: describeCalc(r, cf),
    };
  });
}

export function summariseRule(r: DerivedRule, cf: CartFee): string {
  if (!r.condKeys.length) return 'Added to every cart' + (cf.hideZero ? ' where the amount is above zero.' : ', even at zero.');
  return 'Added when ' + r.condKeys.map((k) => {
    const v = r.cond[k];
    if (k === 'minSubtotal') return 'the basis is at least ' + money(num(v));
    if (k === 'maxSubtotal') return 'the basis is at most ' + money(num(v));
    if (k === 'minItems') return 'the cart holds ' + Math.round(num(v)) + '+ items';
    if (k === 'country') return 'shipping to ' + csv(v).join('/');
    if (k === 'shipping') return csv(v).join('/') + ' is the chosen shipping method';
    if (k === 'payment') return csv(v).join('/') + ' is the chosen gateway';
    if (k === 'role') return 'the shopper is ' + csv(v).join('/');
    if (k === 'category') return 'an item is in ' + csv(v).join('/');
    return k;
  }).join(', and ') + '.';
}

export function validate(cf: CartFee): ValidationIssue[] {
  const d = derive(cf);
  const out: ValidationIssue[] = [];
  const add = (severity: ValidationIssue['severity'], message: string, fix?: string, fixLabel?: string) => out.push({ severity, message, fix, fixLabel });
  const q = (s: string) => '“' + s + '”';

  if (!d.rules.length) add('warning', 'No fees yet — the callback runs on every cart calculation and adds nothing.');
  if (!cf.guardAdmin) add('warning', 'Without the is_admin() guard this callback also runs when an order is edited in wp-admin, where WC()->session and the customer object may be missing — conditions silently fall through and the fee can be added twice.', 'enableGuard', 'Add the guard');

  const seen: Record<string, boolean> = {};
  d.rules.forEach((r, i) => {
    const name = r.label || 'fee ' + (i + 1);
    if (!String(r.label || '').trim()) add('error', 'A fee with no name sanitises to an empty fee id, and WooCommerce drops it.', 'nameFee:' + i, 'Name it');
    else if (seen[r.feeId]) add('error', q(name) + ' sanitises to the same fee id as an earlier fee (' + r.feeId + '). WooCommerce keeps the first and logs a doing_it_wrong notice for this one.', 'renameFee:' + i, 'Make it unique');
    seen[r.feeId] = true;

    if (r.amountNum <= 0) add('warning', q(name) + ' has an amount of ' + money(r.amountNum) + ', so it never adds anything. Discounts are set as a positive amount — the minus sign is added for you.');
    if (r.calc === 'percent' && r.amountNum > 100) add('warning', q(name) + ' is ' + trimNum(r.amountNum) + '% of the cart — more than the cart itself.');
    if (r.calc === 'percent' && !(r.capNum > 0)) add('recommendation', q(name) + ' is a percentage with no cap, so it scales without limit on a large order. A ceiling is cheap insurance.', 'addCap:' + i, 'Cap it');
    if (r.mode === 'discount' && r.taxable) add('recommendation', q(name) + ' is a taxable negative fee. The tax it removes is calculated at the fee’s own tax class, not proportionally across the items being discounted — so the tax line will not match what a coupon would produce.');
    if (r.mode === 'discount' && r.calc === 'fixed' && !Object.prototype.hasOwnProperty.call(r.cond, 'minSubtotal')) add('warning', 'Nothing stops ' + q(name) + ' from exceeding the cart subtotal. WooCommerce clamps the order total at zero, but the fee row still shows the full negative amount.', 'floorDiscount:' + i, 'Require a minimum');
    if (Object.prototype.hasOwnProperty.call(r.cond, 'minSubtotal') && Object.prototype.hasOwnProperty.call(r.cond, 'maxSubtotal') && num(r.cond.minSubtotal) > num(r.cond.maxSubtotal)) add('error', q(name) + ' asks for a subtotal above ' + money(num(r.cond.minSubtotal)) + ' and below ' + money(num(r.cond.maxSubtotal)) + ' — no cart can match.', 'swapMinMax:' + i, 'Swap them');
    if (r.taxable && r.taxClass !== 'standard') add('recommendation', q(name) + ' uses the ' + r.taxClass + ' tax class. Confirm that slug still exists under WooCommerce → Settings → Tax — a missing class falls back to no tax at all, silently.');
    if (r.condKeys.indexOf('shipping') >= 0) add('recommendation', q(name) + ' matches on shipping method ids. An id like flat_rate:3 is instance-specific: the number changes per shipping zone, so prefer the bare flat_rate unless you really mean one zone.');
  });

  if (d.usedCond.payment && !cf.paymentRefreshJs) add('error', 'A fee depends on the chosen gateway, but nothing tells the checkout to recalculate when the shopper switches payment method — the fee will be one selection behind until something else refreshes the totals.', 'enablePaymentJs', 'Add the refresh');
  if (d.usedCond.country && cf.addressSource === 'shipping') add('recommendation', 'Country conditions read the shipping country. On a cart with nothing shippable that field can be empty and WooCommerce falls back to the store base — switch to the billing country for digital-only carts.');
  if (d.needWeight) add('recommendation', 'get_cart_contents_weight() returns the store’s configured weight unit, not always kg. The per-weight rate has to be expressed in that same unit.');
  if (cf.basis === 'subtotal') add('recommendation', 'Percentages are taken from get_subtotal(), which is the items total before coupons — a 20% off coupon will not shrink the fee.');
  if (cf.basis === 'after_discount') add('recommendation', 'Percentages are taken from get_cart_contents_total(), so any coupon the shopper applies also shrinks this fee.');
  if (cf.basis === 'subtotal_incl_tax' && d.rules.some((r) => r.taxable)) add('warning', 'A taxable fee calculated from a tax-inclusive basis taxes the tax. Either take the percentage from the ex-tax subtotal or mark the fee non-taxable.');
  if (!cf.hideZero && d.rules.length) add('recommendation', 'Zero-amount fees are still added, and WooCommerce renders a row for them in the cart totals.', 'enableHideZero', 'Skip zero fees');
  if (d.hasDiscount && !cf.feeHtmlFilter) add('recommendation', 'Negative fees render in the same row style as a surcharge. The woocommerce_cart_totals_fee_html filter lets you style the discount rows distinctly.', 'enableFeeHtml', 'Add the filter');
  return out;
}

export function freshProject(): CartFee {
  return {
    prefix: 'acme', textDomain: 'acme', basis: 'subtotal', addressSource: 'shipping',
    guardAdmin: true, hideZero: true, paymentRefreshJs: true, feeHtmlFilter: false, couponAlternative: true,
    rules: [
      { label: 'Handling fee', mode: 'fee', calc: 'percent', amount: '3.5', taxable: true, taxClass: 'standard', cap: '12', cond: { minSubtotal: '25' } },
      { label: 'Oversized item surcharge', mode: 'fee', calc: 'per_item', amount: '4.00', taxable: true, taxClass: 'standard', cap: '', cond: { category: 'oversized' } },
      { label: 'Cash on delivery fee', mode: 'fee', calc: 'fixed', amount: '2.50', taxable: false, taxClass: 'standard', cap: '', cond: { payment: 'cod' } },
    ],
  };
}

/** Fixes are encoded as `kind` or `kind:ruleIndex` — the shared ValidationIssue.fix is a string. */
export function applyFix(cf: CartFee, fix: string): CartFee {
  const p: CartFee = JSON.parse(JSON.stringify(cf));
  const [kind, rawIndex] = fix.split(':');
  const i = parseInt(rawIndex, 10);

  if (kind === 'enableGuard') p.guardAdmin = true;
  if (kind === 'enablePaymentJs') p.paymentRefreshJs = true;
  if (kind === 'enableHideZero') p.hideZero = true;
  if (kind === 'enableFeeHtml') p.feeHtmlFilter = true;

  const r = p.rules && p.rules[i];
  if (!r) return p;
  if (kind === 'nameFee') r.label = r.mode === 'discount' ? 'Discount ' + (i + 1) : 'Fee ' + (i + 1);
  if (kind === 'renameFee') r.label = String(r.label || 'Fee') + ' ' + (i + 1);
  if (kind === 'addCap') r.cap = money(Math.max(10, num(r.amount) * 4));
  if (kind === 'floorDiscount') r.cond = { ...r.cond, minSubtotal: money(Math.max(10, num(r.amount) * 3)) };
  if (kind === 'swapMinMax') {
    const lo = r.cond.minSubtotal;
    const hi = r.cond.maxSubtotal;
    r.cond = { ...r.cond, minSubtotal: hi, maxSubtotal: lo };
  }
  return p;
}

export const SHIPPING_SAMPLES: [string, string][] = [
  ['flat_rate', 'flat_rate'],
  ['free_shipping', 'free_shipping'],
  ['local_pickup', 'local_pickup'],
  ['', 'none chosen'],
];
export const SHIPPING_COST: Record<string, number | null> = { flat_rate: 4.99, free_shipping: 0, local_pickup: 0, '': null };
export const COUNTRY_SAMPLES = ['GB', 'IE', 'US', 'DE', 'FR', 'AU', 'CA'];
export const PAYMENT_SAMPLES = ['cod', 'bacs', 'cheque', 'stripe', 'ppcp-gateway'];
export const ROLE_SAMPLES = ['guest', 'customer', 'subscriber', 'wholesale'];
export const CURRENCIES: [string, string][] = [['£', '£ GBP'], ['$', '$ USD'], ['€', '€ EUR']];

export function freshSample(): SampleCart {
  return { subtotal: '120.00', items: '4', weight: '8', coupon: '0', country: 'GB', shipping: 'flat_rate', payment: 'cod', role: 'customer', hasCategory: true, taxRate: '20', currency: '£' };
}

export function refSignature(pre: string): string {
  return "add_action( 'woocommerce_cart_calculate_fees', '" + pre + "_add_cart_fees' );\n\n// WC_Cart_Fees::add_fee( string $name, float $amount, bool $taxable = false, string $tax_class = '' )";
}

export const REF_FLOW = [
  'WC_Cart::calculate_totals() empties the fee list first, then fires this hook. Every fee has to be added again on every pass — never cache one in a transient or the session.',
  'The hook runs on the cart page, the checkout, every AJAX totals refresh, and any programmatic calculate_totals() call. Expect it several times per page load.',
  'Item totals and shipping are already calculated, so the subtotal and the chosen shipping method are readable. The payment method comes from the session, which is why gateway-based fees need a checkout refresh to keep up.',
  'Taxes for taxable fees are worked out after your callback returns, from the tax class you passed — so pass the amount ex-tax and let WooCommerce add the tax.',
];

export const REF_COUPON_POINTS = [
  'It shows in the fee row, not the discount row — shoppers read it as a charge that happens to be negative.',
  'It is invisible to coupon reports, usage limits, per-product restrictions and the coupon endpoints in the REST API.',
  'It is applied before tax at its own tax class, so the tax it removes will not match the tax on the items you meant to discount.',
  'It can exceed the cart subtotal. The order total is clamped at zero, so the excess is silently swallowed rather than refunded.',
];

export function refFees(d: Derived): string {
  return d.rules.length
    ? d.rules.map((r) => padTo(r.feeId || '(empty)', 28) + padTo(r.mode === 'discount' ? 'negative' : 'positive', 10) + padTo(r.calc, 11) + (r.taxable ? 'taxable / ' + r.taxClass : 'not taxable')).join('\n')
    : 'No fees yet.';
}
