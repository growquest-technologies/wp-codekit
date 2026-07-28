import { escPhp, withCredit, type ValidationIssue } from '../lib/codegen';

export type OutputMode = 'snippet' | 'functions' | 'plugin';
export type FieldType = 'text' | 'textarea' | 'number' | 'price' | 'checkbox' | 'select' | 'url';
export type Placement = 'general' | 'inventory' | 'shipping' | 'custom';
export type SaveMethod = 'crud' | 'legacy';
export type FrontendPlacement = 'meta_end' | 'after_summary';
export type ProductType = 'simple' | 'variable' | 'grouped' | 'external';

export interface ProductField {
  id: string;
  label: string;
  type: FieldType;
  description: string;
  tooltip: boolean;
  choices: string;
}

export interface ProductFields {
  prefix: string;
  textDomain: string;
  metaPrefix: string;
  placement: Placement;
  customTabLabel: string;
  customTabId: string;
  productTypes: ProductType[];
  fields: ProductField[];
  saveMethod: SaveMethod;
  showFrontend: boolean;
  hideIfEmpty: boolean;
  frontendPlacement: FrontendPlacement;
  uninstallCleanup: boolean;
  exposeRest: boolean;
}

export const FIELD_TYPES: [FieldType, string][] = [
  ['text', 'Text'],
  ['textarea', 'Textarea'],
  ['number', 'Number'],
  ['price', 'Price'],
  ['checkbox', 'Checkbox'],
  ['select', 'Select'],
  ['url', 'URL'],
];

const SANITIZE: Record<FieldType, string | null> = {
  text: 'wc_clean',
  textarea: 'sanitize_textarea_field',
  number: 'absint',
  price: 'wc_format_decimal',
  checkbox: null,
  select: 'sanitize_key',
  url: 'esc_url_raw',
};

// WooCommerce's own core product meta keys — reusing one of these corrupts pricing,
// stock, or shipping data instead of adding a new field.
const CORE_KEYS = [
  '_price', '_regular_price', '_sale_price', '_sku', '_stock', '_stock_status', '_manage_stock',
  '_backorders', '_sold_individually', '_weight', '_length', '_width', '_height', '_tax_status',
  '_tax_class', '_downloadable', '_virtual', '_download_limit', '_download_expiry', '_upsell_ids',
  '_crosssell_ids', '_purchase_note', '_default_attributes', '_product_attributes', '_featured',
  '_wc_average_rating', '_wc_review_count',
];

const RESERVED_TAB_IDS = ['general', 'inventory', 'shipping', 'linked_product', 'attribute', 'attributes', 'variations', 'advanced'];

export const PRODUCT_TYPES: ProductType[] = ['simple', 'variable', 'grouped', 'external'];

export const PLACEMENT_LABEL: Record<Exclude<Placement, 'custom'>, string> = {
  general: 'General',
  inventory: 'Inventory',
  shipping: 'Shipping',
};

export const HOOK_BY_PLACEMENT: Record<Exclude<Placement, 'custom'>, string> = {
  general: 'woocommerce_product_options_general_product_data',
  inventory: 'woocommerce_product_options_inventory_product_data',
  shipping: 'woocommerce_product_options_shipping_product_data',
};

export const BASE_TABS: [string, string][] = [
  ['general', 'General'],
  ['inventory', 'Inventory'],
  ['shipping', 'Shipping'],
  ['linked_product', 'Linked Products'],
  ['attribute', 'Attributes'],
  ['advanced', 'Advanced'],
];

function fnSlug(s: string): string {
  return String(s || '').toLowerCase().trim().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
}
function metaSlug(s: string): string {
  return String(s || '').toLowerCase().trim().replace(/[^a-z0-9_]+/g, '_');
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
    const v = slugify(i >= 0 ? p.slice(0, i) : p);
    const l = i >= 0 ? p.slice(i + 1).trim() : p.charAt(0).toUpperCase() + p.slice(1);
    return v ? { value: v, label: l || v } : null;
  }).filter((x): x is Choice => x != null);
}

