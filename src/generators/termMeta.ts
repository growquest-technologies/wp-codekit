import { escPhp, withCredit, type ValidationIssue } from '../lib/codegen';

export type OutputMode = 'snippet' | 'functions' | 'plugin';
export type TermFieldType = 'text' | 'textarea' | 'number' | 'checkbox' | 'select' | 'color' | 'url' | 'image';

export interface TermMetaField {
  key: string;
  label: string;
  type: TermFieldType;
  inRest: boolean;
  description: string;
  choices: string;
}

export interface TermMeta {
  prefix: string;
  textDomain: string;
  taxonomy: string;
  metaPrefix: string;
  fields: TermMetaField[];
  addForm: boolean;
  editForm: boolean;
  column: boolean;
}

export const TYPES: [TermFieldType, string][] = [
  ['text', 'Text'], ['textarea', 'Textarea'], ['number', 'Number'], ['checkbox', 'Checkbox'],
  ['select', 'Select'], ['color', 'Colour'], ['url', 'URL'], ['image', 'Image ID'],
];
export const REST_TYPE: Record<TermFieldType, string> = { text: 'string', textarea: 'string', number: 'integer', checkbox: 'boolean', select: 'string', color: 'string', url: 'string', image: 'integer' };
export const SANITIZE: Record<TermFieldType, string> = { text: 'sanitize_text_field', textarea: 'sanitize_textarea_field', number: 'absint', checkbox: 'rest_sanitize_boolean', select: 'sanitize_key', color: 'sanitize_hex_color', url: 'esc_url_raw', image: 'absint' };

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

export interface Choice {
  value: string;
  label: string;
}

export function parseChoices(str: string): Choice[] {
  return String(str || '')
    .split(',')
    .map((part) => {
      const p = part.trim();
      if (!p) return null;
      const i = p.indexOf(':');
      const v = slugify(i >= 0 ? p.slice(0, i) : p);
      const l = i >= 0 ? p.slice(i + 1).trim() : p.charAt(0).toUpperCase() + p.slice(1);
      return v ? { value: v, label: l || v } : null;
    })
    .filter((c): c is Choice => c !== null);
}

export interface DerivedField extends TermMetaField {
  parsed: Choice[];
}

export interface Derived {
  pre: string;
  td: string;
  tax: string;
  metaPrefix: string;
  fields: DerivedField[];
}

export function derive(tm: TermMeta): Derived {
  const pre = fnSlug(tm.prefix) || 'acme';
  return {
    pre,
    td: slugify(tm.textDomain) || pre.replace(/_/g, '-'),
    tax: slugify(tm.taxonomy) || 'category',
    metaPrefix: metaSlug(tm.metaPrefix),
    fields: (tm.fields || []).map((f) => ({ ...f, key: metaSlug(f.key) || 'field', parsed: parseChoices(f.choices) })),
  };
}

interface Block {
  name: string;
  hook?: string;
  filter?: string;
  hookArgs?: number;
  twoHooks?: string[];
  params?: string;
  doc: string;
  body: string;
}

