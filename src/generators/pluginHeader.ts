import { escPhp, type ValidationIssue } from '../lib/codegen';

export type OutputMode = 'plugin' | 'readme';
export type License = 'GPL-2.0-or-later' | 'GPL-3.0-or-later' | 'MIT' | 'proprietary';

export const LICENSE_URI: Record<License, string> = {
  'GPL-2.0-or-later': 'https://www.gnu.org/licenses/gpl-2.0.html',
  'GPL-3.0-or-later': 'https://www.gnu.org/licenses/gpl-3.0.html',
  MIT: 'https://opensource.org/licenses/MIT',
  proprietary: '',
};

export interface PluginHeader {
  name: string;
  slug: string;
  description: string;
  version: string;
  author: string;
  authorUri: string;
  pluginUri: string;
  minWp: string;
  testedUp: string;
  minPhp: string;
  license: License;
  textDomain: string;
  updateUri: string;
  domainPath: boolean;
  textdomainLoad: boolean;
  bootstrap: boolean;
  networkOnly: boolean;
}

function slugify(s: string): string {
  return String(s || '').toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
}
function constName(s: string): string {
  return String(s || 'acme').toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}
function pascal(s: string): string {
  return String(s || '').split(/[^A-Za-z0-9]+/).filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('_');
}
function padTo(s: string, w: number): string {
  return s + new Array(Math.max(0, w - s.length) + 1).join(' ');
}

const CREDIT = ' * Generated with WP CodeKit — powered by GrowQuest (https://growquest.io).\n';

interface Derived {
  slug: string;
  CONST: string;
  cls: string;
  td: string;
}

function derive(ph: PluginHeader): Derived {
  const slug = slugify(ph.slug) || 'acme-plugin';
  return {
    slug,
    CONST: constName(slug),
    cls: pascal(slug) || 'Acme_Plugin',
    td: slugify(ph.textDomain) || slug,
  };
}
export { derive as derivePluginHeader };

function buildHeader(ph: PluginHeader): string {
  const d = derive(ph);
  const fields: [string, string][] = [];
  fields.push(['Plugin Name', ph.name || 'Acme Plugin']);
  if (String(ph.pluginUri || '').trim()) fields.push(['Plugin URI', String(ph.pluginUri).trim()]);
  fields.push(['Description', ph.description || '']);
  fields.push(['Version', String(ph.version || '1.0.0').trim()]);
  if (String(ph.minWp || '').trim()) fields.push(['Requires at least', String(ph.minWp).trim()]);
  if (String(ph.testedUp || '').trim()) fields.push(['Tested up to', String(ph.testedUp).trim()]);
  if (String(ph.minPhp || '').trim()) fields.push(['Requires PHP', String(ph.minPhp).trim()]);
  fields.push(['Author', ph.author || '']);
  if (String(ph.authorUri || '').trim()) fields.push(['Author URI', String(ph.authorUri).trim()]);
  if (ph.license !== 'proprietary') {
    fields.push(['License', ph.license]);
    fields.push(['License URI', LICENSE_URI[ph.license] || '']);
  } else {
    fields.push(['License', 'Proprietary — all rights reserved']);
  }
  fields.push(['Text Domain', d.td]);
  if (ph.domainPath) fields.push(['Domain Path', '/languages']);
  if (String(ph.updateUri || '').trim()) fields.push(['Update URI', String(ph.updateUri).trim()]);
  if (ph.networkOnly) fields.push(['Network', 'true']);
  const w = fields.reduce((m, f) => Math.max(m, f[0].length), 0);
  return fields.map((f) => (' * ' + padTo(f[0] + ':', w + 2) + ' ' + f[1]).replace(/\s+$/, '')).join('\n');
}

export function freshProject(): PluginHeader {
  return {
    name: 'Acme Toolkit', slug: 'acme-toolkit', description: 'Editorial tools for the Acme site: briefs, review workflow and a weekly digest.',
    version: '1.0.0', author: 'GrowQuest', authorUri: 'https://growquest.io', pluginUri: '',
    minWp: '6.0', testedUp: '6.8', minPhp: '7.4', license: 'GPL-2.0-or-later',
    textDomain: 'acme-toolkit', updateUri: 'false',
    domainPath: true, textdomainLoad: true, bootstrap: true, networkOnly: false,
  };
}