export interface DerivedField extends ProductField {
  parsed: Choice[];
  key: string;
}

export interface Derived {
  pre: string;
  td: string;
  metaPrefix: string;
  tabId: string;
  types: ProductType[];
  fields: DerivedField[];
  isCustomTab: boolean;
}

export function derive(pf: ProductFields): Derived {
  const pre = fnSlug(pf.prefix) || 'acme';
  const td = slugify(pf.textDomain) || pre.replace(/_/g, '-');
  const metaPrefix = metaSlug(pf.metaPrefix) || '_' + pre + '_';
  const tabId = fnSlug(pf.customTabId) || fnSlug(pf.customTabLabel) || pre + '_tab';
  const fields = (pf.fields || []).map((f) => {
    const id = fnSlug(f.id) || 'field';
    return { ...f, id, parsed: parseChoices(f.choices), key: metaPrefix + id };
  });
  return { pre, td, metaPrefix, tabId, types: (pf.productTypes || []).slice(), fields, isCustomTab: pf.placement === 'custom' };
}

function fieldArgsBlock(pairs: [string, string][]): string {
  return 'array(\n' + indent(aligned(pairs), 1) + '\n)';
}

function renderField(f: DerivedField, td: string): string {
  const label = "__( '" + escPhp(f.label || f.id) + "', '" + td + "' )";
  const descPair: [string, string] | null = f.description ? ['description', "__( '" + escPhp(f.description) + "', '" + td + "' )"] : null;
  const tipPair: [string, string] | null = f.tooltip ? ['desc_tip', 'true'] : null;
  const common: [string, string][] = [['id', "'" + f.key + "'"], ['label', label]];

  if (f.type === 'checkbox') {
    const pairs = common.slice();
    if (descPair) pairs.push(descPair);
    return 'woocommerce_wp_checkbox( ' + fieldArgsBlock(pairs) + ' );';
  }
  if (f.type === 'select') {
    const opts = f.parsed.length ? f.parsed.map((c): [string, string] => [c.value, "__( '" + escPhp(c.label) + "', '" + td + "' )"]) : [['value', "__( 'Label', '" + td + "' )"] as [string, string]];
    const pairs = common.concat([['options', 'array(\n' + indent(aligned(opts), 1) + '\n)']]);
    if (tipPair) pairs.push(tipPair);
    if (descPair) pairs.push(descPair);
    return 'woocommerce_wp_select( ' + fieldArgsBlock(pairs) + ' );';
  }
  if (f.type === 'textarea') {
    const pairs = common.slice();
    if (tipPair) pairs.push(tipPair);
    if (descPair) pairs.push(descPair);
    return 'woocommerce_wp_textarea_input( ' + fieldArgsBlock(pairs) + ' );';
  }
  const pairs = common.slice();
  if (f.type === 'number') pairs.push(['type', "'number'"], ['custom_attributes', 'array(\n' + indent(aligned([['step', "'1'"], ['min', "'0'"]]), 1) + '\n)']);
  else if (f.type === 'price') pairs.push(['data_type', "'price'"]);
  else if (f.type === 'url') pairs.push(['type', "'url'"]);
  if (tipPair) pairs.push(tipPair);
  if (descPair) pairs.push(descPair);
  return 'woocommerce_wp_text_input( ' + fieldArgsBlock(pairs) + ' );';
}

