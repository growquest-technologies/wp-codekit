import { escPhp, withCredit, type ValidationIssue } from '../lib/codegen';

export type OutputMode = 'snippet' | 'functions' | 'plugin';
export type ContentType = 'text' | 'callback';

export interface AccountEndpoint {
  prefix: string;
  textDomain: string;
  slug: string;
  menuLabel: string;
  insertAfter: string;
  contentType: ContentType;
  content: string;
}

export const CORE_ITEMS: [string, string][] = [
  ['dashboard', 'Dashboard'],
  ['orders', 'Orders'],
  ['downloads', 'Downloads'],
  ['edit-address', 'Addresses'],
  ['payment-methods', 'Payment methods'],
  ['edit-account', 'Account details'],
  ['end', 'Just before Log out'],
];

const RESERVED = ['dashboard', 'orders', 'downloads', 'edit-address', 'payment-methods', 'edit-account', 'customer-logout', 'lost-password'];

function fnSlug(s: string): string {
  return String(s || '').toLowerCase().trim().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
}
function dashSlug(s: string): string {
  return String(s || '').toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
}
export interface Derived {
  pre: string;
  td: string;
  slug: string;
}

export function derive(ae: AccountEndpoint): Derived {
  const pre = fnSlug(ae.prefix) || 'acme';
  return {
    pre,
    td: dashSlug(ae.textDomain) || pre.replace(/_/g, '-'),
    slug: dashSlug(ae.slug) || 'my-endpoint',
  };
}

export function buildCode(ae: AccountEndpoint, mode: OutputMode): string {
  const d = derive(ae);
  const pre = d.pre;
  const td = d.td;
  const label = ae.menuLabel.trim() || 'My Endpoint';

  let out = '';
  if (mode === 'plugin') {
    out += '<?php\n/**\n * Plugin Name:       ' + label + ' account tab\n * Description:       Adds the ' + d.slug + ' endpoint to My Account.\n * Version:           1.0.0\n * Requires PHP:      7.4\n * Requires Plugins:  woocommerce\n * Text Domain:       ' + td + "\n */\n\ndefined( 'ABSPATH' ) || exit;\n\n";
  } else if (mode === 'functions') {
    out += "<?php\n// Add to your theme's functions.php.\n\n";
  }

  out += '/**\n * Register the /my-account/' + d.slug + ' endpoint.\n */\nfunction ' + pre + '_add_endpoint() {\n\tadd_rewrite_endpoint( \'' + d.slug + "', EP_ROOT | EP_PAGES );\n}\n" + "add_action( 'init', '" + pre + "_add_endpoint' );\n\n";

  out += '/**\n * Tell WooCommerce\'s own query-var map about it.\n *\n * @param array $vars Existing query vars.\n * @return array\n */\nfunction ' + pre + '_query_vars( $vars ) {\n\t$vars[\'' + d.slug + "'] = '" + d.slug + "';\n\n\treturn $vars;\n}\n" + "add_filter( 'woocommerce_get_query_vars', '" + pre + "_query_vars' );\n\n";

  out += '/**\n * Add it to the My Account menu.\n *\n * @param array $items Existing items, keyed by endpoint slug, in display order.\n * @return array\n */\nfunction ' + pre + '_menu_item( $items ) {\n\t$new_items = array();\n\n\tforeach ( $items as $key => $label ) {\n';
  if (ae.insertAfter === 'end') {
    out += "\t\tif ( 'customer-logout' === $key ) {\n\t\t\t$new_items['" + d.slug + "'] = __( '" + escPhp(label) + "', '" + td + "' );\n\t\t}\n\n\t\t$new_items[ $key ] = $label;\n";
  } else {
    out += "\t\t$new_items[ $key ] = $label;\n\n\t\tif ( '" + ae.insertAfter + "' === $key ) {\n\t\t\t$new_items['" + d.slug + "'] = __( '" + escPhp(label) + "', '" + td + "' );\n\t\t}\n";
  }
  out += '\t}\n\n\treturn $new_items;\n}\n' + "add_filter( 'woocommerce_account_menu_items', '" + pre + "_menu_item' );\n\n";

  out += '/**\n * Render the endpoint content.\n */\nfunction ' + pre + '_endpoint_content() {\n';
  if (ae.contentType === 'text') {
    out += '\techo wp_kses_post( wpautop( __( \'' + escPhp(ae.content || 'Content goes here.') + "', '" + td + "' ) ) );\n";
  } else {
    out += '\t$customer_id = get_current_user_id();\n\n\t// Build your markup here — $customer_id identifies who is looking at it.\n';
  }
  out += '}\n' + "add_action( 'woocommerce_account_" + d.slug + "_endpoint', '" + pre + "_endpoint_content' );\n\n";

  out += '/**\n * Flag a rewrite-rule flush for the next full page load — endpoints\n * registered on init are not live until the rules are rebuilt once.\n */\nfunction ' + pre + '_flag_flush() {\n\tupdate_option( \'' + pre + "_flush_rules', 1 );\n}\n" + "register_activation_hook( __FILE__, '" + pre + "_flag_flush' );\n\n";
  out += '/**\n * Flush once, after the endpoint above has actually been registered.\n */\nfunction ' + pre + '_maybe_flush() {\n\tif ( ! get_option( \'' + pre + "_flush_rules' ) ) {\n\t\treturn;\n\t}\n\n\tdelete_option( '" + pre + "_flush_rules' );\n\tflush_rewrite_rules();\n}\n" + "add_action( 'wp_loaded', '" + pre + "_maybe_flush' );\n\n";
  out += "register_deactivation_hook( __FILE__, 'flush_rewrite_rules' );\n";

  return withCredit(out);
}

export function validate(ae: AccountEndpoint): ValidationIssue[] {
  const d = derive(ae);
  const out: ValidationIssue[] = [];
  const add = (severity: ValidationIssue['severity'], message: string, fix?: string, fixLabel?: string) => out.push({ severity, message, fix, fixLabel });

  if (!ae.slug.trim()) add('error', 'No slug — nothing to register.');
  if (!ae.menuLabel.trim()) add('error', 'No menu label. It becomes the link text in the My Account sidebar.');
  if (RESERVED.includes(d.slug)) add('error', `"${d.slug}" is already a core My Account endpoint. Registering it again overwrites core's own page.`, 'renameSlug', 'Rename it');
  if (ae.contentType === 'text' && !ae.content.trim()) add('warning', 'No content — the tab will render as an empty page with just the title.');
  add('recommendation', 'The endpoint only works after rewrite rules are flushed once. This is wired to activation automatically — flushing on every page load instead would be a measurable performance cost on a busy store.');
  return out;
}

export function freshProject(): AccountEndpoint {
  return {
    prefix: 'acme',
    textDomain: 'acme',
    slug: 'loyalty-points',
    menuLabel: 'Loyalty Points',
    insertAfter: 'orders',
    contentType: 'text',
    content: 'You have earned 0 points so far. Points are added automatically when an order is marked complete.',
  };
}

export function applyFix(ae: AccountEndpoint, kind: string): AccountEndpoint {
  const p: AccountEndpoint = JSON.parse(JSON.stringify(ae));
  if (kind === 'renameSlug') p.slug = p.slug + '-custom';
  return p;
}
