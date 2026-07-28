import type { ValidationIssue } from '../lib/codegen';

export type ThemeSource = 'wporg' | 'premium' | 'custom';
export type EnqueueMode = 'stack' | 'handle' | 'none';
export type SlugMode = 'auto' | 'custom';

export interface ParentTheme {
  name: string;
  slug: string;
  isBlock: boolean;
  knownCase: boolean;
  author: string;
  note: string;
}

export interface ChildThemeFields {
  name: string;
  slugMode: SlugMode;
  slug: string;
  description: string;
  author: string;
  authorUri: string;
  themeUri: string;
  version: string;
  textDomain: string;
  requiresWp: string;
  requiresPhp: string;
  tags: string;
}

export interface ChildThemeOptions {
  functions: boolean;
  textdomain: boolean;
  copyMods: boolean;
  setupHook: boolean;
  themeJson: boolean;
  rtl: boolean;
  screenshot: boolean;
}

export interface ChildTheme {
  parent: ParentTheme;
  child: ChildThemeFields;
  enqueueMode: EnqueueMode;
  parentHandle: string;
  options: ChildThemeOptions;
}

export interface ThemeResult {
  name: string;
  slug: string;
  author: string;
  block: boolean;
  premium: boolean;
  note: string;
  installs?: number;
  rating?: number;
  thumb?: string;
}

const SCREENSHOT_ACCENT = '#3858E9';

// Folder names are the Template value and are case sensitive — several of these ship in a
// capitalised directory, which is the single most common child-theme bug.
export const PREMIUM: ThemeResult[] = ([
  ['Divi', 'Divi', 'Elegant Themes', 'The folder really is capitalised — Divi, not divi.'],
  ['Extra', 'Extra', 'Elegant Themes', 'Capitalised folder, same as Divi.'],
  ['Avada', 'Avada', 'ThemeFusion', 'Capitalised folder. Avada also ships an official child theme in your download.'],
  ['Enfold', 'enfold', 'Kriesi', ''],
  ['Flatsome', 'flatsome', 'UX Themes', ''],
  ['The7', 'dt-the7', 'Dream-Theme', 'The folder is dt-the7, not the7.'],
  ['BeTheme', 'betheme', 'Muffin Group', ''],
  ['Bricks', 'bricks', 'Bricks', 'Most of Bricks lives in the builder; the child is for functions.php snippets and custom CSS.'],
  ['Salient', 'salient', 'ThemeNectar', ''],
  ['Jupiter X', 'jupiterx', 'Artbees', ''],
  ['Impreza', 'Impreza', 'UpSolution', 'Capitalised folder.'],
  ['WoodMart', 'woodmart', 'XTemos', ''],
  ['Porto', 'porto', 'P-THEMES', ''],
  ['Uncode', 'uncode', 'Undsgn', ''],
  ['Total', 'Total', 'WPExplorer', 'Capitalised folder.'],
  ['Bridge', 'bridge', 'Qode Interactive', ''],
  ['XStore', 'xstore', '8theme', ''],
  ['Newspaper', 'Newspaper', 'tagDiv', 'Capitalised folder.'],
  ['Jannah', 'jannah', 'TieLabs', ''],
  ['Soledad', 'soledad', 'PenciDesign', ''],
  ['Genesis Framework', 'genesis', 'StudioPress', 'Genesis child themes do not enqueue the parent style.css — Genesis has no front-end CSS of its own. Use the None option.'],
  ['Shoptimizer', 'shoptimizer', 'CommerceGurus', ''],
  ['Electro', 'electro', 'MadrasThemes', ''],
  ['Thrive Theme Builder', 'thrive-theme', 'Thrive Themes', ''],
] as [string, string, string, string][]).map(([name, slug, author, note]) => ({ name, slug, author, note, premium: true, block: false }));

