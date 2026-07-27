import { escPhp, slugify as baseSlugify, withCredit, type ValidationIssue } from '../lib/codegen';

export type OutputMode = 'snippet' | 'functions' | 'plugin';
export type DashboardSource = 'static' | 'query' | 'remote' | 'option';
export type DashboardContext = 'normal' | 'side' | 'column3' | 'column4';
export type DashboardPriority = 'high' | 'core' | 'default' | 'low';

export interface DashboardWidget {
  prefix: string;
  textDomain: string;
  codeStyle: 'procedural' | 'class';
  id: string;
  title: string;
  capability: string;
  context: DashboardContext;
  priority: DashboardPriority;
  source: DashboardSource;
  body: string;
  postType: string;
  count: string;
  postStatus: string;
  endpoint: string;
  cacheMinutes: string;
  capGate: boolean;
  configCallback: boolean;
  forceTop: boolean;
  network: boolean;
  removeWidgets: string[];
}

export const CAPS: [string, string][] = [
  ['manage_options', 'manage_options — admins'],
  ['edit_others_posts', 'edit_others_posts — editors'],
  ['edit_posts', 'edit_posts — contributors and up'],
  ['publish_posts', 'publish_posts — authors and up'],
  ['read', 'read — every logged-in user'],
];

export const CORE_WIDGETS: [string, string, string][] = [
  ['dashboard_activity', 'Activity', 'normal'],
  ['dashboard_right_now', 'At a Glance', 'normal'],
  ['dashboard_quick_press', 'Quick Draft', 'side'],
  ['dashboard_primary', 'WordPress Events and News', 'side'],
  ['dashboard_site_health', 'Site Health Status', 'normal'],
  ['dashboard_php_nag', 'PHP Update Required', 'normal'],
];

export const SOURCES: [DashboardSource, string][] = [
  ['static', 'Static copy'], ['query', 'Recent posts'], ['remote', 'Remote stats'], ['option', 'Saved option'],
];

export const SOURCE_NOTES: Record<DashboardSource, string> = {
  static: 'One escaped paragraph. The right answer more often than it looks — a widget that says one true thing beats a chart nobody reads.',
  query: 'get_posts() with edit links and dates. Drafts and pending posts are the two lists clients actually want.',
  remote: 'wp_remote_get() behind a transient, with a timeout and both failure branches handled.',
  option: 'Reads a saved option so the Configure form can drive the content.',
};

function fnSlug(s: string): string {
  return baseSlugify(s).replace(/-/g, '_');
}
function pascal(s: string): string {
  return String(s || '').split(/[^A-Za-z0-9]+/).filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('_');
}
function indent(text: string, depth: number): string {
  const pad = '\t'.repeat(depth);
  return text.split('\n').map((l) => (l ? pad + l : '')).join('\n');
}
function aligned(pairs: [string, string][]): string {
  const w = pairs.reduce((m, p) => Math.max(m, p[0].length), 0);
  return pairs.map((p) => "'" + p[0] + "'" + ' '.repeat(w - p[0].length) + ' => ' + p[1] + ',').join('\n');
}

export interface DerivedWidget {
  pre: string;
  td: string;
  id: string;
  cls: string;
  cap: string;
  isClass: boolean;
  source: DashboardSource;
}

export function derive(dw: DashboardWidget): DerivedWidget {
  const pre = fnSlug(dw.prefix) || 'acme';
  return {
    pre,
    td: baseSlugify(dw.textDomain) || pre.replace(/_/g, '-'),
    id: fnSlug(dw.id) || pre + '_widget',
    cls: (pascal(dw.prefix || 'Acme') || 'Acme') + '_Dashboard_Widget',
    cap: dw.capability || 'edit_posts',
    isClass: dw.codeStyle === 'class',
    source: dw.source || 'static',
  };
}

export function placementNote(dw: DashboardWidget): string {
  return (dw.context === 'side' ? 'Right column' : dw.context === 'normal' ? 'Left column' : dw.context) + ', ' + dw.priority + " priority — until a user drags it somewhere else, which their profile then remembers.";
}

interface CodeBlock {
  name: string;
  params: string;
  hook?: string;
  doc: string;
  body: string;
}

