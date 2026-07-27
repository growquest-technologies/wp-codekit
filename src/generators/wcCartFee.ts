import { escPhp, withCredit, type ValidationIssue } from '../lib/codegen';

export type OutputMode = 'snippet' | 'functions' | 'plugin';
export type Kind = 'fee' | 'discount';
export type AmountType = 'fixed' | 'percent';
export type SubtotalOp = 'gte' | 'lte';

export interface CartFee {
  prefix: string;
  textDomain: string;
  label: string;
  kind: Kind;
  amountType: AmountType;
  amount: string;
  taxable: boolean;
  condSubtotal: boolean;
  subtotalOp: SubtotalOp;
  subtotalValue: string;
  condProduct: boolean;
  productIds: string;
  condCategory: boolean;
  categorySlugs: string;
  condRole: boolean;
  roles: string[];
  condMinQty: boolean;
  minQty: string;
}

export const ROLES = ['administrator', 'editor', 'author', 'subscriber', 'customer', 'shop_manager', 'wholesale_customer'];

function fnSlug(s: string): string {
  return String(s || '').toLowerCase().trim().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
}
function dashSlug(s: string): string {
  return String(s || '').toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
}
function indent(text: string, depth: number): string {
  const p = new Array(depth + 1).join('\t');
  return text.split('\n').map((l) => (l ? p + l : '')).join('\n');
}
function valueList(str: string): string[] {
  return String(str || '').split(',').map((v) => v.trim()).filter((v) => v !== '');
}

export interface Derived {
  pre: string;
  td: string;
  productIds: string[];
  categorySlugs: string[];
}

export function derive(cf: CartFee): Derived {
  const pre = fnSlug(cf.prefix) || 'acme';
  return {
    pre,
    td: dashSlug(cf.textDomain) || pre.replace(/_/g, '-'),
    productIds: valueList(cf.productIds).filter((v) => /^\d+$/.test(v)),
    categorySlugs: valueList(cf.categorySlugs).map(dashSlug).filter(Boolean),
  };
}

export function buildCode(cf: CartFee, mode: OutputMode): string {
  const d = derive(cf);
  const pre = d.pre;
  const td = d.td;

  const checks: string[] = [];
  const preamble: string[] = [];
  preamble.push('if ( is_admin() && ! defined( \'DOING_AJAX\' ) ) {\n\treturn;\n}\n');

  if (cf.condSubtotal) {
    const op = cf.subtotalOp === 'gte' ? '>=' : '<=';
    checks.push('$cart->get_subtotal() ' + op + ' ' + (parseFloat(cf.subtotalValue) || 0));
  }
  if (cf.condProduct && d.productIds.length) {
    preamble.push(
      '$' + pre + '_has_product = false;\n\nforeach ( $cart->get_cart() as $cart_item ) {\n\tif ( in_array( $cart_item[\'product_id\'], array( ' + d.productIds.join(', ') + ' ), true ) ) {\n\t\t$' + pre + '_has_product = true;\n\t\tbreak;\n\t}\n}\n'
    );
    checks.push('$' + pre + '_has_product');
  }
  if (cf.condCategory && d.categorySlugs.length) {
    preamble.push(
      '$' + pre + "_has_category = false;\n\nforeach ( $cart->get_cart() as $cart_item ) {\n\tif ( has_term( array( '" + d.categorySlugs.map(escPhp).join("', '") + "' ), 'product_cat', $cart_item['product_id'] ) ) {\n\t\t$" + pre + '_has_category = true;\n\t\tbreak;\n\t}\n}\n'
    );
    checks.push('$' + pre + '_has_category');
  }
  if (cf.condRole && cf.roles.length) {
    checks.push("is_user_logged_in() && array_intersect( array( '" + cf.roles.join("', '") + "' ), wp_get_current_user()->roles )");
  }
  if (cf.condMinQty) {
    checks.push('$cart->get_cart_contents_count() >= ' + (parseInt(cf.minQty, 10) || 0));
  }

  let body = preamble.join('\n');
  if (checks.length) {
    body += '\nif ( ! ( ' + checks.join(' && ') + ' ) ) {\n\treturn;\n}\n';
  }

  body += '\n$label = __( \'' + escPhp(cf.label || 'Fee') + "', '" + td + "' );\n\n";
  if (cf.amountType === 'percent') {
    body += '$amount = $cart->get_subtotal() * ( ' + (parseFloat(cf.amount) || 0) + ' / 100 );\n';
  } else {
    body += '$amount = ' + (parseFloat(cf.amount) || 0) + ';\n';
  }
  if (cf.kind === 'discount') body += '$amount = -abs( $amount );\n';
  body += '\n$cart->add_fee( $label, $amount, ' + (cf.taxable ? 'true' : 'false') + ' );';

  let out = '';
  if (mode === 'plugin') {
    out += '<?php\n/**\n * Plugin Name:       Cart ' + (cf.kind === 'discount' ? 'discount' : 'fee') + '\n * Description:       Adds a conditional ' + (cf.kind === 'discount' ? 'discount' : 'fee') + ' at cart calculation.\n * Version:           1.0.0\n * Requires PHP:      7.4\n * Requires Plugins:  woocommerce\n * Text Domain:       ' + td + "\n */\n\ndefined( 'ABSPATH' ) || exit;\n\n";
  } else if (mode === 'functions') {
    out += "<?php\n// Add to your theme's functions.php.\n\n";
  }

  out += '/**\n * Add the ' + (cf.kind === 'discount' ? 'discount' : 'fee') + ' during cart totals calculation.\n *\n * @param WC_Cart $cart The cart being totalled.\n */\nfunction ' + pre + '_cart_fee( $cart ) {\n' + indent(body, 1) + '\n}\n' + "add_action( 'woocommerce_cart_calculate_fees', '" + pre + "_cart_fee' );\n";

  return withCredit(out);
}

