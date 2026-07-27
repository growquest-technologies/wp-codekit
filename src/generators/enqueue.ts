import { escPhp, withCredit, type ValidationIssue } from '../lib/codegen';

export type OutputMode = 'snippet' | 'functions' | 'plugin';
export type AssetBase = 'theme' | 'plugin';
export type VersionMode = 'filemtime' | 'theme' | 'manual' | 'none';
export type AssetKind = 'script' | 'style';
export type ScriptStrategy = 'defer' | 'async' | 'footer' | 'head';
export type LocalizeKind = 'ajax' | 'nonce' | 'rest' | 'text' | 'raw';
export type ConditionalId = 'all' | 'front_page' | 'singular' | 'archive' | 'page_template' | 'has_shortcode' | 'has_block';

export const CORE_HANDLES = ['jquery', 'jquery-core', 'wp-element', 'wp-blocks', 'wp-i18n', 'wp-api-fetch', 'wp-components', 'underscore', 'backbone', 'react', 'react-dom', 'lodash', 'thickbox', 'masonry', 'imagesloaded', 'wp-editor', 'media-upload', 'common', 'admin-bar'];

export const CONTEXTS: [string, string, string][] = [
  ['front', 'Front end', 'wp_enqueue_scripts'],
  ['admin', 'Admin screens', 'admin_enqueue_scripts'],
  ['editor', 'Block editor', 'enqueue_block_editor_assets'],
  ['login', 'Login screen', 'login_enqueue_scripts'],
];

export const CONDITIONALS: [ConditionalId, string, string][] = [
  ['all', 'Every page', ''],
  ['front_page', 'Front page only', 'is_front_page()'],
  ['singular', 'Single posts of a type', "is_singular( '%s' )"],
  ['archive', 'Archive of a post type', "is_post_type_archive( '%s' )"],
  ['page_template', 'A page template', "is_page_template( '%s' )"],
  ['has_shortcode', 'Posts containing a shortcode', "has_shortcode( get_post()->post_content, '%s' )"],
  ['has_block', 'Posts containing a block', "has_block( '%s' )"],
];

export interface LocalizeRow {
  key: string;
  kind: LocalizeKind;
  value: string;
}

export interface Asset {
  kind: AssetKind;
  handle: string;
  file: string;
  context: string;
  deps: string;
  media: string;
  strategy: ScriptStrategy;
  localize: boolean;
  localizeName: string;
  localizeRows: LocalizeRow[];
}

export interface Enqueue {
  base: AssetBase;
  prefix: string;
  folder: string;
  versionMode: VersionMode;
  versionString: string;
  conditional: ConditionalId;
  conditionalArg: string;
  scriptTranslations: boolean;
  dequeueBlockLibrary: boolean;
  jqueryFooter: boolean;
  assets: Asset[];
}

function handleSlug(s: string): string {
  return String(s || '').toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
}
function fnSlug(s: string): string {
  return String(s || '').toLowerCase().trim().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
}
function csv(s: string): string[] {
  return String(s || '').split(',').map((x) => x.trim()).filter(Boolean);
}

export function fullHandle(en: Enqueue, a: Asset): string {
  const h = handleSlug(a.handle) || 'asset';
  const p = handleSlug(en.prefix);
  return p && h.indexOf(p + '-') !== 0 ? p + '-' + h : h;
}
export function relPath(en: Enqueue, a: Asset): string {
  const folder = String(en.folder || '').replace(/^\/+|\/+$/g, '');
  const file = String(a.file || '').replace(/^\/+/, '');
  return (folder ? folder + '/' : '') + file;
}
function urlExpr(en: Enqueue, a: Asset): string {
  const rel = relPath(en, a);
  return en.base === 'plugin' ? "plugins_url( '" + escPhp(rel) + "', __FILE__ )" : "get_theme_file_uri( '" + escPhp(rel) + "' )";
}
function versionExpr(en: Enqueue, a: Asset): string {
  const rel = relPath(en, a);
  if (en.versionMode === 'filemtime') {
    return en.base === 'plugin' ? "filemtime( plugin_dir_path( __FILE__ ) . '" + escPhp(rel) + "' )" : "filemtime( get_theme_file_path( '" + escPhp(rel) + "' ) )";
  }
  if (en.versionMode === 'theme') return en.base === 'plugin' ? 'MY_PLUGIN_VERSION' : "wp_get_theme()->get( 'Version' )";
  if (en.versionMode === 'manual') return "'" + escPhp(en.versionString || '1.0.0') + "'";
  return 'null';
}
function depsExpr(a: Asset): string {
  const d = csv(a.deps);
  return d.length ? 'array( ' + d.map((x) => "'" + escPhp(x) + "'").join(', ') + ' )' : 'array()';
}
function localizeValue(row: LocalizeRow): string {
  if (row.kind === 'ajax') return "admin_url( 'admin-ajax.php' )";
  if (row.kind === 'nonce') return "wp_create_nonce( '" + escPhp(row.value || 'wp_rest') + "' )";
  if (row.kind === 'rest') return "esc_url_raw( rest_url( '" + escPhp(row.value || 'wp/v2/') + "' ) )";
  if (row.kind === 'raw') return row.value || 'null';
  return "esc_html__( '" + escPhp(row.value || '') + "', 'textdomain' )";
}

