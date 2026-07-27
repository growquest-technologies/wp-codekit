import { escPhp, withCredit, type ValidationIssue } from '../lib/codegen';

export type OutputMode = 'functions' | 'snippet';

export interface ImageSize {
  name: string;
  width: string;
  height: string;
  crop: boolean;
}

export interface ThemeSupport {
  prefix: string;
  textDomain: string;
  preset: string;
  enabled: string[];
  sizes: ImageSize[];
  thumbSize: string;
  contentWidth: string;
}

export const FEATURES: [string, string, [string, string][]][] = [
  ['essentials', 'Essentials', [
    ['title-tag', 'Lets core print the title tag. Without it your theme has to, and plugins cannot filter it.'],
    ['post-thumbnails', 'Featured images. Everything else here assumes it.'],
    ['automatic-feed-links', 'Feed links in the head. Expected of every theme in the directory.'],
    ['html5', 'HTML5 markup for search forms, comments, galleries and captions.'],
    ['customize-selective-refresh-widgets', 'Widgets update in the customiser without a full reload.'],
  ]],
  ['editor', 'Editor', [
    ['wp-block-styles', 'Core block styles on the front end. Skip only if you style every block yourself.'],
    ['align-wide', 'Wide and full alignment options in the block editor.'],
    ['responsive-embeds', 'Embeds scale to their container instead of overflowing.'],
    ['editor-styles', 'Load your editor stylesheet so the editor resembles the site.'],
    ['appearance-tools', 'Spacing, border and typography controls without a full theme.json.'],
    ['custom-line-height', 'Line height control in the editor.'],
    ['custom-spacing', 'Padding and margin controls in the editor.'],
    ['custom-units', 'rem, vh and vw as unit options.'],
  ]],
  ['branding', 'Branding and media', [
    ['custom-logo', 'A logo in the customiser, with a size you set.'],
    ['custom-background', 'Background colour and image in the customiser. Rarely used now.'],
    ['custom-header', 'Header image support, with dimensions.'],
    ['post-formats', 'Aside, gallery, link, quote, video and audio formats.'],
    ['woocommerce', 'Declares WooCommerce compatibility so the shop templates behave.'],
  ]],
];

export const PRESETS: Record<string, { label: string; on: string[] }> = {
  classic: { label: 'Classic theme', on: ['title-tag', 'post-thumbnails', 'automatic-feed-links', 'html5', 'customize-selective-refresh-widgets', 'wp-block-styles', 'align-wide', 'responsive-embeds', 'custom-logo', 'editor-styles'] },
  block: { label: 'Block theme', on: ['title-tag', 'post-thumbnails', 'automatic-feed-links', 'html5', 'wp-block-styles', 'align-wide', 'responsive-embeds', 'appearance-tools', 'editor-styles'] },
  minimal: { label: 'Bare minimum', on: ['title-tag', 'post-thumbnails', 'automatic-feed-links', 'html5'] },
};

const HTML5_ARGS = ['search-form', 'comment-form', 'comment-list', 'gallery', 'caption', 'style', 'script'];

function fnSlug(s: string): string {
  return String(s || '').toLowerCase().trim().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
}
/** Dash-based slug for text domains and image-size slugs. */
function dashSlug(s: string): string {
  return String(s || '').toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
}
function indent(text: string, depth: number): string {
  const pad = '\t'.repeat(depth);
  return text.split('\n').map((l) => (l ? pad + l : '')).join('\n');
}

interface Triple {
  width: number;
  height: number;
  crop: boolean;
}

function triple(str: string): Triple | null {
  const parts = String(str || '').split(',').map((v) => v.trim()).filter((v) => v !== '');
  if (parts.length < 2) return null;
  return { width: parseInt(parts[0], 10) || 0, height: parseInt(parts[1], 10) || 0, crop: parts[2] === 'true' || parts[2] === '1' };
}

