import { alignBlock, escPhp, slugify, withCredit, type ValidationIssue } from '../lib/codegen';

export type OutputMode = 'snippet' | 'functions' | 'plugin';

export interface TaxonomyAdv {
  showUi: string;
  showInMenu: string;
  showInNavMenus: string;
  publiclyQueryable: string;
  showTagcloud: string;
  showInQuickEdit: string;
  restBase: string;
  restNamespace: string;
  restController: string;
  rewriteMode: 'on' | 'off';
  rewriteSlug: string;
  withFront: boolean;
  hierarchicalUrls: boolean;
  queryVarMode: 'default' | 'custom' | 'false';
  queryVarString: string;
  manageTerms: string;
  editTerms: string;
  deleteTerms: string;
  assignTerms: string;
  defaultTermName: string;
  defaultTermSlug: string;
  defaultTermDescription: string;
  metaBox: 'default' | 'false';
  countCallback: 'default' | 'generic';
  sort: 'inherit' | 'true';
  priority: string;
  fnPrefix: string;
  textDomain: string;
}

export interface Taxonomy {
  singular: string;
  plural: string;
  key: string;
  keyEdited: boolean;
  pluralEdited: boolean;
  description: string;
  public: boolean;
  hierarchical: boolean;
  showInRest: boolean;
  showAdminColumn: boolean;
  objectTypes: string[];
  customTypes: string[];
  labelOverrides: Record<string, string>;
  outputAllLabels: boolean;
  adv: TaxonomyAdv;
}

export const RESERVED_TERMS = ['attachment', 'attachment_id', 'author', 'author_name', 'calendar', 'cat', 'category', 'category__and', 'category__in', 'category__not_in', 'category_name', 'comments_per_page', 'comments_popup', 'custom', 'customize_messenger_channel', 'customized', 'cpage', 'day', 'debug', 'embed', 'error', 'exact', 'feed', 'fields', 'hour', 'link_category', 'm', 'minute', 'monthnum', 'more', 'name', 'nav_menu', 'nonce', 'nopaging', 'offset', 'order', 'orderby', 'p', 'page', 'page_id', 'paged', 'pagename', 'pb', 'perm', 'post', 'post__in', 'post__not_in', 'post_format', 'post_mime_type', 'post_status', 'post_tag', 'post_type', 'posts', 'posts_per_archive_page', 'posts_per_page', 'preview', 'robots', 's', 'search', 'second', 'sentence', 'showposts', 'static', 'status', 'subpost', 'subpost_id', 'tag', 'tag__and', 'tag__in', 'tag__not_in', 'tag_id', 'tag_slug__and', 'tag_slug__in', 'taxonomy', 'tb', 'term', 'terms', 'theme', 'title', 'type', 'types', 'w', 'withcomments', 'withoutcomments', 'year'];
export const BUILTIN_TYPES = ['post', 'page', 'attachment'];
export const VISIBILITY_KEYS = [
  ['showUi', 'show_ui', 'inherit from public'],
  ['showInMenu', 'show_in_menu', 'inherit from show_ui'],
  ['showInNavMenus', 'show_in_nav_menus', 'inherit from public'],
  ['publiclyQueryable', 'publicly_queryable', 'inherit from public'],
  ['showTagcloud', 'show_tagcloud', 'inherit from show_ui'],
  ['showInQuickEdit', 'show_in_quick_edit', 'inherit from show_ui'],
] as const;
export const CAP_FIELDS = [
  ['manageTerms', 'manage_terms', 'manage_categories'],
  ['editTerms', 'edit_terms', 'manage_categories'],
  ['deleteTerms', 'delete_terms', 'manage_categories'],
  ['assignTerms', 'assign_terms', 'edit_posts'],
] as const;

function lower(s: string) {
  return String(s || '').toLowerCase();
}