export function buildCode(ph: PluginHeader, mode: OutputMode): string {
  const d = derive(ph);
  if (mode === 'readme') {
    let out = '=== ' + (ph.name || 'Acme Plugin') + ' ===\n';
    out += 'Contributors: ' + slugify(ph.author) + '\n';
    out += 'Tags: \nRequires at least: ' + (ph.minWp || '6.0') + '\nTested up to: ' + (ph.testedUp || '6.8') + '\nRequires PHP: ' + (ph.minPhp || '7.4') + '\nStable tag: ' + (ph.version || '1.0.0') + '\nLicense: ' + ph.license + '\n';
    if (LICENSE_URI[ph.license]) out += 'License URI: ' + LICENSE_URI[ph.license] + '\n';
    out += '\n' + (ph.description || '') + '\n\n== Description ==\n\nWrite the long description here — this is what the directory page shows.\n\n== Installation ==\n\n1. Upload the plugin folder to /wp-content/plugins/.\n2. Activate it through the Plugins screen.\n\n== Changelog ==\n\n= ' + (ph.version || '1.0.0') + ' =\n* First release.\n';
    return out;
  }

  let out = '<?php\n/**\n' + buildHeader(ph) + '\n *\n' + CREDIT + ' *\n * @package ' + d.cls + '\n */\n\n';
  out += "defined( 'ABSPATH' ) || exit;\n\n";
  out += '// Fail loudly here rather than fatally later.\n';
  if (String(ph.minPhp || '').trim()) {
    out += "if ( version_compare( PHP_VERSION, '" + escPhp(String(ph.minPhp).trim()) + "', '<' ) ) {\n\treturn;\n}\n\n";
  }
  const W = ['VERSION', 'FILE', 'PATH', 'URL', 'BASENAME'].reduce((m, k) => Math.max(m, (d.CONST + '_' + k).length), 0);
  out += "define( '" + padTo(d.CONST + "_VERSION',", W + 3) + " '" + escPhp(String(ph.version || '1.0.0').trim()) + "' );\ndefine( '" + padTo(d.CONST + "_FILE',", W + 3) + ' __FILE__ );\ndefine( \'' + padTo(d.CONST + "_PATH',", W + 3) + ' plugin_dir_path( __FILE__ ) );\ndefine( \'' + padTo(d.CONST + "_URL',", W + 3) + ' plugin_dir_url( __FILE__ ) );\ndefine( \'' + padTo(d.CONST + "_BASENAME',", W + 3) + ' plugin_basename( __FILE__ ) );\n\n';

  if (ph.textdomainLoad) {
    out += '/**\n * Load translations.\n *\n * Since WordPress 4.6 core loads directory-hosted translations for you;\n * this is for the ones you ship yourself.\n */\nfunction ' + d.slug.replace(/-/g, '_') + '_load_textdomain() {\n\tload_plugin_textdomain( \'' + d.td + "', false, dirname( " + d.CONST + "_BASENAME ) . '/languages' );\n}\nadd_action( 'init', '" + d.slug.replace(/-/g, '_') + "_load_textdomain' );\n\n";
  }

  if (ph.bootstrap) {
    out += '/**\n * The plugin, as one object.\n */\nfinal class ' + d.cls + ' {\n\n\t/**\n\t * The single instance.\n\t *\n\t * @var ' + d.cls + '|null\n\t */\n\tprivate static $instance = null;\n\n\t/**\n\t * Get the instance, creating it on first call.\n\t *\n\t * @return ' + d.cls + '\n\t */\n\tpublic static function instance() {\n\t\tif ( null === self::$instance ) {\n\t\t\tself::$instance = new self();\n\t\t\tself::$instance->boot();\n\t\t}\n\n\t\treturn self::$instance;\n\t}\n\n\t/**\n\t * Load the pieces and wire the hooks.\n\t */\n\tprivate function boot() {\n\t\t$this->includes();\n\t\t$this->hooks();\n\t}\n\n\t/**\n\t * Require the plugin’s own files.\n\t */\n\tprivate function includes() {\n\t\trequire_once ' + d.CONST + "_PATH . 'includes/class-settings.php';\n\t\trequire_once " + d.CONST + "_PATH . 'includes/class-assets.php';\n\t}\n\n\t/**\n\t * Everything this plugin hooks into.\n\t */\n\tprivate function hooks() {\n\t\tadd_action( 'init', array( $this, 'register' ) );\n\t}\n\n\t/**\n\t * Registration that belongs on init.\n\t */\n\tpublic function register() {\n\t\t// Post types, taxonomies and shortcodes go here.\n\t}\n}\n\n" + d.cls + '::instance();\n';
  } else {
    out += '// Load the plugin’s own files.\nrequire_once ' + d.CONST + "_PATH . 'includes/functions.php';\n";
  }
  return out;
}

