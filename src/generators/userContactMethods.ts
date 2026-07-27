import { escPhp, slugify as baseSlugify, withCredit, type ValidationIssue } from '../lib/codegen';

export type OutputMode = 'snippet' | 'functions' | 'plugin' | 'class';
export type FieldType = 'url' | 'handle' | 'email' | 'phone' | 'text';
export type HelperMode = 'none' | 'single' | 'list';

export interface ContactField {
  label: string;
  key: string;
  type: FieldType;
  required: boolean;
  rest: boolean;
}

export interface UserContactMethods {
  prefix: string;
  textDomain: string;
  validate: boolean;
  helper: HelperMode;
  removedCore: string[];
  fields: ContactField[];
}

export const TYPES: [FieldType, string, string, string, string][] = [
  ['url', 'URL', 'esc_url_raw', 'esc_url', 'https://example.com/@sam'],
  ['handle', 'Handle', 'sanitize_text_field', 'esc_html', '@sam'],
  ['email', 'Email', 'sanitize_email', 'esc_html', 'sam@example.com'],
  ['phone', 'Phone', 'sanitize_text_field', 'esc_html', '+44 7700 900123'],
  ['text', 'Plain text', 'sanitize_text_field', 'esc_html', 'Weekdays, 9 to 5'],
];
const TYPE_MAP: Record<FieldType, { label: string; sanitize: string; escape: string; sample: string }> = Object.fromEntries(
  TYPES.map(([id, label, sanitize, escape, sample]) => [id, { label, sanitize, escape, sample }])
) as Record<FieldType, { label: string; sanitize: string; escape: string; sample: string }>;

export const CORE_METHODS: [string, string][] = [
  ['aim', 'Legacy AIM field. Core stopped showing it in 3.6, but plugins and old profiles still carry the key.'],
  ['yim', 'Legacy Yahoo Messenger field.'],
  ['jabber', 'Jabber / Google Talk. Still registered by core on some installs.'],
  ['url', 'The Website field — not a contact method, it lives on wp_users. Listed here because people look for it.'],
];

