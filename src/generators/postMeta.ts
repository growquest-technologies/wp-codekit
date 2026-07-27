import { escPhp, withCredit, type ValidationIssue } from '../lib/codegen';

export type OutputMode = 'snippet' | 'functions' | 'plugin';
export type MetaType = 'string' | 'integer' | 'number' | 'boolean' | 'array' | 'object';
export type Capability = 'edit_post' | 'edit_posts' | 'manage_options';

export interface MetaKey {
  key: string;
  type: MetaType;
  single: boolean;
  inRest: boolean;
  def: string;
  description: string;
}

export interface PostMeta {
  prefix: string;
  textDomain: string;
  postType: string;
  metaPrefix: string;
  capability: Capability;
  keys: MetaKey[];
  helperFns: boolean;
  uninstall: boolean;
}

export const TYPES: [MetaType, string][] = [['string', 'string'], ['integer', 'integer'], ['number', 'number'], ['boolean', 'boolean'], ['array', 'array'], ['object', 'object']];
export const SANITIZE: Record<MetaType, string | null> = { string: 'sanitize_text_field', integer: 'absint', number: 'floatval', boolean: 'rest_sanitize_boolean', array: null, object: null };

function fnSlug(s: string): string {
  return String(s || '').toLowerCase().trim().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
}
function metaSlug(s: string): string {
  return String(s || '').toLowerCase().trim().replace(/[^a-z0-9_]+/g, '_');
}
export function slugify(s: string): string {
  return String(s || '').toLowerCase().trim().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
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

export interface DerivedKey extends MetaKey {
  key: string;
}

export interface Derived {
  pre: string;
  td: string;
  metaPrefix: string;
  postType: string;
  keys: DerivedKey[];
}

export function derive(pm: PostMeta): Derived {
  const pre = fnSlug(pm.prefix) || 'acme';
  return {
    pre,
    td: slugify(pm.textDomain || pm.prefix) || pre.replace(/_/g, '-'),
    metaPrefix: metaSlug(pm.metaPrefix),
    postType: slugify(pm.postType),
    keys: (pm.keys || []).map((k) => ({ ...k, key: metaSlug(k.key) || 'field' })),
  };
}

function defLiteral(k: MetaKey): string {
  const v = String(k.def == null ? '' : k.def).trim();
  if (k.type === 'boolean') return v === '1' || v === 'true' ? 'true' : 'false';
  if (k.type === 'integer') return String(parseInt(v, 10) || 0);
  if (k.type === 'number') return String(parseFloat(v) || 0);
  if (k.type === 'array') return 'array()';
  if (k.type === 'object') return 'array()';
  return "'" + escPhp(v) + "'";
}

export function buildCode(pm: PostMeta, mode: OutputMode): string {
  const d = derive(pm);
  const pre = d.pre;
  const authFn = pre + '_meta_auth';
  let regs = d.keys.map((k) => {
    const full = d.metaPrefix + k.key;
    const pairs: [string, string][] = [['type', "'" + k.type + "'"], ['single', k.single ? 'true' : 'false']];
    if (k.description) pairs.push(['description', "__( '" + escPhp(k.description) + "', '" + d.td + "' )"]);
    pairs.push(['default', defLiteral(k)]);
    if (SANITIZE[k.type]) pairs.push(['sanitize_callback', "'" + SANITIZE[k.type] + "'"]);
    else if (k.type === 'array') pairs.push(['sanitize_callback', "static function ( $value ) {\n\treturn array_map( 'sanitize_text_field', (array) $value );\n}"]);
    pairs.push(['auth_callback', "'" + authFn + "'"]);
    if (k.inRest) {
      if (k.type === 'array') {
        pairs.push(['show_in_rest', "array(\n\t'schema' => array(\n\t\t'type'  => 'array',\n\t\t'items' => array( 'type' => 'string' ),\n\t),\n)"]);
      } else if (k.type === 'object') {
        pairs.push(['show_in_rest', "array(\n\t'schema' => array(\n\t\t'type'       => 'object',\n\t\t'properties' => array(),\n\t),\n)"]);
      } else {
        pairs.push(['show_in_rest', 'true']);
      }
    } else {
      pairs.push(['show_in_rest', 'false']);
    }
    return 'register_post_meta(\n' + indent("'" + escPhp(d.postType) + "',\n'" + escPhp(full) + "',\narray(\n" + indent(aligned(pairs), 1) + '\n)', 1) + '\n);';
  }).join('\n\n');
  if (!d.keys.length) regs = '// Add a meta key to generate the registration calls.';

  let out = '';
  if (mode === 'plugin') {
    out += '<?php\n/**\n * Plugin Name:       ' + (d.postType || 'Post') + ' meta\n * Description:       Registers ' + d.keys.length + ' meta key' + (d.keys.length === 1 ? '' : 's') + (d.postType ? ' for ' + d.postType : '') + '.\n * Version:           1.0.0\n * Requires PHP:      7.4\n * Text Domain:       ' + d.td + "\n */\n\ndefined( 'ABSPATH' ) || exit;\n\n";
  } else if (mode === 'functions') {
    out += "<?php\n// Add to your theme's functions.php.\n\n";
  }

  out += '/**\n * Who may read and write these keys through the API.\n *\n * @param bool   $allowed Whether the user can act.\n * @param string $meta_key The key.\n * @param int    $post_id  The post.\n * @return bool\n */\nfunction ' + authFn + ' ( $allowed, $meta_key, $post_id ) {\n\treturn current_user_can( ' + (pm.capability === 'edit_post' ? "'edit_post', $post_id" : "'" + pm.capability + "'") + ' );\n}\n';
  out = out.replace(authFn + ' (', authFn + '(');

  out += '\n/**\n * Register the meta keys.\n */\nfunction ' + pre + '_register_meta() {\n' + indent(regs, 1) + '\n}\n' + "add_action( 'init', '" + pre + "_register_meta' );\n";

  if (pm.helperFns && d.keys.length) {
    out += '\n' + d.keys.map((k) => {
      const full = d.metaPrefix + k.key;
      return '/**\n * Read ' + full + '.\n *\n * @param int $post_id Post ID.\n * @return mixed\n */\nfunction ' + pre + '_get_' + k.key + '( $post_id = 0 ) {\n\t$post_id = $post_id ? $post_id : get_the_ID();\n\n\treturn get_post_meta( $post_id, \'' + escPhp(full) + "', " + (k.single ? 'true' : 'false') + ' );\n}';
    }).join('\n\n') + '\n';
  }

  if (pm.uninstall && d.keys.length) {
    out += '\n/*\n * uninstall.php — remove the meta when the plugin is deleted.\n *\n * defined( \'WP_UNINSTALL_PLUGIN\' ) || exit;\n' + d.keys.map((k) => " * delete_post_meta_by_key( '" + escPhp(d.metaPrefix + k.key) + "' );").join('\n') + '\n */\n';
  }
  return withCredit(out);
}

export function validate(pm: PostMeta): ValidationIssue[] {
  const d = derive(pm);
  const out: ValidationIssue[] = [];
  const add = (severity: ValidationIssue['severity'], message: string, fix?: string, fixLabel?: string) => out.push({ severity, message, fix, fixLabel });
  if (!d.keys.length) add('error', 'No meta keys — nothing is registered.');
  if (!d.postType) add('warning', 'No post type, so these keys are registered for every post type on the site. Usually you want one.', 'setPost', 'Limit to post');
  if (!d.metaPrefix) add('warning', `No key prefix. Meta keys are global; an unprefixed "${d.keys[0] ? d.keys[0].key : 'key'}" will eventually collide with a plugin.`, 'addPrefix', 'Prefix the keys');
  const seen: Record<string, boolean> = {};
  d.keys.forEach((k) => {
    const full = d.metaPrefix + k.key;
    if (seen[full]) add('error', `Two entries register "${full}". The second call overwrites the first.`);
    seen[full] = true;
    if (!String(k.key || '').trim()) add('error', 'A key name is missing.');
    if (k.inRest && full.charAt(0) === '_') add('recommendation', `"${full}" starts with an underscore, so it is protected — but registering it with show_in_rest deliberately exposes it to the API anyway. That is allowed and often intended; just be sure it holds nothing private.`);
    if (k.inRest && !k.single) add('warning', `"${full}" is exposed to REST without single, so the API returns an array of every row. Block code almost always expects a scalar.`, 'makeSingle', 'Make it single');
    if ((k.type === 'array' || k.type === 'object') && k.inRest) add('recommendation', `"${full}" is a ${k.type} in REST, which needs a schema — a stub is generated. Fill in the item or property types or the API will reject writes.`);
    if (k.type === 'boolean' && String(k.def || '').trim() && ['1', '0', 'true', 'false'].indexOf(String(k.def).trim()) === -1) add('warning', `"${full}" is boolean but its default is "${k.def}". Use 1 or 0.`);
    if (k.type === 'integer' && String(k.def || '').trim() && !/^-?\d+$/.test(String(k.def).trim())) add('error', `"${full}" is an integer but its default is not a number.`);
    if (!k.inRest && (k.type === 'array' || k.type === 'object')) add('recommendation', `"${full}" holds structured data and is not in REST — fine for PHP-only use, but get_post_meta() will hand you the serialised array with no validation.`);
    if (!k.description) add('recommendation', `No description on "${full}". It becomes the field description in the REST schema, which is the only documentation an API consumer gets.`);
  });
  if (pm.capability === 'edit_posts') add('warning', 'auth_callback checks edit_posts rather than edit_post for the specific post, so any contributor can write these keys on anyone\'s post through the API.', 'authPerPost', 'Check per post');
  if (pm.capability === 'manage_options') add('recommendation', 'manage_options for meta auth means only admins can save these fields — including through the block editor. Correct for settings-like meta, wrong for editorial fields.');
  if (!pm.helperFns) add('recommendation', 'Without helper accessors every template calls get_post_meta() with a string literal. One typo, one silent empty value.');
  if (!pm.uninstall) add('recommendation', 'Nothing deletes these keys on uninstall. delete_post_meta_by_key() in uninstall.php keeps the postmeta table honest.');
  return out;
}

export function freshProject(): PostMeta {
  return {
    prefix: 'acme', textDomain: 'acme', postType: 'post', metaPrefix: 'acme_', capability: 'edit_post',
    keys: [
      { key: 'reading_time', type: 'integer', single: true, inRest: true, def: '0', description: 'Estimated reading time in minutes.' },
      { key: 'subtitle', type: 'string', single: true, inRest: true, def: '', description: 'Shown under the title.' },
      { key: 'featured', type: 'boolean', single: true, inRest: true, def: '0', description: 'Pin this post to the top of archives.' },
    ],
    helperFns: true, uninstall: true,
  };
}

export function applyFix(pm: PostMeta, kind: string): PostMeta {
  const p: PostMeta = JSON.parse(JSON.stringify(pm));
  if (kind === 'setPost') p.postType = 'post';
  if (kind === 'addPrefix') p.metaPrefix = fnSlug(p.prefix) + '_';
  if (kind === 'makeSingle') p.keys.forEach((k) => { if (k.inRest) k.single = true; });
  if (kind === 'authPerPost') p.capability = 'edit_post';
  return p;
}
