import { escPhp, withCredit, type ValidationIssue } from '../lib/codegen';

export type OutputMode = 'classic' | 'blocks';
export type FieldType = 'text' | 'select' | 'checkbox';

export interface CheckoutField {
  key: string;
  label: string;
  type: FieldType;
  location: string;
  required: boolean;
  placeholder: string;
  choices: string;
}

export interface CheckoutFields {
  prefix: string;
  textDomain: string;
  fields: CheckoutField[];
}

export const CLASSIC_LOCATIONS: [string, string][] = [
  ['billing', 'Billing'],
  ['shipping', 'Shipping'],
  ['order', 'Order notes'],
];

export const BLOCKS_LOCATIONS: [string, string][] = [
  ['address', 'Address (billing & shipping)'],
  ['contact', 'Contact info'],
  ['order', 'Additional order info'],
];

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
function padTo(s: string, w: number): string {
  return s + new Array(Math.max(0, w - s.length) + 1).join(' ');
}
function aligned(pairs: [string, string][]): string {
  const w = pairs.reduce((m, p) => Math.max(m, p[0].length), 0);
  return pairs.map((p) => padTo("'" + p[0] + "'", w + 2) + ' => ' + p[1] + ',').join('\n');
}

export interface Choice {
  value: string;
  label: string;
}
function parseChoices(str: string): Choice[] {
  return String(str || '').split(',').map((part) => {
    const p = part.trim();
    if (!p) return null;
    const i = p.indexOf(':');
    const v = fnSlug(i >= 0 ? p.slice(0, i) : p);
    const l = i >= 0 ? p.slice(i + 1).trim() : p.charAt(0).toUpperCase() + p.slice(1);
    return v ? { value: v, label: l || v } : null;
  }).filter((x): x is Choice => x != null);
}

export interface DerivedField extends CheckoutField {
  key: string;
  parsed: Choice[];
}

export interface Derived {
  pre: string;
  td: string;
  fields: DerivedField[];
}

export function derive(cf: CheckoutFields): Derived {
  const pre = fnSlug(cf.prefix) || 'acme';
  return {
    pre,
    td: dashSlug(cf.textDomain) || pre.replace(/_/g, '-'),
    fields: (cf.fields || []).map((f) => ({ ...f, key: fnSlug(f.key) || 'field', parsed: parseChoices(f.choices) })),
  };
}

function buildClassic(cf: CheckoutFields): string {
  const d = derive(cf);
  const pre = d.pre;
  const td = d.td;
  const t = (s: string) => "__( '" + escPhp(s) + "', '" + td + "' )";

  const byLocation: Record<string, DerivedField[]> = {};
  d.fields.forEach((f) => {
    (byLocation[f.location] = byLocation[f.location] || []).push(f);
  });

  const filterBody = d.fields.map((f) => {
    const fullKey = f.location + '_' + f.key;
    const pairs: [string, string][] = [
      ['label', t(f.label || f.key)],
      ['required', f.required ? 'true' : 'false'],
      ["class", "array( 'form-row-wide' )"],
    ];
    if (f.placeholder) pairs.push(['placeholder', t(f.placeholder)]);
    if (f.type !== 'text') pairs.push(['type', "'" + f.type + "'"]);
    if (f.type === 'select' && f.parsed.length) {
      pairs.push(['options', 'array(\n' + indent(aligned(f.parsed.map((c) => [c.value, t(c.label)] as [string, string])), 1) + '\n)']);
    }
    return "\t$fields['" + f.location + "']['" + fullKey + "'] = array(\n" + indent(aligned(pairs), 2) + '\n\t);';
  }).join('\n\n');

  const saveBody = d.fields.map((f) => {
    const fullKey = f.location + '_' + f.key;
    return "\tif ( ! empty( $_POST['" + fullKey + "'] ) ) {\n\t\t$order->update_meta_data( '_" + fullKey + "', sanitize_text_field( wp_unslash( $_POST['" + fullKey + "'] ) ) );\n\t}";
  }).join('\n\n');

  let out = '/**\n * Add fields to the classic checkout form.\n *\n * @param array $fields Existing fields, grouped by section.\n * @return array\n */\nfunction ' + pre + '_checkout_fields( $fields ) {\n' + filterBody + '\n\n\treturn $fields;\n}\n' + "add_filter( 'woocommerce_checkout_fields', '" + pre + "_checkout_fields' );\n\n";

  out += '/**\n * Save the values onto the order — before it is written, so this\n * runs whether the order ends up in wp_posts or the HPOS tables.\n *\n * @param WC_Order $order The order being created.\n * @param array    $data  The posted checkout data.\n */\nfunction ' + pre + '_save_checkout_fields( $order, $data ) {\n' + saveBody + '\n}\n' + "add_action( 'woocommerce_checkout_create_order', '" + pre + "_save_checkout_fields', 10, 2 );\n\n";

  if (byLocation.billing) {
    out += '/**\n * Show the billing fields on the order edit screen.\n *\n * @param WC_Order $order The order.\n */\nfunction ' + pre + '_display_billing_meta( $order ) {\n' + byLocation.billing.map((f) => {
      const fullKey = 'billing_' + f.key;
      return "\t$value = $order->get_meta( '_" + fullKey + "' );\n\n\tif ( $value ) {\n\t\techo '<p><strong>' . esc_html( " + t(f.label || f.key) + " ) . ':</strong> ' . esc_html( $value ) . '</p>';\n\t}";
    }).join('\n\n') + '\n}\n' + "add_action( 'woocommerce_admin_order_data_after_billing_address', '" + pre + "_display_billing_meta' );\n\n";
  }
  if (byLocation.shipping) {
    out += '/**\n * Show the shipping fields on the order edit screen.\n *\n * @param WC_Order $order The order.\n */\nfunction ' + pre + '_display_shipping_meta( $order ) {\n' + byLocation.shipping.map((f) => {
      const fullKey = 'shipping_' + f.key;
      return "\t$value = $order->get_meta( '_" + fullKey + "' );\n\n\tif ( $value ) {\n\t\techo '<p><strong>' . esc_html( " + t(f.label || f.key) + " ) . ':</strong> ' . esc_html( $value ) . '</p>';\n\t}";
    }).join('\n\n') + '\n}\n' + "add_action( 'woocommerce_admin_order_data_after_shipping_address', '" + pre + "_display_shipping_meta' );\n";
  }

  return out;
}