export function autoLabels(tx: Taxonomy): [string, string][] {
  const s = tx.singular || 'Term';
  const p = tx.plural || s + 's';
  const ls = lower(s);
  const lp = lower(p);
  const shared: [string, string][] = [
    ['name', p], ['singular_name', s], ['menu_name', p],
    ['all_items', 'All ' + p], ['edit_item', 'Edit ' + s], ['view_item', 'View ' + s],
    ['update_item', 'Update ' + s], ['add_new_item', 'Add New ' + s], ['new_item_name', 'New ' + s + ' Name'],
    ['search_items', 'Search ' + p], ['not_found', 'No ' + lp + ' found.'], ['no_terms', 'No ' + lp],
    ['items_list', p + ' list'], ['items_list_navigation', p + ' list navigation'],
    ['most_used', 'Most Used'], ['back_to_items', '← Go to ' + p],
    ['item_link', s + ' Link'], ['item_link_description', 'A link to a ' + ls + '.'],
    ['name_field_description', 'The name is how it appears on your site.'],
    ['slug_field_description', 'The slug is the URL-friendly version of the name.'],
    ['desc_field_description', 'The description is not prominent by default, however some themes may show it.'],
  ];
  const hier: [string, string][] = [
    ['parent_item', 'Parent ' + s], ['parent_item_colon', 'Parent ' + s + ':'],
    ['filter_by_item', 'Filter by ' + ls],
    ['parent_field_description', 'Assign a parent term to create a hierarchy.'],
  ];
  const flat: [string, string][] = [
    ['popular_items', 'Popular ' + p],
    ['separate_items_with_commas', 'Separate ' + lp + ' with commas'],
    ['add_or_remove_items', 'Add or remove ' + lp],
    ['choose_from_most_used', 'Choose from the most used ' + lp],
  ];
  return shared.concat(tx.hierarchical ? hier : flat);
}

export const ESSENTIAL_LABELS = ['name', 'singular_name', 'menu_name', 'all_items', 'edit_item', 'add_new_item', 'new_item_name', 'search_items', 'not_found', 'parent_item', 'parent_item_colon', 'separate_items_with_commas'];

export function resolvedLabels(tx: Taxonomy): [string, string, boolean][] {
  return autoLabels(tx).map((row) => {
    const ov = tx.labelOverrides[row[0]];
    return [row[0], ov != null && ov !== '' ? ov : row[1], ov != null && ov !== ''];
  });
}

function tri(v: string, fallback: boolean): boolean {
  return v === 'true' ? true : v === 'false' ? false : fallback;
}

export function effective(tx: Taxonomy) {
  const a = tx.adv;
  return {
    showUi: tri(a.showUi, tx.public),
    publiclyQueryable: tri(a.publiclyQueryable, tx.public),
    rewriteOn: a.rewriteMode !== 'off',
    slug: a.rewriteSlug || tx.key || 'taxonomy',
    queryVar: a.queryVarMode === 'false' ? false : a.queryVarMode === 'custom' ? a.queryVarString || tx.key : tx.key || 'taxonomy',
    restBase: a.restBase || tx.key || 'taxonomy',
    restNamespace: a.restNamespace || 'wp/v2',
    objectTypes: tx.objectTypes.concat(tx.customTypes),
  };
}

export function buildArgs(tx: Taxonomy): [string, string][] {
  const a = tx.adv;
  const e = effective(tx);
  const args: [string, string][] = [];
  args.push(['labels', '$labels']);
  if (tx.description) args.push(['description', "__( '" + escPhp(tx.description) + "', '" + escPhp(a.textDomain) + "' )"]);
  args.push(['hierarchical', tx.hierarchical ? 'true' : 'false']);
  args.push(['public', tx.public ? 'true' : 'false']);
  VISIBILITY_KEYS.forEach((v) => {
    const val = a[v[0] as keyof TaxonomyAdv];
    if (val === 'true' || val === 'false') args.push([v[1], val as string]);
  });
  if (tx.showAdminColumn) args.push(['show_admin_column', 'true']);
  args.push(['show_in_rest', tx.showInRest ? 'true' : 'false']);
  if (a.restBase) args.push(['rest_base', "'" + escPhp(a.restBase) + "'"]);
  if (a.restNamespace) args.push(['rest_namespace', "'" + escPhp(a.restNamespace) + "'"]);
  if (a.restController) args.push(['rest_controller_class', "'" + escPhp(a.restController) + "'"]);
  const caps = CAP_FIELDS.filter((c) => a[c[0] as keyof TaxonomyAdv]);
  if (caps.length) {
    args.push(['capabilities', 'array(\n' + caps.map((c) => "\t\t\t'" + c[1] + "' => '" + escPhp(a[c[0] as keyof TaxonomyAdv]) + "',").join('\n') + '\n\t\t)']);
  }
  if (a.metaBox === 'false') args.push(['meta_box_cb', 'false']);
  if (a.countCallback === 'generic') args.push(['update_count_callback', "'_update_generic_term_count'"]);
  if (a.sort === 'true') args.push(['sort', 'true']);
  if (!e.rewriteOn) args.push(['rewrite', 'false']);
  else {
    const parts: string[] = [];
    if (a.rewriteSlug) parts.push("'slug' => '" + escPhp(a.rewriteSlug) + "'");
    if (!a.withFront) parts.push("'with_front' => false");
    if (a.hierarchicalUrls) parts.push("'hierarchical' => true");
    if (parts.length) args.push(['rewrite', 'array( ' + parts.join(', ') + ' )']);
  }
  if (a.queryVarMode === 'false') args.push(['query_var', 'false']);
  else if (a.queryVarMode === 'custom' && a.queryVarString) args.push(['query_var', "'" + escPhp(a.queryVarString) + "'"]);
  if (a.defaultTermName) {
    const dt = ["'name' => __( '" + escPhp(a.defaultTermName) + "', '" + escPhp(a.textDomain) + "' )", "'slug' => '" + escPhp(a.defaultTermSlug || slugify(a.defaultTermName, 40)) + "'"];
    if (a.defaultTermDescription) dt.push("'description' => __( '" + escPhp(a.defaultTermDescription) + "', '" + escPhp(a.textDomain) + "' )");
    args.push(['default_term', 'array(\n' + dt.map((d) => '\t\t\t' + d + ',').join('\n') + '\n\t\t)']);
  }
  return args;
}

