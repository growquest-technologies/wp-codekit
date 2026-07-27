import { escPhp, slugify as sharedSlugify, withCredit, type ValidationIssue } from '../lib/codegen';

export type OutputMode = 'snippet' | 'functions' | 'plugin';
export type AttrType = 'text' | 'number' | 'bool' | 'url' | 'color' | 'select' | 'id';

export interface ShortcodeAttr {
  name: string;
  type: AttrType;
  def: string;
  choices: string;
  description: string;
}

export interface Shortcode {
  tag: string;
  fnPrefix: string;
  textDomain: string;
  attrs: ShortcodeAttr[];
  markup: string;
  enclosing: boolean;
  inWidgets: boolean;
  inExcerpts: boolean;
}

export const CORE_TAGS = ['gallery', 'caption', 'wp_caption', 'embed', 'audio', 'video', 'playlist', 'kses', 'shortcode'];

export const TYPE_INFO: Record<AttrType, { sanitize: string | null; escape: string | null; def: string }> = {
  text: { sanitize: 'sanitize_text_field', escape: 'esc_html', def: 'Our team' },
  number: { sanitize: null, escape: 'absint', def: '3' },
  bool: { sanitize: null, escape: null, def: 'false' },
  url: { sanitize: null, escape: 'esc_url', def: 'https://example.com' },
  color: { sanitize: 'sanitize_hex_color', escape: 'esc_attr', def: '#3858E9' },
  select: { sanitize: null, escape: 'esc_attr', def: 'grid' },
  id: { sanitize: null, escape: 'absint', def: '0' },
};

const SCRIPT_RE = new RegExp('<\\s*scr' + 'ipt|onerror\\s*=|onclick\\s*=', 'i');

/** Shortcode tags/attrs allow dashes to survive (only underscores get collapsed), unlike the shared slugify. */
export function slugify(s: string, max?: number): string {
  const out = String(s || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return max ? out.slice(0, max) : out;
}

export function csv(s: string): string[] {
  return String(s || '').split(',').map((x) => x.trim()).filter(Boolean);
}

export function varName(name: string): string {
  return '$' + slugify(name).replace(/^(\d)/, '_$1');
}

export function usedTokens(markup: string): string[] {
  const out: string[] = [];
  const re = /\{([a-zA-Z0-9_]+)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(markup)) !== null) if (out.indexOf(m[1]) === -1) out.push(m[1]);
  return out;
}

function prepLine(attr: ShortcodeAttr): string {
  const key = "$atts['" + slugify(attr.name) + "']";
  if (attr.type === 'bool') return varName(attr.name) + ' = filter_var( ' + key + ', FILTER_VALIDATE_BOOLEAN );';
  if (attr.type === 'number' || attr.type === 'id') return varName(attr.name) + ' = absint( ' + key + ' );';
  if (attr.type === 'url') return varName(attr.name) + ' = esc_url( ' + key + ' );';
  if (attr.type === 'color') return varName(attr.name) + ' = sanitize_hex_color( ' + key + ' );';
  if (attr.type === 'select') {
    const choices = csv(attr.choices);
    return varName(attr.name) + ' = in_array( ' + key + ', array( ' + choices.map((c) => "'" + escPhp(c) + "'").join(', ') + ' ), true ) ? ' + key + " : '" + escPhp(choices[0] || '') + "';";
  }
  return varName(attr.name) + ' = sanitize_text_field( ' + key + ' );';
}

function outputExpr(attr: ShortcodeAttr): string {
  if (attr.type === 'bool') return varName(attr.name) + " ? 'true' : 'false'";
  if (attr.type === 'number' || attr.type === 'id' || attr.type === 'url' || attr.type === 'color') return varName(attr.name);
  if (attr.type === 'select') return 'esc_attr( ' + varName(attr.name) + ' )';
  return 'esc_html( ' + varName(attr.name) + ' )';
}

function phpQuoted(text: string): string {
  return "'" + escPhp(text).replace(/\n/g, "' . \"\\n\" .\n\t\t'") + "'";
}

