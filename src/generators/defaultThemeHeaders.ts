import { alignBlock, escPhp, withCredit, type ValidationIssue } from '../lib/codegen';

export type OutputMode = 'functions' | 'child' | 'template';

export interface HeaderImage {
  key: string;
  file: string;
  thumb: string;
  description: string;
  width: string;
  height: string;
}

export interface DefaultThemeHeaders {
  prefix: string;
  textDomain: string;
  path: string;
  base: '%1$s' | '%2$s';
  width: string;
  height: string;
  flexWidth: boolean;
  flexHeight: boolean;
  headerText: boolean;
  textColor: string;
  uploads: boolean;
  video: boolean;
  headCallback: boolean;
  defaultKey: string;
  headers: HeaderImage[];
}

function fnSlug(s: string): string {
  return String(s || '').toLowerCase().trim().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
}
/** Dash-based slug for the text domain, matching the source's slugify(). */
function dashSlug(s: string): string {
  return String(s || '').toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
}
/** Header array keys allow underscores as well as dashes. */
function keySlug(s: string): string {
  return String(s || '').toLowerCase().trim().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
}
function indent(text: string, depth: number): string {
  const pad = '\t'.repeat(depth);
  return text.split('\n').map((l) => (l ? pad + l : '')).join('\n');
}
function cleanPath(p: string): string {
  return String(p || '').trim().replace(/^\/+|\/+$/g, '');
}
function intOr(v: string, d: number): number {
  const n = parseInt(String(v || '').replace(/[^0-9]/g, ''), 10);
  return isNaN(n) ? d : n;
}

export interface Derived {
  pre: string;
  td: string;
  path: string;
  base: '%1$s' | '%2$s';
  headers: HeaderImage[];
  width: number;
  height: number;
}

export function derive(dh: DefaultThemeHeaders): Derived {
  const pre = fnSlug(dh.prefix) || 'acme';
  const headers = (dh.headers || []).filter((h) => String(h.key || '').trim() || String(h.file || '').trim());
  return {
    pre,
    td: dashSlug(dh.textDomain) || pre.replace(/_/g, '-'),
    path: cleanPath(dh.path) || 'assets/headers',
    base: dh.base === '%2$s' ? '%2$s' : '%1$s',
    headers,
    width: intOr(dh.width, 1920),
    height: intOr(dh.height, 480),
  };
}

export function headerUrl(dh: DefaultThemeHeaders, file: string): string {
  const d = derive(dh);
  return d.base + '/' + d.path + '/' + String(file || '').trim().replace(/^\/+/, '');
}

