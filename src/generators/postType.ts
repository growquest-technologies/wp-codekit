import { alignBlock, escPhp, slugify, withCredit, type ValidationIssue } from '../lib/codegen';

export type OutputMode = 'snippet' | 'functions' | 'plugin';

export interface PostTypeAdv {
  showUi: string;
  showInMenu: string;
  showInNavMenus: string;
  showInAdminBar: string;
  publiclyQueryable: string;
  excludeFromSearch: string;
  menuPosition: string;
  menuIcon: string;
  showInMenuString: string;
  restBase: string;
  restNamespace: string;
  restController: string;
  rewriteMode: 'on' | 'off';
  rewriteSlug: string;
  withFront: boolean;
  pages: boolean;
  feeds: boolean;
  queryVarMode: 'true' | 'false' | 'custom';
  queryVarString: string;
  capMode: 'post' | 'page' | 'custom';
  capSingular: string;
  capPlural: string;
  mapMetaCap: boolean;
  canExport: string;
  deleteWithUser: string;
  templateLock: string;
  fnPrefix: string;
  textDomain: string;
}

export interface PostType {
  singular: string;
  plural: string;
  key: string;
  keyEdited: boolean;
  pluralEdited: boolean;
  description: string;
  public: boolean;
  hierarchical: boolean;
  showInRest: boolean;
  hasArchive: boolean;
  archiveSlug: string;
  supports: string[];
  taxonomies: string[];
  customTax: string[];
  labelOverrides: Record<string, string>;
  outputAllLabels: boolean;
  adv: PostTypeAdv;
}

export const RESERVED = ['post', 'page', 'attachment', 'revision', 'nav_menu_item', 'custom_css', 'customize_changeset', 'oembed_cache', 'user_request', 'wp_block', 'wp_global_styles', 'wp_navigation', 'wp_template', 'wp_template_part', 'action', 'author', 'order', 'theme'];
export const SUPPORTS_OPTIONS = ['title', 'editor', 'author', 'thumbnail', 'excerpt', 'trackbacks', 'custom-fields', 'comments', 'revisions', 'page-attributes', 'post-formats'];
export const BUILTIN_TAX = [['category', 'category'], ['post_tag', 'post_tag']] as const;
export const MENU_POSITIONS = [['', 'Default — bottom'], ['5', '5 — below Posts'], ['10', '10 — below Media'], ['15', '15 — below Links'], ['20', '20 — below Pages'], ['25', '25 — below Comments'], ['60', '60 — below first separator'], ['65', '65 — below Plugins'], ['70', '70 — below Users'], ['75', '75 — below Tools'], ['80', '80 — below Settings'], ['100', '100 — below second separator']];
export const DASHICONS = ['dashicons-admin-post', 'dashicons-admin-page', 'dashicons-book', 'dashicons-portfolio', 'dashicons-calendar-alt', 'dashicons-format-quote', 'dashicons-cart', 'dashicons-groups', 'dashicons-media-document', 'dashicons-star-filled', 'dashicons-location', 'dashicons-megaphone', 'dashicons-testimonial', 'dashicons-video-alt3', 'dashicons-hammer'];
const VISIBILITY_KEYS = [
  ['showUi', 'show_ui', 'inherit from public'],
  ['showInMenu', 'show_in_menu', 'inherit from show_ui'],
  ['showInNavMenus', 'show_in_nav_menus', 'inherit from public'],
  ['showInAdminBar', 'show_in_admin_bar', 'inherit from show_in_menu'],
  ['publiclyQueryable', 'publicly_queryable', 'inherit from public'],
  ['excludeFromSearch', 'exclude_from_search', 'opposite of public'],
] as const;

export function freshProject(): PostType {
  return {
    singular: 'Book',
    plural: 'Books',
    key: 'book',
    keyEdited: false,
    pluralEdited: false,
    description: '',
    public: true,
    hierarchical: false,
    showInRest: true,
    hasArchive: true,
    archiveSlug: '',
    supports: ['title', 'editor', 'thumbnail', 'excerpt'],
    taxonomies: ['category'],
    customTax: [],
    labelOverrides: {},
    outputAllLabels: false,
    adv: {
      showUi: 'inherit', showInMenu: 'inherit', showInNavMenus: 'inherit', showInAdminBar: 'inherit', publiclyQueryable: 'inherit', excludeFromSearch: 'inherit',
      menuPosition: '', menuIcon: 'dashicons-admin-post', showInMenuString: '',
      restBase: '', restNamespace: '', restController: '',
      rewriteMode: 'on', rewriteSlug: '', withFront: true, pages: true, feeds: false,
      queryVarMode: 'true', queryVarString: '',
      capMode: 'post', capSingular: '', capPlural: '', mapMetaCap: false,
      canExport: 'inherit', deleteWithUser: 'inherit', templateLock: '',
      fnPrefix: 'mytheme', textDomain: 'textdomain',
    },
  };
}