export function buildCode(tx: Taxonomy, mode: OutputMode): string {
  const a = tx.adv;
  const key = tx.key || 'taxonomy';
  const e = effective(tx);
  const fn = (a.fnPrefix || 'mytheme') + '_register_' + key.replace(/-/g, '_') + '_taxonomy';
  const td = escPhp(a.textDomain || 'textdomain');
  const labels = resolvedLabels(tx).filter((l) => tx.outputAllLabels || ESSENTIAL_LABELS.indexOf(l[0]) !== -1 || l[2]);
  const labelPairs: [string, string][] = labels.map((l) => {
    const ctx = l[0] === 'name' ? 'taxonomy general name' : l[0] === 'singular_name' ? 'taxonomy singular name' : null;
    return [l[0], ctx ? "_x( '" + escPhp(l[1]) + "', '" + ctx + "', '" + td + "' )" : "__( '" + escPhp(l[1]) + "', '" + td + "' )"];
  });
  const types = e.objectTypes;
  const typeArg = types.length === 0 ? 'null' : types.length === 1 ? "'" + escPhp(types[0]) + "'" : 'array( ' + types.map((t) => "'" + escPhp(t) + "'").join(', ') + ' )';
  let out = '';
  if (mode === 'plugin') {
    out += '<?php\n/**\n * Plugin Name:       ' + (tx.plural || 'Custom Taxonomy') + '\n * Description:       Registers the ' + (tx.plural || 'custom') + ' taxonomy.\n * Version:           1.0.0\n * Requires at least: 6.0\n * Requires PHP:      7.4\n * Text Domain:       ' + td + '\n */\n\ndefined( \'ABSPATH\' ) || exit;\n\n';
  } else if (mode === 'functions') {
    out += "<?php\n// Add to your theme's functions.php.\n\n";
  }
  out += '/**\n * Register the ' + (tx.plural || 'custom') + ' taxonomy.\n */\nfunction ' + fn + '() {\n';
  out += '\t$labels = array(\n' + alignBlock(labelPairs, '\t\t') + '\n\t);\n\n';
  out += '\t$args = array(\n' + alignBlock(buildArgs(tx), '\t\t') + '\n\t);\n\n';
  out += "\tregister_taxonomy( '" + escPhp(key) + "', " + typeArg + ", $args );\n}\nadd_action( 'init', '" + fn + "'" + (a.priority !== '10' ? ', ' + a.priority : '') + ' );\n';
  if (mode === 'plugin') {
    out += "\n/**\n * Flush rewrite rules once, on activation only.\n */\nfunction " + fn + "_activate() {\n\t" + fn + "();\n\tflush_rewrite_rules();\n}\nregister_activation_hook( __FILE__, '" + fn + "_activate' );\n";
  } else if (mode === 'functions') {
    out += "\n/**\n * Flush rewrite rules once, after the theme is switched on.\n */\nfunction " + fn + "_flush() {\n\t" + fn + "();\n\tflush_rewrite_rules();\n}\nadd_action( 'after_switch_theme', '" + fn + "_flush' );\n";
  }
  return withCredit(out);
}

function keyPrefix(adv: TaxonomyAdv, key: string): string {
  const full = slugify(adv.fnPrefix) || 'acme';
  return full.length + 1 + key.length <= 32 ? full : full.slice(0, 4);
}