export function buildSupportBlock(dh: DefaultThemeHeaders): string {
  const d = derive(dh);
  const defaultHeader = d.headers.find((h) => keySlug(h.key) === keySlug(dh.defaultKey)) || d.headers[0];
  const dirFn = d.base === '%2$s' ? 'get_stylesheet_directory_uri()' : 'get_template_directory_uri()';

  const pairs: [string, string][] = [];
  if (defaultHeader && String(defaultHeader.file || '').trim()) {
    pairs.push(['default-image', dirFn + " . '/" + d.path + '/' + escPhp(String(defaultHeader.file).trim()) + "'"]);
  }
  pairs.push(['width', String(d.width)]);
  pairs.push(['height', String(d.height)]);
  pairs.push(['flex-width', dh.flexWidth ? 'true' : 'false']);
  pairs.push(['flex-height', dh.flexHeight ? 'true' : 'false']);
  pairs.push(['header-text', dh.headerText ? 'true' : 'false']);
  if (dh.headerText && String(dh.textColor || '').trim()) pairs.push(['default-text-color', "'" + escPhp(String(dh.textColor).trim().replace(/^#/, '')) + "'"]);
  pairs.push(['uploads', dh.uploads ? 'true' : 'false']);
  if (dh.video) pairs.push(['video', 'true']);
  if (dh.headCallback) pairs.push(['wp-head-callback', "'" + d.pre + "_header_style'"]);

  return "add_theme_support(\n\t'custom-header',\n\tarray(\n" + indent(alignBlock(pairs, ''), 2) + '\n\t)\n);';
}

export function buildHeadersBlock(dh: DefaultThemeHeaders): string {
  const d = derive(dh);
  if (!d.headers.length) return '';
  const entries: [string, string][] = d.headers.map((h) => {
    const key = keySlug(h.key) || dashSlug(h.file) || 'header';
    const inner: [string, string][] = [
      ['url', "'" + escPhp(headerUrl(dh, h.file)) + "'"],
      ['thumbnail_url', "'" + escPhp(headerUrl(dh, String(h.thumb || '').trim() || h.file)) + "'"],
      ['description', "__( '" + escPhp(h.description || key) + "', '" + d.td + "' )"],
    ];
    return [key, 'array(\n' + indent(alignBlock(inner, ''), 1) + '\n)'];
  });
  return 'register_default_headers(\n\tarray(\n' + indent(alignBlock(entries, ''), 2) + '\n\t)\n);';
}

export function buildHeadStyle(dh: DefaultThemeHeaders): string {
  const d = derive(dh);
  if (!dh.headCallback) return '';
  return '\n/**\n * Print the header text colour the user chose.\n *\n * Only runs when wp-head-callback is registered above.\n */\nfunction ' + d.pre + "_header_style() {\n\t$text_color = get_header_textcolor();\n\n\t// Nothing to print only when the text is shown AND left at the default colour.\n\t// Bailing on the colour alone would skip the rule that hides the title.\n\tif ( display_header_text() && get_theme_support( 'custom-header', 'default-text-color' ) === $text_color ) {\n\t\treturn;\n\t}\n\n\t?>\n\t<style id=\"" + d.pre.replace(/_/g, '-') + "-header-style\">\n\t<?php if ( ! display_header_text() ) : ?>\n\t\t.site-title,\n\t\t.site-description {\n\t\t\tposition: absolute;\n\t\t\tclip-path: inset( 50% );\n\t\t}\n\t<?php else : ?>\n\t\t.site-title a,\n\t\t.site-description {\n\t\t\tcolor: #<?php echo esc_attr( $text_color ); ?>;\n\t\t}\n\t<?php endif; ?>\n\t</style>\n\t<?php\n}\n";
}

export function buildTemplate(dh: DefaultThemeHeaders): string {
  const d = derive(dh);
  return "<?php\n// header.php — inside the site header markup.\n\nif ( has_header_image() ) {\n\tthe_header_image_tag(\n\t\tarray(\n\t\t\t'class' => 'site-header__image',\n\t\t\t'alt'   => get_bloginfo( 'name', 'display' ),\n\t\t)\n\t);\n}\n\n// Or build it yourself when you need the URL alone.\n$header_url = get_header_image();\n\nif ( $header_url ) {\n\tprintf(\n\t\t'<div class=\"site-header__banner\" style=\"background-image:url(%s)\"></div>',\n\t\tesc_url( $header_url )\n\t);\n}\n\n" +
    (dh.headerText ? "// The user can hide the title and tagline from the Customiser.\nif ( display_header_text() ) {\n\tprintf(\n\t\t'<h1 class=\"site-title\"><a href=\"%1$s\">%2$s</a></h1>',\n\t\tesc_url( home_url( '/' ) ),\n\t\tesc_html( get_bloginfo( 'name' ) )\n\t);\n}\n\n" : '') +
    (dh.video ? "// Video headers render their own markup and fall back to the image.\nif ( function_exists( 'the_custom_header_markup' ) ) {\n\tthe_custom_header_markup();\n}\n\n" : '') +
    '// Registered in functions.php: ' + d.headers.length + ' suggested header' + (d.headers.length === 1 ? '' : 's') + '.\n';
}

export function buildCode(dh: DefaultThemeHeaders, mode: OutputMode): string {
  const d = derive(dh);
  if (mode === 'template') return withCredit(buildTemplate(dh));

  let out = '';
  if (mode === 'functions') out += "<?php\n// Add to your theme's functions.php.\n\n";
  else if (mode === 'child') out += "<?php\n// A child theme's functions.php. after_setup_theme runs for the child too,\n// and a later priority lets you replace what the parent registered.\n\n";

  const headersBlock = buildHeadersBlock(dh);
  const body = buildSupportBlock(dh) + (headersBlock ? '\n\n' + headersBlock : '');
  const priority = mode === 'child' ? ', 11' : '';

  out += '/**\n * Custom header support and the images bundled with the theme.\n */\nfunction ' + d.pre + '_custom_header_setup() {\n' + indent(body, 1) + '\n}\n' +
    "add_action( 'after_setup_theme', '" + d.pre + "_custom_header_setup'" + priority + ' );\n';
  out += buildHeadStyle(dh);
  return withCredit(out);
}

export function validate(dh: DefaultThemeHeaders): ValidationIssue[] {
  const d = derive(dh);
  const out: ValidationIssue[] = [];
  const add = (severity: ValidationIssue['severity'], message: string, fix?: string, fixLabel?: string) => out.push({ severity, message, fix, fixLabel });

  if (!d.headers.length) add('warning', 'No headers registered. The theme still supports a custom header, but the Customiser shows an empty Suggested list.');

  const seen: Record<string, boolean> = {};
  let ratioMismatch = 0;
  const baseRatio = d.width && d.height ? d.width / d.height : 0;

  d.headers.forEach((h, i) => {
    const key = keySlug(h.key) || dashSlug(h.file);
    const label = 'Header ' + (i + 1) + (h.key ? ' (' + h.key + ')' : '');
    if (!String(h.file || '').trim()) add('error', label + ' has no file name, so its url resolves to the folder itself.');
    if (!key) add('error', label + ' has no key. Core uses the array key to remember which header the user picked.');
    if (String(h.key || '').trim() && keySlug(h.key) !== String(h.key).trim()) add('error', '“' + h.key + '” is not a safe header key — lowercase, dashes and underscores only.', 'fixKeys', 'Clean the keys');
    if (seen[key]) add('error', 'Two headers share the key “' + key + '”. The second replaces the first.');
    seen[key] = true;
    if (!String(h.description || '').trim()) add('warning', label + ' has no description. It is the accessible name in the Customiser and the alt text core falls back to.', 'fillDescriptions', 'Name them from the keys');
    if (/^https?:\/\//.test(String(h.file || ''))) add('error', label + ' uses an absolute URL. Header files live in the theme — core prepends the theme URI through the %1$s placeholder.', 'stripAbsolute', 'Strip the domain');
    if (!String(h.thumb || '').trim()) add('warning', label + ' has no thumbnail, so the Customiser downloads the full-size image for a 230px tile.', 'deriveThumbs', 'Add -thumb names');
    const w = intOr(h.width, 0);
    const hh = intOr(h.height, 0);
    if (w && hh) {
      if (!dh.flexWidth && w !== d.width) add('warning', label + ' is ' + w + 'px wide but the theme declares ' + d.width + 'px and flex-width is off. Core will crop it.');
      if (!dh.flexHeight && hh !== d.height) add('warning', label + ' is ' + hh + 'px tall but the theme declares ' + d.height + 'px and flex-height is off. Core will crop it.');
      if (baseRatio && Math.abs(w / hh - baseRatio) > 0.25) ratioMismatch++;
      if (w > 2560) add('recommendation', label + ' is ' + w + 'px wide. Anything past 2560 is mostly weight — most themes ship headers at 1920 or less.');
    } else if (dh.flexWidth || dh.flexHeight) {
      add('recommendation', label + ' has no dimensions noted. With flex on that is legal, but recording them here keeps the crop preview honest.');
    }
  });

  if (ratioMismatch) add('recommendation', ratioMismatch + ' of the images have a noticeably different aspect ratio from the declared ' + d.width + '×' + d.height + '. The Customiser preview will jump as the user clicks through them.');

  if (String(dh.textColor || '').indexOf('#') === 0) add('error', 'default-text-color must be a bare hex value — core adds the hash itself. “' + dh.textColor + '” renders as ##' + String(dh.textColor).replace('#', '') + '.', 'stripHash', 'Drop the hash');
  if (!dh.headerText && String(dh.textColor || '').trim()) add('recommendation', 'header-text is off, so default-text-color is never used. Harmless, but it reads as a contradiction.');
  if (dh.headerText && !dh.headCallback) add('warning', 'header-text is on with no wp-head-callback, so nothing prints the colour the user picks — the Customiser control does nothing.', 'enableCallback', 'Add the callback');
  if (!dh.uploads && !d.headers.length) add('error', 'Uploads are off and no headers are registered, so the Customiser panel offers the user nothing at all.');
  if (!dh.uploads) add('recommendation', 'Uploads are off. Users can only pick from the images you ship, which is a deliberate choice for a tightly art-directed theme and a support ticket for everyone else.');
  if (dh.video && !dh.uploads) add('warning', 'Video headers are on but uploads are off, so there is no way to add the video.');
  if (dh.video && d.width < 900) add('recommendation', 'Core hides the video header below 900px wide by default. A ' + d.width + 'px declared width means most visitors see the image instead.');
  if (dh.flexWidth && dh.flexHeight) add('recommendation', 'Both flex flags are on, so width and height are only hints. Any image the user uploads is used at its own size — make sure the CSS can cope.');
  if (!dh.flexWidth && !dh.flexHeight) add('recommendation', 'Fixed dimensions force a crop step for every upload. Turning on flex-height is the usual compromise.');
  if (d.base === '%2$s') add('recommendation', 'The images resolve against the child theme URI (%2$s). Correct for a child theme, wrong if this code ships in the parent.');
  if (!(d.path.indexOf('images') === 0 || d.path.indexOf('assets') === 0)) add('recommendation', 'The folder “' + d.path + '” is unusual — assets/headers or images/headers is what reviewers expect to find.');
  if (dh.defaultKey && !d.headers.some((h) => keySlug(h.key) === keySlug(dh.defaultKey))) add('warning', 'The default image points at “' + dh.defaultKey + '”, which is not one of the registered headers. Core falls back to no header at all.', 'firstAsDefault', 'Use the first one');
  return out;
}

export function freshProject(): DefaultThemeHeaders {
  return {
    prefix: 'acme', textDomain: 'acme', path: 'assets/headers', base: '%1$s',
    width: '1920', height: '480',
    flexWidth: false, flexHeight: true, headerText: true, textColor: '1c1a15',
    uploads: true, video: false, headCallback: true,
    defaultKey: 'dunes',
    headers: [
      { key: 'dunes', file: 'dunes.jpg', thumb: 'dunes-thumb.jpg', description: 'Dunes at dawn', width: '1920', height: '480' },
      { key: 'harbour', file: 'harbour.jpg', thumb: 'harbour-thumb.jpg', description: 'Harbour in fog', width: '1920', height: '480' },
      { key: 'workshop', file: 'workshop.jpg', thumb: 'workshop-thumb.jpg', description: 'The workshop bench', width: '1920', height: '640' },
    ],
  };
}

export function applyFix(dh: DefaultThemeHeaders, kind: string): DefaultThemeHeaders {
  const p: DefaultThemeHeaders = JSON.parse(JSON.stringify(dh));
  if (kind === 'fixKeys') p.headers.forEach((h) => { h.key = keySlug(h.key) || dashSlug(h.file); });
  if (kind === 'fillDescriptions') p.headers.forEach((h) => {
    if (String(h.description || '').trim()) return;
    const k = keySlug(h.key) || dashSlug(h.file) || 'header';
    h.description = k.replace(/[-_]+/g, ' ').replace(/^./, (c) => c.toUpperCase());
  });
  if (kind === 'stripAbsolute') p.headers.forEach((h) => { h.file = String(h.file || '').replace(/^https?:\/\/[^/]+\/?/, '').split('/').pop() || ''; });
  if (kind === 'deriveThumbs') p.headers.forEach((h) => {
    if (String(h.thumb || '').trim() || !String(h.file || '').trim()) return;
    const parts = String(h.file).split('.');
    const ext = parts.length > 1 ? parts.pop()! : 'jpg';
    h.thumb = parts.join('.') + '-thumb.' + ext;
  });
  if (kind === 'stripHash') p.textColor = String(p.textColor || '').replace(/#/g, '');
  if (kind === 'enableCallback') p.headCallback = true;
  if (kind === 'firstAsDefault') p.defaultKey = keySlug((p.headers[0] || { key: '' }).key || '');
  return p;
}
