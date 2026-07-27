import { escPhp, withCredit, type ValidationIssue } from '../lib/codegen';

export type OutputMode = 'snippet' | 'functions' | 'plugin';
export type FieldType = 'text' | 'textarea' | 'number' | 'date' | 'checkbox' | 'select' | 'url' | 'email';
export type CodeStyle = 'procedural' | 'class';

export interface MetaBoxField {
  id: string;
  label: string;
  type: FieldType;
  description: string;
  choices: string;
}

export interface MetaBox {
  prefix: string;
  textDomain: string;
  codeStyle: CodeStyle;
  id: string;
  title: string;
  context: 'normal' | 'side' | 'advanced';
  priority: 'high' | 'default' | 'low';
  metaPrefix: string;
  postTypes: string[];
  customPostType: string;
  fields: MetaBoxField[];
  nonceCheck: boolean;
  autosaveGuard: boolean;
  capCheck: boolean;
  typeCheck: boolean;
  registerMeta: boolean;
}

export const POST_TYPES = ['post', 'page', 'product', 'event'];
export const FIELD_TYPES: [FieldType, string][] = [
  ['text', 'Text'], ['textarea', 'Textarea'], ['number', 'Number'], ['date', 'Date'],
  ['checkbox', 'Checkbox'], ['select', 'Select'], ['url', 'URL'], ['email', 'Email'],
];
export const SANITIZE: Record<FieldType, string> = { text: 'sanitize_text_field', textarea: 'sanitize_textarea_field', number: 'absint', date: 'sanitize_text_field', checkbox: 'rest_sanitize_boolean', select: 'sanitize_key', url: 'esc_url_raw', email: 'sanitize_email' };
export const REST_TYPE: Record<FieldType, string> = { text: 'string', textarea: 'string', number: 'integer', date: 'string', checkbox: 'boolean', select: 'string', url: 'string', email: 'string' };