export function buildCode(ts: ThemeSupport, mode: OutputMode): string {
  const pre = fnSlug(ts.prefix) || 'mytheme';
  const td = dashSlug(ts.textDomain) || pre.replace(/_/g, '-');
  const on = ts.enabled || [];
  const has = (f: string) => on.indexOf(f) >= 0;
  const lines: string[] = [];

  lines.push("load_theme_textdomain( '" + td + "', get_template_directory() . '/languages' );");
  lines.push('');
  on.forEach((f) => {
    if (f === 'html5') {
      lines.push("add_theme_support(\n\t'html5',\n\tarray(\n" + HTML5_ARGS.map((a) => "\t\t'" + a + "',").join('\n') + '\n\t)\n);');
    } else if (f === 'custom-logo') {
      lines.push("add_theme_support(\n\t'custom-logo',\n\tarray(\n\t\t'height'      => 60,\n\t\t'width'       => 240,\n\t\t'flex-height' => true,\n\t\t'flex-width'  => true,\n\t)\n);");
    } else if (f === 'post-formats') {
      lines.push("add_theme_support(\n\t'post-formats',\n\tarray(\n\t\t'aside',\n\t\t'gallery',\n\t\t'link',\n\t\t'quote',\n\t\t'video',\n\t)\n);");
    } else if (f === 'custom-header') {
      lines.push("add_theme_support(\n\t'custom-header',\n\tarray(\n\t\t'width'         => 1600,\n\t\t'height'        => 500,\n\t\t'flex-height'   => true,\n\t\t'default-image' => '',\n\t)\n);");
    } else if (f === 'custom-background') {
      lines.push("add_theme_support(\n\t'custom-background',\n\tarray(\n\t\t'default-color' => 'ffffff',\n\t)\n);");
    } else if (f === 'editor-styles') {
      lines.push("add_theme_support( 'editor-styles' );");
      lines.push("add_editor_style( 'assets/css/editor.css' );");
    } else {
      lines.push("add_theme_support( '" + f + "' );");
    }
  });

  const sizes = (ts.sizes || []).filter((s) => String(s.name || '').trim());
  const thumb = triple(ts.thumbSize);
  if (has('post-thumbnails') && (thumb || sizes.length)) {
    lines.push('');
    if (thumb) lines.push('set_post_thumbnail_size( ' + thumb.width + ', ' + thumb.height + ', ' + (thumb.crop ? 'true' : 'false') + ' );');
    sizes.forEach((s) => {
      lines.push("add_image_size( '" + escPhp(dashSlug(s.name)) + "', " + (parseInt(s.width, 10) || 0) + ', ' + (parseInt(s.height, 10) || 0) + ', ' + (s.crop ? 'true' : 'false') + ' );');
    });
  }

  let out = '';
  if (mode === 'functions') out += "<?php\n// Add to your theme's functions.php.\n\n";
  out += '/**\n * Declare what this theme supports.\n */\nfunction ' + pre + '_setup() {\n' + indent(lines.join('\n'), 1) + '\n}\n' + "add_action( 'after_setup_theme', '" + pre + "_setup' );\n";

  const cw = parseInt(ts.contentWidth, 10);
  if (cw) {
    out += '\n/**\n * Set the content width for oEmbeds and wide images.\n */\nfunction ' + pre + '_content_width() {\n\t$GLOBALS[\'content_width\'] = apply_filters( \'' + pre + '_content_width\', ' + cw + ' );\n}\n' + "add_action( 'after_setup_theme', '" + pre + "_content_width', 0 );\n";
  }
  if (sizes.length) {
    out += '\n/**\n * Offer the custom sizes in the editor’s image size dropdown.\n *\n * @param array $sizes Size name => label.\n * @return array\n */\nfunction ' + pre + '_image_size_names( $sizes ) {\n\treturn array_merge(\n\t\t$sizes,\n\t\tarray(\n' + sizes.map((s) => "\t\t\t'" + escPhp(dashSlug(s.name)) + "' => __( '" + escPhp(s.name) + "', '" + td + "' ),").join('\n') + '\n\t\t)\n\t);\n}\n' + "add_filter( 'image_size_names_choose', '" + pre + "_image_size_names' );\n";
  }
  return withCredit(out);
}

