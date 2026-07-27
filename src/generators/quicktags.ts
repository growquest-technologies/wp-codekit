import { escPhp, slugify as baseSlugify, withCredit, type ValidationIssue } from '../lib/codegen';

export type OutputMode = 'snippet' | 'functions' | 'plugin' | 'js';
export type ButtonType = 'wrap' | 'insert' | 'prompt';
export type Delivery = 'inline' | 'file';

export interface QuicktagsButton {
  label: string;
  id: string;
  type: ButtonType;
  open: string;
  close: string;
  accessKey: string;
  priority: string;
  title: string;
  promptLabel?: string;
}

export interface Quicktags {
  prefix: string;
  textDomain: string;
  delivery: Delivery;
  instance: string;
  postTypes: string[];
  removedCore: string[];
  buttons: QuicktagsButton[];
}

const SCRIPT_OPEN = '<' + 'script>';
const SCRIPT_CLOSE = '</' + 'script>';

export const CORE_BUTTONS: [string, string, number, string][] = [
  ['strong', 'b', 10, 'Bold — wraps the selection in a strong tag.'],
  ['em', 'i', 20, 'Italic — wraps the selection in an em tag.'],
  ['link', 'a', 30, 'Prompts for a URL and wraps the selection in a link.'],
  ['block', 'q', 40, 'Blockquote.'],
  ['del', 'd', 50, 'Struck-through text with a timestamp.'],
  ['ins', 's', 60, 'Inserted text with a timestamp.'],
  ['img', 'm', 70, 'Prompts for an image URL and alt text.'],
  ['ul', 'u', 80, 'Unordered list wrapper.'],
  ['ol', 'o', 90, 'Ordered list wrapper.'],
  ['li', 'l', 100, 'List item.'],
  ['code', 'c', 110, 'Inline code.'],
  ['more', 't', 120, 'The read more separator.'],
  ['close', '', 130, 'Closes whatever tag is still open. Removing it strands authors mid-tag.'],
];
export const CORE_IDS = CORE_BUTTONS.map((b) => b[0]);
const CORE_KEYS: Record<string, string> = {};
CORE_BUTTONS.forEach((b) => {
  if (b[1]) CORE_KEYS[b[1]] = b[0];
});

export const PRESETS: { label: string; b: QuicktagsButton }[] = [
  { label: 'lead paragraph', b: { label: 'lead', id: 'lead', type: 'wrap', open: '<p class="lead">', close: '</p>', accessKey: '', priority: '1', title: 'Lead paragraph' } },
  { label: 'shortcode', b: { label: 'cta', id: 'cta', type: 'wrap', open: '[cta]', close: '[/cta]', accessKey: '', priority: '205', title: 'Call to action shortcode' } },
  { label: 'callout', b: { label: 'note', id: 'note', type: 'insert', open: '<div class="callout"></div>', close: '', accessKey: '', priority: '210', title: 'Callout box' } },
  { label: 'prompt', b: { label: 'ref', id: 'ref', type: 'prompt', open: '<sup><a href="#fn-%s">%s</a></sup>', close: '', promptLabel: 'Footnote number', accessKey: '', priority: '215', title: 'Footnote reference' } },
];

export const POST_TYPES = ['post', 'page', 'product', 'docs'];