export function buildCode(dw: DashboardWidget, mode: OutputMode): string {
  const d = derive(dw);
  const pre = d.pre, td = d.td, isClass = d.isClass;
  const t = (s: string) => "__( '" + escPhp(s) + "', '" + td + "' )";
  const cb = (m: string) => (isClass ? "array( $this, '" + m + "' )" : "'" + pre + '_' + m + "'");
  const blocks: CodeBlock[] = [];
  const optName = pre + '_dashboard_options';

  let setup = '';
  if (dw.capGate) setup += "if ( ! current_user_can( '" + escPhp(d.cap) + "' ) ) {\n\treturn;\n}\n\n";
  const addArgs = ["'" + escPhp(d.id) + "'", t(dw.title || 'Dashboard'), cb('render')];
  if (dw.configCallback) addArgs.push(cb('configure'));
  else if (dw.context !== 'normal' || dw.priority !== 'core') addArgs.push('null');
  if (dw.context !== 'normal' || dw.priority !== 'core') {
    addArgs.push('array()');
    addArgs.push("'" + dw.context + "'");
    addArgs.push("'" + dw.priority + "'");
  }
  setup += 'wp_add_dashboard_widget(\n' + indent(addArgs.join(',\n'), 1) + '\n);';
  const removals = (dw.removeWidgets || []).map((id) => {
    const meta = CORE_WIDGETS.filter((c) => c[0] === id)[0];
    return "remove_meta_box( '" + id + "', 'dashboard', '" + (meta ? meta[2] : 'normal') + "' );";
  });
  if (removals.length) setup += '\n\n// Clear the core boxes the client does not use.\n' + removals.join('\n');
  if (dw.forceTop) {
    setup +=
      "\n\n// Force this widget to the top for every user, ignoring their own drag order.\nglobal $wp_meta_boxes;\n$widget = $wp_meta_boxes['dashboard']['" + dw.context + "']['" + dw.priority + "'];\n$mine   = array( '" + escPhp(d.id) + "' => $widget['" + escPhp(d.id) + "'] );\nunset( $widget['" + escPhp(d.id) + "'] );\n$wp_meta_boxes['dashboard']['" + dw.context + "']['" + dw.priority + "'] = array_merge( $mine, $widget );";
  }
  blocks.push({ name: 'setup', params: '', hook: dw.network ? 'wp_network_dashboard_setup' : 'wp_dashboard_setup', doc: '/**\n * Register the dashboard widget.\n */\n', body: setup });

  let render = '';
  if (d.source === 'static') {
    render = "echo '<p>' . esc_html__( '" + escPhp(dw.body || 'Nothing to report.') + "', '" + td + "' ) . '</p>';";
  } else if (d.source === 'query') {
    render =
      '$posts = get_posts(\n' +
      indent(
        'array(\n' +
          indent(
            aligned([
              ['post_type', "'" + escPhp(baseSlugify(dw.postType) || 'post') + "'"],
              ['post_status', "'" + (dw.postStatus || 'publish') + "'"],
              ['numberposts', String(parseInt(dw.count, 10) || 5)],
              ['orderby', "'date'"],
              ['order', "'DESC'"],
              ['suppress_filters', 'false'],
            ]),
            1
          ) +
          '\n)',
        1
      ) +
      '\n);\n\nif ( ! $posts ) {\n\techo \'<p>\' . esc_html__( \'Nothing here yet.\', \'' +
      td +
      "' ) . '</p>';\n\treturn;\n}\n\necho '<ul>';\n\nforeach ( $posts as $post ) {\n\tprintf(\n\t\t'<li><a href=\"%1$s\">%2$s</a> <span class=\"post-date\">%3$s</span></li>',\n\t\tesc_url( get_edit_post_link( $post->ID ) ),\n\t\tesc_html( get_the_title( $post ) ),\n\t\tesc_html( get_the_date( '', $post ) )\n\t);\n}\n\necho '</ul>';";
  } else if (d.source === 'remote') {
    const mins = parseInt(dw.cacheMinutes, 10) || 15;
    render =
      "$cache_key = '" + pre + "_dashboard_stats';\n$stats     = get_transient( $cache_key );\n\nif ( false === $stats ) {\n\t$response = wp_remote_get(\n" +
      indent("'" + escPhp(dw.endpoint || 'https://api.example.com/stats') + "',\narray(\n\t'timeout' => 10,\n)", 2) +
      '\n\t);\n\n\tif ( is_wp_error( $response ) || 200 !== wp_remote_retrieve_response_code( $response ) ) {\n\t\techo \'<p>\' . esc_html__( \'Stats are unavailable right now.\', \'' +
      td +
      "' ) . '</p>';\n\t\treturn;\n\t}\n\n\t$stats = json_decode( wp_remote_retrieve_body( $response ), true );\n\tset_transient( $cache_key, $stats, " +
      mins +
      " * MINUTE_IN_SECONDS );\n}\n\nif ( ! is_array( $stats ) ) {\n\techo '<p>' . esc_html__( 'Unexpected response.', '" +
      td +
      "' ) . '</p>';\n\treturn;\n}\n\necho '<ul>';\n\nforeach ( $stats as $label => $value ) {\n\tprintf(\n\t\t'<li><strong>%1$s</strong> %2$s</li>',\n\t\tesc_html( $value ),\n\t\tesc_html( $label )\n\t);\n}\n\necho '</ul>';";
  } else {
    render = "$options = (array) get_option( '" + optName + "', array() );\n\nprintf(\n\t'<p>%s</p>',\n\tesc_html( isset( $options['message'] ) ? $options['message'] : __( 'Nothing configured yet.', '" + td + "' ) )\n);";
  }
  blocks.push({ name: 'render', params: '', doc: '/**\n * Print the widget body.\n */\n', body: render });

  if (dw.configCallback) {
    blocks.push({
      name: 'configure',
      params: '',
      doc: '/**\n * The form behind the Configure link.\n */\n',
      body:
        "$options = (array) get_option( '" +
        optName +
        "', array() );\n\nif ( isset( $_POST['" +
        pre +
        "_config_nonce'] ) && wp_verify_nonce( sanitize_key( $_POST['" +
        pre +
        "_config_nonce'] ), '" +
        pre +
        "_save_config' ) ) {\n\t$options['message'] = isset( $_POST['" +
        pre +
        "_message'] ) ? sanitize_text_field( wp_unslash( $_POST['" +
        pre +
        "_message'] ) ) : '';\n\tupdate_option( '" +
        optName +
        "', $options );\n}\n\nwp_nonce_field( '" +
        pre +
        "_save_config', '" +
        pre +
        "_config_nonce' );\n\nprintf(\n\t'<p><label for=\"" +
        pre +
        '_message">%1$s</label><br /><input type="text" class="widefat" id="' +
        pre +
        '_message" name="' +
        pre +
        "_message\" value=\"%2$s\" /></p>',\n\tesc_html__( 'Message', '" +
        td +
        "' ),\n\tesc_attr( isset( $options['message'] ) ? $options['message'] : '' )\n);",
    });
  }

  let out = '';
  if (mode === 'plugin') {
    out += '<?php\n/**\n * Plugin Name:       ' + (dw.title || 'Dashboard widget') + '\n * Description:       Adds the ' + (dw.title || 'dashboard') + ' widget to the admin dashboard.\n * Version:           1.0.0\n * Requires PHP:      7.4\n * Text Domain:       ' + td + "\n */\n\ndefined( 'ABSPATH' ) || exit;\n\n";
  } else if (mode === 'functions') {
    out += "<?php\n// Add to your theme's functions.php.\n\n";
  }

  if (isClass) {
    out += 'final class ' + d.cls + ' {\n\n';
    const hookLines = blocks.filter((b) => b.hook).map((b) => "add_action( '" + b.hook + "', array( $this, '" + b.name + "' ) );");
    out += '\t/**\n\t * Wire the class into WordPress.\n\t */\n\tpublic function hooks() {\n' + indent(hookLines.join('\n'), 2) + '\n\t}\n\n';
    blocks.forEach((b) => {
      out += indent(b.doc, 1) + '\tpublic function ' + b.name + (b.params ? '( ' + b.params + ' )' : '()') + ' {\n' + indent(b.body, 2) + '\n\t}\n\n';
    });
    out += '}\n\n( new ' + d.cls + '() )->hooks();\n';
  } else {
    out += blocks
      .map((b) => {
        let s = b.doc + 'function ' + pre + '_' + b.name + (b.params ? '( ' + b.params + ' )' : '()') + ' {\n' + indent(b.body, 1) + '\n}\n';
        if (b.hook) s += "add_action( '" + b.hook + "', '" + pre + '_' + b.name + "' );\n";
        return s;
      })
      .join('\n');
  }
  return withCredit(out);
}