export function buildCode(sc: Shortcode, mode: OutputMode): string {
  const tag = slugify(sc.tag) || 'my_shortcode';
  const prefix = slugify(sc.fnPrefix) || 'mytheme';
  const fn = prefix + '_' + tag + '_shortcode';
  const td = escPhp(sc.textDomain || 'textdomain');
  const attrs = sc.attrs.filter((a) => slugify(a.name));

  let doc = '/**\n * [' + tag + '] shortcode.\n *\n';
  if (attrs.length) {
    doc += ' * @param array $atts {\n *     Shortcode attributes.\n *\n';
    const w = attrs.reduce((m, a) => Math.max(m, slugify(a.name).length), 0);
    attrs.forEach((a) => {
      const t = a.type === 'bool' ? 'bool' : a.type === 'number' || a.type === 'id' ? 'int' : 'string';
      doc += ' *     @type ' + t + ' $' + slugify(a.name) + ' '.repeat(Math.max(1, w - slugify(a.name).length + 1)) + (a.description || 'Attribute.') + ' Default ' + (a.def === '' ? "''" : "'" + a.def + "'") + '.\n';
    });
    doc += ' * }\n';
  } else {
    doc += ' * @param array $atts Shortcode attributes. Unused.\n';
  }
  if (sc.enclosing) doc += ' * @param string $content Enclosed content.\n';
  doc += ' * @return string Rendered HTML.\n */\n';

  let body = 'function ' + fn + '( $atts' + (sc.enclosing ? " = array(), $content = ''" : '') + ' ) {\n';

  if (attrs.length) {
    const w = attrs.reduce((m, a) => Math.max(m, slugify(a.name).length), 0);
    body += '\t$atts = shortcode_atts(\n\t\tarray(\n';
    attrs.forEach((a) => { body += "\t\t\t'" + slugify(a.name) + "'" + ' '.repeat(w - slugify(a.name).length) + " => '" + escPhp(a.def) + "',\n"; });
    body += "\t\t),\n\t\t$atts,\n\t\t'" + tag + "'\n\t);\n\n";
    attrs.forEach((a) => { body += '\t' + prepLine(a) + '\n'; });
    body += '\n';
  }
  if (sc.enclosing) body += '\t$inner = wp_kses_post( do_shortcode( $content ) );\n\n';

  const exprs: string[] = [];
  let template = String(sc.markup || '').replace(/\{([a-zA-Z0-9_]+)\}/g, (full, name) => {
    const attr = attrs.filter((a) => slugify(a.name) === name)[0];
    if (attr) { exprs.push(outputExpr(attr)); return '%s'; }
    if (sc.enclosing && name === 'content') { exprs.push('$inner'); return '%s'; }
    return full;
  });
  template = template.replace(/%(?!s)/g, '%%');

  if (exprs.length) {
    body += '\treturn sprintf(\n\t\t' + phpQuoted(template) + ',\n' + exprs.map((e) => '\t\t' + e).join(',\n') + '\n\t);\n';
  } else {
    body += '\treturn ' + phpQuoted(template) + ';\n';
  }
  body += '}\n';

  let out = doc + body;
  if (mode === 'plugin') {
    out = '<?php\n/**\n * Plugin Name:       [' + tag + '] shortcode\n * Description:       Registers the [' + tag + '] shortcode.\n * Version:           1.0.0\n * Requires PHP:      7.4\n * Text Domain:       ' + td + '\n */\n\ndefined( \'ABSPATH\' ) || exit;\n\n' + out;
  } else if (mode === 'functions') {
    out = "<?php\n// Add to your theme's functions.php.\n\n" + out;
  }
  out += "add_shortcode( '" + tag + "', '" + fn + "' );\n";
  if (sc.inWidgets) out += "\n// Run shortcodes inside classic text widgets.\nadd_filter( 'widget_text', 'do_shortcode' );\n";
  if (sc.inExcerpts) out += "\n// Run shortcodes inside excerpts.\nadd_filter( 'the_excerpt', 'do_shortcode' );\n";
  return withCredit(out);
}

