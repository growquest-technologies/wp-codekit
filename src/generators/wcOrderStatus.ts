import { escPhp, withCredit, type ValidationIssue } from '../lib/codegen';

export type OutputMode = 'snippet' | 'functions' | 'plugin';

export interface OrderStatus {
  slug: string;
  label: string;
  prefix: string;
  textDomain: string;
  insertAfter: string;
  excludeFromSearch: boolean;
  showInAdminAllList: boolean;
  showInAdminStatusList: boolean;
  badgeEnabled: boolean;
  badgeBg: string;
  badgeFg: string;
}

export const CORE_STATUSES: [string, string][] = [
  ['wc-pending', 'Pending payment'],
  ['wc-processing', 'Processing'],
  ['wc-on-hold', 'On hold'],
  ['wc-completed', 'Completed'],
  ['wc-cancelled', 'Cancelled'],
  ['wc-refunded', 'Refunded'],
  ['wc-failed', 'Failed'],
  ['end', 'At the end of the list'],
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

export interface Derived {
  pre: string;
  td: string;
  slug: string;
  status: string;
}

export function derive(os: OrderStatus): Derived {
  const pre = fnSlug(os.prefix) || 'acme';
  const slug = dashSlug(os.slug) || 'custom-status';
  return {
    pre,
    td: dashSlug(os.textDomain) || pre.replace(/_/g, '-'),
    slug,
    status: 'wc-' + slug,
  };
}

export function buildCode(os: OrderStatus, mode: OutputMode): string {
  const d = derive(os);
  const pre = d.pre;
  const td = d.td;
  const label = os.label.trim() || 'Custom status';

  const regPairs: [string, string][] = [
    ['label', "_x( '" + escPhp(label) + "', 'Order status', '" + td + "' )"],
    ['public', 'false'],
    ['exclude_from_search', os.excludeFromSearch ? 'true' : 'false'],
    ['show_in_admin_all_list', os.showInAdminAllList ? 'true' : 'false'],
    ['show_in_admin_status_list', os.showInAdminStatusList ? 'true' : 'false'],
    ['label_count', "_n_noop(\n\t'" + escPhp(label) + " <span class=\"count\">(%s)</span>',\n\t'" + escPhp(label) + " <span class=\"count\">(%s)</span>',\n\t'" + td + "'\n)"],
  ];

  let out = '';
  if (mode === 'plugin') {
    out += '<?php\n/**\n * Plugin Name:       ' + label + ' order status\n * Description:       Registers the ' + d.status + ' order status.\n * Version:           1.0.0\n * Requires PHP:      7.4\n * Requires Plugins:  woocommerce\n * Text Domain:       ' + td + "\n */\n\ndefined( 'ABSPATH' ) || exit;\n\n";
  } else if (mode === 'functions') {
    out += "<?php\n// Add to your theme's functions.php.\n\n";
  }

  out += '/**\n * Register the ' + d.status + ' post status.\n */\nfunction ' + pre + '_register_order_status() {\n\tregister_post_status(\n\t\t\'' + d.status + "',\n" + indent('array(\n' + indent(aligned(regPairs), 1) + '\n)', 1) + '\n\t);\n}\n' + "add_action( 'init', '" + pre + "_register_order_status' );\n\n";

  out += '/**\n * Add it to the list WooCommerce shows everywhere — the admin dropdown,\n * the orders list filters, and the bulk "Change status to" actions.\n *\n * @param array $order_statuses Existing statuses, in display order.\n * @return array\n */\nfunction ' + pre + '_order_statuses( $order_statuses ) {\n';
  if (os.insertAfter === 'end') {
    out += "\t$order_statuses['" + d.status + "'] = _x( '" + escPhp(label) + "', 'Order status', '" + td + "' );\n\n\treturn $order_statuses;\n";
  } else {
    out += "\t$new_statuses = array();\n\n\tforeach ( $order_statuses as $key => $status ) {\n\t\t$new_statuses[ $key ] = $status;\n\n\t\tif ( '" + os.insertAfter + "' === $key ) {\n\t\t\t$new_statuses['" + d.status + "'] = _x( '" + escPhp(label) + "', 'Order status', '" + td + "' );\n\t\t}\n\t}\n\n\treturn $new_statuses;\n";
  }
  out += '}\n' + "add_filter( 'wc_order_statuses', '" + pre + "_order_statuses' );\n";

  if (os.badgeEnabled) {
    out += '\n/**\n * Give the status its own colour in the orders list.\n */\nfunction ' + pre + '_order_status_badge_css() {\n\t?>\n\t<style>\n\t\tmark.order-status.status-' + d.slug + ',\n\t\t.order-status.status-' + d.slug + ' {\n\t\t\tbackground: ' + (os.badgeBg || '#f0ad4e') + ';\n\t\t\tcolor: ' + (os.badgeFg || '#ffffff') + ';\n\t\t}\n\t</style>\n\t<?php\n}\n' + "add_action( 'admin_head', '" + pre + "_order_status_badge_css' );\n";
  }

  return withCredit(out);
}

export function validate(os: OrderStatus): ValidationIssue[] {
  const d = derive(os);
  const out: ValidationIssue[] = [];
  const add = (severity: ValidationIssue['severity'], message: string, fix?: string, fixLabel?: string) => out.push({ severity, message, fix, fixLabel });

  if (!os.slug.trim()) add('error', 'No slug — nothing to register.');
  if (!os.label.trim()) add('error', 'No label. It becomes the text everywhere: the dropdown, the orders list, the bulk action.');

  const core = CORE_STATUSES.map(([s]) => s).filter((s) => s !== 'end');
  if (core.includes(d.status)) add('error', `"${d.status}" is already a core WooCommerce status. Registering it again overwrites core's own label and count text.`, 'renameSlug', 'Rename it');

  if (d.status.length > 20) add('error', `"${d.status}" is ${d.status.length} characters. The post_status column is varchar(20) — anything longer is silently truncated by the database, and the truncated value will not match what you registered.`, 'shortenSlug', 'Shorten the slug');

  if (os.badgeEnabled && !/^#[0-9a-f]{3,8}$/i.test(os.badgeBg)) add('warning', 'The badge background is not a valid hex colour.');
  if (!os.showInAdminStatusList) add('recommendation', 'show_in_admin_status_list is off, so this status never appears in the "Change status to" bulk action WooCommerce builds automatically from the registered list.');
  return out;
}

export function freshProject(): OrderStatus {
  return {
    slug: 'awaiting-pickup',
    label: 'Awaiting pickup',
    prefix: 'acme',
    textDomain: 'acme',
    insertAfter: 'wc-processing',
    excludeFromSearch: false,
    showInAdminAllList: true,
    showInAdminStatusList: true,
    badgeEnabled: true,
    badgeBg: '#f0ad4e',
    badgeFg: '#ffffff',
  };
}

export function applyFix(os: OrderStatus, kind: string): OrderStatus {
  const p: OrderStatus = JSON.parse(JSON.stringify(os));
  if (kind === 'renameSlug') p.slug = p.slug + '-custom';
  if (kind === 'shortenSlug') p.slug = p.slug.slice(0, 17);
  return p;
}