export function conditionalExpr(en: Enqueue): string {
  const def = CONDITIONALS.filter((c) => c[0] === en.conditional)[0];
  if (!def || !def[2]) return '';
  return def[2].replace('%s', escPhp(en.conditionalArg || ''));
}

export function freshProject(): Enqueue {
  return {
    base: 'theme', prefix: 'mytheme', folder: 'assets',
    versionMode: 'filemtime', versionString: '1.0.0',
    conditional: 'all', conditionalArg: '',
    scriptTranslations: false, dequeueBlockLibrary: false, jqueryFooter: false,
    assets: [
      { kind: 'style', handle: 'main', file: 'css/main.css', context: 'front', deps: '', media: 'all', strategy: 'defer', localize: false, localizeName: '', localizeRows: [] },
      { kind: 'script', handle: 'main', file: 'js/main.js', context: 'front', deps: '', media: 'all', strategy: 'defer', localize: true, localizeName: 'mythemeData', localizeRows: [{ key: 'ajaxUrl', kind: 'ajax', value: '' }, { key: 'nonce', kind: 'nonce', value: 'mytheme_nonce' }] },
    ],
  };
}

export function buildCode(en: Enqueue, mode: OutputMode): string {
  const prefix = fnSlug(en.prefix) || 'mytheme';
  const byContext: Record<string, Asset[]> = {};
  en.assets.forEach((a) => { (byContext[a.context] = byContext[a.context] || []).push(a); });

  let out = '';
  if (mode === 'plugin') {
    out += "<?php\n/**\n * Plugin Name:       " + (en.prefix || 'My') + " assets\n * Description:       Registers and enqueues the plugin's scripts and styles.\n * Version:           1.0.0\n * Requires PHP:      7.4\n */\n\ndefined( 'ABSPATH' ) || exit;\n\ndefine( 'MY_PLUGIN_VERSION', '1.0.0' );\n\n";
  } else if (mode === 'functions') {
    out += "<?php\n// Add to your theme's functions.php.\n\n";
  } else if (en.base === 'plugin' && en.versionMode === 'theme') {
    out += "define( 'MY_PLUGIN_VERSION', '1.0.0' );\n\n";
  }

  CONTEXTS.forEach((ctx) => {
    const assets = byContext[ctx[0]];
    if (!assets || !assets.length) return;
    const fn = prefix + '_enqueue_' + ctx[0] + '_assets';
    const cond = ctx[0] === 'front' ? conditionalExpr(en) : '';
    out += '/**\n * Enqueue ' + ctx[1].toLowerCase() + ' assets.\n */\nfunction ' + fn + '(' + (ctx[0] === 'admin' ? ' $hook_suffix' : '') + ') {\n';
    const ind = '\t';
    if (cond) out += '\tif ( ! ' + cond + ' ) {\n\t\treturn;\n\t}\n\n';
    if (ctx[0] === 'admin') out += "\tif ( 'toplevel_page_" + (fnSlug(en.prefix) || 'mytheme') + "' !== $hook_suffix ) {\n\t\treturn;\n\t}\n\n";
    assets.forEach((a, i) => {
      const handle = fullHandle(en, a);
      if (a.kind === 'style') {
        out += ind + "wp_enqueue_style(\n" + ind + "\t'" + escPhp(handle) + "',\n" + ind + '\t' + urlExpr(en, a) + ',\n' + ind + '\t' + depsExpr(a) + ',\n' + ind + '\t' + versionExpr(en, a) + ",\n" + ind + "\t'" + (a.media || 'all') + "'\n" + ind + ');\n';
      } else {
        const inFooter = a.strategy === 'head' ? 'false' : 'true';
        const argsArr = a.strategy === 'defer' || a.strategy === 'async'
          ? 'array(\n' + ind + "\t\t'in_footer' => true,\n" + ind + "\t\t'strategy'  => '" + a.strategy + "',\n" + ind + '\t)'
          : inFooter;
        out += ind + "wp_enqueue_script(\n" + ind + "\t'" + escPhp(handle) + "',\n" + ind + '\t' + urlExpr(en, a) + ',\n' + ind + '\t' + depsExpr(a) + ',\n' + ind + '\t' + versionExpr(en, a) + ',\n' + ind + '\t' + argsArr + '\n' + ind + ');\n';
        if (a.localize && a.localizeRows.length) {
          out += '\n' + ind + 'wp_localize_script(\n' + ind + "\t'" + escPhp(handle) + "',\n" + ind + "\t'" + escPhp(a.localizeName || 'myData') + "',\n" + ind + '\tarray(\n';
          const w = a.localizeRows.reduce((m, r) => Math.max(m, String(r.key || '').length), 0);
          a.localizeRows.forEach((r) => {
            if (!r.key) return;
            out += ind + "\t\t'" + escPhp(r.key) + "'" + ' '.repeat(Math.max(0, w - r.key.length)) + ' => ' + localizeValue(r) + ',\n';
          });
          out += ind + '\t)\n' + ind + ');\n';
        }
        if (en.scriptTranslations) {
          out += '\n' + ind + "wp_set_script_translations( '" + escPhp(handle) + "', 'textdomain' );\n";
        }
      }
      if (i < assets.length - 1) out += '\n';
    });
    out += '}\n';
    out += "add_action( '" + ctx[2] + "', '" + fn + "' );\n\n";
  });

  if (en.dequeueBlockLibrary) {
    out += "/**\n * Drop the core block stylesheet on the front end.\n */\nfunction " + prefix + "_dequeue_block_library() {\n\twp_dequeue_style( 'wp-block-library' );\n\twp_dequeue_style( 'wp-block-library-theme' );\n\twp_dequeue_style( 'global-styles' );\n}\nadd_action( 'wp_enqueue_scripts', '" + prefix + "_dequeue_block_library', 100 );\n\n";
  }
  if (en.jqueryFooter) {
    out += "/**\n * Move the bundled jQuery to the footer on the front end.\n */\nfunction " + prefix + "_jquery_to_footer() {\n\tif ( is_admin() ) {\n\t\treturn;\n\t}\n\twp_scripts()->add_data( 'jquery', 'group', 1 );\n\twp_scripts()->add_data( 'jquery-core', 'group', 1 );\n\twp_scripts()->add_data( 'jquery-migrate', 'group', 1 );\n}\nadd_action( 'wp_default_scripts', '" + prefix + "_jquery_to_footer' );\n\n";
  }
  return withCredit(out.replace(/\n+$/, '\n'));
}

