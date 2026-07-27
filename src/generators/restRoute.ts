import { escPhp, withCredit, type ValidationIssue } from '../lib/codegen';

export type OutputMode = 'snippet' | 'functions' | 'plugin';
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type Permission = 'public' | 'logged_in' | 'capability' | 'edit_posts' | 'manage_options';
export type HandlerStyle = 'posts' | 'option' | 'stub';
export type ArgType = 'string' | 'integer' | 'number' | 'boolean' | 'array' | 'object';
export type ArgFormat = '' | 'email' | 'uri' | 'date-time' | 'ip' | 'enum' | 'range';

export const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
export const PERMISSIONS: [Permission, string][] = [
  ['public', 'Public — anyone, including logged-out visitors'],
  ['logged_in', 'Any logged-in user'],
  ['capability', 'Users with a capability'],
  ['edit_posts', 'Editors — edit_posts'],
  ['manage_options', 'Administrators — manage_options'],
];
export const PERMISSION_NOTES: Record<Permission, string> = {
  public: 'Readable by anyone and cached by proxies. Never expose private data or write operations here.',
  logged_in: 'is_user_logged_in() only — combine with a capability if the route changes anything.',
  capability: 'current_user_can() with the capability you name below.',
  edit_posts: 'The usual bar for content endpoints an editor should reach.',
  manage_options: 'Site-settings level. Correct for anything that writes to wp_options.',
};

export interface RestArg {
  name: string;
  type: ArgType;
  format: ArgFormat;
  extra: string;
  def: string;
  required: boolean;
  description: string;
}

export interface RestRoute {
  namespace: string;
  route: string;
  fnPrefix: string;
  methods: HttpMethod[];
  permission: Permission;
  capability: string;
  handlerStyle: HandlerStyle;
  args: RestArg[];
  registerField: boolean;
  cacheHeaders: boolean;
}

function fnSlug(s: string): string {
  return String(s || '').toLowerCase().trim().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
}
export function argSlug(s: string): string {
  return String(s || '').toLowerCase().trim().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
}
function csv(s: string): string[] {
  return String(s || '').split(',').map((x) => x.trim()).filter(Boolean);
}
export function cleanRoute(r: string): string {
  let out = String(r || '').trim();
  if (!out) return '/';
  if (out[0] !== '/') out = '/' + out;
  return out.replace(/\/+$/, '') || '/';
}
function routeFnPart(r: string): string {
  return fnSlug(cleanRoute(r).replace(/\(\?P<[a-z_]+>[^)]*\)/gi, '').replace(/[^a-z0-9]+/gi, '_')) || 'route';
}
export function routeParams(r: string): string[] {
  const out: string[] = [];
  const re = /\(\?P<([a-z_]+)>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(String(r || ''))) !== null) out.push(m[1]);
  return out;
}

function sanitizeFor(a: RestArg): string | null {
  if (a.type === 'integer') return 'absint';
  if (a.type === 'number') return 'floatval';
  if (a.type === 'boolean') return 'rest_sanitize_boolean';
  if (a.format === 'email') return 'sanitize_email';
  if (a.format === 'uri') return 'esc_url_raw';
  if (a.type === 'array' || a.type === 'object') return null;
  return 'sanitize_text_field';
}
export { sanitizeFor };

function argSchema(a: RestArg): string[] {
  const rows: string[] = [];
  if (a.description) rows.push("'description'       => __( '" + escPhp(a.description) + "', 'textdomain' )");
  rows.push("'type'              => '" + a.type + "'");
  if (a.required) rows.push("'required'          => true");
  if (a.def !== '') {
    const numeric = a.type === 'integer' || a.type === 'number';
    const bool = a.type === 'boolean';
    rows.push("'default'           => " + (bool ? (a.def === 'true' ? 'true' : 'false') : numeric ? a.def : "'" + escPhp(a.def) + "'"));
  }
  if (a.format === 'enum') rows.push("'enum'              => array( " + csv(a.extra).map((c) => "'" + escPhp(c) + "'").join(', ') + ' )');
  else if (a.format === 'range') {
    const parts = csv(a.extra);
    if (parts[0]) rows.push("'minimum'           => " + parts[0]);
    if (parts[1]) rows.push("'maximum'           => " + parts[1]);
  } else if (a.format) rows.push("'format'            => '" + a.format + "'");
  const san = sanitizeFor(a);
  if (san) rows.push("'sanitize_callback' => '" + san + "'");
  rows.push("'validate_callback' => 'rest_validate_request_arg'");
  return rows;
}