function saveFunctionBody(pf: ProductFields, d: Derived): string {
  const lines: string[] = ['$product = wc_get_product( $post_id );', '', 'if ( ! $product ) {\n\treturn;\n}'];
  if (d.types.length) lines.push('', 'if ( ! in_array( $product->get_type(), array( ' + d.types.map((t) => "'" + t + "'").join(', ') + ' ), true ) ) {\n\treturn;\n}');
  lines.push('');
  d.fields.forEach((f) => {
    const post = "$_POST['" + f.key + "']";
    let stmt: string;
    if (f.type === 'checkbox') {
      stmt = pf.saveMethod === 'legacy'
        ? "update_post_meta( $post_id, '" + f.key + "', isset( " + post + " ) ? 'yes' : 'no' );"
        : "$product->update_meta_data( '" + f.key + "', isset( " + post + " ) ? 'yes' : 'no' );";
    } else if (f.type === 'select' && f.parsed.length) {
      const allowed = f.parsed.map((c) => "'" + c.value + "'").join(', ');
      const write = pf.saveMethod === 'legacy'
        ? "update_post_meta( $post_id, '" + f.key + "', sanitize_key( " + post + " ) );"
        : "$product->update_meta_data( '" + f.key + "', sanitize_key( " + post + " ) );";
      stmt = 'if ( isset( ' + post + ' ) && in_array( sanitize_key( ' + post + ' ), array( ' + allowed + ' ), true ) ) {\n\t' + write + '\n}';
    } else {
      const sanitized = (SANITIZE[f.type] || 'wc_clean') + '( wp_unslash( ' + post + ' ) )';
      const write = pf.saveMethod === 'legacy'
        ? "update_post_meta( $post_id, '" + f.key + "', " + sanitized + ' );'
        : "$product->update_meta_data( '" + f.key + "', " + sanitized + ' );';
      stmt = 'if ( isset( ' + post + ' ) ) {\n\t' + write + '\n}';
    }
    lines.push(stmt, '');
  });
  if (!d.fields.length) lines.push('// Nothing to save yet.', '');
  if (pf.saveMethod !== 'legacy') lines.push('$product->save();');
  while (lines.length && lines[lines.length - 1] === '') lines.pop();
  return lines.join('\n');
}

function frontendBody(pf: ProductFields, d: Derived): string {
  const lines: string[] = ['global $product;', '', 'if ( ! $product ) {\n\treturn;\n}', ''];
  d.fields.forEach((f) => {
    const cls = d.pre + '-' + f.id.replace(/_/g, '-');
    if (f.type === 'checkbox') {
      lines.push("if ( 'yes' === $product->get_meta( '" + f.key + "', true ) ) {\n\tprintf( '<span class=\"" + cls + "\">%s</span>', esc_html__( '" + escPhp(f.label || f.id) + "', '" + d.td + "' ) );\n}");
    } else {
      const v = '$' + f.id;
      let block = v + " = $product->get_meta( '" + f.key + "', true );\n";
      const printLine = "printf( '<span class=\"" + cls + "\"><strong>%1$s:</strong> %2$s</span>', esc_html__( '" + escPhp(f.label || f.id) + "', '" + d.td + "' ), esc_html( " + v + ' ) );';
      block += pf.hideIfEmpty ? "if ( '' !== " + v + ' ) {\n\t' + printLine + '\n}' : printLine;
      lines.push(block);
    }
    lines.push('');
  });
  while (lines.length && lines[lines.length - 1] === '') lines.pop();
  return lines.join('\n');
}

interface Block {
  name: string;
  hook: string;
  isFilter?: boolean;
  params?: string;
  priority?: number | null;
  doc: string;
  body: string;
}