export function buildCode(tm: TermMeta, mode: OutputMode): string {
  const d = derive(tm);
  const pre = d.pre;
  const td = d.td;
  const t = (s: string) => "__( '" + escPhp(s) + "', '" + td + "' )";
  const nonceField = pre + '_term_nonce';
  const nonceAction = pre + '_save_term_meta';
  const full = (f: DerivedField) => d.metaPrefix + f.key;
  const blocks: Block[] = [];

  const regs = d.fields.map((f) => {
    const pairs: [string, string][] = [['type', "'" + REST_TYPE[f.type] + "'"], ['single', 'true'], ['show_in_rest', f.inRest ? 'true' : 'false'], ['sanitize_callback', "'" + SANITIZE[f.type] + "'"]];
    if (f.description) pairs.push(['description', t(f.description)]);
    pairs.push(['auth_callback', "static function () {\n\treturn current_user_can( 'manage_categories' );\n}"]);
    return 'register_term_meta(\n' + indent("'" + escPhp(d.tax) + "',\n'" + escPhp(full(f)) + "',\narray(\n" + indent(aligned(pairs), 1) + '\n)', 1) + '\n);';
  }).join('\n\n');
  blocks.push({ name: 'register_meta', hook: 'init', doc: '/**\n * Register the term meta keys.\n */\n', body: regs || '// Add a field first.' });

  const control = (f: DerivedField, value: string): string => {
    const id = pre + '_' + f.key;
    if (f.type === 'textarea') {
      return 'printf(\n\t\'<textarea id="%1$s" name="%1$s" rows="4" class="large-text">%2$s</textarea>\',\n\t\'' + id + "',\n\tesc_textarea( " + value + ' )\n);';
    }
    if (f.type === 'checkbox') {
      return 'printf(\n\t\'<input type="checkbox" id="%1$s" name="%1$s" value="1"%2$s />\',\n\t\'' + id + "',\n\tchecked( (bool) " + value + ', true, false )\n);';
    }
    if (f.type === 'select') {
      return "echo '<select id=\"" + id + '" name="' + id + "\">';\n\nforeach ( array(\n" + indent(aligned(f.parsed.map((c) => [c.value, t(c.label)])), 1) + '\n) as $value => $label ) {\n\tprintf(\n\t\t\'<option value="%1$s"%2$s>%3$s</option>\',\n\t\tesc_attr( $value ),\n\t\tselected( ' + value + ", $value, false ),\n\t\tesc_html( $label )\n\t);\n}\n\necho '</select>';";
    }
    const inputType = f.type === 'number' || f.type === 'image' ? 'number' : f.type === 'color' ? 'color' : f.type === 'url' ? 'url' : 'text';
    return 'printf(\n\t\'<input type="' + inputType + '" id="%1$s" name="%1$s" value="%2$s" class="regular-text" />\',\n\t\'' + id + "',\n\tesc_attr( " + value + ' )\n);';
  };

  if (tm.addForm) {
    let body = "wp_nonce_field( '" + nonceAction + "', '" + nonceField + "' );\n\n";
    body += d.fields.map((f) => {
      return 'echo \'<div class="form-field term-' + f.key + '-wrap">\';\nprintf(\n\t\'<label for="%1$s">%2$s</label>\',\n\t\'' + pre + '_' + f.key + "',\n\tesc_html( " + t(f.label || f.key) + ' )\n);\n' + control(f, "''") + (f.description ? '\nprintf(\n\t\'<p>%s</p>\',\n\tesc_html( ' + t(f.description) + ' )\n);' : '') + "\necho '</div>';";
    }).join('\n\n');
    blocks.push({ name: 'add_form_fields', hook: d.tax + '_add_form_fields', doc: '/**\n * Fields on the add-term form.\n */\n', body: body || '// Add a field first.' });
  }

  if (tm.editForm) {
    let body = "wp_nonce_field( '" + nonceAction + "', '" + nonceField + "' );\n\n";
    body += d.fields.map((f) => {
      const v = '$' + f.key;
      return v + " = get_term_meta( $term->term_id, '" + escPhp(full(f)) + "', true );\n\necho '<tr class=\"form-field term-" + f.key + '-wrap">\';\nprintf(\n\t\'<th scope="row"><label for="%1$s">%2$s</label></th>\',\n\t\'' + pre + '_' + f.key + "',\n\tesc_html( " + t(f.label || f.key) + " )\n);\necho '<td>';\n" + control(f, v) + (f.description ? '\nprintf(\n\t\'<p class="description">%s</p>\',\n\tesc_html( ' + t(f.description) + ' )\n);' : '') + "\necho '</td></tr>';";
    }).join('\n\n');
    blocks.push({ name: 'edit_form_fields', params: '$term', hook: d.tax + '_edit_form_fields', hookArgs: 2, doc: '/**\n * Fields on the edit-term form.\n *\n * @param WP_Term $term The term being edited.\n */\n', body: body || '// Add a field first.' });
  }

  let save = "if ( ! isset( $_POST['" + nonceField + "'] ) || ! wp_verify_nonce( sanitize_key( $_POST['" + nonceField + "'] ), '" + nonceAction + "' ) ) {\n\treturn;\n}\n\nif ( ! current_user_can( 'manage_categories' ) ) {\n\treturn;\n}\n\n";
  save += d.fields.map((f) => {
    const post = "$_POST['" + pre + '_' + f.key + "']";
    if (f.type === 'checkbox') {
      return 'if ( ! empty( ' + post + " ) ) {\n\tupdate_term_meta( $term_id, '" + escPhp(full(f)) + "', 1 );\n} else {\n\tdelete_term_meta( $term_id, '" + escPhp(full(f)) + "' );\n}";
    }
    if (f.type === 'select' && f.parsed.length) {
      return 'if ( isset( ' + post + ' ) && in_array( sanitize_key( ' + post + ' ), array( ' + f.parsed.map((c) => "'" + c.value + "'").join(', ') + " ), true ) ) {\n\tupdate_term_meta( $term_id, '" + escPhp(full(f)) + "', sanitize_key( " + post + ' ) );\n}';
    }
    return 'if ( isset( ' + post + ' ) ) {\n\t$value = ' + SANITIZE[f.type] + '( wp_unslash( ' + post + " ) );\n\n\tif ( '' === $value || null === $value ) {\n\t\tdelete_term_meta( $term_id, '" + escPhp(full(f)) + "' );\n\t} else {\n\t\tupdate_term_meta( $term_id, '" + escPhp(full(f)) + "', $value );\n\t}\n}";
  }).join('\n\n');
  blocks.push({ name: 'save_term_meta', params: '$term_id', doc: '/**\n * Save the fields. Fires on both create and edit.\n *\n * @param int $term_id The term.\n */\n', body: save || '// Add a field first.', twoHooks: [d.tax === 'category' ? 'created_category' : 'created_' + d.tax, d.tax === 'category' ? 'edited_category' : 'edited_' + d.tax] });

  if (tm.column && d.fields.length) {
    const first = d.fields[0];
    blocks.push({
      name: 'column_head', params: '$columns', filter: 'manage_edit-' + d.tax + '_columns',
      doc: '/**\n * Add a column to the terms table.\n *\n * @param array $columns Existing columns.\n * @return array\n */\n',
      body: "$columns['" + escPhp(first.key) + "'] = " + t(first.label || first.key) + ';\n\nreturn $columns;',
    });
    blocks.push({
      name: 'column_content', params: '$content, $column, $term_id', filter: 'manage_' + d.tax + '_custom_column', hookArgs: 3,
      doc: '/**\n * Fill the column.\n *\n * @param string $content Current content.\n * @param string $column  Column name.\n * @param int    $term_id Term ID.\n * @return string\n */\n',
      body: "if ( '" + escPhp(first.key) + "' !== $column ) {\n\treturn $content;\n}\n\nreturn esc_html( (string) get_term_meta( $term_id, '" + escPhp(full(first)) + "', true ) );",
    });
  }

  let out = '';
  if (mode === 'plugin') {
    out += '<?php\n/**\n * Plugin Name:       ' + d.tax + ' term fields\n * Description:       Adds ' + d.fields.length + ' field' + (d.fields.length === 1 ? '' : 's') + ' to ' + d.tax + ' terms.\n * Version:           1.0.0\n * Requires PHP:      7.4\n * Text Domain:       ' + td + "\n */\n\ndefined( 'ABSPATH' ) || exit;\n\n";
  } else if (mode === 'functions') {
    out += "<?php\n// Add to your theme's functions.php.\n\n";
  }
  out += blocks.map((b) => {
    let s = b.doc + 'function ' + pre + '_' + b.name + (b.params ? '( ' + b.params + ' )' : '()') + ' {\n' + indent(b.body, 1) + '\n}\n';
    if (b.twoHooks) s += b.twoHooks.map((h) => "add_action( '" + h + "', '" + pre + '_' + b.name + "' );").join('\n') + '\n';
    else if (b.filter) s += "add_filter( '" + b.filter + "', '" + pre + '_' + b.name + "'" + (b.hookArgs ? ', 10, ' + b.hookArgs : '') + ' );\n';
    else if (b.hook) s += "add_action( '" + b.hook + "', '" + pre + '_' + b.name + "'" + (b.hookArgs ? ', 10, ' + b.hookArgs : '') + ' );\n';
    return s;
  }).join('\n');
  return withCredit(out);
}