// Only used when wordpress.org cannot be reached from the browser.
export const WPORG_FALLBACK: ThemeResult[] = ([
  ['Astra', 'astra', 'Brainstorm Force', false], ['Kadence', 'kadence', 'Kadence WP', false],
  ['Blocksy', 'blocksy', 'CreativeThemes', false], ['GeneratePress', 'generatepress', 'Tom Usborne', false],
  ['OceanWP', 'oceanwp', 'OceanWP', false], ['Neve', 'neve', 'ThemeIsle', false],
  ['Hello Elementor', 'hello-elementor', 'Elementor', false], ['Storefront', 'storefront', 'WooCommerce', false],
  ['Twenty Twenty-Five', 'twentytwentyfive', 'the WordPress team', true],
  ['Twenty Twenty-Four', 'twentytwentyfour', 'the WordPress team', true],
  ['Twenty Twenty-Three', 'twentytwentythree', 'the WordPress team', true],
  ['Twenty Twenty-One', 'twentytwentyone', 'the WordPress team', false],
  ['Sydney', 'sydney', 'aThemes', false], ['Botiga', 'botiga', 'aThemes', false],
  ['Hestia', 'hestia', 'ThemeIsle', false], ['Zakra', 'zakra', 'ThemeGrill', false],
  ['Woostify', 'woostify', 'Woostify', false], ['Ollie', 'ollie', 'Mike McAlister', true],
  ['Frost', 'frost', 'Brian Gardner', true], ['Spectra One', 'spectra-one', 'Brainstorm Force', true],
] as [string, string, string, boolean][]).map(([name, slug, author, block]) => ({ name, slug, author, block, premium: false, note: '' }));

export function slugify(s: string): string {
  return String(s || '').toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
}
function fnSlug(s: string): string {
  return String(s || '').toLowerCase().trim().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
}
function pkgName(s: string): string {
  return slugify(s).split('-').filter(Boolean).map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('_') || 'Child_Theme';
}
function padTo(s: string, w: number): string {
  return s + new Array(Math.max(0, w - s.length) + 1).join(' ');
}

export interface Derived {
  parentSlug: string;
  parentName: string;
  childSlug: string;
  childName: string;
  td: string;
  fn: string;
  pkg: string;
  parentHandle: string;
  isBlock: boolean;
}

export function derive(ct: ChildTheme): Derived {
  const parentSlug = String(ct.parent.slug || '').trim();
  const parentName = String(ct.parent.name || '').trim();
  const childSlug = ct.child.slugMode === 'custom' ? slugify(ct.child.slug) : (slugify(parentSlug) || 'parent') + '-child';
  const childName = String(ct.child.name || '').trim() || (parentName || 'Parent') + ' Child';
  const td = slugify(ct.child.textDomain) || childSlug;
  return {
    parentSlug, parentName: parentName || parentSlug,
    childSlug, childName, td,
    fn: fnSlug(childSlug) || 'child_theme',
    pkg: pkgName(childSlug),
    parentHandle: slugify(ct.parentHandle) || (slugify(parentSlug) || 'parent') + '-style',
    isBlock: !!ct.parent.isBlock,
  };
}

function styleCss(ct: ChildTheme, d: Derived): string {
  const rows: [string, string][] = ([
    ['Theme Name', d.childName],
    ['Theme URI', ct.child.themeUri],
    ['Description', ct.child.description || 'Child theme for ' + d.parentName + '.'],
    ['Author', ct.child.author],
    ['Author URI', ct.child.authorUri],
    ['Template', d.parentSlug],
    ['Version', ct.child.version || '1.0.0'],
    ['Requires at least', ct.child.requiresWp],
    ['Requires PHP', ct.child.requiresPhp],
    ['License', 'GNU General Public License v2 or later'],
    ['License URI', 'https://www.gnu.org/licenses/gpl-2.0.html'],
    ['Text Domain', d.td],
    ['Tags', ct.child.tags],
  ] as [string, string][]).filter((r) => String(r[1] || '').trim());
  const w = rows.reduce((m, r) => Math.max(m, r[0].length + 1), 0);
  return '/*\n' + rows.map((r) => padTo(r[0] + ':', w + 2) + r[1]).join('\n') + '\n*/\n\n'
    + '/* -----------------------------------------------------------------\n'
    + '   Your styles go below. This file loads after ' + d.parentSlug + '/style.css,\n'
    + '   so a selector of equal specificity already wins — !important is\n'
    + '   almost never the answer.\n'
    + '   ----------------------------------------------------------------- */\n';
}