export function buildCode(pf: ProductFields, mode: OutputMode): string {
  const d = derive(pf);
  const pre = d.pre;
  const blocks: Block[] = [];

  if (d.isCustomTab) {
    const wrapClasses = d.types.length ? 'array( ' + d.types.map((t) => "'show_if_" + t + "'").join(', ') + ' )' : 'array()';
    blocks.push({
      name: 'add_product_tab', hook: 'woocommerce_product_data_tabs', isFilter: true, params: '$tabs',
      doc: '/**\n * Add the ' + escPhp(pf.customTabLabel || 'custom') + ' tab.\n *\n * @param array $tabs Existing tabs.\n * @return array\n */\n',
      body: "$tabs['" + d.tabId + "'] = array(\n" + indent(aligned([
        ['label', "__( '" + escPhp(pf.customTabLabel || 'Details') + "', '" + d.td + "' )"],
        ['target', "'" + d.tabId + "_data'"],
        ['class', wrapClasses],
        ['priority', '21'],
      ]), 1) + '\n);\n\nreturn $tabs;',
    });
    blocks.push({
      name: 'product_tab_panel', hook: 'woocommerce_product_data_panels', params: undefined as unknown as string,
      doc: '/**\n * Render the panel.\n */\n',
      body: "echo '<div id=\"" + d.tabId + "_data\" class=\"panel woocommerce_options_panel\">';\necho '<div class=\"options_group\">';\n\n"
        + (d.fields.length ? d.fields.map((f) => renderField(f, d.td)).join('\n\n') : '// Add a field to generate the form markup.')
        + "\n\necho '</div>';\necho '</div>';",
    });
  } else {
    const placement = pf.placement as Exclude<Placement, 'custom'>;
    const wrapClasses = d.types.length ? ' ' + d.types.map((t) => 'show_if_' + t).join(' ') : '';
    blocks.push({
      name: 'add_product_fields', hook: HOOK_BY_PLACEMENT[placement], params: undefined as unknown as string,
      doc: '/**\n * Add the fields to the ' + PLACEMENT_LABEL[placement] + ' tab.\n */\n',
      body: "echo '<div class=\"options_group" + wrapClasses + "\">';\n\n"
        + (d.fields.length ? d.fields.map((f) => renderField(f, d.td)).join('\n\n') : '// Add a field to generate the form markup.')
        + "\n\necho '</div>';",
    });
  }

  blocks.push({
    name: 'save_product_fields', hook: 'woocommerce_process_product_meta', params: '$post_id',
    doc: '/**\n * Save the fields.\n *\n * @param int $post_id Product ID.\n */\n',
    body: saveFunctionBody(pf, d),
  });

  if (pf.showFrontend && d.fields.length) {
    blocks.push({
      name: 'display_product_fields',
      hook: pf.frontendPlacement === 'after_summary' ? 'woocommerce_single_product_summary' : 'woocommerce_product_meta_end',
      priority: pf.frontendPlacement === 'after_summary' ? 25 : null,
      doc: '/**\n * Show the values on the single product page.\n */\n',
      body: frontendBody(pf, d),
    });
  }

  if (pf.exposeRest && d.fields.length) {
    blocks.push({
      name: 'register_product_meta', hook: 'init', params: undefined as unknown as string,
      doc: '/**\n * Expose the fields to the REST API and the block editor.\n */\n',
      body: d.fields.map((f) => {
        const restType = f.type === 'checkbox' ? 'boolean' : (f.type === 'number' || f.type === 'price') ? 'number' : 'string';
        const pairs: [string, string][] = [
          ['type', "'" + restType + "'"],
          ['single', 'true'],
          ['show_in_rest', 'true'],
          ['sanitize_callback', f.type === 'checkbox' ? "static function ( $value ) {\n\treturn $value ? 'yes' : 'no';\n}" : "'" + (SANITIZE[f.type] || 'sanitize_text_field') + "'"],
          ['auth_callback', "static function ( $allowed, $meta_key, $post_id ) {\n\treturn current_user_can( 'edit_product', $post_id );\n}"],
        ];
        return 'register_post_meta(\n' + indent("'product',\n'" + escPhp(f.key) + "',\n" + fieldArgsBlock(pairs), 1) + '\n);';
      }).join('\n\n'),
    });
  }

  let out = '';
  if (mode === 'plugin') {
    out += '<?php\n/**\n * Plugin Name:       ' + escPhp(pf.customTabLabel || 'Product fields') + '\n * Description:       Adds custom fields to WooCommerce products and saves their values.\n * Version:           1.0.0\n * Requires PHP:      7.4\n * Requires Plugins:  woocommerce\n * Text Domain:       ' + d.td + "\n */\n\ndefined( 'ABSPATH' ) || exit;\n\n";
  } else if (mode === 'functions') {
    out += "<?php\n// Add to your theme's functions.php.\n\nif ( ! class_exists( 'WooCommerce' ) ) {\n\treturn;\n}\n\n";
  } else {
    out += "if ( ! class_exists( 'WooCommerce' ) ) {\n\treturn;\n}\n\n";
  }

  out += blocks.map((b) => {
    let s = b.doc + 'function ' + pre + '_' + b.name + (b.params ? '( ' + b.params + ' )' : '()') + ' {\n' + indent(b.body, 1) + '\n}\n';
    s += (b.isFilter ? 'add_filter' : 'add_action') + "( '" + b.hook + "', '" + pre + '_' + b.name + "'" + (b.priority ? ', ' + b.priority : '') + ' );\n';
    return s;
  }).join('\n');

  return withCredit(out);
}

