import { escPhp, slugify as baseSlugify, withCredit, type ValidationIssue } from '../lib/codegen';

export type OutputMode = 'snippet' | 'functions' | 'plugin';
export type ToolbarScope = 'both' | 'admin' | 'front';

export interface ToolbarChild {
  title: string;
  id: string;
  href: string;
  nonce: boolean;
}

export interface ToolbarNode {
  prefix: string;
  textDomain: string;
  title: string;
  id: string;
  href: string;
  parent: string;
  capability: string;
  scope: ToolbarScope;
  priority: string;
  showCount: boolean;
  children: ToolbarChild[];
  removals: string[];
}

export const PARENTS: [string, string][] = [
  ['', 'Top level'],
  ['site-name', 'Under the site name'],
  ['my-account', 'Under Howdy, user'],
  ['new-content', 'Under the + New menu'],
  ['top-secondary', 'Top level, right side'],
];

export const CAPS: [string, string][] = [
  ['manage_options', 'manage_options — admins'],
  ['edit_others_posts', 'edit_others_posts — editors'],
  ['edit_posts', 'edit_posts — contributors and up'],
  ['upload_files', 'upload_files — authors and up'],
  ['read', 'read — anyone logged in'],
];

export const CORE_NODES: [string, string][] = [
  ['wp-logo', 'The WordPress logo and its About links.'],
  ['comments', 'The comment bubble and count.'],
  ['new-content', 'The + New menu.'],
  ['updates', 'The updates counter.'],
  ['customize', 'The Customise link on the front end.'],
  ['search', 'The front-end search box.'],
  ['wp-logo-external', 'The wordpress.org links under the logo.'],
];

function fnSlug(s: string): string {
  return baseSlugify(s).replace(/-/g, '_');
}
function slug(s: string): string {
  return baseSlugify(s);
}
function indent(text: string, depth: number): string {
  const pad = '\t'.repeat(depth);
  return text.split('\n').map((l) => (l ? pad + l : '')).join('\n');
}
function aligned(pairs: [string, string][]): string {
  const w = pairs.reduce((m, p) => Math.max(m, p[0].length), 0);
  return pairs.map((p) => "'" + p[0] + "'" + ' '.repeat(w - p[0].length) + ' => ' + p[1] + ',').join('\n');
}

export interface DerivedToolbar {
  pre: string;
  td: string;
  id: string;
  children: ToolbarChild[];
  removals: string[];
}

export function derive(tb: ToolbarNode): DerivedToolbar {
  const pre = fnSlug(tb.prefix) || 'acme';
  return {
    pre,
    td: baseSlugify(tb.textDomain) || pre.replace(/_/g, '-'),
    id: slug(tb.id) || pre.replace(/_/g, '-') + '-tools',
    children: (tb.children || []).filter((c) => String(c.title || '').trim() || String(c.id || '').trim()),
    removals: tb.removals || [],
  };
}