export const PRESETS: { label: string; f: ContactField }[] = [
  { label: 'Mastodon', f: { label: 'Mastodon', key: 'mastodon', type: 'url', required: false, rest: true } },
  { label: 'LinkedIn', f: { label: 'LinkedIn', key: 'linkedin', type: 'url', required: false, rest: true } },
  { label: 'GitHub', f: { label: 'GitHub', key: 'github', type: 'handle', required: false, rest: true } },
  { label: 'Phone', f: { label: 'Direct line', key: 'phone', type: 'phone', required: false, rest: false } },
  { label: 'Press email', f: { label: 'Press email', key: 'press_email', type: 'email', required: false, rest: false } },
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

export function fieldKey(pre: string, f: ContactField): string {
  const raw = fnSlug(f.key) || fnSlug(f.label);
  if (!raw) return '';
  return raw.indexOf(pre + '_') === 0 ? raw : pre + '_' + raw;
}

export interface DerivedContactMethods {
  pre: string;
  td: string;
  fields: ContactField[];
  removed: string[];
  restFields: ContactField[];
  requiredFields: ContactField[];
  validated: ContactField[];
}

export function derive(ucm: UserContactMethods): DerivedContactMethods {
  const pre = fnSlug(ucm.prefix) || 'acme';
  const fields = (ucm.fields || []).filter((f) => String(f.label || '').trim() || String(f.key || '').trim());
  return {
    pre,
    td: slug(ucm.textDomain) || pre.replace(/_/g, '-'),
    fields,
    removed: (ucm.removedCore || []).slice(),
    restFields: fields.filter((f) => f.rest),
    requiredFields: fields.filter((f) => f.required),
    validated: fields.filter((f) => f.required || f.type === 'url' || f.type === 'email'),
  };
}

function buildMethodsBlock(ucm: UserContactMethods): string {
  const d = derive(ucm);
  const t = (s: string) => "__( '" + escPhp(s) + "', '" + d.td + "' )";
  let body = '';
  if (d.removed.length) body += d.removed.map((k) => "unset( $methods['" + k + "'] );").join('\n') + '\n\n';
  if (d.fields.length) {
    const pairs = d.fields.map((f) => [fieldKey(d.pre, f), t(f.label || f.key)] as [string, string]);
    body += '$methods = array_merge(\n\t$methods,\n\tarray(\n' + indent(aligned(pairs), 2) + '\n\t)\n);\n\n';
  }
  body += 'return $methods;';

  return (
    '/**\n * Add the fields this site needs to the Contact Info table.\n *\n * @param array        $methods Method key => label.\n * @param WP_User|null $user    The user being edited, null on the list screen.\n * @return array\n */\nfunction ' +
    d.pre +
    '_user_contact_methods( $methods, $user ) {\n' +
    indent(body, 1) +
    '\n}\n' +
    "add_filter( 'user_contact_methods', '" + d.pre + "_user_contact_methods', 10, 2 );\n"
  );
}

function buildValidationBlock(ucm: UserContactMethods, asClass = false): string {
  const d = derive(ucm);
  if (!ucm.validate || !d.validated.length) return '';
  const body =
    'foreach ( ' +
    (asClass ? 'self::rules()' : d.pre + '_contact_field_rules()') +
    " as $key => $rule ) {\n\t$value = isset( $_POST[ $key ] ) ? trim( sanitize_text_field( wp_unslash( $_POST[ $key ] ) ) ) : '';\n\n\tif ( '' === $value ) {\n\t\tif ( ! empty( $rule['required'] ) ) {\n\t\t\t$errors->add(\n\t\t\t\t$key . '_empty',\n\t\t\t\tsprintf(\n\t\t\t\t\t/* translators: %s: field label */\n\t\t\t\t\t__( '<strong>Error</strong>: %s cannot be empty.', '" +
    d.td +
    "' ),\n\t\t\t\t\t$rule['label']\n\t\t\t\t)\n\t\t\t);\n\t\t}\n\n\t\tcontinue;\n\t}\n\n\tif ( 'url' === $rule['type'] && ! wp_http_validate_url( $value ) ) {\n\t\t$errors->add(\n\t\t\t$key . '_invalid',\n\t\t\tsprintf(\n\t\t\t\t/* translators: %s: field label */\n\t\t\t\t__( '<strong>Error</strong>: %s must be a full URL, starting with https://.', '" +
    d.td +
    "' ),\n\t\t\t\t$rule['label']\n\t\t\t)\n\t\t);\n\t}\n\n\tif ( 'email' === $rule['type'] && ! is_email( $value ) ) {\n\t\t$errors->add(\n\t\t\t$key . '_invalid',\n\t\t\tsprintf(\n\t\t\t\t/* translators: %s: field label */\n\t\t\t\t__( '<strong>Error</strong>: %s is not a valid email address.', '" +
    d.td +
    "' ),\n\t\t\t\t$rule['label']\n\t\t\t)\n\t\t);\n\t}\n}";

  const rules = d.validated.map(
    (f) =>
      [
        fieldKey(d.pre, f),
        "array(\n\t'label'    => __( '" + escPhp(f.label || f.key) + "', '" + d.td + "' ),\n\t'type'     => '" + f.type + "',\n\t'required' => " + (f.required ? 'true' : 'false') + ',\n)',
      ] as [string, string]
  );

  if (asClass) {
    return (
      '\n\t/**\n\t * The fields worth checking before the profile saves.\n\t *\n\t * @return array\n\t */\n\tpublic static function rules() {\n\t\treturn array(\n' +
      indent(aligned(rules), 3) +
      '\n\t\t);\n\t}\n' +
      '\n\t/**\n\t * Reject bad values before core writes them to usermeta.\n\t *\n\t * Core sanitises contact methods with sanitize_text_field() and nothing more,\n\t * so this is the only chance to say no.\n\t *\n\t * @param WP_Error $errors Error collector, passed by reference.\n\t * @param bool     $update Whether this is an existing user.\n\t * @param stdClass $user   The user object about to be written.\n\t */\n\tpublic static function validate( $errors, $update, $user ) {\n' +
      indent(body, 2) +
      '\n\t}\n'
    );
  }

  return (
    '\n/**\n * The fields worth checking before the profile saves.\n *\n * @return array\n */\nfunction ' +
    d.pre +
    '_contact_field_rules() {\n\treturn array(\n' +
    indent(aligned(rules), 2) +
    '\n\t);\n}\n' +
    '\n/**\n * Reject bad values before core writes them to usermeta.\n *\n * Core sanitises contact methods with sanitize_text_field() and nothing more,\n * so this is the only chance to say no.\n *\n * @param WP_Error $errors Error collector, passed by reference.\n * @param bool     $update Whether this is an existing user.\n * @param stdClass $user   The user object about to be written.\n */\nfunction ' +
    d.pre +
    '_validate_contact_methods( $errors, $update, $user ) {\n' +
    indent(body, 1) +
    '\n}\n' +
    "add_action( 'user_profile_update_errors', '" + d.pre + "_validate_contact_methods', 10, 3 );\n"
  );
}

function buildRestBlock(ucm: UserContactMethods, asClass = false): string {
  const d = derive(ucm);
  if (!d.restFields.length) return '';
  const rows = d.restFields
    .map((f) => {
      const ty = TYPE_MAP[f.type] || TYPE_MAP.text;
      return (
        "register_meta(\n\t'user',\n\t'" +
        fieldKey(d.pre, f) +
        "',\n\tarray(\n\t\t'type'              => 'string',\n\t\t'single'            => true,\n\t\t'show_in_rest'      => true,\n\t\t'description'       => __( '" +
        escPhp(f.label || f.key) +
        "', '" +
        d.td +
        "' ),\n\t\t'sanitize_callback' => '" +
        ty.sanitize +
        "',\n\t\t'auth_callback'     => function () {\n\t\t\treturn current_user_can( 'edit_users' );\n\t\t},\n\t)\n);"
      );
    })
    .join('\n\n');
  if (asClass) {
    return '\n\t/**\n\t * Expose the fields on the user REST resource.\n\t *\n\t * Without this the values exist in usermeta but never appear in /wp/v2/users.\n\t */\n\tpublic static function register_rest_meta() {\n' + indent(rows, 2) + '\n\t}\n';
  }
  return (
    '\n/**\n * Expose the fields on the user REST resource.\n *\n * Without this the values exist in usermeta but never appear in /wp/v2/users.\n */\nfunction ' +
    d.pre +
    '_register_contact_meta() {\n' +
    indent(rows, 1) +
    '\n}\n' +
    "add_action( 'init', '" + d.pre + "_register_contact_meta' );\n"
  );
}

function buildHelperBlock(ucm: UserContactMethods, asClass = false): string {
  const d = derive(ucm);
  if (ucm.helper === 'none' || !d.fields.length) return '';

  if (ucm.helper === 'single') {
    const one =
      "$user_id = $user_id ? (int) $user_id : get_the_author_meta( 'ID' );\n$value   = get_user_meta( $user_id, '" +
      d.pre +
      "_' . $key, true );\n\nif ( ! $value ) {\n\treturn '';\n}\n\nreturn ( false !== strpos( $value, '://' ) ) ? esc_url( $value ) : esc_html( $value );";
    if (asClass) {
      return '\n\t/**\n\t * One contact value for a user, escaped for output.\n\t *\n\t * @param string $key     Method key, without the prefix.\n\t * @param int    $user_id User id. Defaults to the current post author.\n\t * @return string\n\t */\n\tpublic static function get( $key, $user_id = 0 ) {\n' + indent(one, 2) + '\n\t}\n';
    }
    return '\n/**\n * One contact value for a user, escaped for output.\n *\n * @param string $key     Method key, without the prefix.\n * @param int    $user_id User id. Defaults to the current post author.\n * @return string\n */\nfunction ' + d.pre + '_contact( $key, $user_id = 0 ) {\n' + indent(one, 1) + '\n}\n';
  }

  const rows = d.fields.map((f) => {
    const ty = TYPE_MAP[f.type] || TYPE_MAP.text;
    return [
      fieldKey(d.pre, f),
      "array(\n\t'label'  => __( '" + escPhp(f.label || f.key) + "', '" + d.td + "' ),\n\t'escape' => '" + ty.escape + "',\n\t'link'   => " + (f.type === 'url' || f.type === 'email' ? 'true' : 'false') + ',\n)',
    ] as [string, string];
  });

  const listBody =
    "$user_id = $user_id ? (int) $user_id : get_the_author_meta( 'ID' );\n$fields  = array(\n" +
    indent(aligned(rows), 1) +
    "\n);\n\n$items = array();\n\nforeach ( $fields as $key => $field ) {\n\t$value = get_user_meta( $user_id, $key, true );\n\n\tif ( ! $value ) {\n\t\tcontinue;\n\t}\n\n\t$label = esc_html( $field['label'] );\n\n\tif ( $field['link'] ) {\n\t\t$href    = ( false === strpos( $value, '@' ) || false !== strpos( $value, '://' ) ) ? esc_url( $value ) : 'mailto:' . esc_attr( sanitize_email( $value ) );\n\t\t$items[] = sprintf( '<li><a href=\"%1$s\" rel=\"me nofollow\">%2$s</a></li>', $href, $label );\n\t\tcontinue;\n\t}\n\n\t$items[] = sprintf( '<li>%1$s: %2$s</li>', $label, call_user_func( $field['escape'], $value ) );\n}\n\nif ( ! $items ) {\n\treturn '';\n}\n\nreturn '<ul class=\"" +
    d.pre.replace(/_/g, '-') +
    "-contact\">' . implode( '', $items ) . '</ul>';";

  if (asClass) {
    return '\n\t/**\n\t * The author contact links, ready to print.\n\t *\n\t * @param int $user_id User id. Defaults to the current post author.\n\t * @return string Escaped markup, or an empty string when nothing is filled in.\n\t */\n\tpublic static function links( $user_id = 0 ) {\n' + indent(listBody, 2) + '\n\t}\n';
  }

  return '\n/**\n * The author contact links, ready to print.\n *\n * @param int $user_id User id. Defaults to the current post author.\n * @return string Escaped markup, or an empty string when nothing is filled in.\n */\nfunction ' + d.pre + '_contact_links( $user_id = 0 ) {\n' + indent(listBody, 1) + '\n}\n';
}

function buildClassBlock(ucm: UserContactMethods): string {
  const d = derive(ucm);
  const cls = d.pre.split('_').map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('_') + '_Contact_Methods';
  const t = (s: string) => "__( '" + escPhp(s) + "', '" + d.td + "' )";
  const pairs = d.fields.map((f) => [fieldKey(d.pre, f), t(f.label || f.key)] as [string, string]);
  let body = '';
  if (d.removed.length) body += d.removed.map((k) => "unset( $methods['" + k + "'] );").join('\n') + '\n\n';
  if (pairs.length) body += '$methods = array_merge( $methods, self::fields() );\n\n';
  body += 'return $methods;';

  let out = 'final class ' + cls + " {\n\n\t/**\n\t * Hook everything this class owns.\n\t */\n\tpublic static function init() {\n\t\tadd_filter( 'user_contact_methods', array( __CLASS__, 'methods' ), 10, 2 );\n";
  if (ucm.validate && d.validated.length) out += "\t\tadd_action( 'user_profile_update_errors', array( __CLASS__, 'validate' ), 10, 3 );\n";
  if (d.restFields.length) out += "\t\tadd_action( 'init', array( __CLASS__, 'register_rest_meta' ) );\n";
  out += '\t}\n';
  if (pairs.length) out += '\n\t/**\n\t * Field key => label.\n\t *\n\t * @return array\n\t */\n\tpublic static function fields() {\n\t\treturn array(\n' + indent(aligned(pairs), 3) + '\n\t\t);\n\t}\n';
  out += '\n\t/**\n\t * Filter callback.\n\t *\n\t * @param array        $methods Method key => label.\n\t * @param WP_User|null $user    The user being edited.\n\t * @return array\n\t */\n\tpublic static function methods( $methods, $user ) {\n' + indent(body, 2) + '\n\t}\n';
  out += buildValidationBlock(ucm, true);
  out += buildRestBlock(ucm, true);
  out += buildHelperBlock(ucm, true);
  out += '}\n' + cls + '::init();\n';
  return out;
}

export function buildCode(ucm: UserContactMethods, mode: OutputMode): string {
  const d = derive(ucm);
  let out = '';
  if (mode === 'plugin') {
    out += '<?php\n/**\n * Plugin Name:       ' + (ucm.prefix || 'Acme') + ' contact methods\n * Description:       Adds ' + d.fields.length + ' contact field' + (d.fields.length === 1 ? '' : 's') + ' to the user profile screen.\n * Version:           1.0.0\n * Requires PHP:      7.4\n * Text Domain:       ' + d.td + "\n */\n\ndefined( 'ABSPATH' ) || exit;\n\n";
  } else if (mode === 'functions') {
    out += "<?php\n// Add to your theme's functions.php. Contact fields usually belong in a plugin —\n// switching theme should not lose an author's links.\n\n";
  } else if (mode === 'class') {
    out += '<?php\n\n';
  }

  if (mode === 'class') {
    out += buildClassBlock(ucm);
    return withCredit(out);
  }

  out += buildMethodsBlock(ucm);
  out += buildValidationBlock(ucm);
  out += buildRestBlock(ucm);
  out += buildHelperBlock(ucm);
  return withCredit(out);
}

const RESERVED = ['url', 'email', 'user_email', 'description', 'nickname', 'first_name', 'last_name', 'display_name', 'user_login', 'admin_color', 'locale', 'rich_editing'];

export function freshProject(): UserContactMethods {
  return {
    prefix: 'acme', textDomain: 'acme', validate: true, helper: 'list',
    removedCore: ['aim', 'yim', 'jabber'],
    fields: [
      { label: 'Mastodon', key: 'mastodon', type: 'url', required: false, rest: true },
      { label: 'LinkedIn', key: 'linkedin', type: 'url', required: false, rest: true },
      { label: 'GitHub', key: 'github', type: 'handle', required: false, rest: true },
      { label: 'Press email', key: 'press_email', type: 'email', required: false, rest: false },
    ],
  };
}

export function validate(ucm: UserContactMethods): ValidationIssue[] {
  const d = derive(ucm);
  const out: ValidationIssue[] = [];
  const add = (severity: ValidationIssue['severity'], message: string, targetId?: string, fix?: string, fixLabel?: string) => out.push({ severity, message, targetId, fix, fixLabel });

  if (!d.fields.length && !d.removed.length) add('error', 'Nothing to generate — add a field or remove a core method.', 'fields');

  const seen: Record<string, boolean> = {};
  d.fields.forEach((f, i) => {
    const label = 'Field ' + (i + 1) + (f.label ? ' (' + f.label + ')' : '');
    const key = fieldKey(d.pre, f);
    const raw = fnSlug(f.key) || fnSlug(f.label);
    if (!String(f.label || '').trim()) add('error', label + ' has no label. The Contact Info row would render with an empty heading.', 'fields');
    if (!raw) add('error', label + ' has no key and no label to derive one from.', 'fields');
    if (String(f.key || '').trim() && fnSlug(f.key) !== String(f.key).trim()) add('error', '"' + f.key + '" is not a usable meta key. Lowercase letters, numbers and underscores only.', 'fields', 'fixKeys', 'Clean the keys');
    if (seen[key]) add('error', 'Two fields resolve to the meta key "' + key + '". The second overwrites the first in the array.', 'fields');
    seen[key] = true;
    if (RESERVED.indexOf(raw) >= 0) add('error', label + ' uses "' + raw + '", which core already owns on the user object. Registering it here fights with core’s own field.', 'fields', 'prefixKeys', 'Prefix the keys');
    if (key === raw && raw.indexOf(d.pre) !== 0) add('warning', label + '’s key is unprefixed. Contact methods write to plain usermeta, so "' + raw + '" is shared with every other plugin that picked the same word.', 'fields', 'prefixKeys', 'Prefix the keys');
    if (String(f.label || '').length > 28) add('recommendation', label + '’s label is long. The profile table gives the left column a fixed width and long labels wrap onto three lines.', 'fields');
    if (f.type === 'url' && !ucm.validate) add('warning', label + ' is a URL field with validation switched off. Core stores whatever is typed, including "facebook" with no scheme.', 'validate', 'enableValidation', 'Turn validation on');
    if (f.type === 'email' && !ucm.validate) add('warning', label + ' is an email field with validation switched off — is_email() never runs.', 'validate', 'enableValidation', 'Turn validation on');
    if (f.required && !ucm.validate) add('error', label + ' is marked required but validation is off, so nothing enforces it.', 'validate', 'enableValidation', 'Turn validation on');
    if (f.rest && f.type === 'phone') add('warning', label + ' exposes a phone number in the REST API. /wp/v2/users is public on most sites — check that is intended.', 'fields');
    if (f.rest && f.type === 'email') add('warning', label + ' exposes an email address in the REST API, which is readable by anyone who can list users.', 'fields');
  });

  if (d.requiredFields.length) add('recommendation', d.requiredFields.length + ' required field' + (d.requiredFields.length === 1 ? '' : 's') + ' — remember this also blocks admins editing other users, and the new-user screen.', 'fields');
  if (d.removed.indexOf('url') >= 0) add('error', 'The Website field is not a contact method — it lives on the users table. Unsetting url here does nothing; remove it with the user_profile fields instead.', 'removedCore', 'unremoveUrl', 'Drop that removal');
  if (ucm.helper === 'list' && !d.fields.length) add('warning', 'The output helper has no fields to print.', 'helper');
  if (!d.restFields.length && d.fields.length) add('recommendation', 'None of these fields appear in the REST API. Block themes and headless front ends read authors from /wp/v2/users, where these values will be missing.', 'fields');
  if (ucm.validate && !d.validated.length) add('recommendation', 'Validation is on but no field is required, a URL or an email — the generated check will never reject anything.', 'validate');
  add('recommendation', 'Values are visible to anyone who can edit the user, and to the user themselves. Do not use contact methods for anything private.', undefined);
  return out;
}

export function applyFix(ucm: UserContactMethods, kind: string): UserContactMethods {
  const p: UserContactMethods = JSON.parse(JSON.stringify(ucm));
  const pre = fnSlug(p.prefix) || 'acme';
  if (kind === 'fixKeys')
    p.fields.forEach((f) => {
      f.key = fnSlug(f.key) || fnSlug(f.label);
    });
  if (kind === 'prefixKeys')
    p.fields.forEach((f) => {
      const raw = fnSlug(f.key) || fnSlug(f.label);
      if (raw.indexOf(pre + '_') !== 0) f.key = pre + '_' + raw;
    });
  if (kind === 'enableValidation') p.validate = true;
  if (kind === 'unremoveUrl') p.removedCore = (p.removedCore || []).filter((k) => k !== 'url');
  return p;
}