function enqueueBlock(ct: ChildTheme, d: Derived): string {
  if (ct.enqueueMode === 'none') {
    return '/*\n'
      + ' * No stylesheet enqueue.\n'
      + ' *\n'
      + ' * ' + d.parentName + ' does not need one: its styling comes through theme.json,\n'
      + ' * which WordPress merges the child\'s copy over. If you do put CSS in\n'
      + ' * style.css, enqueue it here — it is not guaranteed to load on its own.\n'
      + ' */\n';
  }
  if (ct.enqueueMode === 'handle') {
    return '/**\n'
      + ' * Load the child stylesheet after the parent\'s.\n'
      + ' *\n'
      + ' * ' + d.parentName + ' already enqueues its own stylesheet as "' + d.parentHandle + '".\n'
      + ' * Naming it as a dependency keeps the order right without loading the\n'
      + ' * parent style.css a second time.\n'
      + ' */\n'
      + 'function ' + d.fn + '_enqueue_styles() {\n'
      + '\twp_enqueue_style(\n'
      + "\t\t'" + d.childSlug + "-style',\n"
      + '\t\tget_stylesheet_uri(),\n'
      + "\t\tarray( '" + d.parentHandle + "' ),\n"
      + "\t\twp_get_theme()->get( 'Version' )\n"
      + '\t);\n'
      + '}\n'
      + "add_action( 'wp_enqueue_scripts', '" + d.fn + "_enqueue_styles' );\n";
  }
  return '/**\n'
    + ' * Load the parent stylesheet, then this theme\'s on top of it.\n'
    + ' *\n'
    + ' * The child style is declared as depending on the parent handle, so WordPress\n'
    + ' * prints them in that order no matter what else enqueues in between.\n'
    + ' */\n'
    + 'function ' + d.fn + '_enqueue_styles() {\n'
    + '\t$parent = wp_get_theme()->parent();\n'
    + '\n'
    + '\twp_enqueue_style(\n'
    + "\t\t'" + d.parentHandle + "',\n"
    + "\t\tget_template_directory_uri() . '/style.css',\n"
    + '\t\tarray(),\n'
    + "\t\t$parent ? $parent->get( 'Version' ) : null\n"
    + '\t);\n'
    + '\n'
    + '\twp_enqueue_style(\n'
    + "\t\t'" + d.childSlug + "-style',\n"
    + '\t\tget_stylesheet_uri(),\n'
    + "\t\tarray( '" + d.parentHandle + "' ),\n"
    + "\t\twp_get_theme()->get( 'Version' )\n"
    + '\t);\n'
    + '}\n'
    + "add_action( 'wp_enqueue_scripts', '" + d.fn + "_enqueue_styles' );\n";
}

function functionsPhp(ct: ChildTheme, d: Derived): string {
  const parts: string[] = [];
  parts.push('<?php\n'
    + '/**\n'
    + ' * ' + d.childName + ' functions and definitions.\n'
    + ' *\n'
    + ' * This file is loaded before ' + d.parentSlug + '/functions.php, and adds to it —\n'
    + ' * it does not replace it. Template files are the opposite: a copy in this\n'
    + ' * folder replaces the parent\'s entirely.\n'
    + ' *\n'
    + ' * @package ' + d.pkg + '\n'
    + ' */\n'
    + '\n'
    + "defined( 'ABSPATH' ) || exit;\n");
  parts.push(enqueueBlock(ct, d));
  if (ct.options.textdomain) {
    parts.push('/**\n'
      + ' * Load this theme\'s translations.\n'
      + ' *\n'
      + ' * Strings you add in the child are looked up here first; the parent keeps its own.\n'
      + ' */\n'
      + 'function ' + d.fn + '_load_textdomain() {\n'
      + "\tload_child_theme_textdomain( '" + d.td + "', get_stylesheet_directory() . '/languages' );\n"
      + '}\n'
      + "add_action( 'after_setup_theme', '" + d.fn + "_load_textdomain' );\n");
  }
  if (ct.options.copyMods) {
    parts.push('/**\n'
      + ' * Carry the parent\'s Customiser settings over the first time this theme is activated.\n'
      + ' *\n'
      + ' * theme_mods are stored per stylesheet, so a fresh child starts with an empty\n'
      + ' * Customiser. Anything WordPress has already set on the child — menu locations,\n'
      + ' * most of all — wins over the copied values.\n'
      + ' */\n'
      + 'function ' + d.fn + '_copy_parent_mods() {\n'
      + "\t$parent_mods = get_option( 'theme_mods_' . get_template() );\n"
      + '\n'
      + '\tif ( ! is_array( $parent_mods ) ) {\n'
      + '\t\treturn;\n'
      + '\t}\n'
      + '\n'
      + "\t$child_mods = get_option( 'theme_mods_' . get_stylesheet() );\n"
      + '\t$child_mods = is_array( $child_mods ) ? $child_mods : array();\n'
      + '\n'
      + "\tunset( $parent_mods['nav_menu_locations'] );\n"
      + '\n'
      + "\tupdate_option( 'theme_mods_' . get_stylesheet(), array_merge( $parent_mods, $child_mods ) );\n"
      + '}\n'
      + "add_action( 'after_switch_theme', '" + d.fn + "_copy_parent_mods' );\n");
  }
  if (ct.options.setupHook) {
    parts.push('/**\n'
      + ' * Theme setup.\n'
      + ' *\n'
      + ' * Priority 11 so this runs after ' + d.parentName + '\'s own after_setup_theme callback —\n'
      + ' * at the default priority the child would run first and the parent would overwrite it.\n'
      + ' */\n'
      + 'function ' + d.fn + '_setup() {\n'
      + '\t// add_theme_support( ... );\n'
      + '\t// remove_theme_support( ... );\n'
      + '}\n'
      + "add_action( 'after_setup_theme', '" + d.fn + "_setup', 11 );\n");
  }
  return parts.join('\n');
}