function permissionBody(rt: RestRoute): string {
  if (rt.permission === 'public') return '\treturn true;';
  if (rt.permission === 'logged_in') return '\treturn is_user_logged_in();';
  const cap = rt.permission === 'capability' ? (rt.capability || 'edit_posts') : rt.permission;
  return "\tif ( current_user_can( '" + escPhp(cap) + "' ) ) {\n\t\treturn true;\n\t}\n\n\treturn new WP_Error(\n\t\t'rest_forbidden',\n\t\t__( 'You are not allowed to use this endpoint.', 'textdomain' ),\n\t\tarray( 'status' => rest_authorization_required_code() )\n\t);";
}

function handlerBody(rt: RestRoute, method: string): string {
  const params = rt.args.filter((a) => argSlug(a.name));
  let out = '';
  params.forEach((a) => {
    out += '\t$' + argSlug(a.name) + " = $request->get_param( '" + escPhp(argSlug(a.name)) + "' );\n";
  });
  routeParams(rt.route).forEach((p) => {
    out += '\t$' + p + " = $request->get_param( '" + p + "' );\n";
  });
  if (out) out += '\n';

  if (rt.handlerStyle === 'posts' && method === 'GET') {
    const perPage = params.filter((a) => argSlug(a.name) === 'per_page').length ? '$per_page' : '10';
    out += "\t$query = new WP_Query(\n\t\tarray(\n\t\t\t'post_type'      => 'post',\n\t\t\t'post_status'    => 'publish',\n\t\t\t'posts_per_page' => " + perPage + ",\n\t\t\t'no_found_rows'  => true,\n\t\t)\n\t);\n\n\t$items = array_map(\n\t\tstatic function ( $post ) {\n\t\t\treturn array(\n\t\t\t\t'id'    => $post->ID,\n\t\t\t\t'title' => get_the_title( $post ),\n\t\t\t\t'link'  => get_permalink( $post ),\n\t\t\t);\n\t\t},\n\t\t$query->posts\n\t);\n\n\treturn rest_ensure_response( $items );";
  } else if (rt.handlerStyle === 'option') {
    const optName = fnSlug(rt.fnPrefix) + '_settings';
    if (method === 'GET') out += "\treturn rest_ensure_response( get_option( '" + optName + "', array() ) );";
    else out += "\t$saved = update_option(\n\t\t'" + optName + "',\n\t\tarray(\n" + params.map((a) => "\t\t\t'" + argSlug(a.name) + "' => $" + argSlug(a.name) + ',').join('\n') + "\n\t\t)\n\t);\n\n\tif ( ! $saved ) {\n\t\treturn new WP_Error(\n\t\t\t'rest_not_saved',\n\t\t\t__( 'Nothing was saved.', 'textdomain' ),\n\t\t\tarray( 'status' => 500 )\n\t\t);\n\t}\n\n\treturn rest_ensure_response( array( 'saved' => true ) );";
  } else {
    out += "\t// Do the work here.\n\n\treturn rest_ensure_response( array( 'ok' => true ) );";
  }
  return out;
}

export function freshProject(): RestRoute {
  return {
    namespace: 'myplugin/v1', route: '/items', fnPrefix: 'myplugin',
    methods: ['GET'], permission: 'public', capability: 'edit_posts',
    handlerStyle: 'posts',
    args: [
      { name: 'per_page', type: 'integer', format: 'range', extra: '1, 50', def: '10', required: false, description: 'How many items to return.' },
      { name: 'search', type: 'string', format: '', extra: '', def: '', required: false, description: 'Optional search term.' },
    ],
    registerField: false, cacheHeaders: false,
  };
}