export function buildCode(tb: ToolbarNode, mode: OutputMode): string {
  const d = derive(tb);
  const pre = d.pre, td = d.td;
  const t = (s: string) => "__( '" + escPhp(s) + "', '" + td + "' )";
  const hrefExpr = (h: string) => {
    const v = String(h || '').trim();
    if (!v) return 'false';
    if (/^https?:\/\//.test(v)) return "esc_url( '" + escPhp(v) + "' )";
    if (v.indexOf('home_url') === 0 || v.indexOf('admin_url') === 0) return v;
    return "esc_url( admin_url( '" + escPhp(v) + "' ) )";
  };

  let body = '';
  if (tb.capability) body += "if ( ! current_user_can( '" + escPhp(tb.capability) + "' ) ) {\n\treturn;\n}\n\n";
  if (tb.scope === 'admin') body += 'if ( ! is_admin() ) {\n\treturn;\n}\n\n';
  else if (tb.scope === 'front') body += 'if ( is_admin() ) {\n\treturn;\n}\n\n';

  if (tb.showCount) {
    body += '$count = (int) apply_filters( \'' + pre + '_toolbar_count\', 0 );\n$title = ' + t(tb.title || 'Acme') + ";\n\nif ( $count ) {\n\t$title .= sprintf(\n\t\t' <span class=\"awaiting-mod\"><span class=\"pending-count\">%s</span></span>',\n\t\tesc_html( number_format_i18n( $count ) )\n\t);\n}\n\n";
  }

  const parentPairs: [string, string][] = [['id', "'" + escPhp(d.id) + "'"], ['title', tb.showCount ? '$title' : t(tb.title || 'Acme')]];
  if (tb.parent) parentPairs.push(['parent', "'" + tb.parent + "'"]);
  parentPairs.push(['href', hrefExpr(tb.href)]);
  parentPairs.push(['meta', "array(\n\t'title' => " + t((tb.title || 'Acme') + ' shortcuts') + ',\n)']);
  body += '$wp_admin_bar->add_node(\n' + indent('array(\n' + indent(aligned(parentPairs), 1) + '\n)', 1) + '\n);';

  d.children.forEach((c) => {
    const pairs: [string, string][] = [['id', "'" + escPhp(slug(c.id) || slug(c.title)) + "'"], ['parent', "'" + escPhp(d.id) + "'"], ['title', t(c.title || 'Item')], ['href', hrefExpr(c.href)]];
    if (c.nonce && String(c.href || '').indexOf('admin-post.php') === 0) {
      pairs[3] = ['href', "wp_nonce_url( admin_url( '" + escPhp(c.href) + "' ), '" + pre + '_' + (slug(c.id) || 'action') + "' )"];
    }
    body += '\n\n$wp_admin_bar->add_node(\n' + indent('array(\n' + indent(aligned(pairs), 1) + '\n)', 1) + '\n);';
  });

  let out = '';
  if (mode === 'plugin') {
    out += '<?php\n/**\n * Plugin Name:       ' + (tb.title || 'Toolbar') + ' toolbar node\n * Description:       Adds the ' + d.id + ' node to the admin bar.\n * Version:           1.0.0\n * Requires PHP:      7.4\n * Text Domain:       ' + td + "\n */\n\ndefined( 'ABSPATH' ) || exit;\n\n";
  } else if (mode === 'functions') {
    out += "<?php\n// Add to your theme's functions.php.\n\n";
  }

  out += '/**\n * Add the ' + (tb.title || 'Acme') + ' node to the toolbar.\n *\n * @param WP_Admin_Bar $wp_admin_bar The toolbar instance.\n */\nfunction ' + pre + '_toolbar_node( $wp_admin_bar ) {\n' + indent(body, 1) + '\n}\n';
  out += "add_action( 'admin_bar_menu', '" + pre + '_toolbar_node\', ' + (parseInt(tb.priority, 10) || 80) + ' );\n';

  if (d.removals.length) {
    out += '\n/**\n * Clear the core nodes this site does not use.\n *\n * @param WP_Admin_Bar $wp_admin_bar The toolbar instance.\n */\nfunction ' + pre + '_toolbar_cleanup( $wp_admin_bar ) {\n' + indent(d.removals.map((id) => "$wp_admin_bar->remove_node( '" + id + "' );").join('\n'), 1) + '\n}\n';
    out += "add_action( 'admin_bar_menu', '" + pre + "_toolbar_cleanup', 999 );\n";
  }
  return withCredit(out);
}

export function freshProject(): ToolbarNode {
  return {
    prefix: 'acme', textDomain: 'acme',
    title: 'Acme', id: 'acme-tools', href: 'options-general.php?page=acme-toolkit',
    parent: '', capability: 'edit_others_posts', scope: 'both', priority: '80', showCount: false,
    children: [
      { title: 'Settings', id: 'acme-settings', href: 'options-general.php?page=acme-toolkit', nonce: false },
      { title: 'Clear cache', id: 'acme-clear-cache', href: 'admin-post.php?action=acme_clear_cache', nonce: true },
      { title: 'Documentation', id: 'acme-docs', href: 'https://example.com/docs', nonce: false },
    ],
    removals: ['wp-logo'],
  };
}

export function validate(tb: ToolbarNode): ValidationIssue[] {
  const d = derive(tb);
  const out: ValidationIssue[] = [];
  const add = (severity: ValidationIssue['severity'], message: string, targetId?: string, fix?: string, fixLabel?: string) => out.push({ severity, message, targetId, fix, fixLabel });

  if (!String(tb.title || '').trim()) add('error', 'A title is required — an empty node renders as a blank gap in the toolbar.', 'title');
  if (!String(tb.id || '').trim()) add('error', 'A node id is required. It is what children reference as their parent and what remove_node() needs.', 'id');
  else if (String(tb.id).trim() !== d.id) add('error', '"' + tb.id + '" is not a safe node id. Lowercase with dashes — it becomes an HTML id.', 'id', 'fixId', 'Use ' + d.id);
  if (d.id.indexOf(d.pre.replace(/_/g, '-')) !== 0) add('warning', 'The id is not prefixed. Node ids are global across every plugin in the toolbar; a clash replaces someone else’s menu.', 'id', 'prefixId', 'Prefix it');
  if (!tb.capability) add('warning', 'No capability check, so every logged-in user sees this node — including subscribers on a membership site.', 'capability', 'setCap', 'Require edit_posts');
  if (tb.capability === 'read') add('recommendation', 'read means every logged-in user. Fine for a help link, wrong for anything that changes the site.', 'capability');
  if (String(tb.title || '').length > 24) add('recommendation', 'At ' + String(tb.title).length + ' characters this title will crowd the toolbar and wrap awkwardly on smaller screens.', 'title');
  if (/<[a-z]/i.test(String(tb.title || ''))) add('warning', 'The title contains HTML. That is allowed — the toolbar prints it raw — but anything dynamic inside it must be escaped or you have an XSS hole.', 'title');
  const seen: Record<string, boolean> = {};
  d.children.forEach((c, i) => {
    const id = slug(c.id) || slug(c.title);
    const label = 'Child ' + (i + 1);
    if (!String(c.title || '').trim()) add('error', label + ' has no title.', 'children');
    if (!id) add('error', label + ' has no id and no title to derive one from.', 'children');
    if (seen[id]) add('error', 'Two children share the id "' + id + '". The second overwrites the first.', 'children');
    seen[id] = true;
    if (id === d.id) add('error', label + ' has the same id as its parent, which makes the node its own child and disappears.', 'children');
    if (!String(c.href || '').trim()) add('warning', label + ' has no href, so it renders as unclickable text inside the dropdown.', 'children');
    if (String(c.href || '').indexOf('admin-post.php') === 0 && !c.nonce) add('error', label + ' points at admin-post.php without a nonce. Any site that links to that URL can trigger the action on behalf of your admins.', 'children', 'addNonce', 'Add the nonce');
    if (/^https?:\/\//.test(String(c.href || '')) === false && String(c.href || '').indexOf('?') > 0 && String(c.href).indexOf('=') === -1) add('recommendation', label + '’s href looks incomplete — a query string with no value.', 'children');
  });
  if (!d.children.length && !String(tb.href || '').trim()) add('error', 'The node has neither children nor a link, so clicking it does nothing.', 'href');
  if (d.children.length > 7) add('recommendation', d.children.length + ' items in one toolbar dropdown is a menu, not a shortcut. Consider a settings page.', 'children');
  if (d.removals.indexOf('comments') >= 0) add('recommendation', 'Removing the comments node also removes the only at-a-glance count of pending moderation.', 'removals');
  if (d.removals.indexOf('updates') >= 0) add('warning', 'Hiding the updates counter hides security updates from the people who need to apply them.', 'removals');
  if (d.removals.indexOf('new-content') >= 0 && tb.parent === 'new-content') add('error', 'You are attaching this node under new-content and removing new-content in the same code. The node will vanish.', 'parent', 'topLevel', 'Move to top level');
  if (tb.scope === 'front' && tb.parent === 'my-account') add('recommendation', 'Front-end only under the account menu is unusual — most users look for tools there in the admin too.', 'scope');
  const priority = parseInt(tb.priority, 10);
  if (!isNaN(priority) && priority < 10) add('recommendation', 'A priority below 10 places the node before core’s own items, which usually looks wrong next to the logo.', 'priority');
  if (tb.showCount) add('recommendation', 'The count is wired to the ' + d.pre + '_toolbar_count filter and defaults to zero — hook it to something real or the bubble never appears.', 'showCount');
  return out;
}

export function applyFix(tb: ToolbarNode, kind: string): ToolbarNode {
  const p: ToolbarNode = JSON.parse(JSON.stringify(tb));
  if (kind === 'fixId') p.id = slug(p.id);
  if (kind === 'prefixId') p.id = fnSlug(p.prefix).replace(/_/g, '-') + '-' + slug(p.id);
  if (kind === 'setCap') p.capability = 'edit_posts';
  if (kind === 'addNonce')
    p.children.forEach((c) => {
      if (String(c.href || '').indexOf('admin-post.php') === 0) c.nonce = true;
    });
  if (kind === 'topLevel') p.parent = '';
  return p;
}