export function validate(ph: PluginHeader): ValidationIssue[] {
  const d = derive(ph);
  const out: ValidationIssue[] = [];
  const add = (severity: ValidationIssue['severity'], message: string, targetId?: string, fix?: string, fixLabel?: string) => out.push({ severity, message, targetId, fix, fixLabel });
  if (!String(ph.name || '').trim()) add('error', 'Plugin Name is the one required field. Without it WordPress does not list the file as a plugin at all.', 'name');
  if (!String(ph.description || '').trim()) add('warning', 'No description, so the Plugins screen shows a blank line under the name.', 'description');
  else if (String(ph.description).length > 140) add('warning', 'The description is ' + String(ph.description).length + ' characters. The Plugins screen truncates around 140.', 'description');
  if (!/^\d+\.\d+(\.\d+)?$/.test(String(ph.version || '').trim())) add('error', 'Version must be a comparable version string like 1.0.0 — the update system uses version_compare().', 'version');
  if (!String(ph.author || '').trim()) add('warning', 'No author. The Plugins screen shows "By" followed by nothing.', 'author');
  if (String(ph.slug || '').trim() !== d.slug) add('error', '"' + ph.slug + '" is not a safe folder slug. Lowercase with dashes — it becomes the folder name and the text domain.', 'slug', 'fixSlug', 'Use ' + d.slug);
  if (d.td !== d.slug) add('error', 'The text domain must match the plugin folder name exactly, or WordPress will not load your translation files.', 'textDomain', 'matchTd', 'Use ' + d.slug);
  if (String(ph.pluginUri || '').trim() && !/^https?:\/\//.test(String(ph.pluginUri).trim())) add('error', 'Plugin URI must be a full URL.', 'pluginUri');
  if (String(ph.authorUri || '').trim() && !/^https?:\/\//.test(String(ph.authorUri).trim())) add('error', 'Author URI must be a full URL.', 'authorUri');
  if (!String(ph.minPhp || '').trim()) add('warning', 'No Requires PHP, so WordPress cannot stop an old host from activating the plugin and fatalling.', 'minPhp');
  if (!String(ph.minWp || '').trim()) add('recommendation', 'No Requires at least. Users on old WordPress will install it and discover the problem themselves.');
  if (!String(ph.testedUp || '').trim()) add('recommendation', 'No Tested up to. The directory shows a compatibility warning without it.');
  if (ph.license === 'proprietary') add('warning', 'A proprietary licence cannot be hosted on wordpress.org — the directory requires GPL-compatible licensing. Fine for a client plugin.');
  if (!String(ph.updateUri || '').trim()) add('recommendation', 'No Update URI. If the slug ever collides with a directory plugin, wordpress.org will happily overwrite this one. Set it to false for private plugins.', undefined, 'setUpdateFalse', 'Set it to false');
  if (String(ph.updateUri || '').trim() === 'false') add('recommendation', 'Update URI is false, so nothing external can offer an update. Correct for a client plugin, wrong for a distributed one.');
  if (ph.networkOnly) add('recommendation', 'Network true means the plugin can only be activated network-wide on multisite. It disappears from individual sites’ plugin lists.');
  if (!ph.textdomainLoad) add('recommendation', 'No load_plugin_textdomain(). Core loads directory-hosted translations automatically, but not the .mo files you ship yourself.');
  if (ph.bootstrap) add('recommendation', 'The bootstrap requires includes/class-settings.php and includes/class-assets.php — create them or trim the includes() method.');
  if (!ph.bootstrap) add('recommendation', 'No bootstrap class. Fine for a small plugin; past a few hundred lines a single entry object saves you from a file of loose functions.');
  return out;
}

export function applyFix(ph: PluginHeader, kind: string): PluginHeader {
  const p: PluginHeader = JSON.parse(JSON.stringify(ph));
  if (kind === 'fixSlug') p.slug = slugify(p.slug);
  if (kind === 'matchTd') p.textDomain = slugify(p.slug);
  if (kind === 'setUpdateFalse') p.updateUri = 'false';
  return p;
}

export function treeText(ph: PluginHeader): string {
  const d = derive(ph);
  return d.slug + '/\n├── ' + d.slug + '.php          header, guard, constants\n├── uninstall.php' + new Array(Math.max(1, d.slug.length - 8)).join(' ') + '   deletion, on delete only\n├── readme.txt\n├── languages/\n│   └── ' + d.td + '.pot\n├── includes/\n│   ├── class-settings.php\n│   ├── class-assets.php\n│   └── functions.php\n├── admin/\n│   └── class-admin.php\n└── assets/\n    ├── css/\n    └── js/';
}

export const REF_ARGS: [string, string][] = [
  ['Plugin Name', 'The only required field. Everything else is optional, and its absence is silent.'],
  ['Description', 'One sentence, shown in the Plugins list. Truncated around 140 characters.'],
  ['Version', 'Compared with version_compare() for updates, so 1.10 is newer than 1.9.'],
  ['Requires at least / Requires PHP', 'Core refuses to activate the plugin when the environment is below these. Cheap insurance against a support ticket.'],
  ['Text Domain', 'Must equal the plugin folder name for translations to load.'],
  ['Domain Path', 'Where your own .mo files live, relative to the plugin folder.'],
  ['Update URI', 'Since 5.8. false, or a domain you control, stops wordpress.org offering updates for a slug collision.'],
  ['Network', 'true restricts activation to network-wide on multisite.'],
];