export function validate(cf: CartFee): ValidationIssue[] {
  const d = derive(cf);
  const out: ValidationIssue[] = [];
  const add = (severity: ValidationIssue['severity'], message: string, fix?: string, fixLabel?: string) => out.push({ severity, message, fix, fixLabel });

  if (!cf.label.trim()) add('error', 'No label. This is the line item text shown in the cart and at checkout.');
  if (!cf.amount.trim() || isNaN(parseFloat(cf.amount))) add('error', 'The amount is not a number.');
  else if (parseFloat(cf.amount) < 0) add('warning', 'A negative amount here on top of choosing "Discount" double-negates. Enter a positive number and let the Discount/Fee choice decide the sign.', 'absAmount', 'Make it positive');

  if (cf.condSubtotal && (!cf.subtotalValue.trim() || isNaN(parseFloat(cf.subtotalValue)))) add('error', 'The subtotal threshold is not a number.');
  if (cf.condProduct && !d.productIds.length) add('error', 'Product condition is on, but no valid product ids are listed.');
  if (cf.condCategory && !d.categorySlugs.length) add('error', 'Category condition is on, but no category slugs are listed.');
  if (cf.condRole && !cf.roles.length) add('error', 'Role condition is on, but no roles are selected.');
  if (cf.condMinQty && (!cf.minQty.trim() || isNaN(parseInt(cf.minQty, 10)))) add('error', 'The minimum quantity is not a number.');

  if (!cf.condSubtotal && !cf.condProduct && !cf.condCategory && !cf.condRole && !cf.condMinQty) add('recommendation', 'No conditions are on, so this applies to every cart, every time.');
  if (cf.kind === 'discount' && cf.amountType === 'percent' && parseFloat(cf.amount) >= 100) add('warning', 'A 100% or larger percentage discount makes the cart total zero or negative — WooCommerce clamps fees, but check this is really intended.');
  if (cf.taxable && cf.kind === 'discount') add('recommendation', 'Taxable is on for a discount. WooCommerce applies tax proportionally to negative fees too, which is usually what you want, but double check against your tax settings.');
  return out;
}

export function freshProject(): CartFee {
  return {
    prefix: 'acme',
    textDomain: 'acme',
    label: 'Loyalty discount',
    kind: 'discount',
    amountType: 'percent',
    amount: '10',
    taxable: false,
    condSubtotal: true,
    subtotalOp: 'gte',
    subtotalValue: '100',
    condProduct: false,
    productIds: '',
    condCategory: false,
    categorySlugs: '',
    condRole: true,
    roles: ['wholesale_customer'],
    condMinQty: false,
    minQty: '3',
  };
}

export function applyFix(cf: CartFee, kind: string): CartFee {
  const p: CartFee = JSON.parse(JSON.stringify(cf));
  if (kind === 'absAmount') p.amount = String(Math.abs(parseFloat(p.amount) || 0));
  return p;
}
