import { escPhp, withCredit, type ValidationIssue } from '../lib/codegen';

export type OutputMode = 'snippet' | 'functions' | 'plugin';
export type FieldType = 'text' | 'number' | 'checkbox' | 'select';
export type TaxStatus = 'taxable' | 'none';

export interface ShippingField {
  key: string;
  label: string;
  type: FieldType;
  def: string;
  description: string;
  choices: string;
}

export interface ShippingMethod {
  prefix: string;
  textDomain: string;
  methodId: string;
  methodTitle: string;
  methodDescription: string;
  defaultCost: string;
  taxStatus: TaxStatus;
  extraFields: ShippingField[];
}

function fnSlug(s: string): string {
  return String(s || '').toLowerCase().trim().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
}
function dashSlug(s: string): string {
  return String(s || '').toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
}
function pascal(s: string): string {
  return String(s || '').split(/[^A-Za-z0-9]+/).filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('_');
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

export interface DerivedField extends ShippingField {
  key: string;
  parsed: Choice[];
}

export interface Derived {
  pre: string;
  td: string;
  methodId: string;
  className: string;
  fields: DerivedField[];
}

export function derive(sm: ShippingMethod): Derived {
  const pre = fnSlug(sm.prefix) || 'acme';
  const methodId = fnSlug(sm.methodId) || 'flat_extra';
  return {
    pre,
    td: dashSlug(sm.textDomain) || pre.replace(/_/g, '-'),
    methodId: pre + '_' + methodId,
    className: (pascal(sm.prefix) || 'Acme') + '_' + (pascal(sm.methodId) || 'Shipping_Method') + '_Shipping_Method',
    fields: (sm.extraFields || []).map((f) => ({ ...f, key: fnSlug(f.key) || 'field', parsed: parseChoices(f.choices) })),
  };
}

function fieldEntry(td: string, key: string, f: { label: string; type: FieldType; def: string; description: string; parsed?: Choice[] }): string {
  const t = (s: string) => "__( '" + escPhp(s) + "', '" + td + "' )";
  const pairs: [string, string][] = [
    ['title', t(f.label)],
    ['type', "'" + f.type + "'"],
    ['default', f.type === 'checkbox' ? (f.def === '1' || f.def.toLowerCase() === 'yes' ? "'yes'" : "'no'") : "'" + escPhp(f.def) + "'"],
  ];
  if (f.description) pairs.push(['description', t(f.description)], ['desc_tip', 'true']);
  if (f.type === 'select' && f.parsed && f.parsed.length) {
    pairs.push(['options', 'array(\n' + indent(aligned(f.parsed.map((c) => [c.value, t(c.label)] as [string, string])), 1) + '\n)']);
  }
  return "'" + key + "' => array(\n" + indent(aligned(pairs), 1) + '\n),';
}

export function buildCode(sm: ShippingMethod, mode: OutputMode): string {
  const d = derive(sm);
  const pre = d.pre;
  const td = d.td;
  const title = sm.methodTitle.trim() || 'Flat Rate Extra';
  const description = sm.methodDescription.trim() || 'A flat additional cost added at checkout.';

  const formFields = [
    fieldEntry(td, 'title', { label: 'Method title', type: 'text', def: title, description: 'Shown to the customer at checkout.' }),
    fieldEntry(td, 'cost', { label: 'Cost', type: 'number', def: sm.defaultCost || '0', description: 'Enter a flat cost, or 0 to disable.' }),
    ...d.fields.map((f) => fieldEntry(td, d.pre + '_' + f.key, f)),
  ].join('\n\n');

  const readExtras = d.fields.map((f) => "\t\t$this->" + f.key + ' = $this->get_option( \'' + d.pre + '_' + f.key + "' );").join('\n');

  const classBody =
    '\tpublic function __construct( $instance_id = 0 ) {\n' +
    "\t\t$this->id                 = '" + d.methodId + "';\n" +
    '\t\t$this->instance_id        = absint( $instance_id );\n' +
    "\t\t$this->method_title       = " + `__( '${escPhp(title)}', '${td}' )` + ';\n' +
    "\t\t$this->method_description = " + `__( '${escPhp(description)}', '${td}' )` + ';\n' +
    "\t\t$this->supports           = array( 'shipping-zones', 'instance-settings' );\n\n" +
    '\t\t$this->init();\n' +
    '\t}\n\n' +
    '\t/**\n\t * Load the settings API — fields, saved values, and the save hook.\n\t */\n' +
    '\tpublic function init() {\n' +
    '\t\t$this->init_form_fields();\n' +
    '\t\t$this->init_settings();\n\n' +
    "\t\t$this->title   = $this->get_option( 'title' );\n" +
    "\t\t$this->cost    = $this->get_option( 'cost' );\n" +
    (readExtras ? readExtras + '\n' : '') +
    '\n' +
    "\t\tadd_action( 'woocommerce_update_options_shipping_' . $this->id, array( $this, 'process_admin_options' ) );\n" +
    '\t}\n\n' +
    '\t/**\n\t * The settings fields, keyed by option name.\n\t */\n' +
    '\tpublic function init_form_fields() {\n' +
    '\t\t$this->instance_form_fields = array(\n' + indent(formFields, 2) + '\n\t\t);\n' +
    '\t}\n\n' +
    '\t/**\n\t * Add a rate for this method to the package.\n\t *\n\t * @param array $package The cart contents and destination.\n\t */\n' +
    '\tpublic function calculate_shipping( $package = array() ) {\n' +
    '\t\t$rate = array(\n' +
    "\t\t\t'id'      => $this->get_rate_id(),\n" +
    "\t\t\t'label'   => $this->title,\n" +
    "\t\t\t'cost'    => $this->cost,\n" +
    "\t\t\t'package' => $package,\n" +
    (sm.taxStatus === 'taxable' ? "\t\t\t'taxes'   => '', // Let WooCommerce calculate tax on this rate.\n" : "\t\t\t'taxes'   => false,\n") +
    '\t\t);\n\n' +
    '\t\t$this->add_rate( $rate );\n' +
    '\t}';

  let out = '';
  if (mode === 'plugin') {
    out += '<?php\n/**\n * Plugin Name:       ' + title + ' shipping method\n * Description:       Registers the ' + d.methodId + ' shipping method.\n * Version:           1.0.0\n * Requires PHP:      7.4\n * Requires Plugins:  woocommerce\n * Text Domain:       ' + td + "\n */\n\ndefined( 'ABSPATH' ) || exit;\n\n";
  } else if (mode === 'functions') {
    out += "<?php\n// Add to your theme's functions.php.\n\n";
  }

  out += '/**\n * Declare the class once WooCommerce\'s own shipping base class exists.\n */\nfunction ' + pre + '_shipping_method_init() {\n\tif ( class_exists( \'' + d.className + '\' ) ) {\n\t\treturn;\n\t}\n\n\tclass ' + d.className + ' extends WC_Shipping_Method {\n\n' + classBody + '\n\t}\n}\n' + "add_action( 'woocommerce_shipping_init', '" + pre + "_shipping_method_init' );\n\n";

  out += '/**\n * Register it so it can be added to a shipping zone.\n *\n * @param array $methods Existing methods.\n * @return array\n */\nfunction ' + pre + '_add_shipping_method( $methods ) {\n\t$methods[\'' + d.methodId + "'] = '" + d.className + "';\n\n\treturn $methods;\n}\n" + "add_filter( 'woocommerce_shipping_methods', '" + pre + "_add_shipping_method' );\n";

  return withCredit(out);
}

export function validate(sm: ShippingMethod): ValidationIssue[] {
  const d = derive(sm);
  const out: ValidationIssue[] = [];
  const add = (severity: ValidationIssue['severity'], message: string, fix?: string, fixLabel?: string) => out.push({ severity, message, fix, fixLabel });

  if (!sm.methodId.trim()) add('error', 'No method id — it becomes part of the rate id every order stores.');
  if (!sm.methodTitle.trim()) add('error', 'No method title. Shown in Shipping → Zones when adding this method.');
  if (sm.defaultCost.trim() && isNaN(parseFloat(sm.defaultCost))) add('warning', 'The default cost is not a plain number. WooCommerce\'s cost field accepts formulas too, but a non-numeric default here is probably a typo.');

  const seen: Record<string, boolean> = {};
  d.fields.forEach((f, i) => {
    const label = 'Field ' + (i + 1);
    if (seen[f.key]) add('error', `Two extra fields use the key "${f.key}". The second overwrites the first.`);
    seen[f.key] = true;
    if (f.type === 'select' && !f.parsed.length) add('error', `${label} ("${f.label || f.key}") is a select with no choices.`, 'addChoices', 'Add two choices');
  });

  add('recommendation', 'This method only appears once added to a zone under WooCommerce → Settings → Shipping — registering it here does not place it anywhere automatically.');
  return out;
}

export function freshProject(): ShippingMethod {
  return {
    prefix: 'acme',
    textDomain: 'acme',
    methodId: 'flat_extra',
    methodTitle: 'Flat Rate Extra',
    methodDescription: 'A flat additional cost added on top of the customer\'s chosen shipping option.',
    defaultCost: '5.00',
    taxStatus: 'taxable',
    extraFields: [],
  };
}

export function applyFix(sm: ShippingMethod, kind: string): ShippingMethod {
  const p: ShippingMethod = JSON.parse(JSON.stringify(sm));
  if (kind === 'addChoices') p.extraFields.forEach((f) => { if (f.type === 'select' && !f.choices.trim()) f.choices = 'first:First, second:Second'; });
  return p;
}

export interface RefArg {
  name: string;
  description: string;
}

export const REF_ARGS: RefArg[] = [
  { name: '$this->id / $this->instance_id', description: 'id is the method type, shared by every zone that adds it. instance_id is which specific placement in which zone — get_option() reads settings scoped to that instance.' },
  { name: 'init_form_fields() → init_settings()', description: 'Order matters: init_settings() populates get_option() from the database, so any code reading $this->get_option() must run after it, not before.' },
  { name: 'instance_form_fields vs form_fields', description: 'Zone-based methods (the "shipping-zones" support flag) use instance_form_fields. The older global form_fields is only for a method with no per-zone settings at all.' },
  { name: 'calculate_shipping()', description: 'Called once per matching package. add_rate() can be called more than once here to offer several rates from the same method.' },
];
