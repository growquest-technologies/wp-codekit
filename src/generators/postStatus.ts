import { escPhp, withCredit, type ValidationIssue } from '../lib/codegen';

export type OutputMode = 'snippet' | 'functions' | 'plugin';

export interface PostStatus {
  prefix: string;
  textDomain: string;
  label: string;
  slug: string;
  countLabel: string;
  postTypes: string[];
  customPostType: string;
  isPublic: boolean;
  internal: boolean;
  excludeFromSearch: boolean;
  showInAllList: boolean;
  showInStatusList: boolean;
  dateFloating: boolean;
  displayState: boolean;
  editorDropdown: boolean;
  adminFilter: boolean;
}

export const POST_TYPES = ['post', 'page', 'product'];
export const CORE_STATUSES = ['publish', 'draft', 'pending', 'private', 'future', 'trash', 'auto-draft', 'inherit'];
const OPEN_SCRIPT = '<' + 'script>';
const CLOSE_SCRIPT = '</' + 'script>';

function fnSlug(s: string): string {
  return String(s || '').toLowerCase().trim().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
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

export interface Derived {
  pre: string;
  td: string;
  slug: string;
  types: string[];
}

export function derive(ps: PostStatus): Derived {
  const pre = fnSlug(ps.prefix) || 'acme';
  const types = (ps.postTypes || []).slice();
  String(ps.customPostType || '').split(',').forEach((t) => {
    const s = slugify(t);
    if (s && types.indexOf(s) === -1) types.push(s);
  });
  return {
    pre,
    td: slugify(ps.textDomain) || pre.replace(/_/g, '-'),
    slug: slugify(ps.slug) || 'in-review',
    types,
  };
}

interface Block {
  name: string;
  hook?: string;
  filter?: string;
  hookArgs?: number;
  params?: string;
  doc: string;
  body: string;
}

export function buildCode(ps: PostStatus, mode: OutputMode): string {
  const d = derive(ps);
  const pre = d.pre;
  const td = d.td;
  const label = ps.label || 'In review';
  const countLabel = ps.countLabel || label + ' <span class="count">(%s)</span>';
  const blocks: Block[] = [];

  const pairs: [string, string][] = [
    ['label', "_x( '" + escPhp(label) + "', 'post status', '" + td + "' )"],
    ['label_count', "_n_noop(\n\t'" + escPhp(countLabel) + "',\n\t'" + escPhp(countLabel) + "',\n\t'" + td + "'\n)"],
    ['public', ps.isPublic ? 'true' : 'false'],
    ['internal', ps.internal ? 'true' : 'false'],
    ['exclude_from_search', ps.excludeFromSearch ? 'true' : 'false'],
    ['show_in_admin_all_list', ps.showInAllList ? 'true' : 'false'],
    ['show_in_admin_status_list', ps.showInStatusList ? 'true' : 'false'],
    ['date_floating', ps.dateFloating ? 'true' : 'false'],
  ];
  if (d.types.length) pairs.push(['post_type', 'array( ' + d.types.map((t) => "'" + escPhp(t) + "'").join(', ') + ' )']);
  blocks.push({
    name: 'register_status', hook: 'init',
    doc: '/**\n * Register the ' + label + ' status.\n */\n',
    body: "register_post_status(\n\t'" + escPhp(d.slug) + "',\n\tarray(\n" + indent(aligned(pairs), 2) + '\n\t)\n);',
  });

  if (ps.displayState) {
    blocks.push({
      name: 'display_state', params: '$states, $post', hookArgs: 2, filter: 'display_post_states',
      doc: '/**\n * Show the status beside the title in the posts list.\n *\n * @param string[] $states Existing state labels.\n * @param WP_Post  $post   The post.\n * @return string[]\n */\n',
      body: "if ( '" + escPhp(d.slug) + "' === get_post_status( $post ) ) {\n\t$states['" + escPhp(d.slug) + "'] = _x( '" + escPhp(label) + "', 'post status', '" + td + "' );\n}\n\nreturn $states;",
    });
  }

  if (ps.editorDropdown) {
    const typeCheck = d.types.length ? 'in_array( $post->post_type, array( ' + d.types.map((t) => "'" + escPhp(t) + "'").join(', ') + " ), true )" : 'true';
    blocks.push({
      name: 'submitbox_status', params: '$post', hook: 'post_submitbox_misc_actions',
      doc: '/**\n * Add the status to the classic editor dropdown.\n *\n * The block editor ignores PHP-registered statuses, so this only\n * affects the classic editor and Quick Edit.\n *\n * @param WP_Post $post The post being edited.\n */\n',
      body: 'if ( ! ' + typeCheck + " ) {\n\treturn;\n}\n\n$label  = _x( '" + escPhp(label) + "', 'post status', '" + td + "' );\n$option = sprintf(\n\t'<option value=\"%1$s\"%2$s>%3$s</option>',\n\tesc_attr( '" + escPhp(d.slug) + "' ),\n\tselected( get_post_status( $post ), '" + escPhp(d.slug) + "', false ),\n\tesc_html( $label )\n);\n?>\n" + OPEN_SCRIPT + "\njQuery( function ( $ ) {\n\tvar option = <?php echo wp_json_encode( $option ); ?>;\n\tvar label  = <?php echo wp_json_encode( $label ); ?>;\n\n\t$( 'select#post_status' ).append( option );\n\n\t<?php if ( get_post_status( $post ) === '" + escPhp(d.slug) + "' ) : ?>\n\t\t$( '#post-status-display' ).text( label );\n\t<?php endif; ?>\n} );\n" + CLOSE_SCRIPT + '\n<?php',
    });
  }

  if (ps.adminFilter) {
    blocks.push({
      name: 'default_query', params: '$query', hook: 'pre_get_posts',
      doc: '/**\n * Include the status when the posts list shows "All".\n *\n * @param WP_Query $query The query, by reference.\n */\n',
      body: "if ( ! is_admin() || ! $query->is_main_query() ) {\n\treturn;\n}\n\n$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;\n\nif ( ! $screen || 'edit' !== $screen->base ) {\n\treturn;\n}\n\nif ( ! empty( $_GET['post_status'] ) ) {\n\treturn;\n}\n\n$statuses = (array) $query->get( 'post_status' );\n\nif ( $statuses && ! in_array( '" + escPhp(d.slug) + "', $statuses, true ) ) {\n\t$statuses[] = '" + escPhp(d.slug) + "';\n\t$query->set( 'post_status', $statuses );\n}",
    });
  }

  let out = '';
  if (mode === 'plugin') {
    out += '<?php\n/**\n * Plugin Name:       ' + label + ' post status\n * Description:       Registers the ' + d.slug + ' status' + (d.types.length ? ' for ' + d.types.join(', ') : '') + '.\n * Version:           1.0.0\n * Requires PHP:      7.4\n * Text Domain:       ' + td + "\n */\n\ndefined( 'ABSPATH' ) || exit;\n\n";
  } else if (mode === 'functions') {
    out += "<?php\n// Add to your theme's functions.php.\n\n";
  }
  out += blocks.map((b) => {
    let s = b.doc + 'function ' + pre + '_' + b.name + (b.params ? '( ' + b.params + ' )' : '()') + ' {\n' + indent(b.body, 1) + '\n}\n';
    if (b.filter) s += "add_filter( '" + b.filter + "', '" + pre + '_' + b.name + "'" + (b.hookArgs ? ', 10, ' + b.hookArgs : '') + ' );\n';
    else if (b.hook) s += "add_action( '" + b.hook + "', '" + pre + '_' + b.name + "' );\n";
    return s;
  }).join('\n');
  return withCredit(out);
}

export function validate(ps: PostStatus): ValidationIssue[] {
  const d = derive(ps);
  const out: ValidationIssue[] = [];
  const add = (severity: ValidationIssue['severity'], message: string, fix?: string, fixLabel?: string) => out.push({ severity, message, fix, fixLabel });
  if (!String(ps.label || '').trim()) add('error', 'A label is required — it is what the editor and the posts list show.');
  if (!String(ps.slug || '').trim()) add('error', 'A status slug is required. It is stored in the post_status column on every post that uses it.');
  else if (String(ps.slug).trim() !== d.slug) add('error', `"${ps.slug}" is not a safe slug. Lowercase with dashes, since it goes straight into the database and the URL.`, 'fixSlug', `Use ${d.slug}`);
  if (CORE_STATUSES.indexOf(d.slug) >= 0) add('error', `"${d.slug}" is a core status. Registering it again overrides core behaviour across the whole site.`);
  if (d.slug.length > 20) add('error', `post_status is a 20-character column. "${d.slug}" is ${d.slug.length} characters and will be truncated.`);
  if (String(ps.countLabel || '').indexOf('%s') === -1) add('warning', 'label_count has no %s, so the posts list link will show the label with no number.', 'fixCount', 'Add the count');
  if (!d.types.length) add('warning', 'No post type selected, so the status is registered globally. Harmless, but the editor dropdown and filters will offer it everywhere.', 'addPost', 'Limit to post');
  if (ps.isPublic && ps.internal) add('error', 'public and internal contradict each other. internal statuses are for core plumbing like auto-draft and inherit.', 'notInternal', 'Turn off internal');
  if (ps.isPublic && !ps.excludeFromSearch) add('warning', 'A public status that is not excluded from search means unfinished posts show up in site search and in feeds.', 'excludeSearch', 'Exclude from search');
  if (!ps.isPublic && !ps.showInAllList && !ps.showInStatusList) add('error', 'The status is not public and appears in neither admin list, so nobody will ever see a post in it.', 'showLists', 'Show in both lists');
  if (!ps.showInStatusList) add('warning', 'Without show_in_admin_status_list there is no filter link at the top of the posts list — the fastest way for a client to lose their in-progress work.', 'showStatus', 'Add the filter link');
  if (!ps.showInAllList) add('recommendation', 'show_in_admin_all_list false hides these posts from the "All" view. Deliberate for archived content, confusing for a review step.');
  if (!ps.displayState) add('warning', 'Without the display_post_states filter, a post in this status looks identical to a published one in the posts list.', 'addDisplay', 'Add the label');
  if (!ps.editorDropdown) add('warning', 'Nothing adds this status to the editor\'s Status dropdown, so an author cannot actually set it.', 'addDropdown', 'Add the dropdown');
  if (ps.editorDropdown) add('recommendation', 'The dropdown snippet is classic-editor only and depends on jQuery. In the block editor the status can still be set programmatically or by Quick Edit.');
  if (ps.dateFloating) add('recommendation', 'date_floating keeps the post date unset until publish — right for a draft-like status, wrong for anything users see dated.');
  if (ps.adminFilter && ps.showInAllList) add('recommendation', 'The pre_get_posts helper only matters when show_in_admin_all_list is off. With it on, core already includes the status.');
  if (d.td !== d.pre.replace(/_/g, '-')) add('recommendation', 'The text domain must match the plugin or theme folder, or the label never translates.');
  return out;
}

export function freshProject(): PostStatus {
  return {
    prefix: 'acme', textDomain: 'acme',
    label: 'In review', slug: 'in-review', countLabel: 'In review <span class="count">(%s)</span>',
    postTypes: ['post'], customPostType: '',
    isPublic: false, internal: false, excludeFromSearch: true,
    showInAllList: true, showInStatusList: true, dateFloating: true,
    displayState: true, editorDropdown: true, adminFilter: false,
  };
}

export function applyFix(ps: PostStatus, kind: string): PostStatus {
  const p: PostStatus = JSON.parse(JSON.stringify(ps));
  if (kind === 'fixSlug') p.slug = slugify(p.slug);
  if (kind === 'fixCount') p.countLabel = (p.label || 'In review') + ' <span class="count">(%s)</span>';
  if (kind === 'addPost') { p.postTypes = p.postTypes || []; if (p.postTypes.indexOf('post') === -1) p.postTypes.push('post'); }
  if (kind === 'notInternal') p.internal = false;
  if (kind === 'excludeSearch') p.excludeFromSearch = true;
  if (kind === 'showLists') { p.showInAllList = true; p.showInStatusList = true; }
  if (kind === 'showStatus') p.showInStatusList = true;
  if (kind === 'addDisplay') p.displayState = true;
  if (kind === 'addDropdown') p.editorDropdown = true;
  return p;
}