function fnSlug(s: string): string {
  return baseSlugify(s).replace(/-/g, '_');
}
function jsId(s: string): string {
  return String(s || '').trim().replace(/[^A-Za-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
}
function indent(text: string, depth: number): string {
  const pad = '\t'.repeat(depth);
  return text.split('\n').map((l) => (l ? pad + l : '')).join('\n');
}

export interface DerivedQuicktags {
  pre: string;
  td: string;
  handle: string;
  buttons: QuicktagsButton[];
  kept: string[];
  prunes: string[];
}

export function derive(qt: Quicktags): DerivedQuicktags {
  const pre = fnSlug(qt.prefix) || 'acme';
  const buttons = (qt.buttons || []).filter((b) => String(b.label || '').trim() || String(b.id || '').trim());
  const kept = CORE_IDS.filter((id) => (qt.removedCore || []).indexOf(id) < 0);
  return {
    pre,
    td: baseSlugify(qt.textDomain) || pre.replace(/_/g, '-'),
    handle: pre.replace(/_/g, '-') + '-quicktags',
    buttons,
    kept,
    prunes: (qt.removedCore || []).slice(),
  };
}

export function buttonId(pre: string, b: QuicktagsButton): string {
  const raw = jsId(b.id) || jsId(b.label);
  if (!raw) return '';
  return raw.indexOf(pre) === 0 ? raw : pre + '_' + raw;
}

function buildButtonCall(qt: Quicktags, b: QuicktagsButton, depth: number): string {
  const d = derive(qt);
  const id = buttonId(d.pre, b);
  const key = String(b.accessKey || '').slice(0, 1);
  const title = String(b.title || '').trim();
  const priority = String(b.priority || '').trim();
  const instance = String(qt.instance || '');

  if (b.type === 'prompt') {
    const parts = String(b.open || '').split('%s');
    const expr = parts.map((p) => "'" + escPhp(p) + "'").join(' + value + ');
    const fn =
      'function () {\n' +
      "\tvar value = window.prompt( '" + escPhp(b.promptLabel || 'Value') + "' );\n\n" +
      '\tif ( ! value ) {\n\t\treturn;\n\t}\n\n' +
      '\tQTags.insertContent( ' + expr + ' );\n}';
    const args = ["'" + id + "'", "'" + escPhp(b.label) + "'", fn, "''", "'" + escPhp(key) + "'", "'" + escPhp(title) + "'", priority || '0'];
    if (instance) args.push("'" + instance + "'");
    return indent('QTags.addButton(\n' + indent(args.join(',\n'), 1) + '\n);', depth);
  }

  const args = ["'" + id + "'", "'" + escPhp(b.label) + "'", "'" + escPhp(b.open) + "'", "'" + escPhp(b.type === 'insert' ? '' : b.close) + "'"];
  const tail = [key, title, priority, instance];
  let lastSet = -1;
  tail.forEach((v, i) => {
    if (String(v || '').length) lastSet = i;
  });
  if (lastSet >= 0) args.push("'" + escPhp(key) + "'");
  if (lastSet >= 1) args.push("'" + escPhp(title) + "'");
  if (lastSet >= 2) args.push(priority || '0');
  if (lastSet >= 3) args.push("'" + instance + "'");

  const oneLine = 'QTags.addButton( ' + args.join(', ') + ' );';
  if (oneLine.length + depth * 4 <= 96) return indent(oneLine, depth);
  return indent('QTags.addButton(\n' + indent(args.join(',\n'), 1) + '\n);', depth);
}

function buildJs(qt: Quicktags, depth: number): string {
  const d = derive(qt);
  if (!d.buttons.length) return indent('// No custom buttons registered.', depth);
  return d.buttons.map((b) => buildButtonCall(qt, b, depth)).join('\n\n');
}

function buildJsFile(qt: Quicktags): string {
  return (
    '/**\n * Text tab buttons for the classic editor.\n *\n * Enqueued with quicktags as a dependency, so QTags exists by the time this runs.\n */\n( function () {\n' +
    "\tif ( typeof window.QTags === 'undefined' ) {\n\t\treturn;\n\t}\n\n" +
    buildJs(qt, 1) +
    '\n} )();\n'
  );
}

function buildPruneBlock(qt: Quicktags): string {
  const d = derive(qt);
  if (!d.prunes.length) return '';
  return (
    '\n/**\n * Drop the core buttons this site does not use.\n *\n * @param array  $settings  Quicktags settings.\n * @param string $editor_id The editor being rendered.\n * @return array\n */\nfunction ' +
    d.pre +
    '_quicktags_settings( $settings, $editor_id ) {\n' +
    (qt.instance ? "\tif ( '" + escPhp(qt.instance) + "' !== $editor_id ) {\n\t\treturn $settings;\n\t}\n\n" : '') +
    "\t$settings['buttons'] = '" + d.kept.join(',') + "';\n\n\treturn $settings;\n}\nadd_filter( 'quicktags_settings', '" + d.pre + "_quicktags_settings', 10, 2 );\n"
  );
}

export function buildCode(qt: Quicktags, mode: OutputMode): string {
  const d = derive(qt);
  if (mode === 'js') return buildJsFile(qt);

  let out = '';
  if (mode === 'plugin') {
    out += '<?php\n/**\n * Plugin Name:       ' + (qt.prefix || 'Acme') + ' quicktags\n * Description:       Adds ' + d.buttons.length + ' button' + (d.buttons.length === 1 ? '' : 's') + ' to the Text tab of the classic editor.\n * Version:           1.0.0\n * Requires PHP:      7.4\n * Text Domain:       ' + d.td + "\n */\n\ndefined( 'ABSPATH' ) || exit;\n\n";
  } else if (mode === 'functions') {
    out += "<?php\n// Add to your theme's functions.php.\n\n";
  }

  let gate = '';
  if ((qt.postTypes || []).length) {
    gate = '$screen = get_current_screen();\n\nif ( ! $screen || ! in_array( $screen->post_type, array( ' + qt.postTypes.map((p) => "'" + escPhp(p) + "'").join(', ') + " ), true ) ) {\n\treturn;\n}\n";
  }

  if (qt.delivery === 'file') {
    const uri = mode === 'functions' ? "get_theme_file_uri( 'js/quicktags.js' )" : "plugins_url( 'js/quicktags.js', __FILE__ )";
    out +=
      '/**\n * Enqueue the Text tab buttons.\n *\n * quicktags as a dependency guarantees the script loads after QTags exists.\n *\n * @param string $hook_suffix The current admin screen.\n */\nfunction ' +
      d.pre +
      '_quicktags_assets( $hook_suffix ) {\n' +
      "\tif ( ! in_array( $hook_suffix, array( 'post.php', 'post-new.php', 'comment.php' ), true ) ) {\n\t\treturn;\n\t}\n\n" +
      (gate ? indent(gate, 1) + '\n' : '') +
      "\twp_enqueue_script(\n\t\t'" + d.handle + "',\n\t\t" + uri + ",\n\t\tarray( 'quicktags' ),\n\t\t'1.0.0',\n\t\ttrue\n\t);\n}\nadd_action( 'admin_enqueue_scripts', '" + d.pre + "_quicktags_assets' );\n";
  } else {
    out +=
      '/**\n * Print the Text tab buttons in the admin footer.\n *\n * wp_script_is() keeps this off every screen that never rendered an editor.\n */\nfunction ' +
      d.pre +
      '_quicktags_buttons() {\n' +
      "\tif ( ! wp_script_is( 'quicktags' ) ) {\n\t\treturn;\n\t}\n\n" +
      (gate ? indent(gate, 1) + '\n' : '') +
      '\t?>\n\t' + SCRIPT_OPEN + "\n\t( function () {\n\t\tif ( typeof QTags === 'undefined' ) {\n\t\t\treturn;\n\t\t}\n\n" +
      buildJs(qt, 2) +
      '\n\t} )();\n\t' + SCRIPT_CLOSE + '\n\t<?php\n}\n' +
      "add_action( 'admin_print_footer_scripts', '" + d.pre + "_quicktags_buttons' );\n";
  }

  out += buildPruneBlock(qt);
  return withCredit(out);
}

export function freshProject(): Quicktags {
  return {
    prefix: 'acme', textDomain: 'acme', delivery: 'inline', instance: '', postTypes: [],
    removedCore: [],
    buttons: [
      { label: 'lead', id: 'lead', type: 'wrap', open: '<p class="lead">', close: '</p>', accessKey: '', priority: '1', title: 'Lead paragraph' },
      { label: 'cta', id: 'cta', type: 'wrap', open: '[cta]', close: '[/cta]', accessKey: '', priority: '205', title: 'Call to action shortcode' },
      { label: 'ref', id: 'ref', type: 'prompt', open: '<sup><a href="#fn-%s">%s</a></sup>', close: '', promptLabel: 'Footnote number', accessKey: '', priority: '210', title: 'Footnote reference' },
    ],
  };
}

export function validate(qt: Quicktags): ValidationIssue[] {
  const d = derive(qt);
  const out: ValidationIssue[] = [];
  const add = (severity: ValidationIssue['severity'], message: string, targetId?: string, fix?: string, fixLabel?: string) => out.push({ severity, message, targetId, fix, fixLabel });

  if (!d.buttons.length && !d.prunes.length) add('error', 'Nothing to generate — add a button or remove a core one.', 'buttons');

  const seenId: Record<string, boolean> = {}, seenKey: Record<string, boolean> = {}, seenPriority: Record<string, boolean> = {};
  d.buttons.forEach((b, i) => {
    const label = 'Button ' + (i + 1) + (b.label ? ' (' + b.label + ')' : '');
    const id = buttonId(d.pre, b);
    if (!String(b.label || '').trim()) add('error', label + ' has no display label. Core skips any button registered without one.', 'buttons');
    if (String(b.label || '').length > 10) add('recommendation', label + '’s label is ' + String(b.label).length + ' characters. The Text tab toolbar wraps early — core keeps its own labels under five.', 'buttons');
    if (String(b.id || '').trim() && jsId(b.id) !== String(b.id).trim()) add('error', '“' + b.id + '” is not a valid button id. It becomes a DOM id and a JS property — letters, numbers and underscores only.', 'buttons', 'fixIds', 'Clean the ids');
    if (seenId[id]) add('error', 'Two buttons resolve to the id “' + id + '”. The second silently replaces the first.', 'buttons');
    seenId[id] = true;
    if (CORE_IDS.indexOf(id) >= 0) add('warning', label + ' uses the core id “' + id + '”, so it replaces core’s own button rather than adding one.', 'buttons', 'prefixIds', 'Prefix the ids');
    if (b.type === 'wrap' && !String(b.open || '').trim() && !String(b.close || '').trim()) add('error', label + ' wraps the selection in nothing.', 'buttons');
    if (b.type === 'insert' && !String(b.open || '').trim()) add('error', label + ' inserts an empty string.', 'buttons');
    if (b.type === 'prompt' && String(b.open || '').indexOf('%s') < 0) add('warning', label + ' prompts for a value but its template has no %s, so the answer is thrown away.', 'buttons');
    if (b.type === 'prompt' && String(b.open || '').split('%s').length > 2) add('recommendation', label + ' uses %s ' + (String(b.open).split('%s').length - 1) + ' times, so the answer is inserted at each one — right for a footnote reference, worth a second look otherwise.', 'buttons');
    if (b.type === 'wrap') {
      const om = /^<([a-z][a-z0-9]*)/i.exec(String(b.open || ''));
      const cm = /<\/([a-z][a-z0-9]*)\s*>\s*$/i.exec(String(b.close || ''));
      if (om && !cm) add('warning', label + ' opens a ' + om[1] + ' tag and never closes it. Authors will be relying on the close button to notice.', 'buttons', 'closeTags', 'Close the tag');
      else if (om && cm && om[1].toLowerCase() !== cm[1].toLowerCase()) add('error', label + ' opens a ' + om[1] + ' tag but closes ' + cm[1] + '.', 'buttons');
    }
    const key = String(b.accessKey || '');
    if (key.length > 1) add('error', label + '’s access key must be a single character.', 'buttons', 'trimKeys', 'Keep the first character');
    if (key.length === 1) {
      if (CORE_KEYS[key.toLowerCase()]) add('warning', label + ' takes access key “' + key + '”, which core already uses for the ' + CORE_KEYS[key.toLowerCase()] + ' button.', 'buttons');
      if (seenKey[key.toLowerCase()]) add('error', 'Access key “' + key + '” is assigned twice in your own set.', 'buttons');
      seenKey[key.toLowerCase()] = true;
    }
    const p = String(b.priority || '').trim();
    if (p && !/^\d+$/.test(p)) add('error', label + '’s priority must be a number.', 'buttons');
    if (p && seenPriority[p]) add('recommendation', 'Two buttons share priority ' + p + '. They fall back to registration order, which works but is not explicit.', 'buttons');
    if (p) seenPriority[p] = true;
    if (p && parseInt(p, 10) > 0 && parseInt(p, 10) < 10) add('recommendation', label + ' sits before core’s bold button. Deliberate placement is fine — just check it is what you meant.', 'buttons');
    if (/onerror=|javascript:|<scr/i.test(String(b.open || '') + String(b.close || ''))) add('error', label + ' inserts script markup into post content. KSES strips it for anyone below an administrator.', 'buttons');
  });

  if (d.prunes.indexOf('close') >= 0) add('warning', 'Removing the close button leaves authors no way to close an open tag from the toolbar.', 'removedCore');
  if (d.prunes.indexOf('link') >= 0) add('recommendation', 'Without the link button the Text tab has no link helper at all — authors hand-write the anchor.', 'removedCore');
  if (d.prunes.length && !d.kept.length) add('error', 'Every core button is removed, which leaves an empty toolbar strip above the textarea.', 'removedCore');
  if (qt.delivery === 'inline' && (qt.postTypes || []).length === 0) add('recommendation', 'The inline script prints on every admin screen that loaded an editor, including comment replies. Limit it to post types if these buttons only make sense on one.', 'postTypes');
  if (qt.delivery === 'file') add('recommendation', 'Ship js/quicktags.js alongside the PHP — the JavaScript tab has the file contents.', 'delivery');
  if (qt.instance && qt.delivery === 'inline' && !d.prunes.length) add('recommendation', 'Scoping to the “' + qt.instance + '” instance only affects the buttons; the script itself still prints on every editor screen.', 'instance');
  add('recommendation', 'Quicktags only exist in the classic editor. Authors on the block editor see none of this — check which one your site actually uses.', undefined);
  return out;
}

export function applyFix(qt: Quicktags, kind: string): Quicktags {
  const p: Quicktags = JSON.parse(JSON.stringify(qt));
  if (kind === 'fixIds')
    p.buttons.forEach((b) => {
      b.id = jsId(b.id) || jsId(b.label);
    });
  if (kind === 'prefixIds') {
    const pre = fnSlug(p.prefix) || 'acme';
    p.buttons.forEach((b) => {
      const id = jsId(b.id) || jsId(b.label);
      if (id.indexOf(pre) !== 0) b.id = pre + '_' + id;
    });
  }
  if (kind === 'trimKeys')
    p.buttons.forEach((b) => {
      b.accessKey = String(b.accessKey || '').slice(0, 1);
    });
  if (kind === 'closeTags')
    p.buttons.forEach((b) => {
      if (b.type !== 'wrap') return;
      const om = /^<([a-z][a-z0-9]*)/i.exec(String(b.open || ''));
      if (om && !/<\/[a-z]/i.test(String(b.close || ''))) b.close = '</' + om[1].toLowerCase() + '>';
    });
  return p;
}