export function validate(en: Enqueue): ValidationIssue[] {
  const out: ValidationIssue[] = [];
  const add = (severity: ValidationIssue['severity'], message: string, targetId?: string, fix?: string, fixLabel?: string) => out.push({ severity, message, targetId, fix, fixLabel });
  if (!en.assets.length) add('warning', 'No assets yet — add a script or a stylesheet.');
  const handles: string[] = [];
  en.assets.forEach((a, i) => {
    const label = a.handle || 'asset ' + (i + 1);
    if (!handleSlug(a.handle)) add('error', 'Asset ' + (i + 1) + ' has no handle.');
    if (!String(a.file).trim()) add('error', '"' + label + '" has no file path.');
    else if (a.kind === 'script' && !/\.js$/i.test(a.file)) add('warning', '"' + label + '" is a script but the file does not end in .js.');
    else if (a.kind === 'style' && !/\.css$/i.test(a.file)) add('warning', '"' + label + '" is a stylesheet but the file does not end in .css.');
    const h = a.kind + ':' + fullHandle(en, a);
    if (handles.indexOf(h) !== -1) add('error', 'Handle "' + fullHandle(en, a) + '" is used by two ' + a.kind + 's — the second enqueue is ignored.');
    handles.push(h);
    if (CORE_HANDLES.indexOf(handleSlug(a.handle)) !== -1) add('error', '"' + handleSlug(a.handle) + '" is a core WordPress handle. Prefix yours or you will replace core’s copy.', undefined, 'prefixHandles', 'Prefix handles');
    csv(a.deps).forEach((d) => {
      if (d === 'jquery') add('recommendation', '"' + label + '" depends on jQuery. Core still bundles it, but vanilla JS avoids the extra 30 KB.');
    });
    if (a.kind === 'script' && a.strategy === 'head') add('recommendation', '"' + label + '" loads in the head and blocks rendering. Footer + defer is almost always better.', undefined, 'deferAll', 'Defer scripts');
    if (a.kind === 'script' && a.strategy === 'async' && csv(a.deps).length) add('warning', '"' + label + '" is async but has dependencies — async ignores order, so it may run before them.');
    if (a.localize && !a.localizeName) add('error', '"' + label + '" is localised but has no JS object name.');
    if (a.localize && a.localizeRows.some((r) => !r.key)) add('warning', '"' + label + '" has a localise entry with no key.');
    if (a.context === 'editor' && a.kind === 'script' && csv(a.deps).indexOf('wp-blocks') === -1 && csv(a.deps).indexOf('wp-element') === -1) add('recommendation', 'Block editor scripts normally depend on wp-blocks and wp-element.');
  });
  if (en.versionMode === 'none') add('warning', 'Without a version, browsers cache the file against the WordPress version — a change to your file will not be picked up.', undefined, 'useFilemtime', 'Use filemtime()');
  if (en.versionMode === 'filemtime') add('recommendation', 'filemtime() hits the filesystem on every request. Perfect in development; swap to a version constant for production if profiling shows it.');
  if (en.conditional !== 'all' && ['singular', 'archive', 'page_template', 'has_shortcode', 'has_block'].indexOf(en.conditional) !== -1 && !en.conditionalArg) add('error', 'The chosen condition needs a value — the generated check would be empty.');
  if (en.conditional === 'has_shortcode') add('recommendation', 'has_shortcode() only inspects the main post content, so shortcodes inside widgets or templates will not match.');
  if (en.dequeueBlockLibrary) add('warning', 'Dequeuing wp-block-library breaks the default styling of core blocks — only do this if your theme styles every block itself.');
  if (en.assets.some((a) => a.context === 'admin')) add('recommendation', 'Admin assets are gated on $hook_suffix in the output — change the screen check to match your page.');
  return out;
}