export function buildCode(rt: RestRoute, mode: OutputMode): string {
  const prefix = fnSlug(rt.fnPrefix) || 'myplugin';
  const ns = String(rt.namespace || 'myplugin/v1').trim();
  const route = cleanRoute(rt.route);
  const part = routeFnPart(rt.route);
  const registerFn = prefix + '_register_' + part + '_route';
  const permFn = prefix + '_' + part + '_permission';
  const methods = METHODS.filter((m) => rt.methods.indexOf(m) !== -1);
  const readable = methods.length === 1 && methods[0] === 'GET';
  const editable = methods.length > 0 && methods.every((m) => m !== 'GET');

  let out = '';
  if (mode === 'plugin') {
    out += "<?php\n/**\n * Plugin Name:       " + ns + " REST route\n * Description:       Registers the " + route + " endpoint.\n * Version:           1.0.0\n * Requires PHP:      7.4\n */\n\ndefined( 'ABSPATH' ) || exit;\n\n";
  } else if (mode === 'functions') {
    out += "<?php\n// Add to your theme's functions.php.\n\n";
  }

  out += '/**\n * Register the ' + route + ' endpoint.\n */\nfunction ' + registerFn + '() {\n';
  out += "\tregister_rest_route(\n\t\t'" + escPhp(ns) + "',\n\t\t'" + escPhp(route) + "',\n\t\tarray(\n";

  const groups: [string, string][] = readable
    ? [['GET', 'WP_REST_Server::READABLE']]
    : editable && methods.length === 1
      ? [[methods[0], "'" + methods[0] + "'"]]
      : methods.map((m) => [m, m === 'GET' ? 'WP_REST_Server::READABLE' : m === 'DELETE' ? 'WP_REST_Server::DELETABLE' : "'" + m + "'"]);

  groups.forEach((g) => {
    const cbName = prefix + '_' + part + '_' + g[0].toLowerCase();
    out += '\t\t\tarray(\n';
    out += "\t\t\t\t'methods'             => " + g[1] + ',\n';
    out += "\t\t\t\t'callback'            => '" + cbName + "',\n";
    out += "\t\t\t\t'permission_callback' => '" + permFn + "',\n";
    const relevant = rt.args.filter((a) => argSlug(a.name));
    if (relevant.length) {
      out += "\t\t\t\t'args'                => array(\n";
      relevant.forEach((a) => {
        out += "\t\t\t\t\t'" + escPhp(argSlug(a.name)) + "' => array(\n";
        argSchema(a).forEach((r) => { out += '\t\t\t\t\t\t' + r + ',\n'; });
        out += '\t\t\t\t\t),\n';
      });
      out += '\t\t\t\t),\n';
    }
    out += '\t\t\t),\n';
  });

  out += '\t\t)\n\t);\n}\n';
  out += "add_action( 'rest_api_init', '" + registerFn + "' );\n\n";

  out += '/**\n * Permission check for ' + route + '.\n *\n * @return true|WP_Error\n */\nfunction ' + permFn + '() {\n' + permissionBody(rt) + '\n}\n\n';

  groups.forEach((g) => {
    const cbName = prefix + '_' + part + '_' + g[0].toLowerCase();
    out += '/**\n * ' + g[0] + ' ' + route + '\n *\n * @param WP_REST_Request $request Request object.\n * @return WP_REST_Response|WP_Error\n */\nfunction ' + cbName + '( $request ) {\n' + handlerBody(rt, g[0]) + '\n}\n\n';
  });

  if (rt.registerField) {
    out += "/**\n * Expose an extra field on core post responses.\n */\nfunction " + prefix + "_register_rest_fields() {\n\tregister_rest_field(\n\t\t'post',\n\t\t'" + prefix + "_reading_time',\n\t\tarray(\n\t\t\t'get_callback' => static function ( $post ) {\n\t\t\t\treturn (int) ceil( str_word_count( wp_strip_all_tags( $post['content']['raw'] ?? '' ) ) / 200 );\n\t\t\t},\n\t\t\t'schema'       => array(\n\t\t\t\t'type'        => 'integer',\n\t\t\t\t'description' => __( 'Estimated reading time in minutes.', 'textdomain' ),\n\t\t\t\t'context'     => array( 'view', 'edit' ),\n\t\t\t),\n\t\t)\n\t);\n}\nadd_action( 'rest_api_init', '" + prefix + "_register_rest_fields' );\n\n";
  }
  if (rt.cacheHeaders) {
    out += "/**\n * Let proxies cache this public endpoint for a minute.\n */\nfunction " + prefix + '_' + part + "_cache_headers( $response ) {\n\t$response->header( 'Cache-Control', 'public, max-age=60' );\n\n\treturn $response;\n}\nadd_filter( 'rest_post_dispatch', '" + prefix + '_' + part + "_cache_headers' );\n\n";
  }
  return withCredit(out.replace(/\n+$/, '\n'));
}