export function validate(tx: Taxonomy): ValidationIssue[] {
  const out: ValidationIssue[] = [];
  const key = tx.key || '';
  const a = tx.adv;
  const e = effective(tx);
  const add = (severity: ValidationIssue['severity'], message: string, targetId?: string, fix?: string, fixLabel?: string) =>
    out.push({ severity, message, targetId, fix, fixLabel });

  if (!tx.singular.trim()) add('error', 'Singular name is empty — every label is derived from it.', 'singular');
  if (!tx.plural.trim()) add('error', 'Plural name is empty — the admin menu label needs it.', 'plural');
  if (!key) add('error', 'Taxonomy key is required.', 'key');
  else {
    if (key.length > 32) add('error', `Taxonomy key is ${key.length} characters — the database limit is 32.`, 'key', 'truncateKey', 'Truncate to 32');
    if (!/^[a-z0-9_-]+$/.test(key)) add('error', 'Taxonomy key may only contain lowercase letters, numbers, dashes and underscores.', 'key', 'sanitizeKey', 'Sanitise key');
    if (RESERVED_TERMS.indexOf(key) !== -1) add('error', `"${key}" is a reserved query variable — the front end will 404 or fall through to the home page.`, 'key', 'prefixKey', 'Add a prefix');
    else if (!/^[a-z0-9]{2,6}_/.test(key) && key.length <= 26) {
      const pfx = keyPrefix(a, key);
      add('recommendation', `Prefix the key (e.g. "${pfx}_${key}") so it cannot clash with another plugin or a query var.`, 'key', 'prefixKey', `Add "${pfx}_"`);
    }
  }
  if (!e.objectTypes.length) add('warning', 'No post type attached — the taxonomy registers but never appears in the admin. Pass it in the post type\'s taxonomies argument, or pick a type above.', 'types');
  if (!tx.showInRest) add('warning', 'show_in_rest is off, so the term panel will not appear in the block editor sidebar.', 'rest', 'enableRest', 'Turn on REST');
  if (a.queryVarMode === 'custom' && RESERVED_TERMS.indexOf(slugify(a.queryVarString)) !== -1) add('error', 'That query_var is a reserved WordPress query variable and will break the front end.', 'rewrite');
  if (e.rewriteOn && a.rewriteSlug && RESERVED_TERMS.indexOf(slugify(a.rewriteSlug)) !== -1) add('warning', 'The rewrite slug is a reserved term — term archives will not resolve correctly.', 'rewrite');
  if (a.hierarchicalUrls && !tx.hierarchical) add('warning', 'Hierarchical URLs are on but the taxonomy is flat, so nested paths will never be generated.', 'rewrite');
  if (tx.hierarchical && a.countCallback === 'generic') add('recommendation', 'The generic count callback counts unpublished objects too — usually only wanted for attachments.', 'misc');
  if (!tx.public && a.showUi === 'inherit') add('recommendation', 'This taxonomy is private, so no admin UI is generated. Set show_ui to true if editors still need the screen.', 'visibility');
  if (a.defaultTermName && !tx.hierarchical) add('recommendation', 'Default terms are usually reserved for category-style taxonomies.', 'defaultTerm');
  if (!tx.showAdminColumn) add('recommendation', 'Turning on the admin column makes terms visible and filterable in the posts list.', 'behaviour');
  if (a.priority === '10' && e.objectTypes.length) add('recommendation', 'Register at init priority 0 if the post type rewrite needs to include this taxonomy slug.', 'misc');
  return out;
}

export function freshProject(): Taxonomy {
  return {
    singular: 'Genre', plural: 'Genres', key: 'genre', keyEdited: false, pluralEdited: false,
    description: '', public: true, hierarchical: true, showInRest: true, showAdminColumn: true,
    objectTypes: ['post'], customTypes: [],
    labelOverrides: {}, outputAllLabels: false,
    adv: {
      showUi: 'inherit', showInMenu: 'inherit', showInNavMenus: 'inherit', publiclyQueryable: 'inherit', showTagcloud: 'inherit', showInQuickEdit: 'inherit',
      restBase: '', restNamespace: '', restController: '',
      rewriteMode: 'on', rewriteSlug: '', withFront: true, hierarchicalUrls: false,
      queryVarMode: 'default', queryVarString: '',
      manageTerms: '', editTerms: '', deleteTerms: '', assignTerms: '',
      defaultTermName: '', defaultTermSlug: '', defaultTermDescription: '',
      metaBox: 'default', countCallback: 'default', sort: 'inherit', priority: '0',
      fnPrefix: 'mytheme', textDomain: 'textdomain',
    },
  };
}

export function applyFix(tx: Taxonomy, kind: string): Taxonomy {
  const p: Taxonomy = JSON.parse(JSON.stringify(tx));
  if (kind === 'truncateKey') { p.key = p.key.slice(0, 32); p.keyEdited = true; }
  if (kind === 'sanitizeKey') { p.key = slugify(p.key, 32); p.keyEdited = true; }
  if (kind === 'prefixKey') { p.key = slugify(keyPrefix(p.adv, p.key) + '_' + p.key, 32); p.keyEdited = true; }
  if (kind === 'enableRest') p.showInRest = true;
  return p;
}