function fnSlug(s: string): string {
  return String(s || '').toLowerCase().trim().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
}
function metaSlug(s: string): string {
  return String(s || '').toLowerCase().trim().replace(/[^a-z0-9_]+/g, '_');
}
export function slugify(s: string): string {
  return String(s || '').toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
}
function pascal(s: string): string {
  return String(s || '').split(/[^A-Za-z0-9]+/).filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('_');
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

export interface DerivedField extends MetaBoxField {
  parsed: Choice[];
}

export interface Derived {
  pre: string;
  td: string;
  id: string;
  cls: string;
  isClass: boolean;
  metaPrefix: string;
  types: string[];
  fields: DerivedField[];
}

export function derive(mb: MetaBox): Derived {
  const pre = fnSlug(mb.prefix) || 'acme';
  const types = (mb.postTypes || []).slice();
  String(mb.customPostType || '').split(',').forEach((t) => {
    const s = slugify(t);
    if (s && types.indexOf(s) === -1) types.push(s);
  });
  return {
    pre,
    td: slugify(mb.textDomain) || pre.replace(/_/g, '-'),
    id: fnSlug(mb.id) || pre + '_details',
    cls: (pascal(mb.prefix || 'Acme') || 'Acme') + '_Meta_Box',
    isClass: mb.codeStyle === 'class',
    metaPrefix: metaSlug(mb.metaPrefix) || '_' + pre + '_',
    types,
    fields: (mb.fields || []).map((f) => ({ ...f, id: fnSlug(f.id) || 'field', parsed: parseChoices(f.choices) })),
  };
}

interface Block {
  name: string;
  hook?: string;
  params?: string;
  doc: string;
  body: string;
}

export function buildCode(mb: MetaBox, mode: OutputMode): string {
  const d = derive(mb);
  const pre = d.pre;
  const td = d.td;
  const isClass = d.isClass;
  const t = (s: string) => "__( '" + escPhp(s) + "', '" + td + "' )";
  const cb = (m: string) => (isClass ? "array( $this, '" + m + "' )" : "'" + pre + '_' + m + "'");
  const key = (f: DerivedField) => d.metaPrefix + f.id;
  const input = (f: DerivedField) => pre + '_' + f.id;
  const nonceField = pre + '_meta_nonce';
  const nonceAction = pre + '_save_meta';
  const blocks: Block[] = [];

  const typeList = d.types.length ? d.types.map((x) => "'" + escPhp(x) + "'").join(', ') : "'post'";
  blocks.push({
    name: 'add_box',
    hook: 'add_meta_boxes',
    doc: '/**\n * Register the meta box.\n */\n',
    body: 'add_meta_box(\n' + indent(["'" + escPhp(d.id) + "'", t(mb.title || 'Details'), cb('render'), 'array( ' + typeList + ' )', "'" + mb.context + "'", "'" + mb.priority + "'"].join(',\n'), 1) + '\n);',
  });

  let render = "wp_nonce_field( '" + nonceAction + "', '" + nonceField + "' );\n\n";
  render += d.fields.map((f) => {
    const v = '$' + f.id;
    const nm = input(f);
    const help = f.description ? "'<span class=\"description\">' . esc_html( " + t(f.description) + " ) . '</span>'" : "''";
    let s = v + " = get_post_meta( $post->ID, '" + key(f) + "', true );\n";
    if (f.type === 'textarea') {
      s += 'printf(\n\t\'<p><label for="' + nm + '"><strong>%1$s</strong></label><br /><textarea id="' + nm + '" name="' + nm + '" rows="4" class="widefat">%2$s</textarea>%3$s</p>\',\n\tesc_html( ' + t(f.label || f.id) + ' ),\n\tesc_textarea( ' + v + ' ),\n\t' + help + '\n);';
    } else if (f.type === 'checkbox') {
      s += 'printf(\n\t\'<p><label for="' + nm + '"><input type="checkbox" id="' + nm + '" name="' + nm + '" value="1"%1$s /> %2$s</label>%3$s</p>\',\n\tchecked( (bool) ' + v + ', true, false ),\n\tesc_html( ' + t(f.label || f.id) + ' ),\n\t' + help + '\n);';
    } else if (f.type === 'select') {
      s += 'echo \'<p><label for="' + nm + '"><strong>\' . esc_html( ' + t(f.label || f.id) + " ) . '</strong></label><br />';\necho '<select id=\"" + nm + '" name="' + nm + '">\';\n\nforeach ( array(\n' + indent(aligned(f.parsed.map((c) => [c.value, t(c.label)])), 1) + '\n) as $value => $label ) {\n\tprintf(\n\t\t\'<option value="%1$s"%2$s>%3$s</option>\',\n\t\tesc_attr( $value ),\n\t\tselected( ' + v + ', $value, false ),\n\t\tesc_html( $label )\n\t);\n}\n\necho \'</select></p>\';';
    } else {
      s += 'printf(\n\t\'<p><label for="' + nm + '"><strong>%1$s</strong></label><br /><input type="' + f.type + '" id="' + nm + '" name="' + nm + '" value="%2$s" class="widefat" />%3$s</p>\',\n\tesc_html( ' + t(f.label || f.id) + ' ),\n\tesc_attr( ' + v + ' ),\n\t' + help + '\n);';
    }
    return s;
  }).join('\n\n');
  if (!d.fields.length) render += '// Add a field to generate the form markup.';
  blocks.push({ name: 'render', params: '$post', doc: '/**\n * Print the box.\n *\n * @param WP_Post $post Post being edited.\n */\n', body: render });

  let save = '';
  if (mb.nonceCheck) save += "if ( ! isset( $_POST['" + nonceField + "'] ) || ! wp_verify_nonce( sanitize_key( $_POST['" + nonceField + "'] ), '" + nonceAction + "' ) ) {\n\treturn;\n}\n\n";
  if (mb.autosaveGuard) save += "if ( wp_is_post_autosave( $post_id ) || wp_is_post_revision( $post_id ) || ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) ) {\n\treturn;\n}\n\n";
  if (mb.capCheck) save += "if ( ! current_user_can( 'edit_post', $post_id ) ) {\n\treturn;\n}\n\n";
  if (mb.typeCheck && d.types.length) save += 'if ( ! in_array( get_post_type( $post_id ), array( ' + typeList + ' ), true ) ) {\n\treturn;\n}\n\n';
  save += d.fields.map((f) => {
    const post = "$_POST['" + input(f) + "']";
    if (f.type === 'checkbox') {
      return 'if ( ! empty( ' + post + " ) ) {\n\tupdate_post_meta( $post_id, '" + key(f) + "', 1 );\n} else {\n\tdelete_post_meta( $post_id, '" + key(f) + "' );\n}";
    }
    const sanitized = SANITIZE[f.type] + '( wp_unslash( ' + post + ' ) )';
    if (f.type === 'select' && f.parsed.length) {
      return 'if ( isset( ' + post + ' ) && in_array( sanitize_key( ' + post + ' ), array( ' + f.parsed.map((c) => "'" + c.value + "'").join(', ') + " ), true ) ) {\n\tupdate_post_meta( $post_id, '" + key(f) + "', sanitize_key( " + post + ' ) );\n}';
    }
    return 'if ( isset( ' + post + ' ) ) {\n\t$value = ' + sanitized + ";\n\n\tif ( '' === $value ) {\n\t\tdelete_post_meta( $post_id, '" + key(f) + "' );\n\t} else {\n\t\tupdate_post_meta( $post_id, '" + key(f) + "', $value );\n\t}\n}";
  }).join('\n\n');
  if (!d.fields.length) save += '// Nothing to save yet.';
  blocks.push({ name: 'save', params: '$post_id', hook: 'save_post', doc: '/**\n * Save the fields.\n *\n * @param int $post_id Post being saved.\n */\n', body: save });

  if (mb.registerMeta) {
    const regs = d.fields.map((f) => {
      const pairs: [string, string][] = [['type', "'" + REST_TYPE[f.type] + "'"], ['single', 'true'], ['show_in_rest', 'true'], ['sanitize_callback', "'" + SANITIZE[f.type] + "'"], ['auth_callback', "function () {\n\treturn current_user_can( 'edit_posts' );\n}"]];
      return 'register_post_meta(\n' + indent("'" + escPhp(d.types[0] || 'post') + "',\n'" + key(f) + "',\narray(\n" + indent(aligned(pairs), 1) + '\n)', 1) + '\n);';
    }).join('\n\n');
    blocks.push({ name: 'register_meta', hook: 'init', doc: '/**\n * Expose the meta to the REST API so blocks and the editor can read it.\n */\n', body: regs || '// Add a field first.' });
  }

  let out = '';
  if (mode === 'plugin') {
    out += '<?php\n/**\n * Plugin Name:       ' + (mb.title || 'Meta box') + '\n * Description:       Adds the ' + (mb.title || 'details') + ' meta box to ' + (d.types.join(', ') || 'posts') + '.\n * Version:           1.0.0\n * Requires PHP:      7.4\n * Text Domain:       ' + td + "\n */\n\ndefined( 'ABSPATH' ) || exit;\n\n";
  } else if (mode === 'functions') {
    out += "<?php\n// Add to your theme's functions.php.\n\n";
  }

  if (isClass) {
    out += 'final class ' + d.cls + ' {\n\n';
    const hookLines = blocks.filter((b) => b.hook).map((b) => "add_action( '" + b.hook + "', array( $this, '" + b.name + "' ) );");
    out += '\t/**\n\t * Wire the class into WordPress.\n\t */\n\tpublic function hooks() {\n' + indent(hookLines.join('\n'), 2) + '\n\t}\n\n';
    blocks.forEach((b) => { out += indent(b.doc, 1) + '\tpublic function ' + b.name + (b.params ? '( ' + b.params + ' )' : '()') + ' {\n' + indent(b.body, 2) + '\n\t}\n\n'; });
    out += '}\n\n( new ' + d.cls + '() )->hooks();\n';
  } else {
    out += blocks.map((b) => {
      let s = b.doc + 'function ' + pre + '_' + b.name + (b.params ? '( ' + b.params + ' )' : '()') + ' {\n' + indent(b.body, 1) + '\n}\n';
      if (b.hook) s += "add_action( '" + b.hook + "', '" + pre + '_' + b.name + "' );\n";
      return s;
    }).join('\n');
  }
  return withCredit(out);
}

export function validate(mb: MetaBox): ValidationIssue[] {
  const d = derive(mb);
  const out: ValidationIssue[] = [];
  const add = (severity: ValidationIssue['severity'], message: string, fix?: string, fixLabel?: string) => out.push({ severity, message, fix, fixLabel });
  if (!String(mb.title || '').trim()) add('error', 'A title is required — the box renders with an empty header otherwise.');
  if (!String(mb.id || '').trim()) add('error', 'A box id is required. It is the key for user hidden-box preferences and remove_meta_box().');
  if (!d.types.length) add('error', 'No post type selected, so the box will not appear on any edit screen.', 'addPost', 'Add post');
  if (!d.fields.length) add('warning', 'No fields yet, so the box renders an empty panel.');
  if (!mb.nonceCheck) add('error', 'No nonce check in the save handler. Without it any request that hits save_post can write your meta — this is the one guard you cannot skip.', 'addNonce', 'Add the nonce check');
  if (!mb.autosaveGuard) add('error', 'No autosave or revision guard. save_post fires for autosaves and for each revision, so your fields will be overwritten with empty values as soon as the editor autosaves.', 'addAutosave', 'Add the guard');
  if (!mb.capCheck) add('error', "No current_user_can( 'edit_post', $post_id ) check. Nonce verification proves the request came from your form, not that this user may edit this post.", 'addCap', 'Add the check');
  if (!mb.typeCheck && d.types.length > 0) add('recommendation', 'save_post fires for every post type. A get_post_type() check keeps the handler from running on unrelated saves.', 'addTypeCheck', 'Add the check');
  const seen: Record<string, boolean> = {};
  d.fields.forEach((f) => {
    if (seen[f.id]) add('error', `Two fields share the key "${f.id}" — one will overwrite the other on save.`);
    seen[f.id] = true;
    if (!String(f.label || '').trim()) add('warning', `The field "${f.id}" has no label, so it renders as a bare input.`);
    if (f.type === 'select' && !f.parsed.length) add('error', `The select "${f.id}" has no choices, so it renders empty and never saves.`, 'addChoices', 'Add two choices');
    if (f.type === 'number' && SANITIZE[f.type] === 'absint') add('recommendation', `"${f.id}" sanitises with absint(), which drops decimals and negatives. Swap it for floatval() in the generated code if you need either.`);
    if (['content', 'excerpt', 'title', 'post_name', 'order', 'menu_order', 'tags_input', 'status', 'visibility', 'password', 'author'].indexOf(f.id) >= 0) add('recommendation', `"${f.id}" is also a core editor field name. The generated inputs post as ${d.pre}_${f.id} so nothing collides, but a less overloaded key will read better in six months.`);
  });
  if (d.metaPrefix.charAt(0) !== '_') add('recommendation', 'The meta prefix does not start with an underscore, so these values appear in the Custom Fields panel and can be edited by hand. Fine if that is deliberate.', 'protectKeys', 'Add the underscore');
  if (mb.registerMeta && d.types.length > 1) add('recommendation', `register_post_meta() is generated for "${d.types[0]}" only. Repeat the call per post type, or pass an empty string to register for all of them.`);
  if (!mb.registerMeta) add('recommendation', 'Without register_post_meta() the values stay invisible to the REST API and to the block editor — fine for a classic box, a problem the moment a block needs to read them.');
  if (d.types.indexOf('page') >= 0 && mb.context === 'normal') add('recommendation', 'On pages the normal context sits under the content, where clients scroll past it. side is more visible for one or two fields.');
  return out;
}

export function freshProject(): MetaBox {
  return {
    prefix: 'acme', textDomain: 'acme', codeStyle: 'procedural',
    id: 'acme_event_details', title: 'Event details',
    context: 'side', priority: 'default', metaPrefix: '_acme_',
    postTypes: ['post'], customPostType: 'event',
    fields: [
      { id: 'start_date', label: 'Start date', type: 'date', description: 'When the event begins.', choices: '' },
      { id: 'venue', label: 'Venue', type: 'text', description: '', choices: '' },
      { id: 'format', label: 'Format', type: 'select', description: '', choices: 'online:Online, venue:In person, hybrid:Hybrid' },
      { id: 'sold_out', label: 'Sold out', type: 'checkbox', description: 'Hides the booking button on the front end.', choices: '' },
    ],
    nonceCheck: true, autosaveGuard: true, capCheck: true, typeCheck: true, registerMeta: true,
  };
}

export function applyFix(mb: MetaBox, kind: string): MetaBox {
  const p: MetaBox = JSON.parse(JSON.stringify(mb));
  if (kind === 'addNonce') p.nonceCheck = true;
  if (kind === 'addAutosave') p.autosaveGuard = true;
  if (kind === 'addCap') p.capCheck = true;
  if (kind === 'addTypeCheck') p.typeCheck = true;
  if (kind === 'addPost') { p.postTypes = p.postTypes || []; if (p.postTypes.indexOf('post') === -1) p.postTypes.push('post'); }
  if (kind === 'protectKeys') p.metaPrefix = '_' + metaSlug(p.metaPrefix);
  if (kind === 'addChoices') p.fields.forEach((f) => { if (f.type === 'select' && !parseChoices(f.choices).length) f.choices = 'first:First, second:Second'; });
  return p;
}