function lower(s: string) {
  return String(s || '').toLowerCase();
}

export function autoLabels(pt: PostType): [string, string][] {
  const s = pt.singular || 'Item';
  const p = pt.plural || s + 's';
  const ls = lower(s);
  const lp = lower(p);
  return [
    ['name', p], ['singular_name', s], ['menu_name', p], ['name_admin_bar', s],
    ['add_new', 'Add New'], ['add_new_item', 'Add New ' + s], ['new_item', 'New ' + s],
    ['edit_item', 'Edit ' + s], ['view_item', 'View ' + s], ['view_items', 'View ' + p],
    ['all_items', 'All ' + p], ['search_items', 'Search ' + p],
    ['not_found', 'No ' + lp + ' found.'], ['not_found_in_trash', 'No ' + lp + ' found in Trash.'],
    ['parent_item_colon', 'Parent ' + p + ':'],
    ['archives', s + ' archives'], ['attributes', s + ' attributes'],
    ['insert_into_item', 'Insert into ' + ls], ['uploaded_to_this_item', 'Uploaded to this ' + ls],
    ['featured_image', 'Featured image'], ['set_featured_image', 'Set featured image'],
    ['remove_featured_image', 'Remove featured image'], ['use_featured_image', 'Use as featured image'],
    ['filter_items_list', 'Filter ' + lp + ' list'], ['filter_by_date', 'Filter by date'],
    ['items_list_navigation', p + ' list navigation'], ['items_list', p + ' list'],
    ['item_published', s + ' published.'], ['item_published_privately', s + ' published privately.'],
    ['item_reverted_to_draft', s + ' reverted to draft.'], ['item_scheduled', s + ' scheduled.'],
    ['item_updated', s + ' updated.'], ['item_link', s + ' link'], ['item_link_description', 'A link to a ' + ls + '.'],
  ];
}

export const ESSENTIAL_LABELS = ['name', 'singular_name', 'menu_name', 'add_new_item', 'edit_item', 'new_item', 'view_item', 'all_items', 'search_items', 'not_found'];

export function resolvedLabels(pt: PostType): [string, string, boolean][] {
  return autoLabels(pt).map((row) => {
    const ov = pt.labelOverrides[row[0]];
    return [row[0], ov != null && ov !== '' ? ov : row[1], ov != null && ov !== ''];
  });
}

function tri(v: string, fallback: boolean): boolean {
  return v === 'true' ? true : v === 'false' ? false : fallback;
}

export function effective(pt: PostType) {
  const a = pt.adv;
  const publiclyQueryable = tri(a.publiclyQueryable, pt.public);
  const showUi = tri(a.showUi, pt.public);
  const rewriteOn = a.rewriteMode !== 'off';
  const slug = a.rewriteSlug || pt.key || 'post-type';
  return {
    publiclyQueryable,
    showUi,
    showInMenu: a.showInMenuString ? a.showInMenuString : tri(a.showInMenu, showUi),
    rewriteOn,
    slug,
    archiveSlug: pt.archiveSlug || slug,
    queryVar: a.queryVarMode === 'false' ? false : a.queryVarMode === 'custom' ? a.queryVarString || pt.key : pt.key || 'post-type',
    restBase: a.restBase || pt.key || 'post-type',
    restNamespace: a.restNamespace || 'wp/v2',
  };
}