export function validate(tm: TermMeta): ValidationIssue[] {
  const d = derive(tm);
  const out: ValidationIssue[] = [];
  const add = (severity: ValidationIssue['severity'], message: string, fix?: string, fixLabel?: string) => out.push({ severity, message, fix, fixLabel });
  const full = (f: DerivedField) => d.metaPrefix + f.key;
  if (!slugify(tm.taxonomy)) add('error', 'A taxonomy is required — every hook here is named after it.');
  if (!d.fields.length) add('error', 'No fields, so nothing is registered or rendered.');
  if (!d.metaPrefix) add('warning', 'No key prefix. Term meta keys are shared across every taxonomy on the site.', 'addPrefix', 'Prefix the keys');
  const seen: Record<string, boolean> = {};
  d.fields.forEach((f) => {
    const key = full(f);
    if (seen[key]) add('error', `Two fields register "${key}".`);
    seen[key] = true;
    if (!String(f.key || '').trim()) add('error', 'A field is missing its key.');
    if (!String(f.label || '').trim()) add('warning', `"${f.key}" has no label, so both forms render a bare input.`);
    if (f.type === 'select' && !f.parsed.length) add('error', `The select "${f.key}" has no choices, so it renders empty and never saves.`, 'addChoices', 'Add two choices');
    if (f.type === 'image') add('recommendation', `"${f.key}" stores an attachment ID as a number. A real media picker needs wp.media and an enqueued script — the number input is the honest fallback.`);
    if (f.type === 'color' && f.inRest) add('recommendation', 'sanitize_hex_color() returns null for anything that is not a hex colour, which REST reports as an invalid value rather than silently emptying it. That is the behaviour you want.');
  });
  if (!tm.addForm && !tm.editForm) add('error', 'Neither form is generated, so the fields are registered but cannot be filled in by anyone.', 'bothForms', 'Add both forms');
  if (!tm.addForm) add('warning', 'No add-term form, so a new term can only get these values after it has been created and re-opened.', 'bothForms', 'Add both forms');
  if (!tm.editForm) add('error', 'No edit-term form. Values set on creation could never be changed.', 'bothForms', 'Add both forms');
  if (tm.column && d.fields.length > 1) add('recommendation', `The terms-table column shows the first field only (${d.fields[0].key}). Duplicate the pair of filters for more.`);
  if (d.tax === 'post_tag') add('recommendation', 'Tags are usually flat and numerous. Extra fields on hundreds of tags rarely get filled in — consider whether a taxonomy with fewer terms is the right home.');
  if (d.fields.some((f) => f.inRest) === false) add('recommendation', 'No field is exposed to REST, so the block editor and the API cannot read these values.');
  return out;
}

export function freshProject(): TermMeta {
  return {
    prefix: 'acme', textDomain: 'acme', taxonomy: 'category', metaPrefix: 'acme_',
    fields: [
      { key: 'accent', label: 'Accent colour', type: 'color', inRest: true, description: 'Used for the archive header.', choices: '' },
      { key: 'tagline', label: 'Tagline', type: 'text', inRest: true, description: 'Shown under the term name on its archive.', choices: '' },
      { key: 'layout', label: 'Archive layout', type: 'select', inRest: true, description: '', choices: 'grid:Grid, list:List' },
      { key: 'featured', label: 'Feature on the home page', type: 'checkbox', inRest: false, description: '', choices: '' },
    ],
    addForm: true, editForm: true, column: true,
  };
}

export function applyFix(tm: TermMeta, kind: string): TermMeta {
  const p: TermMeta = JSON.parse(JSON.stringify(tm));
  if (kind === 'addPrefix') p.metaPrefix = fnSlug(p.prefix) + '_';
  if (kind === 'bothForms') { p.addForm = true; p.editForm = true; }
  if (kind === 'addChoices') p.fields.forEach((f) => { if (f.type === 'select' && !parseChoices(f.choices).length) f.choices = 'first:First, second:Second'; });
  return p;
}