export function validate(pf: ProductFields): ValidationIssue[] {
  const d = derive(pf);
  const out: ValidationIssue[] = [];
  const add = (severity: ValidationIssue['severity'], message: string, fix?: string, fixLabel?: string) => out.push({ severity, message, fix, fixLabel });

  if (!d.fields.length) add('warning', 'No fields yet — nothing will render or save.');
  if (pf.placement === 'custom') {
    if (!String(pf.customTabLabel || '').trim()) add('error', 'The new tab needs a label — it is what shows in the product data tab list.', 'addTabLabel', 'Add a label');
    if (RESERVED_TAB_IDS.indexOf(d.tabId) >= 0) add('error', '“' + d.tabId + '” collides with a built-in tab id. Pick a more specific tab id.', 'renameTabId', 'Rename the tab id');
  }
  const seenKeys: Record<string, boolean> = {};
  d.fields.forEach((f) => {
    if (!String(f.id || '').trim()) { add('error', 'A field is missing its id.'); return; }
    if (seenKeys[f.key]) add('error', 'Two fields save to “' + f.key + '” — one will overwrite the other.');
    seenKeys[f.key] = true;
    if (CORE_KEYS.indexOf(f.key) >= 0) add('error', '“' + f.key + '” is a core WooCommerce meta key. Reusing it will corrupt ' + (['_price', '_regular_price', '_sale_price'].indexOf(f.key) >= 0 ? 'pricing' : (f.key === '_stock' || f.key === '_stock_status' ? 'stock levels' : 'product data')) + ' — pick a different key.');
    if (!String(f.label || '').trim()) add('warning', 'The field “' + f.id + '” has no label, so it renders with a blank one.');
    if (f.type === 'select' && !f.parsed.length) add('error', 'The select “' + f.id + '” has no choices, so it renders empty and never saves.', 'addChoices', 'Add two choices');
    if (f.tooltip && !String(f.description || '').trim()) add('recommendation', '“' + f.id + '” has a tooltip enabled but no description — the ? icon has nothing to show.');
  });
  if (d.metaPrefix.charAt(0) !== '_') add('recommendation', 'The meta key prefix does not start with an underscore. Product meta never shows in a Custom Fields panel either way, but the leading underscore is still the convention WooCommerce itself follows.', 'protectKeys', 'Add the underscore');
  if (pf.saveMethod === 'legacy') add('recommendation', 'update_post_meta() writes straight to postmeta, bypassing the product object WooCommerce may already hold in memory for this save. The CRUD toggle — update_meta_data() plus save() — is what core and every extension use.', 'useCrud', 'Switch to CRUD');
  if (pf.placement === 'shipping') add('recommendation', 'WooCommerce hides the Shipping tab entirely for Grouped and External/Affiliate products — fields added here will not be reachable on those types.');
  if (d.types.length && pf.placement !== 'custom') add('recommendation', 'Limiting to ' + d.types.join(', ') + ' hides the fields with CSS (show_if_ classes) and skips saving them on other types — the tab itself still opens for every product type.');
  if (pf.showFrontend && !d.fields.length) add('recommendation', 'Frontend display is on, but there is nothing to show yet.');
  if (!pf.showFrontend && d.fields.length) add('recommendation', 'These values are admin-only right now — turn on the frontend toggle if shoppers should see them.');
  if (!pf.uninstallCleanup && d.fields.length) add('recommendation', 'Nothing deletes these keys on uninstall. delete_post_meta_by_key() per key in uninstall.php keeps postmeta clean.');
  if (pf.exposeRest && !d.fields.length) add('warning', 'REST exposure is on but there are no fields to register meta for.');
  return out;
}