export function freshProject(): DashboardWidget {
  return {
    prefix: 'acme', textDomain: 'acme', codeStyle: 'procedural',
    id: 'acme_overview', title: 'Acme Overview', capability: 'edit_posts',
    context: 'normal', priority: 'high',
    source: 'query', body: 'Everything is running. Nothing needs your attention today.',
    postType: 'post', count: '5', postStatus: 'draft',
    endpoint: 'https://api.example.com/stats', cacheMinutes: '15',
    capGate: true, configCallback: false, forceTop: false, network: false,
    removeWidgets: ['dashboard_primary', 'dashboard_quick_press'],
  };
}

export function validate(dw: DashboardWidget): ValidationIssue[] {
  const d = derive(dw);
  const out: ValidationIssue[] = [];
  const add = (severity: ValidationIssue['severity'], message: string, targetId?: string, fix?: string, fixLabel?: string) => out.push({ severity, message, targetId, fix, fixLabel });

  if (!String(dw.title || '').trim()) add('error', 'A title is required — the widget renders with an empty header otherwise.', 'title');
  if (!String(dw.id || '').trim()) add('error', 'A widget id is required. It is the handle remove_meta_box() and user hidden-box preferences both use.', 'id');
  else if (fnSlug(dw.id) !== String(dw.id).trim()) add('warning', '"' + dw.id + '" is not a safe id. Stick to lowercase and underscores so the CSS id and the meta box key match.', 'id', 'fixId', 'Use ' + fnSlug(dw.id));
  if (fnSlug(dw.id).indexOf(d.pre) !== 0) add('warning', 'The id is not prefixed with "' + d.pre + '". Dashboard ids are global; a clash silently replaces someone else’s widget.', 'id', 'prefixId', 'Prefix it');
  if (d.cap === 'read') add('warning', 'A capability of read shows this to every subscriber, including on membership sites where that is everyone.', 'capability', 'setEditPosts', 'Use edit_posts');
  if (!dw.capGate) add('warning', 'No current_user_can() gate, so the widget registers for every role that can see the dashboard.', 'capGate', 'addGate', 'Add the check');
  if (d.source === 'remote') {
    if (!/^https?:\/\//.test(String(dw.endpoint || ''))) add('error', 'The endpoint needs a full https:// URL — wp_remote_get() will not guess.', 'endpoint');
    const mins = parseInt(dw.cacheMinutes, 10);
    if (!mins) add('error', 'Set a cache window. An uncached HTTP request in a dashboard widget makes every admin page load wait on someone else’s server.', 'cacheMinutes');
    else if (mins < 5) add('warning', 'A ' + mins + '-minute cache still means a blocking request several times an hour for every admin who loads the dashboard.', 'cacheMinutes');
  }
  if (d.source === 'query') {
    const n = parseInt(dw.count, 10);
    if (!n) add('warning', 'No post count set, so get_posts() falls back to its own default rather than yours.', 'count');
    else if (n > 20) add('recommendation', n + ' rows is more than a dashboard box can show without scrolling. Five to ten reads better.', 'count');
    if (dw.postStatus === 'draft' || dw.postStatus === 'pending') add('recommendation', 'Listing ' + dw.postStatus + ' posts is genuinely useful — pair it with edit links, which the generated code already does.', 'postStatus');
  }
  if (d.source === 'option' && !dw.configCallback) add('warning', 'The body reads a saved option but there is no Configure form to set it.', 'configCallback', 'addConfig', 'Add the config form');
  if (dw.configCallback && d.source !== 'option') add('recommendation', 'The Configure form saves a message the current content source never reads. Switch the source to "Saved option" or drop the form.', 'source');
  if (dw.forceTop) add('warning', 'Forcing the widget to the top rewrites $wp_meta_boxes on every dashboard load and overrides each user’s own arrangement. Clients ask for it; a week later they ask why they cannot move it.', 'forceTop');
  if ((dw.removeWidgets || []).indexOf('dashboard_activity') >= 0) add('recommendation', 'Removing Activity also removes the only place a client sees scheduled and recently published posts.', 'removeWidgets');
  if ((dw.removeWidgets || []).indexOf('dashboard_site_health') >= 0) add('recommendation', 'Hiding Site Health hides the warnings you will be asked about later. Consider leaving it for admins only.', 'removeWidgets');
  if (dw.context !== 'normal' || dw.priority !== 'core') add('recommendation', 'The context and priority arguments need WordPress 5.6 or newer. Below that they are ignored and the widget lands in the normal column.', 'context');
  if (dw.network) add('recommendation', 'wp_network_dashboard_setup only fires on the network admin dashboard. Register on both hooks if the widget should appear in each site too.', 'network');
  return out;
}

export function applyFix(dw: DashboardWidget, kind: string): DashboardWidget {
  const p: DashboardWidget = JSON.parse(JSON.stringify(dw));
  if (kind === 'fixId') p.id = fnSlug(p.id);
  if (kind === 'prefixId') p.id = fnSlug(p.prefix) + '_' + fnSlug(p.id).replace(new RegExp('^' + fnSlug(p.prefix) + '_?'), '');
  if (kind === 'setEditPosts') p.capability = 'edit_posts';
  if (kind === 'addGate') p.capGate = true;
  if (kind === 'addConfig') p.configCallback = true;
  return p;
}