function themeJsonFile(): string {
  return '{\n'
    + '\t"$schema": "https://schemas.wp.org/trunk/theme.json",\n'
    + '\t"version": 3,\n'
    + '\t"settings": {\n'
    + '\t\t"appearanceTools": true,\n'
    + '\t\t"color": {\n'
    + '\t\t\t"palette": [\n'
    + '\t\t\t\t{ "slug": "accent", "name": "Accent", "color": "' + SCREENSHOT_ACCENT + '" }\n'
    + '\t\t\t]\n'
    + '\t\t}\n'
    + '\t},\n'
    + '\t"styles": {\n'
    + '\t\t"elements": {\n'
    + '\t\t\t"link": { "color": { "text": "var(--wp--preset--color--accent)" } }\n'
    + '\t\t}\n'
    + '\t}\n'
    + '}\n';
}

function rtlCss(d: Derived): string {
  return '/*\n'
    + ' * Right-to-left styles for ' + d.childName + '.\n'
    + ' *\n'
    + ' * WordPress loads this instead of nothing whenever is_rtl() is true — you do not\n'
    + ' * enqueue it. Only put the flipped declarations here, not a copy of style.css.\n'
    + ' */\n';
}

export interface GeneratedFile {
  name: string;
  lang: 'css' | 'php' | 'json' | 'image';
  code: string;
}

export function buildFiles(ct: ChildTheme): GeneratedFile[] {
  const d = derive(ct);
  const files: GeneratedFile[] = [{ name: 'style.css', lang: 'css', code: styleCss(ct, d) }];
  if (ct.options.functions) files.push({ name: 'functions.php', lang: 'php', code: functionsPhp(ct, d) });
  if (ct.options.themeJson) files.push({ name: 'theme.json', lang: 'json', code: themeJsonFile() });
  if (ct.options.rtl) files.push({ name: 'rtl.css', lang: 'css', code: rtlCss(d) });
  if (ct.options.screenshot) files.push({ name: 'screenshot.png', lang: 'image', code: '' });
  return files;
}

