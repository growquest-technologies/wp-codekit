import { alignBlock, escPhp, withCredit, type ValidationIssue } from '../lib/codegen';

export type OutputMode = 'snippet' | 'functions' | 'plugin';
export type Hook = 'after_setup_theme' | 'init';
export type ContainerTag = 'false' | 'nav' | 'div';
export type Fallback = 'false' | 'page_menu' | 'custom';

export interface NavLocation {
  slug: string;
  name: string;
  where: string;
}

export interface NavMenu {
  prefix: string;
  textDomain: string;
  codeStyle: 'procedural' | 'class';
  hook: Hook;
  locations: NavLocation[];
  container: ContainerTag;
  containerClass: string;
  menuClass: string;
  menuId: string;
  depth: string;
  fallback: Fallback;
  fallbackName: string;
  itemsWrap: string;
  hasMenuGuard: boolean;
  ariaWrapper: boolean;
}

export const START_PRESETS: [string, NavLocation[]][] = [
  ['Primary only', [{ slug: 'primary', name: 'Primary Menu', where: 'header.php' }]],
  ['Header + footer', [
    { slug: 'primary', name: 'Primary Menu', where: 'header.php' },
    { slug: 'footer', name: 'Footer Menu', where: 'footer.php' },
  ]],
  ['Full theme set', [
    { slug: 'primary', name: 'Primary Menu', where: 'header.php' },
    { slug: 'footer', name: 'Footer Menu', where: 'footer.php' },
    { slug: 'social', name: 'Social Links', where: 'footer.php' },
    { slug: 'legal', name: 'Legal Links', where: 'footer.php' },
  ]],
];

function fnSlug(s: string): string {
  return String(s || '').toLowerCase().trim().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
}
/** Dash-based slug for menu location slugs — distinct from the shared underscore slugify. */
function dashSlug(s: string): string {
  return String(s || '').toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
}
function pascal(s: string): string {
  return String(s || '')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('_');
}
function indent(text: string, depth: number): string {
  const pad = '\t'.repeat(depth);
  return text.split('\n').map((l) => (l ? pad + l : '')).join('\n');
}

export type DerivedLocation = NavLocation;

export interface Derived {
  pre: string;
  td: string;
  cls: string;
  hook: Hook;
  locations: DerivedLocation[];
}

export function derive(nm: NavMenu): Derived {
  const pre = fnSlug(nm.prefix) || 'mytheme';
  const locations = (nm.locations || []).map((l) => ({ slug: dashSlug(l.slug) || 'primary', name: l.name || 'Menu', where: l.where || 'header.php' }));
  return {
    pre,
    td: dashSlug(nm.textDomain) || pre.replace(/_/g, '-'),
    cls: (pascal(nm.prefix || 'MyTheme') || 'MyTheme') + '_Nav_Menus',
    hook: nm.hook === 'init' ? 'init' : 'after_setup_theme',
    locations,
  };
}

export function buildCode(nm: NavMenu, mode: OutputMode): string {
  const d = derive(nm);
  const t = (s: string) => "__( '" + escPhp(s) + "', '" + d.td + "' )";
  const body = d.locations.length
    ? 'register_nav_menus(\n' + indent('array(\n' + indent(alignBlock(d.locations.map((l) => [l.slug, t(l.name)] as [string, string]), ''), 1) + '\n)', 1) + '\n);'
    : '// Add a menu location to generate the registration call.';
  const doc = '/**\n * Register the theme’s menu locations.\n */\n';
  let out = '';
  if (mode === 'plugin') {
    out += '<?php\n/**\n * Plugin Name:       Menu locations\n * Description:       Registers ' + d.locations.length + ' nav menu location' + (d.locations.length === 1 ? '' : 's') + '.\n * Version:           1.0.0\n * Requires PHP:      7.4\n * Text Domain:       ' + d.td + "\n */\n\ndefined( 'ABSPATH' ) || exit;\n\n";
  } else if (mode === 'functions') {
    out += "<?php\n// Add to your theme's functions.php.\n\n";
  }
  if (nm.codeStyle === 'class') {
    out += 'final class ' + d.cls + " {\n\n\t/**\n\t * Wire the class into WordPress.\n\t */\n\tpublic function hooks() {\n\t\tadd_action( '" + d.hook + "', array( $this, 'register' ) );\n\t}\n\n" + indent(doc, 1) + '\tpublic function register() {\n' + indent(body, 2) + '\n\t}\n}\n\n( new ' + d.cls + '() )->hooks();\n';
  } else {
    out += doc + 'function ' + d.pre + '_nav_menus() {\n' + indent(body, 1) + '\n}\n' + "add_action( '" + d.hook + "', '" + d.pre + "_nav_menus' );\n";
  }
  if (nm.fallback === 'custom' && d.locations.length) {
    out += '\n/**\n * Printed when no menu is assigned to the location.\n */\nfunction ' + (fnSlug(nm.fallbackName) || d.pre + '_menu_fallback') + '() {\n\tif ( ! current_user_can( \'edit_theme_options\' ) ) {\n\t\treturn;\n\t}\n\n\tprintf(\n\t\t\'<p class="menu-fallback"><a href="%1$s">%2$s</a></p>\',\n\t\tesc_url( admin_url( \'nav-menus.php\' ) ),\n\t\tesc_html__( \'Assign a menu to this location\', \'' + d.td + "' )\n\t);\n}\n";
  }
  return withCredit(out);
}