function buildBlocks(cf: CheckoutFields): string {
  const d = derive(cf);
  const pre = d.pre;
  const td = d.td;
  const t = (s: string) => "__( '" + escPhp(s) + "', '" + td + "' )";

  const calls = d.fields.map((f) => {
    const id = pre + '/' + f.key.replace(/_/g, '-');
    const pairs: [string, string][] = [
      ['id', "'" + id + "'"],
      ['label', t(f.label || f.key)],
      ['location', "'" + f.location + "'"],
      ['type', "'" + f.type + "'"],
      ['required', f.required ? 'true' : 'false'],
    ];
    if (f.type === 'select' && f.parsed.length) {
      pairs.push(['options', 'array(\n' + indent(f.parsed.map((c) => 'array(\n' + indent(aligned([['value', "'" + c.value + "'"], ['label', t(c.label)]]), 1) + '\n),').join('\n'), 1) + '\n)']);
    }
    return 'woocommerce_register_additional_checkout_field(\n' + indent('array(\n' + indent(aligned(pairs), 1) + '\n)', 1) + '\n);';
  }).join('\n\n');

  let out = '/**\n * Register fields for the Blocks Checkout — the id must be namespaced\n * with a slash, or WooCommerce refuses to register it.\n */\nfunction ' + pre + '_register_checkout_fields() {\n' + indent(calls, 1) + '\n}\n' + "add_action( 'woocommerce_init', '" + pre + "_register_checkout_fields' );\n\n";
  out += '/**\n * Read a value back — swap in the id of the field you need.\n *\n * $value = $order->get_meta( \'' + (d.fields[0] ? pre + '/' + d.fields[0].key.replace(/_/g, '-') : pre + '/field') + "' );\n */\n";

  return out;
}

export function buildCode(cf: CheckoutFields, mode: OutputMode): string {
  let out = '<?php\n/**\n * Plugin Name:       Checkout fields\n * Description:       Adds ' + (cf.fields || []).length + ' field' + ((cf.fields || []).length === 1 ? '' : 's') + ' to ' + (mode === 'classic' ? 'classic' : 'Blocks') + ' checkout.\n * Version:           1.0.0\n * Requires PHP:      7.4\n * Requires Plugins:  woocommerce\n */\n\ndefined( \'ABSPATH\' ) || exit;\n\n';
  out += mode === 'classic' ? buildClassic(cf) : buildBlocks(cf);
  return withCredit(out);
}

export function validate(cf: CheckoutFields): ValidationIssue[] {
  const d = derive(cf);
  const out: ValidationIssue[] = [];
  const add = (severity: ValidationIssue['severity'], message: string, fix?: string, fixLabel?: string) => out.push({ severity, message, fix, fixLabel });

  if (!d.fields.length) add('error', 'No fields yet.');

  const seen: Record<string, boolean> = {};
  d.fields.forEach((f, i) => {
    const label = 'Field ' + (i + 1);
    const key = f.location + '_' + f.key;
    if (seen[key]) add('error', `Two fields both resolve to "${key}" — the second overwrites the first.`);
    seen[key] = true;
    if (!f.label.trim()) add('error', `${label} has no label.`);
    if (f.type === 'select' && !f.parsed.length) add('error', `${label} ("${f.label || f.key}") is a select with no choices.`, 'addChoices', 'Add two choices');
  });

  add('recommendation', 'Classic checkout (the shortcode) and the Blocks Checkout are two separate rendering paths — a store using Blocks Checkout needs the Blocks output mode as well, not instead of, if any customer could still land on a classic checkout page.');
  return out;
}

export function freshProject(): CheckoutFields {
  return {
    prefix: 'acme',
    textDomain: 'acme',
    fields: [
      { key: 'vat_id', label: 'VAT number', type: 'text', location: 'billing', required: false, placeholder: 'e.g. GB123456789', choices: '' },
    ],
  };
}

export function applyFix(cf: CheckoutFields, kind: string): CheckoutFields {
  const p: CheckoutFields = JSON.parse(JSON.stringify(cf));
  if (kind === 'addChoices') p.fields.forEach((f) => { if (f.type === 'select' && !f.choices.trim()) f.choices = 'first:First, second:Second'; });
  return p;
}