export function validate(ts: ThemeSupport): ValidationIssue[] {
  const out: ValidationIssue[] = [];
  const add = (severity: ValidationIssue['severity'], message: string, fix?: string, fixLabel?: string) => out.push({ severity, message, fix, fixLabel });
  const on = ts.enabled || [];
  const has = (f: string) => on.indexOf(f) >= 0;
  const sizes = (ts.sizes || []).filter((s) => String(s.name || '').trim());
  if (!on.length) add('error', 'No features selected — the setup function will only load the text domain.');
  if (!has('title-tag')) add('warning', 'Without title-tag your theme must print the title itself, and no plugin can filter it. Every theme in the directory needs this.', 'addTitle', 'Add title-tag');
  if (!has('post-thumbnails')) add('warning', 'No post-thumbnails, so the featured image panel never appears in the editor.', 'addThumbs', 'Add post-thumbnails');
  if (!has('html5')) add('recommendation', 'Without html5 support core prints XHTML-era markup for search forms and comment lists.');
  if (!has('automatic-feed-links')) add('recommendation', 'automatic-feed-links is a one-liner and expected of any theme you might submit.');
  if (sizes.length && !has('post-thumbnails')) add('error', 'You have added image sizes but post-thumbnails is off, so nothing will use them.', 'addThumbs', 'Add post-thumbnails');
  if (triple(ts.thumbSize) && !has('post-thumbnails')) add('warning', 'set_post_thumbnail_size() without post-thumbnails support does nothing.');
  const seen: Record<string, boolean> = {};
  sizes.forEach((s) => {
    const name = dashSlug(s.name);
    const w = parseInt(s.width, 10);
    const h = parseInt(s.height, 10);
    if (seen[name]) add('error', 'Two image sizes are called “' + name + '”. The second one overwrites the first.');
    seen[name] = true;
    if (['thumbnail', 'medium', 'medium_large', 'large', 'full'].indexOf(name) >= 0) add('error', '“' + name + '” is a core size name. Registering it here silently changes core behaviour across the whole site.');
    if (!w && !h) add('error', 'The size “' + name + '” has no dimensions.');
    if (s.crop && (!w || !h)) add('warning', '“' + name + '” is set to crop but only has one dimension. Cropping needs both.');
    if (w > 2560) add('recommendation', '“' + name + '” is ' + w + 'px wide. Core caps uploads at 2560px by default, so anything larger will not be generated.');
  });
  if (sizes.length > 4) add('warning', sizes.length + ' custom sizes means ' + sizes.length + ' extra files generated per upload, on top of the core five. Media libraries get heavy fast.');
  if (has('appearance-tools') && (has('custom-line-height') || has('custom-spacing') || has('custom-units'))) add('recommendation', 'appearance-tools already includes line height, spacing and custom units. The individual flags are redundant alongside it.', 'dropRedundant', 'Drop the extras');
  if (has('custom-background')) add('recommendation', 'custom-background is a pre-block-editor feature. Most modern themes handle backgrounds in theme.json or CSS instead.');
  if (has('woocommerce') && !has('post-thumbnails')) add('error', 'WooCommerce needs post-thumbnails for product images.', 'addThumbs', 'Add post-thumbnails');
  if (has('editor-styles')) add('recommendation', 'editor-styles is generated with add_editor_style( assets/css/editor.css ) — make sure that file exists or the editor loads nothing.');
  if (!parseInt(ts.contentWidth, 10)) add('recommendation', 'No content_width. Without it oEmbeds have no maximum and can overflow your layout.', 'setWidth', 'Set 1200');
  const cw = parseInt(ts.contentWidth, 10);
  if (cw && cw < 400) add('warning', 'A content width of ' + cw + 'px will shrink every embed on the site.');
  if (dashSlug(ts.textDomain) !== fnSlug(ts.prefix).replace(/_/g, '-')) add('recommendation', 'The text domain must match the theme folder name exactly, or none of these strings translate.');
  return out;
}

export function freshProject(): ThemeSupport {
  return {
    prefix: 'mytheme', textDomain: 'mytheme', preset: 'classic',
    enabled: PRESETS.classic.on.slice(),
    sizes: [
      { name: 'card-thumb', width: '640', height: '360', crop: true },
      { name: 'hero-wide', width: '1600', height: '700', crop: true },
    ],
    thumbSize: '1200, 675, true', contentWidth: '1200',
  };
}

export function applyFix(ts: ThemeSupport, kind: string): ThemeSupport {
  const p: ThemeSupport = JSON.parse(JSON.stringify(ts));
  p.enabled = p.enabled || [];
  const addF = (f: string) => { if (p.enabled.indexOf(f) === -1) p.enabled.push(f); };
  if (kind === 'addTitle') addF('title-tag');
  if (kind === 'addThumbs') addF('post-thumbnails');
  if (kind === 'setWidth') p.contentWidth = '1200';
  if (kind === 'dropRedundant') p.enabled = p.enabled.filter((f) => ['custom-line-height', 'custom-spacing', 'custom-units'].indexOf(f) === -1);
  return p;
}