export function buildTemplate(nm: NavMenu, loc: DerivedLocation | null): string {
  const d = derive(nm);
  if (!loc) return '<?php\n// Add a menu location first.\n';
  const args: [string, string][] = [['theme_location', "'" + escPhp(loc.slug) + "'"]];
  if (nm.menuId) args.push(['menu_id', "'" + escPhp(nm.menuId) + "'"]);
  if (nm.menuClass) args.push(['menu_class', "'" + escPhp(nm.menuClass) + "'"]);
  args.push(['container', nm.container === 'false' ? 'false' : "'" + nm.container + "'"]);
  if (nm.container !== 'false') args.push(['container_class', "'" + escPhp(nm.containerClass || 'menu-' + loc.slug) + "'"]);
  if (String(nm.depth) !== '0') args.push(['depth', String(parseInt(nm.depth, 10) || 0)]);
  args.push(['fallback_cb', nm.fallback === 'false' ? 'false' : nm.fallback === 'page_menu' ? "'wp_page_menu'" : "'" + (fnSlug(nm.fallbackName) || d.pre + '_menu_fallback') + "'"]);
  if (nm.itemsWrap) args.push(['items_wrap', "'" + escPhp(nm.itemsWrap) + "'"]);
  const call = 'wp_nav_menu(\n' + indent('array(\n' + indent(alignBlock(args, ''), 1) + '\n)', 1) + '\n);';
  const inner = nm.ariaWrapper
    ? '<nav class="' + escPhp(nm.containerClass || 'site-nav') + '" aria-label="' + '<?php esc_attr_e( \'' + escPhp(loc.name) + '\', \'' + d.td + '\' ); ?>">\n\t<?php\n' + indent(call, 1) + '\n\t?>\n</nav>'
    : '<?php\n' + call + '\n?>';
  let out = '';
  if (nm.hasMenuGuard) {
    out += "<?php if ( has_nav_menu( '" + escPhp(loc.slug) + "' ) ) : ?>\n" + indent(inner, 1) + '\n<?php endif; ?>\n';
  } else {
    out += inner + '\n';
  }
  return out;
}

export function sampleHTML(nm: NavMenu, loc: DerivedLocation | null): string {
  if (!loc) return '<!-- add a menu location -->';
  const id = nm.menuId || 'menu-' + loc.slug;
  const cls = nm.menuClass || 'menu';
  const items = '\n\t<li class="menu-item menu-item-type-post_type menu-item-object-page current-menu-item"><a href="/" aria-current="page">Home</a></li>\n\t<li class="menu-item menu-item-has-children"><a href="/work/">Work</a>\n\t\t<ul class="sub-menu">\n\t\t\t<li class="menu-item"><a href="/work/case-studies/">Case Studies</a></li>\n\t\t</ul>\n\t</li>\n';
  const list = String(nm.itemsWrap || '<ul id="%1$s" class="%2$s">%3$s</ul>').replace('%1$s', id).replace('%2$s', cls).replace('%3$s', items);
  const wrap = nm.ariaWrapper ? '<nav class="' + (nm.containerClass || 'site-nav') + '" aria-label="' + loc.name + '">\n' + indent(list, 1) + '\n</nav>' : list;
  return nm.container === 'false' ? wrap : '<' + nm.container + ' class="' + (nm.containerClass || 'menu-' + loc.slug) + '">\n' + indent(wrap, 1) + '\n</' + nm.container + '>';
}