export function freshProject(): ProductFields {
  return {
    prefix: 'acme', textDomain: 'acme',
    placement: 'custom', customTabLabel: 'Product Details', customTabId: 'product_details',
    metaPrefix: '_acme_', productTypes: ['simple', 'variable'],
    fields: [
      { id: 'manufacturer_part_no', label: 'Manufacturer part number', type: 'text', description: 'Printed on the packing slip.', tooltip: true, choices: '' },
      { id: 'assembly_required', label: 'Assembly required', type: 'checkbox', description: 'Shows an assembly notice on the product page.', tooltip: false, choices: '' },
      { id: 'difficulty', label: 'Assembly difficulty', type: 'select', description: '', tooltip: false, choices: 'easy:Easy, moderate:Moderate, advanced:Advanced' },
      { id: 'care_instructions', label: 'Care instructions', type: 'textarea', description: '', tooltip: false, choices: '' },
    ],
    saveMethod: 'crud', showFrontend: true, frontendPlacement: 'meta_end', hideIfEmpty: true, uninstallCleanup: true,
    exposeRest: true,
  };
}

export function applyFix(pf: ProductFields, kind: string): ProductFields {
  const p: ProductFields = JSON.parse(JSON.stringify(pf));
  if (kind === 'addChoices') p.fields.forEach((f) => { if (f.type === 'select' && !parseChoices(f.choices).length) f.choices = 'first:First, second:Second'; });
  if (kind === 'protectKeys') p.metaPrefix = '_' + metaSlug(p.metaPrefix);
  if (kind === 'useCrud') p.saveMethod = 'crud';
  if (kind === 'addTabLabel') p.customTabLabel = p.customTabLabel || 'Product Details';
  if (kind === 'renameTabId') p.customTabId = (fnSlug(p.customTabId) || fnSlug(p.customTabLabel) || 'product') + '_fields';
  return p;
}

export const REF_FLOW = [
  "WooCommerce's own Product Data metabox posts to post.php, and its save() method runs first — before your hook ever fires.",
  "It checks the woocommerce_meta_nonce field against wp_verify_nonce(), so your handler doesn't have to.",
  "It bails on autosaves and revisions, and checks current_user_can( 'edit_post', $post_id ) for this specific product.",
  'Only then does it call woocommerce_process_product_meta — the hook this generator saves into.',
];

export function refTitle(placement: Placement, d: Derived): string {
  return d.isCustomTab ? 'woocommerce_product_data_tabs / woocommerce_product_data_panels' : HOOK_BY_PLACEMENT[placement as Exclude<Placement, 'custom'>];
}

export function refSignature(placement: Placement, d: Derived): string {
  return d.isCustomTab
    ? "add_filter( 'woocommerce_product_data_tabs', '" + d.pre + "_add_product_tab' );\nadd_action( 'woocommerce_product_data_panels', '" + d.pre + "_product_tab_panel' );"
    : "add_action( '" + HOOK_BY_PLACEMENT[placement as Exclude<Placement, 'custom'>] + "', '" + d.pre + "_add_product_fields' );";
}

export function refKeys(d: Derived): string {
  return d.fields.length
    ? d.fields.map((f) => padTo(f.key, 28) + padTo(f.type, 10) + (f.type === 'checkbox' ? 'yes / no' : (SANITIZE[f.type] || 'wc_clean') + '()')).join('\n')
    : 'No fields yet.';
}
