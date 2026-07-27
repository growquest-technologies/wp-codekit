import { escPhp, withCredit, type ValidationIssue } from '../lib/codegen';

export type OutputMode = 'snippet' | 'functions' | 'plugin';
export type FieldType = 'text' | 'number' | 'checkbox' | 'select' | 'textarea';
export type ProductTab = 'general' | 'inventory' | 'shipping' | 'custom';

export interface ProductField {
  key: string;
  label: string;
  type: FieldType;
  def: string;
  description: string;
  choices: string;
}

export interface ProductFields {
  prefix: string;
  textDomain: string;
  metaPrefix: string;
  tab: ProductTab;
  customTabLabel: string;
  fields: ProductField[];
  exposeRest: boolean;
}

export const TYPES: [FieldType, string][] = [
  ['text', 'Text'],
  ['number', 'Number'],
  ['checkbox', 'Checkbox'],
  ['select', 'Select'],
  ['textarea', 'Textarea'],
];

export const TAB_HOOKS: Record<Exclude<ProductTab, 'custom'>, string> = {
  general: 'woocommerce_product_options_general_product_data',
  inventory: 'woocommerce_product_options_inventory_product_data',
  shipping: 'woocommerce_product_options_shipping_product_data',
};

const SANITIZE: Record<FieldType, string> = {
  text: 'wc_clean',
  number: 'wc_format_decimal',
  checkbox: '',
  select: 'sanitize_key',
  textarea: 'sanitize_textarea_field',
};