export function validate(ct: ChildTheme, d: Derived): ValidationIssue[] {
  const out: ValidationIssue[] = [];
  const add = (severity: ValidationIssue['severity'], message: string, fix?: string, fixLabel?: string) => out.push({ severity, message, fix, fixLabel });

  if (!d.parentSlug) add('error', 'No parent folder yet. Without a Template value WordPress treats this as a standalone theme — search for the parent above, or type its folder name.');
  if (!String(ct.parent.name || '').trim() && d.parentSlug) add('warning', 'The parent has a folder but no name — only the Description and Themes screen copy use it, but it reads badly empty.');
  if (d.parentSlug && d.childSlug === d.parentSlug) add('error', 'The child folder is the same as the parent folder. Two themes cannot share a directory — rename one of them.');
  if (d.parentSlug && /\s/.test(d.parentSlug)) add('error', 'The Template value has a space in it. It is a directory name, not a title — “' + d.parentSlug + '” cannot exist as a folder.', 'slugifyParent', 'Fix the folder name');
  if (d.parentSlug && /[A-Z]/.test(d.parentSlug)) {
    add(ct.parent.knownCase ? 'recommendation' : 'warning',
      ct.parent.knownCase
        ? '“' + d.parentSlug + '” is capitalised on purpose — that is genuinely how the theme ships. Template is case sensitive, so leave it exactly like this.'
        : 'The parent folder has capitals in it. Template matches the directory character for character, so “' + d.parentSlug + '” only works if the folder really is capitalised. Check wp-content/themes before you ship.',
      ct.parent.knownCase ? undefined : 'lowerParent', 'Make it lowercase');
  }
  if (!String(ct.child.name || '').trim()) add('warning', 'No child theme name — the Themes screen will fall back to the folder name.');
  if (d.childSlug !== slugify(d.childSlug) || !d.childSlug) add('error', 'The child folder name is not a valid directory slug.');
  if (d.td !== d.childSlug) add('recommendation', 'The text domain (' + d.td + ') differs from the folder name (' + d.childSlug + '). WordPress requires them to match for translations from translate.wordpress.org, and it is the convention everywhere else.', 'syncTextDomain', 'Match the folder');
  if (!/^\d+(\.\d+)*$/.test(String(ct.child.version || ''))) add('warning', 'Version “' + ct.child.version + '” is not a plain dotted number. Update checkers compare it with version_compare().');
  if (!ct.options.functions && ct.enqueueMode !== 'none') add('error', 'functions.php is switched off, so nothing enqueues the parent stylesheet — the site will load unstyled. Turn the file back on or pick the “No enqueue” option.', 'enableFunctions', 'Add functions.php');
  if (ct.enqueueMode === 'handle' && !String(ct.parentHandle || '').trim()) add('error', 'Depending on the parent handle needs the handle name. Look for wp_enqueue_style() in the parent\'s functions.php.');
  if (d.isBlock && ct.enqueueMode === 'stack') add('recommendation', d.parentName + ' is a block theme, so most of its styling comes from theme.json rather than style.css. A child theme.json merged over the parent is usually all you need.', 'blockPreset', 'Use theme.json instead');
  if (d.isBlock && !ct.options.themeJson) add('recommendation', 'The parent is a block theme and there is no child theme.json. Only the keys you declare override the parent — it does not have to be a full copy.', 'addThemeJson', 'Add theme.json');
  if (!ct.options.screenshot) add('recommendation', 'No screenshot.png. WordPress shows a grey placeholder in the Themes grid; the recommended size is 1200 × 900.', 'addScreenshot', 'Generate one');
  if (!ct.options.copyMods) add('recommendation', 'Activating a child theme starts with an empty Customiser, because theme_mods are stored per stylesheet. The activation snippet copies the parent\'s across once.', 'addCopyMods', 'Add the snippet');
  if (ct.options.rtl) add('recommendation', 'rtl.css is loaded automatically by WordPress when the site language is right-to-left — do not enqueue it yourself.');
  if (ct.child.tags) add('recommendation', 'Tags only matter for themes submitted to the wordpress.org directory. A private child theme can leave the header off.');
  return out;
}

export function freshProject(): ChildTheme {
  return {
    parent: { name: 'Astra', slug: 'astra', isBlock: false, knownCase: false, author: 'Brainstorm Force', note: '' },
    child: {
      name: 'Astra Child', slugMode: 'auto', slug: '', description: 'Child theme for Astra.',
      author: '', authorUri: '', themeUri: '', version: '1.0.0', textDomain: 'astra-child',
      requiresWp: '6.0', requiresPhp: '7.4', tags: '',
    },
    enqueueMode: 'stack', parentHandle: '',
    options: { functions: true, textdomain: true, copyMods: true, setupHook: false, themeJson: false, rtl: false, screenshot: true },
  };
}

export function applyFix(ct: ChildTheme, kind: string): ChildTheme {
  const p: ChildTheme = JSON.parse(JSON.stringify(ct));
  if (kind === 'slugifyParent') p.parent.slug = slugify(p.parent.slug);
  if (kind === 'lowerParent') { p.parent.slug = p.parent.slug.toLowerCase(); p.parent.knownCase = false; }
  if (kind === 'syncTextDomain') p.child.textDomain = p.child.slugMode === 'custom' ? slugify(p.child.slug) : (slugify(p.parent.slug) || 'parent') + '-child';
  if (kind === 'enableFunctions') p.options.functions = true;
  if (kind === 'blockPreset') { p.enqueueMode = 'none'; p.options.themeJson = true; }
  if (kind === 'addThemeJson') p.options.themeJson = true;
  if (kind === 'addScreenshot') p.options.screenshot = true;
  if (kind === 'addCopyMods') p.options.copyMods = true;
  return p;
}