export function buildArgs(pt: PostType): [string, string][] {
  const a = pt.adv;
  const e = effective(pt);
  const args: [string, string][] = [];
  args.push(['labels', '$labels']);
  if (pt.description) args.push(['description', "__( '" + escPhp(pt.description) + "', '" + escPhp(a.textDomain) + "' )"]);
  args.push(['public', pt.public ? 'true' : 'false']);
  if (pt.hierarchical) args.push(['hierarchical', 'true']);
  VISIBILITY_KEYS.forEach((v) => {
    if (v[0] === 'showInMenu' && a.showInMenuString) {
      args.push(['show_in_menu', "'" + escPhp(a.showInMenuString) + "'"]);
      return;
    }
    const val = a[v[0] as keyof PostTypeAdv];
    if (val === 'true' || val === 'false') args.push([v[1], val as string]);
  });
  args.push(['show_in_rest', pt.showInRest ? 'true' : 'false']);
  if (a.restBase) args.push(['rest_base', "'" + escPhp(a.restBase) + "'"]);
  if (a.restNamespace) args.push(['rest_namespace', "'" + escPhp(a.restNamespace) + "'"]);
  if (a.restController) args.push(['rest_controller_class', "'" + escPhp(a.restController) + "'"]);
  if (a.menuPosition) args.push(['menu_position', a.menuPosition]);
  if (a.menuIcon && a.menuIcon !== 'dashicons-admin-post') args.push(['menu_icon', "'" + escPhp(a.menuIcon) + "'"]);
  if (a.capMode === 'page') args.push(['capability_type', "'page'"]);
  else if (a.capMode === 'custom') args.push(['capability_type', "array( '" + escPhp(a.capSingular || pt.key) + "', '" + escPhp(a.capPlural || pt.key + 's') + "' )"]);
  if (a.mapMetaCap) args.push(['map_meta_cap', 'true']);
  args.push(['supports', pt.supports.length ? 'array( ' + pt.supports.map((s) => "'" + s + "'").join(', ') + ' )' : 'false']);
  const taxes = pt.taxonomies.concat(pt.customTax);
  if (taxes.length) args.push(['taxonomies', 'array( ' + taxes.map((t) => "'" + escPhp(t) + "'").join(', ') + ' )']);
  if (pt.hasArchive) args.push(['has_archive', pt.archiveSlug ? "'" + escPhp(pt.archiveSlug) + "'" : 'true']);
  if (!e.rewriteOn) args.push(['rewrite', 'false']);
  else {
    const parts: string[] = [];
    if (a.rewriteSlug) parts.push("'slug' => '" + escPhp(a.rewriteSlug) + "'");
    if (!a.withFront) parts.push("'with_front' => false");
    if (!a.pages) parts.push("'pages' => false");
    if (a.feeds) parts.push("'feeds' => true");
    if (parts.length) args.push(['rewrite', 'array( ' + parts.join(', ') + ' )']);
  }
  if (a.queryVarMode === 'false') args.push(['query_var', 'false']);
  else if (a.queryVarMode === 'custom' && a.queryVarString) args.push(['query_var', "'" + escPhp(a.queryVarString) + "'"]);
  if (a.canExport === 'false') args.push(['can_export', 'false']);
  if (a.deleteWithUser === 'true' || a.deleteWithUser === 'false') args.push(['delete_with_user', a.deleteWithUser]);
  if (a.templateLock) args.push(['template_lock', "'" + escPhp(a.templateLock) + "'"]);
  return args;
}

export function buildCode(pt: PostType, mode: OutputMode): string {
  const a = pt.adv;
  const key = pt.key || 'post_type';
  const fn = (a.fnPrefix || 'mytheme') + '_register_' + key.replace(/-/g, '_') + '_post_type';
  const td = escPhp(a.textDomain || 'textdomain');
  const labels = resolvedLabels(pt).filter((l) => pt.outputAllLabels || ESSENTIAL_LABELS.indexOf(l[0]) !== -1 || l[2]);
  const labelPairs: [string, string][] = labels.map((l) => [l[0], "__( '" + escPhp(l[1]) + "', '" + td + "' )"]);
  const argPairs = buildArgs(pt);
  let out = '';
  if (mode === 'plugin') {
    out += '<?php\n/**\n * Plugin Name:       ' + (pt.plural || 'Custom Post Type') + '\n * Description:       Registers the ' + (pt.plural || 'custom') + ' post type.\n * Version:           1.0.0\n * Requires at least: 6.0\n * Requires PHP:      7.4\n * Text Domain:       ' + td + '\n */\n\ndefined( \'ABSPATH\' ) || exit;\n\n';
  } else if (mode === 'functions') {
    out += "<?php\n// Add to your theme's functions.php.\n\n";
  }
  out += '/**\n * Register the ' + (pt.plural || 'custom') + ' post type.\n */\nfunction ' + fn + '() {\n';
  out += '\t$labels = array(\n' + alignBlock(labelPairs, '\t\t') + '\n\t);\n\n';
  out += '\t$args = array(\n' + alignBlock(argPairs, '\t\t') + '\n\t);\n\n';
  out += "\tregister_post_type( '" + escPhp(key) + "', $args );\n}\nadd_action( 'init', '" + fn + "' );\n";
  if (mode === 'plugin') {
    out += "\n/**\n * Flush rewrite rules once, on activation only.\n */\nfunction " + fn + "_activate() {\n\t" + fn + "();\n\tflush_rewrite_rules();\n}\nregister_activation_hook( __FILE__, '" + fn + "_activate' );\n";
  } else if (mode === 'functions') {
    out += "\n/**\n * Flush rewrite rules once, after the theme is switched on.\n */\nfunction " + fn + "_flush() {\n\t" + fn + "();\n\tflush_rewrite_rules();\n}\nadd_action( 'after_switch_theme', '" + fn + "_flush' );\n";
  }
  return withCredit(out);
}