function fnSlug(s: string): string {
  return String(s || '').toLowerCase().trim().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
}
function metaSlug(s: string): string {
  return String(s || '').toLowerCase().trim().replace(/[^a-z0-9_]+/g, '_');
}
export function slugify(s: string): string {
  return String(s || '').toLowerCase().trim().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
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
export function parseChoices(str: string): Choice[] {
  return String(str || '').split(',').map((part) => {
    const p = part.trim();
    if (!p) return null;
    const i = p.indexOf(':');
    const v = metaSlug(i >= 0 ? p.slice(0, i) : p);
    const l = i >= 0 ? p.slice(i + 1).trim() : p.charAt(0).toUpperCase() + p.slice(1);
    return v ? { value: v, label: l || v } : null;
  }).filter((x): x is Choice => x != null);
}

export interface DerivedField extends ProductField {
  key: string;
  parsed: Choice[];
}

export interface Derived {
  pre: string;
  td: string;
  metaPrefix: string;
  tabId: string;
  fields: DerivedField[];
}

export function derive(pf: ProductFields): Derived {
  const pre = fnSlug(pf.prefix) || 'acme';
  return {
    pre,
    td: slugify(pf.textDomain || pf.prefix) || pre.replace(/_/g, '-'),
    metaPrefix: metaSlug(pf.metaPrefix),
    tabId: pre + '_extra',
    fields: (pf.fields || []).map((f) => ({ ...f, key: metaSlug(f.key) || 'field', parsed: parseChoices(f.choices) })),
  };
}

function defLiteral(f: ProductField): string {
  const v = String(f.def == null ? '' : f.def).trim();
  if (f.type === 'checkbox') return v === '1' || v.toLowerCase() === 'yes' ? "'yes'" : "'no'";
  return "'" + escPhp(v) + "'";
}

function fieldMarkup(d: Derived, f: DerivedField, td: string): string {
  const id = d.metaPrefix + f.key;
  const t = (s: string) => "__( '" + escPhp(s) + "', '" + td + "' )";
  const common: [string, string][] = [['id', "'" + id + "'"], ['label', t(f.label || f.key)]];
  if (f.description) common.push(['description', t(f.description)], ['desc_tip', 'true']);

  if (f.type === 'checkbox') {
    common.push(['value', "get_post_meta( $product->get_id(), '" + id + "', true ) ?: '" + (defLiteral(f) === "'yes'" ? 'yes' : 'no') + "'"]);
    return 'woocommerce_wp_checkbox(\n' + indent('array(\n' + indent(aligned(common), 1) + '\n)', 1) + '\n);';
  }
  if (f.type === 'select') {
    const options = f.parsed.length ? f.parsed : [{ value: 'a', label: 'Option A' }, { value: 'b', label: 'Option B' }];
    common.push(['value', "get_post_meta( $product->get_id(), '" + id + "', true )"]);
    common.push(['options', 'array(\n' + indent(aligned(options.map((c) => [c.value, t(c.label)] as [string, string])), 1) + '\n)']);
    return 'woocommerce_wp_select(\n' + indent('array(\n' + indent(aligned(common), 1) + '\n)', 1) + '\n);';
  }
  if (f.type === 'textarea') {
    common.push(['value', "get_post_meta( $product->get_id(), '" + id + "', true )"]);
    return 'woocommerce_wp_textarea_input(\n' + indent('array(\n' + indent(aligned(common), 1) + '\n)', 1) + '\n);';
  }
  if (f.type === 'number') {
    common.push(['value', "get_post_meta( $product->get_id(), '" + id + "', true )"]);
    common.push(['type', "'number'"]);
    common.push(['custom_attributes', "array(\n\t'step' => 'any',\n\t'min'  => '0',\n)"]);
    return 'woocommerce_wp_text_input(\n' + indent('array(\n' + indent(aligned(common), 1) + '\n)', 1) + '\n);';
  }
  common.push(['value', "get_post_meta( $product->get_id(), '" + id + "', true )"]);
  return 'woocommerce_wp_text_input(\n' + indent('array(\n' + indent(aligned(common), 1) + '\n)', 1) + '\n);';
}

function saveLine(d: Derived, f: DerivedField): string {
  const id = d.metaPrefix + f.key;
  const post = "wp_unslash( $_POST['" + id + "'] ?? '' )";
  if (f.type === 'checkbox') return "update_post_meta( $post_id, '" + id + "', isset( $_POST['" + id + "'] ) ? 'yes' : 'no' );";
  if (f.type === 'select') {
    const values = (f.parsed.length ? f.parsed : [{ value: 'a', label: '' }]).map((c) => "'" + c.value + "'").join(', ');
    return "$" + f.key + ' = ' + SANITIZE.select + '( ' + post + ' );\nupdate_post_meta( $post_id, \'' + id + "', in_array( $" + f.key + ', array( ' + values + ' ), true ) ? $' + f.key + ' : ' + defLiteral(f) + ' );';
  }
  return "update_post_meta( $post_id, '" + id + "', " + SANITIZE[f.type] + '( ' + post + ' ) );';
}

export function buildCode(pf: ProductFields, mode: OutputMode): string {
  const d = derive(pf);
  const pre = d.pre;
  const td = d.td;
  const tabHook = pf.tab === 'custom' ? null : TAB_HOOKS[pf.tab];

  const panelBody = d.fields.length
    ? d.fields.map((f) => fieldMarkup(d, f, td)).join('\n\n')
    : '// Add a field to generate the form markup.';

  let out = '';
  if (mode === 'plugin') {
    out += '<?php\n/**\n * Plugin Name:       Product fields\n * Description:       Adds ' + d.fields.length + ' field' + (d.fields.length === 1 ? '' : 's') + ' to the Product Data metabox.\n * Version:           1.0.0\n * Requires PHP:      7.4\n * Requires Plugins:  woocommerce\n * Text Domain:       ' + td + "\n */\n\ndefined( 'ABSPATH' ) || exit;\n\n";
  } else if (mode === 'functions') {
    out += "<?php\n// Add to your theme's functions.php.\n\n";
  }

  if (pf.tab === 'custom') {
    out += '/**\n * Add the tab to the Product Data panel.\n *\n * @param array $tabs Existing tabs.\n * @return array\n */\nfunction ' + pre + "_product_tab( $tabs ) {\n\t$tabs['" + d.tabId + "'] = array(\n\t\t'label'    => __( '" + escPhp(pf.customTabLabel || 'Extra') + "', '" + td + "' ),\n\t\t'target'   => '" + d.tabId + "_data',\n\t\t'class'    => array(),\n\t\t'priority' => 80,\n\t);\n\n\treturn $tabs;\n}\n" + "add_filter( 'woocommerce_product_data_tabs', '" + pre + "_product_tab' );\n\n";
    out += '/**\n * Render the tab panel.\n */\nfunction ' + pre + '_product_panel() {\n\tglobal $product_object;\n\n\t$product = $product_object;\n\n\techo \'<div id="\' . esc_attr( \'' + d.tabId + '_data\' ) . \'" class="panel woocommerce_options_panel">\';\n\n' + indent(panelBody, 1) + '\n\n\techo \'</div>\';\n}\n' + "add_action( 'woocommerce_product_data_panels', '" + pre + "_product_panel' );\n";
  } else {
    out += '/**\n * Render the fields in the ' + pf.tab + ' tab.\n */\nfunction ' + pre + '_product_fields() {\n\tglobal $product_object;\n\n\t$product = $product_object;\n\n' + indent(panelBody, 1) + '\n}\n' + "add_action( '" + tabHook + "', '" + pre + "_product_fields' );\n";
  }

  out += '\n/**\n * Save the fields. Fires after WooCommerce has already verified the\n * Product Data metabox nonce, so no extra nonce check belongs here.\n *\n * @param int $post_id Product post ID.\n */\nfunction ' + pre + '_save_product_fields( $post_id ) {\n' + indent(d.fields.length ? d.fields.map((f) => saveLine(d, f)).join('\n\n') : '// Nothing to save yet.', 1) + '\n}\n' + "add_action( 'woocommerce_process_product_meta', '" + pre + "_save_product_fields' );\n";

  if (pf.exposeRest && d.fields.length) {
    out += '\n/**\n * Expose the fields to the REST API and the block editor.\n */\nfunction ' + pre + '_register_product_meta() {\n' + indent(d.fields.map((f) => {
      const id = d.metaPrefix + f.key;
      const restType = f.type === 'checkbox' ? 'boolean' : f.type === 'number' ? 'number' : 'string';
      const pairs: [string, string][] = [
        ['type', "'" + restType + "'"],
        ['single', 'true'],
        ['show_in_rest', 'true'],
        ['sanitize_callback', f.type === 'checkbox' ? "static function ( $value ) {\n\treturn $value ? 'yes' : 'no';\n}" : "'" + (SANITIZE[f.type] || 'sanitize_text_field') + "'"],
        ['auth_callback', "static function ( $allowed, $meta_key, $post_id ) {\n\treturn current_user_can( 'edit_product', $post_id );\n}"],
      ];
      return 'register_post_meta(\n' + indent("'product',\n'" + escPhp(id) + "',\narray(\n" + indent(aligned(pairs), 1) + '\n)', 1) + '\n);';
    }).join('\n\n'), 1) + '\n}\n' + "add_action( 'init', '" + pre + "_register_product_meta' );\n";
  }

  return withCredit(out);
}

export function validate(pf: ProductFields): ValidationIssue[] {
  const d = derive(pf);
  const out: ValidationIssue[] = [];
  const add = (severity: ValidationIssue['severity'], message: string, fix?: string, fixLabel?: string) => out.push({ severity, message, fix, fixLabel });

  if (!d.fields.length) add('error', 'No fields yet — the panel renders empty.');
  if (!d.metaPrefix) add('warning', 'No key prefix. Product meta keys are global across every plugin on the site.', 'addPrefix', 'Prefix the keys');
  if (pf.tab === 'custom' && !pf.customTabLabel.trim()) add('error', 'A custom tab needs a label, or it renders as a blank pill in the tab strip.');

  const seen: Record<string, boolean> = {};
  d.fields.forEach((f) => {
    const id = d.metaPrefix + f.key;
    if (seen[id]) add('error', `Two fields save to "${id}". The second overwrites the first on save.`);
    seen[id] = true;
    if (!String(f.key || '').trim()) add('error', 'A field key is missing.');
    if (f.type === 'select' && !f.parsed.length) add('error', `The select "${f.key}" has no choices, so it always falls back to its default.`, 'addChoices', 'Add two choices');
    if (!f.description) add('recommendation', `No description on "${f.label || f.key}" — desc_tip only shows when there is text to show.`);
  });

  if (pf.tab !== 'custom' && d.fields.length > 6) add('recommendation', `${d.fields.length} fields in the ${pf.tab} tab is a lot to add to an existing WooCommerce panel — consider a custom tab instead so your fields don't crowd core's own.`);
  if (pf.exposeRest && !d.fields.length) add('warning', 'REST exposure is on but there are no fields to register meta for.');
  return out;
}

export function freshProject(): ProductFields {
  return {
    prefix: 'acme',
    textDomain: 'acme',
    metaPrefix: 'acme_',
    tab: 'general',
    customTabLabel: 'Extra details',
    fields: [
      { key: 'warranty_months', label: 'Warranty (months)', type: 'number', def: '12', description: 'Shown on the product page under the price.', choices: '' },
      { key: 'gift_wrappable', label: 'Gift wrappable', type: 'checkbox', def: '0', description: 'Offers gift wrapping at checkout for this product.', choices: '' },
    ],
    exposeRest: true,
  };
}

export function applyFix(pf: ProductFields, kind: string): ProductFields {
  const p: ProductFields = JSON.parse(JSON.stringify(pf));
  if (kind === 'addPrefix') p.metaPrefix = fnSlug(p.prefix) + '_';
  if (kind === 'addChoices') p.fields.forEach((f) => { if (f.type === 'select' && !f.choices.trim()) f.choices = 'first:First, second:Second'; });
  return p;
}

export interface RefArg {
  name: string;
  type: string;
  description: string;
}

export const REF_ARGS: RefArg[] = [
  { name: 'woocommerce_product_options_general_product_data', type: 'action', description: 'Fires inside the General tab, after core\'s own price and SKU fields.' },
  { name: 'woocommerce_product_options_inventory_product_data', type: 'action', description: 'Fires inside the Inventory tab.' },
  { name: 'woocommerce_product_options_shipping_product_data', type: 'action', description: 'Fires inside the Shipping tab, after weight and dimensions.' },
  { name: 'woocommerce_product_data_tabs / _panels', type: 'filter/action', description: 'Add a whole new tab (filter) and render its content (action) — used instead of the three hooks above when a custom tab is selected.' },
  { name: 'woocommerce_process_product_meta', type: 'action', description: 'Fires once, after WooCommerce has already verified the Product Data metabox nonce — your save callback does not need its own.' },
];