export function validate(sc: Shortcode): ValidationIssue[] {
  const out: ValidationIssue[] = [];
  const add = (severity: ValidationIssue['severity'], message: string, fix?: string, fixLabel?: string) => out.push({ severity, message, fix, fixLabel });
  const tag = sc.tag || '';
  if (!tag) add('error', 'A shortcode tag is required.');
  else {
    if (tag !== tag.toLowerCase()) add('error', 'Shortcode tags are case sensitive — use lowercase so editors can actually type it.', 'lowerTag', 'Lowercase it');
    if (/[\s[\]<>&/]/.test(tag)) add('error', 'Tags cannot contain spaces, brackets, slashes or ampersands.', 'sanitizeTag', 'Clean the tag');
    if (tag.indexOf('-') !== -1) add('warning', 'Dashes work but underscores are the WordPress convention and avoid confusion with HTML attributes.');
    if (CORE_TAGS.indexOf(tag) !== -1) add('error', `"${tag}" is a core WordPress shortcode — registering it overrides core behaviour.`, 'prefixTag', 'Prefix the tag');
    else if (tag.indexOf('_') === -1 && tag.length < 12) add('recommendation', `Prefix the tag (e.g. "${sharedSlugify(sc.fnPrefix, 6) || 'acme'}_${tag}") so another plugin cannot claim the same name.`, 'prefixTag', 'Add a prefix');
  }
  if (!String(sc.markup).trim()) add('error', 'Output markup is empty — the shortcode would render nothing.');
  const names: string[] = [];
  sc.attrs.forEach((a, i) => {
    const n = slugify(a.name);
    if (!n) { add('error', `Attribute ${i + 1} has no name.`); return; }
    if (a.name !== a.name.toLowerCase()) add('error', `Attribute "${a.name}" has uppercase letters — WordPress lowercases attribute keys, so it would never match.`, 'lowerAttrs', 'Lowercase attributes');
    if (names.indexOf(n) !== -1) add('error', `Attribute "${n}" is declared twice.`);
    names.push(n);
    if (a.type === 'select' && !csv(a.choices).length) add('error', `Attribute "${n}" is a choice list with no choices.`);
    if (a.type === 'select' && csv(a.choices).length && a.def && csv(a.choices).indexOf(a.def) === -1) add('warning', `Default "${a.def}" for "${n}" is not one of its choices, so it falls back to "${csv(a.choices)[0]}".`);
    if (a.def === '' && a.type !== 'text') add('recommendation', `Attribute "${n}" has no default — shortcode_atts passes an empty string to the sanitiser.`);
  });
  const tokens = usedTokens(sc.markup);
  const unknown = tokens.filter((t) => names.indexOf(t) === -1 && !(sc.enclosing && t === 'content'));
  if (unknown.length) add('warning', 'Markup references ' + unknown.map((u) => '{' + u + '}').join(', ') + ' which no attribute provides — it renders as literal text.');
  const unused = names.filter((n) => tokens.indexOf(n) === -1);
  if (unused.length) add('recommendation', 'Declared but never output: ' + unused.join(', ') + '.');
  if (sc.enclosing && tokens.indexOf('content') === -1) add('warning', 'Enclosing mode is on but the markup never places {content}, so the wrapped text disappears.');
  if (SCRIPT_RE.test(sc.markup)) add('warning', 'Inline scripts and event handlers get stripped by wp_kses for most roles — enqueue a script instead.');
  if (/\becho\b/.test(sc.markup)) add('recommendation', 'Shortcodes must return their markup, never echo it — anything echoed jumps to the top of the page.');
  return out;
}

export function freshProject(): Shortcode {
  return {
    tag: 'team_grid', fnPrefix: 'mytheme', textDomain: 'textdomain',
    attrs: [
      { name: 'title', type: 'text', def: 'Our team', choices: '', description: 'Heading shown above the grid.' },
      { name: 'columns', type: 'number', def: '3', choices: '', description: 'How many columns to render.' },
      { name: 'layout', type: 'select', def: 'grid', choices: 'grid, list', description: 'Grid or single-column list.' },
    ],
    markup: '<section class="team-grid team-grid--{layout}" style="--columns: {columns}">\n\t<h2 class="team-grid__title">{title}</h2>\n</section>',
    enclosing: false, inWidgets: false, inExcerpts: false,
  };
}

export function applyFix(sc: Shortcode, kind: string): Shortcode {
  const p: Shortcode = JSON.parse(JSON.stringify(sc));
  if (kind === 'lowerTag') p.tag = p.tag.toLowerCase();
  if (kind === 'sanitizeTag') p.tag = slugify(p.tag);
  if (kind === 'prefixTag') p.tag = slugify((slugify(p.fnPrefix, 6) || 'acme') + '_' + p.tag);
  if (kind === 'lowerAttrs') p.attrs.forEach((a) => { a.name = slugify(a.name); });
  return p;
}