export function applyFix(en: Enqueue, kind: string): Enqueue {
  const p: Enqueue = JSON.parse(JSON.stringify(en));
  if (kind === 'prefixHandles') {
    p.assets.forEach((a) => {
      const h = handleSlug(a.handle);
      const pre = handleSlug(p.prefix) || 'acme';
      if (h.indexOf(pre + '-') !== 0) a.handle = pre + '-' + h;
    });
  }
  if (kind === 'deferAll') p.assets.forEach((a) => { if (a.kind === 'script' && a.strategy === 'head') a.strategy = 'defer'; });
  if (kind === 'useFilemtime') p.versionMode = 'filemtime';
  return p;
}

export function mapRows(en: Enqueue) {
  const condExpr = conditionalExpr(en);
  return en.assets.map((a) => {
    const ctx = CONTEXTS.filter((c) => c[0] === a.context)[0] || CONTEXTS[0];
    const isScript = a.kind === 'script';
    const pos = isScript
      ? (a.strategy === 'head' ? 'Rendered in <head>, blocking.' : a.strategy === 'defer' ? 'Footer, deferred — runs after parsing, order preserved.' : a.strategy === 'async' ? 'Footer, async — runs as soon as it downloads.' : 'Footer, blocking.')
      : 'Rendered in <head> with media="' + (a.media || 'all') + '".';
    return {
      handle: fullHandle(en, a),
      kind: a.kind,
      hook: "add_action( '" + ctx[2] + "', … ) · " + ctx[1],
      position: pos + (a.context === 'front' && condExpr ? ' Guarded by ' + condExpr + '.' : ''),
    };
  });
}