export function validate(rt: RestRoute): ValidationIssue[] {
  const out: ValidationIssue[] = [];
  const add = (severity: ValidationIssue['severity'], message: string, targetId?: string, fix?: string, fixLabel?: string) => out.push({ severity, message, targetId, fix, fixLabel });
  const ns = String(rt.namespace || '').trim();
  if (!ns) add('error', 'A namespace is required — routes without one collide with every other plugin.', 'namespace');
  else {
    if (!/^[a-z0-9-]+\/v[0-9]+$/.test(ns)) add('warning', 'Convention is vendor/vN, for example "myplugin/v1". Versioning the namespace is what lets you change the response later.', 'namespace');
    if (ns.indexOf('wp/') === 0) add('error', 'The wp/ namespace belongs to core — use your own vendor prefix.', 'namespace');
  }
  if (!String(rt.route).trim()) add('error', 'A route is required.', 'route');
  else if (/\s/.test(rt.route)) add('error', 'Routes cannot contain spaces.', 'route');
  if (!rt.methods.length) add('error', 'Pick at least one HTTP method.');
  if (rt.methods.indexOf('GET') !== -1 && rt.methods.length > 1 && rt.permission === 'public') add('warning', 'This route accepts writes and is public — anyone on the internet can change data.');
  if (rt.permission === 'public' && rt.methods.some((m) => m !== 'GET')) add('error', 'A public permission callback on a write method is an open door. Require a capability.', undefined, 'requireCap', 'Require edit_posts');
  if (rt.permission === 'capability' && !rt.capability) add('error', 'Choose the capability to check.', 'capability');
  const names: string[] = [];
  rt.args.forEach((a, i) => {
    const n = argSlug(a.name);
    if (!n) { add('error', 'Argument ' + (i + 1) + ' has no name.'); return; }
    if (names.indexOf(n) !== -1) add('error', 'Argument "' + n + '" is declared twice.');
    names.push(n);
    if (a.format === 'enum' && !csv(a.extra).length) add('error', 'Argument "' + n + '" is an enum with no values.');
    if (a.format === 'range' && !csv(a.extra).length) add('error', 'Argument "' + n + '" uses min/max but has no values — enter them comma separated.');
    if (a.required && a.def !== '') add('warning', 'Argument "' + n + '" is required and has a default — the default can never apply.');
    if ((a.type === 'array' || a.type === 'object') && !a.description) add('recommendation', 'Complex types like "' + n + '" benefit from a description and an items schema in the docs.');
  });
  const params = routeParams(rt.route);
  params.forEach((p) => {
    if (names.indexOf(p) === -1) add('recommendation', 'Route captures (?P<' + p + '>…) but there is no matching arg entry, so it is neither sanitised nor documented.');
  });
  if (String(rt.route).indexOf('(?P<') === -1 && /\/\{[a-z_]+\}/i.test(rt.route)) add('error', 'WordPress routes use named regex groups, not {braces} — write (?P<id>[\\d]+) instead.', 'route');
  if (rt.cacheHeaders && rt.permission !== 'public') add('warning', 'Cache headers on an authenticated route can leak one user’s response to another through a shared proxy.');
  if (rt.methods.indexOf('PUT') !== -1 && rt.methods.indexOf('POST') === -1) add('recommendation', 'Most REST clients send POST. Accepting both POST and PUT avoids surprises.');
  if (!rt.args.length && rt.methods.some((m) => m !== 'GET')) add('recommendation', 'Write endpoints usually declare their body in the args schema so WordPress validates before your callback runs.');
  return out;
}

export function applyFix(rt: RestRoute, kind: string): RestRoute {
  const p: RestRoute = JSON.parse(JSON.stringify(rt));
  if (kind === 'requireCap') p.permission = 'edit_posts';
  return p;
}

const SAMPLE_DOMAIN = 'example.com';

export function clientExamples(rt: RestRoute) {
  const ns = String(rt.namespace || 'myplugin/v1').trim();
  const route = cleanRoute(rt.route);
  const path = '/wp-json/' + ns + route;
  const firstMethod = METHODS.filter((m) => rt.methods.indexOf(m) !== -1)[0] || 'GET';
  const queryArgs = rt.args.filter((a) => argSlug(a.name) && a.def !== '').map((a) => argSlug(a.name) + '=' + encodeURIComponent(a.def)).join('&');
  const qs = queryArgs && firstMethod === 'GET' ? '?' + queryArgs : '';
  return {
    path,
    endpointFull: firstMethod + ' https://' + SAMPLE_DOMAIN + path + qs,
    apiFetchExample: "import apiFetch from '@wordpress/api-fetch';\n\napiFetch( {\n\tpath: '" + ns + route + qs + "',\n\tmethod: '" + firstMethod + "',\n} ).then( ( data ) => console.log( data ) );",
    fetchExample: "fetch( '" + path + "', {\n\tmethod: '" + firstMethod + "',\n\theaders: {\n\t\t'Content-Type': 'application/json',\n\t\t'X-WP-Nonce': wpApiSettings.nonce,\n\t},\n} )\n\t.then( ( r ) => r.json() )\n\t.then( ( data ) => console.log( data ) );",
    curlExample: 'curl -X ' + firstMethod + ' "https://' + SAMPLE_DOMAIN + path + qs + '"' + (rt.permission === 'public' ? '' : ' \\\n\t--user admin:application-password'),
  };
}