function keyPrefix(adv: PostTypeAdv, key: string): string {
  const full = slugify(adv.fnPrefix) || 'acme';
  return full.length + 1 + key.length <= 20 ? full : full.slice(0, 4);
}

export function validate(pt: PostType): ValidationIssue[] {
  const out: ValidationIssue[] = [];
  const key = pt.key || '';
  const a = pt.adv;
  const add = (severity: ValidationIssue['severity'], message: string, targetId?: string, fix?: string, fixLabel?: string) =>
    out.push({ severity, message, targetId, fix, fixLabel });

  if (!pt.singular.trim()) add('error', 'Singular name is empty — every label is derived from it.', 'singular');
  if (!pt.plural.trim()) add('error', 'Plural name is empty — the admin menu label needs it.', 'plural');
  if (!key) add('error', 'Post type key is required.', 'key');
  else {
    if (key.length > 20) add('error', `Post type key is ${key.length} characters — the limit is 20.`, 'key', 'truncateKey', 'Truncate to 20');
    if (!/^[a-z0-9_-]+$/.test(key)) add('error', 'Post type key may only contain lowercase letters, numbers, dashes and underscores.', 'key', 'sanitizeKey', 'Sanitise key');
    if (RESERVED.indexOf(key) !== -1) add('error', `"${key}" is reserved by WordPress and will collide with core.`, 'key', 'prefixKey', 'Add a prefix');
    else if (!/^[a-z0-9]{2,6}_/.test(key) && key.length <= 16) {
      const pfx = keyPrefix(a, key);
      add('recommendation', `Prefix the key with a short project prefix (e.g. "${pfx}_${key}") so it cannot clash with another plugin.`, 'key', 'prefixKey', `Add "${pfx}_"`);
    }
  }
  if (pt.supports.indexOf('editor') !== -1 && !pt.showInRest) add('warning', 'The block editor needs show_in_rest — with it off, this type falls back to the classic editor.', 'rest', 'enableRest', 'Turn on REST');
  if (pt.hierarchical && pt.supports.indexOf('page-attributes') === -1) add('warning', 'Hierarchical types need "page-attributes" support to show the Parent selector.', 'supports', 'addPageAttributes', 'Add page-attributes');
  if (pt.supports.indexOf('thumbnail') !== -1 && !pt.public) add('recommendation', 'Thumbnail support is enabled but the type is not public — the featured image UI still works in the admin, this is just a heads-up.', 'thumbnail-note');
  if (a.rewriteMode !== 'off' && !pt.public && pt.public !== undefined) {
    // no-op placeholder to keep parity with source ordering; source has no rule here
  }
  return out;
}

export function applyFix(pt: PostType, kind: string): PostType {
  const p: PostType = JSON.parse(JSON.stringify(pt));
  if (kind === 'truncateKey') {
    p.key = p.key.slice(0, 20);
    p.keyEdited = true;
  }
  if (kind === 'sanitizeKey') {
    p.key = slugify(p.key, 20);
    p.keyEdited = true;
  }
  if (kind === 'prefixKey') {
    p.key = slugify((slugify(p.adv.fnPrefix, 4) || 'acme') + '_' + p.key, 20);
    p.keyEdited = true;
  }
  if (kind === 'enableRest') p.showInRest = true;
  if (kind === 'addPageAttributes' && p.supports.indexOf('page-attributes') === -1) p.supports.push('page-attributes');
  if (kind === 'enableRewrite') p.adv.rewriteMode = 'on';
  if (kind === 'enableMapMetaCap') p.adv.mapMetaCap = true;
  return p;
}
