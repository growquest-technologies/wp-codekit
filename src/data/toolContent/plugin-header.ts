import type { ToolContent } from '../toolContentTypes';

export const pluginHeaderContent: ToolContent = {
  aboutTitle: 'Plugin Header Generator Online',
  aboutLead:
    'The WordPress plugin header generator that writes the whole first file, not just the comment block. Fourteen aligned header fields, the `defined( \'ABSPATH\' ) || exit;` guard, a PHP version check that returns instead of fatalling, the five path constants every plugin ends up needing, and — if you want it — a singleton bootstrap class to hang the rest of the plugin from.',
  aboutSupport:
    'A live mock-up of the Plugins screen shows how your row will actually read: the name, the description, the version, the author and the Requires PHP note. Switch the output and the same fields seed a starter `readme.txt`. Free, no account, and everything is generated in the browser.',
  spec: {
    hook: 'Plugin Name: — the file header WordPress parses',
    outputs: 'A main plugin file, or a seeded `readme.txt`',
    requires: 'WordPress 5.8+ for the Update URI header; PHP 7.4+ for the generated code',
  },

  whyTitle: 'Why a generated plugin header beats copying the one from your last project',
  whyIntro:
    'The header is parsed from the first 8 kB of the main file, and every field except `Plugin Name` fails silently when it is wrong. A text domain that does not match the folder means translations never load. A version that is not `version_compare()`-able means updates behave unpredictably. A missing `Update URI` means wordpress.org can offer someone else\'s plugin as an update for yours.',
  features: [
    {
      title: 'Every field, aligned and in order',
      body: 'Plugin Name, Plugin URI, Description, Version, Requires at least, Tested up to, Requires PHP, Author, Author URI, License, License URI, Text Domain, Domain Path, Update URI and Network — written in the order WordPress documents, with the values column-aligned.',
    },
    {
      title: 'Slug and text domain kept in sync',
      body: 'The text domain must equal the plugin folder name or your `.mo` files never load, so a mismatch is an error with a one-click fix. An unsafe folder slug — capitals, spaces, underscores — is flagged the same way.',
    },
    {
      title: 'Update URI, for plugins that are not in the directory',
      body: 'Since WordPress 5.8, setting `Update URI` to `false` or to a domain you control stops wordpress.org offering an update for a directory plugin whose slug happens to match yours. The generator recommends it, and explains when the opposite is correct.',
    },
    {
      title: 'Checks that mirror how the Plugins screen behaves',
      body: 'A description over 140 characters is flagged because the list truncates it, a version that `version_compare()` cannot read is an error, a missing `Requires PHP` is a warning, and a proprietary licence is called out as incompatible with hosting on wordpress.org.',
    },
    {
      title: 'A bootstrap you can actually build on',
      body: 'Optional constants for `_VERSION`, `_FILE`, `_PATH`, `_URL` and `_BASENAME`, a `load_plugin_textdomain()` call for translations you ship yourself, and a final singleton class with `instance()`, `includes()` and `hooks()` so the main file stays a header and a require.',
    },
    {
      title: 'Two files from one form',
      body: 'The same fields produce a starter `readme.txt` with the directory header, and the Structure tab shows a folder layout — `includes/`, `admin/`, `languages/`, `uninstall.php` — that survives the plugin growing past one file.',
    },
  ],

  howTitle: 'How does the Plugin Header Generator work?',
  howIntro: 'Four steps to a main plugin file that WordPress will list, activate and update correctly.',
  steps: [
    {
      title: 'Name the plugin',
      body: 'Plugin name, folder slug and the one-line description the Plugins screen shows. The preview above the form updates as you type.',
    },
    {
      title: 'Set compatibility',
      body: 'Version, Requires at least, Tested up to and Requires PHP. These are what stop an unsuitable site activating the plugin, and what the directory reads for its compatibility notice.',
    },
    {
      title: 'Add the metadata',
      body: 'Author and URIs, licence, text domain, domain path and Update URI. Toggle the translation loader, the bootstrap class and, for multisite, the network-only flag.',
    },
    {
      title: 'Export both files',
      body: 'Clear the Checks tab, download the main file as `your-slug/your-slug.php`, then switch the output mode to take the seeded `readme.txt` with it.',
    },
  ],
  example: {
    title: 'Worked example — the header and guard for a GPL plugin',
    intro:
      'The top of the generated main file. Constants, the translation loader and the bootstrap class follow underneath it.',
    code: `<?php
/**
 * Plugin Name:        Acme Toolkit
 * Description:        Editorial tools for the Acme site: briefs, review workflow and a weekly digest.
 * Version:            1.0.0
 * Requires at least:  6.0
 * Tested up to:       6.8
 * Requires PHP:       7.4
 * Author:             GrowQuest
 * Author URI:         https://growquest.io
 * License:            GPL-2.0-or-later
 * License URI:        https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:        acme-toolkit
 * Domain Path:        /languages
 * Update URI:         false
 *
 * @package Acme_Toolkit
 */

defined( 'ABSPATH' ) || exit;

// Fail loudly here rather than fatally later.
if ( version_compare( PHP_VERSION, '7.4', '<' ) ) {
\treturn;
}`,
    note:
      'The `Requires PHP` header stops WordPress activating the plugin on an older PHP version, but the runtime check matters too: a site that was already running the plugin can be moved to an older PHP install, and returning early is far better than a parse error on a syntax the host does not support.',
  },
  refLinks: [
    {
      href: 'https://developer.wordpress.org/plugins/plugin-basics/header-requirements/',
      title: 'Header Requirements — Plugin Handbook',
      description: 'Every recognised header field, including Requires Plugins from WordPress 6.5.',
    },
    {
      href: 'https://developer.wordpress.org/plugins/plugin-basics/best-practices/',
      title: 'Plugin Basics: Best Practices',
      description: 'Prefixing, folder structure and the direct-access guard this generator writes.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/get_plugin_data/',
      title: 'get_plugin_data() — developer reference',
      description: 'The function that parses the header, and the exact keys it recognises.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/load_plugin_textdomain/',
      title: 'load_plugin_textdomain() — developer reference',
      description: 'Loading translations you ship yourself, and how Domain Path is used.',
    },
    {
      href: 'https://developer.wordpress.org/plugins/plugin-basics/including-a-software-license/',
      title: 'Including a Software License — Plugin Handbook',
      description: 'Why directory plugins must be GPL-compatible, and how to declare it.',
    },
    {
      href: 'https://developer.wordpress.org/plugins/wordpress-org/how-your-readme-txt-works/',
      title: 'How your readme.txt works',
      description: 'What the directory reads from readme.txt once the header is in place.',
    },
  ],

  faqTitle: 'Plugin headers — frequently asked questions',
  faqIntro: 'What developers ask when WordPress will not list, activate or update a plugin correctly.',
  faqs: [
    {
      question: 'Which plugin header fields are required?',
      answer:
        'Only `Plugin Name`. WordPress will list a file as a plugin on that alone. Everything else is optional and fails quietly: no description leaves a blank line on the Plugins screen, no `Requires PHP` means an old host can activate the plugin and fatal, and no text domain means translations are never loaded.',
    },
    {
      question: 'Why is my plugin not showing up in the Plugins list?',
      answer:
        'WordPress only reads the first 8 kB of PHP files directly inside `wp-content/plugins/` and one level down, so the header has to be in the main file, near the top, in a `/** … */` block. A stray character before `<?php`, a header buried below 8 kB of code, or a file nested two folders deep will all keep it hidden. Note the opposite problem too: a second `Plugin Name:` in any other file in the folder makes WordPress list that file as a separate plugin.',
    },
    {
      question: 'Does the text domain have to match the plugin folder name?',
      answer:
        'Yes. Since WordPress 4.6 core loads translations automatically from `wp-content/languages/plugins/` using the folder name, so a text domain that differs from the folder simply never resolves. If you also ship your own `.mo` files, set `Domain Path` to `/languages` and call `load_plugin_textdomain()` for those.',
    },
    {
      question: 'What is the Update URI header for?',
      answer:
        'Added in WordPress 5.8, it controls where update checks for your plugin may come from. Set it to `false` for a private or client plugin and wordpress.org will never offer an update for it, even if a directory plugin shares the slug — which is otherwise a real way to have a stranger\'s code installed over yours. Set it to a domain you control if you are serving your own updates.',
    },
    {
      question: 'How do I make my plugin require another plugin?',
      answer:
        'WordPress 6.5 added the `Requires Plugins:` header. It takes a comma-separated list of wordpress.org plugin slugs, such as `woocommerce`, and WordPress will not let the plugin be activated until those dependencies are installed and active. It only accepts directory slugs, not paths like `woocommerce/woocommerce.php`, and it is not generated here — add the line to the header block yourself if you need it.',
    },
    {
      question: 'Can a WordPress plugin be a single file?',
      answer:
        'Yes. A single `.php` file with a valid header, placed directly in `wp-content/plugins/`, is a complete plugin. Once it grows past a few hundred lines a folder with the main file, an `includes/` directory and an `uninstall.php` is far easier to live with — and a folder is required if you ever want to publish it to the directory, since it needs a `readme.txt` beside the code.',
    },
  ],

  related: [
    { id: 'activation', note: 'The lifecycle routines that must live in the main file this header belongs to.' },
    { id: 'readme', note: 'Turn the same metadata into a readme.txt the plugin directory will accept.' },
    { id: 'hooks', note: 'What the bootstrap class actually registers once the file loads.' },
    { id: 'enqueue', note: 'The path and URL constants this file defines are what asset registration uses.' },
    { id: 'wp-config', note: 'Requires PHP is one gate; the site config is where the environment is declared.' },
    { id: 'cron', note: 'Scheduled events wired to the activation and deactivation hooks in this file.' },
  ],
};