// ---------------------------------------------------------------------------
// wordpress.org theme search

export const WPORG_ENDPOINT = 'https://api.wordpress.org/themes/info/1.2/?action=query_themes';

export function wporgSearchUrl(query: string): string {
  const params = query ? '&request[search]=' + encodeURIComponent(query) : '&request[browse]=popular';
  return WPORG_ENDPOINT + params
    + '&request[per_page]=16'
    + '&request[fields][description]=0&request[fields][sections]=0'
    + '&request[fields][tags]=1&request[fields][active_installs]=1&request[fields][screenshot_url]=1';
}

interface WporgThemeJson {
  name: string;
  slug: string;
  tags?: string[] | Record<string, string>;
  author?: string | { display_name?: string; user_nickname?: string };
  active_installs?: number;
  rating?: number;
  version?: string;
  screenshot_url?: string;
}

export function mapWporgThemes(json: { themes?: WporgThemeJson[] } | null | undefined): ThemeResult[] {
  const list = json && json.themes ? json.themes : [];
  return list.map((t) => {
    const tags = t.tags ? (Array.isArray(t.tags) ? t.tags : Object.keys(t.tags)) : [];
    const author = t.author && typeof t.author === 'object' ? t.author.display_name || t.author.user_nickname || '' : t.author || '';
    return {
      name: t.name, slug: t.slug, author: String(author).replace(/<[^>]*>/g, ''),
      block: tags.indexOf('full-site-editing') >= 0,
      installs: t.active_installs || 0, rating: t.rating || 0,
      thumb: t.screenshot_url ? (t.screenshot_url.indexOf('//') === 0 ? 'https:' + t.screenshot_url : t.screenshot_url) : '',
      premium: false, note: '',
    };
  });
}

// ---------------------------------------------------------------------------
// ZIP writer — stored (uncompressed) entries. WordPress's unzip_file() reads
// them fine and it keeps this to under a hundred lines instead of a deflate
// implementation.

let CRC_TABLE: Uint32Array | null = null;
function crcTable(): Uint32Array {
  if (CRC_TABLE) return CRC_TABLE;
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  CRC_TABLE = t;
  return t;
}
function crc32(bytes: Uint8Array): number {
  const t = crcTable();
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = (c >>> 8) ^ t[(c ^ bytes[i]) & 0xff];
  return (c ^ 0xffffffff) >>> 0;
}

export interface ZipEntry {
  name: string;
  data: Uint8Array;
}

export function zipBlob(entries: ZipEntry[]): Blob {
  const enc = new TextEncoder();
  const local: (Uint8Array | ArrayBufferView)[] = [];
  const central: Uint8Array[] = [];
  const now = new Date();
  const time = ((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)) & 0xffff;
  const date = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xffff;
  let offset = 0;
  entries.forEach((e) => {
    const nameBytes = enc.encode(e.name);
    const data = e.data;
    const crc = crc32(data);
    const lh = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(lh.buffer);
    lv.setUint32(0, 0x04034b50, true); lv.setUint16(4, 20, true); lv.setUint16(6, 0x0800, true);
    lv.setUint16(8, 0, true); lv.setUint16(10, time, true); lv.setUint16(12, date, true);
    lv.setUint32(14, crc, true); lv.setUint32(18, data.length, true); lv.setUint32(22, data.length, true);
    lv.setUint16(26, nameBytes.length, true);
    lh.set(nameBytes, 30);
    local.push(lh, data);
    const ch = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(ch.buffer);
    cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true); cv.setUint16(10, 0, true);
    cv.setUint16(12, time, true); cv.setUint16(14, date, true);
    cv.setUint32(16, crc, true); cv.setUint32(20, data.length, true); cv.setUint32(24, data.length, true);
    cv.setUint16(28, nameBytes.length, true); cv.setUint32(42, offset, true);
    ch.set(nameBytes, 46);
    central.push(ch);
    offset += lh.length + data.length;
  });
  const cdSize = central.reduce((n, c) => n + c.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, entries.length, true); ev.setUint16(10, entries.length, true);
  ev.setUint32(12, cdSize, true); ev.setUint32(16, offset, true);
  return new Blob([...local, ...central, end] as BlobPart[], { type: 'application/zip' });
}

