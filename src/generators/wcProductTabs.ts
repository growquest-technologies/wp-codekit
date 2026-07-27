import { escPhp, withCredit, type ValidationIssue } from '../lib/codegen';

export type OutputMode = 'snippet' | 'functions' | 'plugin';

export interface NewTab {
  key: string;
  title: string;
  priority: string;
  content: string;
}

export interface ProductTabs {
  prefix: string;
  textDomain: string;
  keepDescription: boolean;
  keepAdditionalInfo: boolean;
  keepReviews: boolean;
  tabs: NewTab[];
}

export const CORE_TABS: [string, string, number][] = [
  ['description', 'Description', 10],
  ['additional_information', 'Additional information', 20],
  ['reviews', 'Reviews', 30],
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

export interface DerivedTab extends NewTab {
  key: string;
}

export interface Derived {
  pre: string;
  td: string;
  tabs: DerivedTab[];
}

export function derive(pt: ProductTabs): Derived {
  const pre = fnSlug(pt.prefix) || 'acme';
  return {
    pre,
    td: dashSlug(pt.textDomain) || pre.replace(/_/g, '-'),
    tabs: (pt.tabs || []).map((t) => ({ ...t, key: fnSlug(t.key) || 'tab' })),
  };
}

export function buildCode(pt: ProductTabs, mode: OutputMode): string {
  const d = derive(pt);
  const pre = d.pre;
  const td = d.td;

  const removed: string[] = [];
  if (!pt.keepDescription) removed.push('description');
  if (!pt.keepAdditionalInfo) removed.push('additional_information');
  if (!pt.keepReviews) removed.push('reviews');

  let filterBody = '';
  if (removed.length) filterBody += removed.map((k) => "\tunset( $tabs['" + k + "'] );").join('\n') + '\n\n';
  if (d.tabs.length) {
    filterBody += d.tabs.map((t) => {
      const pairs: [string, string][] = [
        ['title', "__( '" + escPhp(t.title || t.key) + "', '" + td + "' )"],
        ['priority', String(parseInt(t.priority, 10) || 50)],
        ['callback', "'" + pre + '_tab_' + t.key + "'"],
      ];
      return "\t$tabs['" + t.key + "'] = array(\n" + indent(aligned(pairs), 2) + '\n\t);';
    }).join('\n\n') + '\n\n';
  }
  filterBody += '\treturn $tabs;';
  if (!removed.length && !d.tabs.length) filterBody = '\t// Nothing selected — remove a core tab or add a new one.\n\n\treturn $tabs;';

  let out = '';
  if (mode === 'plugin') {
    out += '<?php\n/**\n * Plugin Name:       Product tabs\n * Description:       Adds ' + d.tabs.length + ' tab' + (d.tabs.length === 1 ? '' : 's') + (removed.length ? ' and removes ' + removed.length + ' core tab' + (removed.length === 1 ? '' : 's') : '') + '.\n * Version:           1.0.0\n * Requires PHP:      7.4\n * Requires Plugins:  woocommerce\n * Text Domain:       ' + td + "\n */\n\ndefined( 'ABSPATH' ) || exit;\n\n";
  } else if (mode === 'functions') {
    out += "<?php\n// Add to your theme's functions.php.\n\n";
  }

  out += '/**\n * Add and remove tabs on the single product page.\n *\n * @param array $tabs Existing tabs, keyed by id.\n * @return array\n */\nfunction ' + pre + '_product_tabs( $tabs ) {\n' + filterBody + '\n}\n' + "add_filter( 'woocommerce_product_tabs', '" + pre + "_product_tabs' );\n";

  if (d.tabs.length) {
    out += '\n' + d.tabs.map((t) => {
      return '/**\n * Render the "' + (t.title || t.key) + '" tab.\n */\nfunction ' + pre + '_tab_' + t.key + '() {\n\techo wp_kses_post( wpautop( __( \'' + escPhp(t.content || 'Tab content goes here.') + "', '" + td + "' ) ) );\n}";
    }).join('\n\n') + '\n';
  }

  return withCredit(out);
}

export function validate(pt: ProductTabs): ValidationIssue[] {
  const d = derive(pt);
  const out: ValidationIssue[] = [];
  const add = (severity: ValidationIssue['severity'], message: string, fix?: string, fixLabel?: string) => out.push({ severity, message, fix, fixLabel });

  const removed = !pt.keepDescription || !pt.keepAdditionalInfo || !pt.keepReviews;
  if (!removed && !d.tabs.length) add('warning', 'Nothing selected — remove a core tab or add a new one, or this filter does nothing.');

  const coreKeys = CORE_TABS.map(([k]) => k);
  const seen: Record<string, boolean> = {};
  d.tabs.forEach((t, i) => {
    const label = 'Tab ' + (i + 1);
    if (coreKeys.includes(t.key)) add('error', `${label} uses the key "${t.key}", which belongs to a core tab — this overwrites it instead of adding a new one.`);
    if (seen[t.key]) add('error', `Two new tabs use the key "${t.key}". The second overwrites the first.`);
    seen[t.key] = true;
    if (!t.title.trim()) add('error', `${label} has no title, so it renders as a blank pill.`);
    if (isNaN(parseInt(t.priority, 10))) add('warning', `${label}'s priority is not a number — it will fall back to 50.`);
    if (!t.content.trim()) add('recommendation', `${label} has no content — its callback will still print an empty paragraph.`);
  });

  if (!pt.keepReviews) add('recommendation', 'Removing the reviews tab here only hides it from the tab strip. Reviews are still enabled in WooCommerce → Settings → Products unless you turn them off separately.');
  return out;
}

export function freshProject(): ProductTabs {
  return {
    prefix: 'acme',
    textDomain: 'acme',
    keepDescription: true,
    keepAdditionalInfo: true,
    keepReviews: false,
    tabs: [
      { key: 'sizing', title: 'Sizing', priority: '15', content: 'Runs true to size. If you are between sizes, we recommend sizing up.' },
    ],
  };
}

export function applyFix(pt: ProductTabs, _kind: string): ProductTabs {
  void _kind;
  return JSON.parse(JSON.stringify(pt));
}