export function validate(nm: NavMenu): ValidationIssue[] {
  const d = derive(nm);
  const out: ValidationIssue[] = [];
  const add = (severity: ValidationIssue['severity'], message: string, fix?: string, fixLabel?: string) => out.push({ severity, message, fix, fixLabel });

  if (!d.locations.length) add('error', 'No menu locations registered, so Appearance → Menus has nowhere to assign a menu.');
  const seen: Record<string, boolean> = {};
  (nm.locations || []).forEach((l) => {
    const slug = dashSlug(l.slug);
    if (!String(l.slug || '').trim()) add('error', 'A location is missing its slug — theme_location has nothing to match.', 'fixSlugs', 'Derive from names');
    else if (String(l.slug).trim() !== slug) add('error', '“' + l.slug + '” is not a safe location slug. Use lowercase and dashes so the theme_location value matches.', 'fixSlugs', 'Use ' + slug);
    if (seen[slug]) add('error', 'Two locations share the slug “' + slug + '”. The second registration replaces the first.');
    seen[slug] = true;
    if (!String(l.name || '').trim()) add('warning', 'The location “' + slug + '” has no name, so the Menus screen shows an unlabelled checkbox.');
  });
  if (nm.fallback === 'page_menu') add('warning', 'fallback_cb is wp_page_menu, so a site with no menu assigned prints every published page — including the ones nobody meant to link.', 'noFallback', 'Set false');
  if (!nm.hasMenuGuard) add('warning', 'No has_nav_menu() guard, so an unassigned location still prints your nav wrapper and the fallback runs inside it.', 'addGuard', 'Add the guard');
  if (!nm.ariaWrapper) add('recommendation', 'No nav landmark or aria-label. Two unlabelled navs on a page are indistinguishable to a screen reader — wrap the call and name it.');
  if (String(nm.itemsWrap || '').indexOf('%3$s') === -1) add('error', 'items_wrap has no %3$s, so the list renders with no items at all.', 'fixItemsWrap', 'Restore the default');
  if (String(nm.itemsWrap || '').indexOf('%1$s') === -1 && nm.menuId) add('recommendation', 'items_wrap drops %1$s, so the menu_id you set never lands in the markup.');
  if (String(nm.depth) === '1' && d.locations.length) add('recommendation', 'depth 1 flattens the menu — child items an editor adds in the admin will silently not render.');
  if (String(nm.depth) === '0') add('recommendation', 'depth 0 means unlimited nesting. Fine if your CSS handles third-level dropdowns; most themes only style two.');
  if (nm.container !== 'false' && nm.ariaWrapper) add('recommendation', 'You have both a container (' + nm.container + ') and your own nav wrapper — that is two nested elements doing one job. Set container to false.');
  if (d.hook === 'init') add('recommendation', 'register_nav_menus() on init works, but after_setup_theme is where theme features belong and it runs earlier.');
  if (d.td !== d.pre.replace(/_/g, '-')) add('recommendation', 'The text domain “' + d.td + '” must match the theme folder name or the location names never translate.');
  return out;
}

export function freshProject(): NavMenu {
  return {
    prefix: 'mytheme', textDomain: 'mytheme', codeStyle: 'procedural', hook: 'after_setup_theme',
    locations: [
      { slug: 'primary', name: 'Primary Menu', where: 'header.php' },
      { slug: 'footer', name: 'Footer Menu', where: 'footer.php' },
    ],
    container: 'false', containerClass: 'site-nav', menuClass: 'menu', menuId: 'primary-menu',
    depth: '2', fallback: 'false', fallbackName: '',
    itemsWrap: '<ul id="%1$s" class="%2$s">%3$s</ul>',
    hasMenuGuard: true, ariaWrapper: true,
  };
}

export function applyFix(nm: NavMenu, kind: string): NavMenu {
  const p: NavMenu = JSON.parse(JSON.stringify(nm));
  if (kind === 'fixSlugs') p.locations.forEach((l) => { l.slug = dashSlug(l.slug) || dashSlug(l.name) || 'primary'; });
  if (kind === 'noFallback') p.fallback = 'false';
  if (kind === 'addGuard') p.hasMenuGuard = true;
  if (kind === 'fixItemsWrap') p.itemsWrap = '<ul id="%1$s" class="%2$s">%3$s</ul>';
  return p;
}