// ---------------------------------------------------------------------------
// Generated screenshot.png — a canvas-drawn cover, written into the .zip. Real
// screenshots (front-page renders) aren't feasible client-side; this beats
// the grey placeholder WordPress shows for a theme with no screenshot at all.

export function screenshotBytes(childName: string, parentName: string, slug: string): Uint8Array {
  const c = document.createElement('canvas');
  c.width = 1200;
  c.height = 900;
  const x = c.getContext('2d')!;
  x.fillStyle = SCREENSHOT_ACCENT;
  x.fillRect(0, 0, 1200, 900);
  x.fillStyle = 'rgba(255,255,255,0.10)';
  x.beginPath();
  x.arc(1080, 90, 340, 0, Math.PI * 2);
  x.fill();
  x.fillStyle = '#FFFFFF';
  x.font = '700 82px "Instrument Sans", system-ui, sans-serif';
  const words = String(childName).split(' ');
  const lines: string[] = [];
  let line = '';
  words.forEach((w) => {
    const test = line ? line + ' ' + w : w;
    if (x.measureText(test).width > 940 && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  });
  if (line) lines.push(line);
  const shown = lines.slice(0, 3);
  let y = 640 - (shown.length - 1) * 92;
  shown.forEach((l) => {
    x.fillText(l, 84, y);
    y += 92;
  });
  x.fillStyle = 'rgba(255,255,255,0.78)';
  x.font = '400 36px "Instrument Sans", system-ui, sans-serif';
  x.fillText('Child theme of ' + parentName, 84, y + 12);
  x.fillStyle = 'rgba(255,255,255,0.55)';
  x.font = '500 28px "JetBrains Mono", monospace';
  x.fillText(slug, 84, 800);
  const b64 = c.toDataURL('image/png').split(',')[1];
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function refSignature(childName: string, parentSlug: string): string {
  return 'style.css\n\n/*\nTheme Name: ' + childName + '\nTemplate:   ' + (parentSlug || '<parent folder>') + '\n*/\n\n// Template is matched against the directory name in wp-content/themes,\n// byte for byte. It is not the parent\'s display name.';
}

export const INSTALL_STEPS_TEMPLATE = (d: Derived) => [
  'Make sure ' + d.parentName + ' is installed at wp-content/themes/' + (d.parentSlug || 'parent') + '. A child theme with a missing parent shows up under Broken Themes and cannot be activated.',
  'Upload ' + d.childSlug + '.zip at Appearance › Themes › Add New › Upload Theme — or unzip it into wp-content/themes/ over SFTP.',
  'Activate ' + d.childName + '. The parent stays installed; do not activate or delete it.',
  'Re-check Appearance › Menus and the Customiser. Menu locations are remapped by WordPress, but widgets and theme_mods are stored per theme.',
];

export const OVERRIDE_RULES: { what: string; rule: string }[] = [
  { what: 'style.css', rule: "Both load. The child's comes second, so equal-specificity selectors win without !important." },
  { what: 'functions.php', rule: 'Both run, child first. It is the one file that is never replaced — so you cannot redefine a parent function unless the parent made it pluggable.' },
  { what: 'header.php, single.php, any template', rule: "A copy in the child folder replaces the parent's completely. Copy the file, then edit — do not start from scratch." },
  { what: 'templates/ and parts/ (block themes)', rule: "Matched by filename: templates/single.html in the child wins over the parent's." },
  { what: 'theme.json', rule: 'Merged, not replaced. Declare only the settings and styles you are changing.' },
  { what: 'inc/, template-parts/', rule: 'Only found if something requires them. get_template_part() checks the child first; a bare require in the parent still points at the parent.' },
];

export function refPaths(d: Derived): string {
  return padTo('get_stylesheet_directory()', 30) + 'child theme path\n'
    + padTo('get_stylesheet_directory_uri()', 30) + 'child theme URL\n'
    + padTo('get_stylesheet_uri()', 30) + 'child style.css URL\n'
    + padTo('get_template_directory()', 30) + 'parent theme path\n'
    + padTo('get_template_directory_uri()', 30) + 'parent theme URL\n'
    + padTo('get_stylesheet()', 30) + d.childSlug + '\n'
    + padTo('get_template()', 30) + (d.parentSlug || '<parent>');
}
