import type { ToolContent } from '../toolContentTypes';

export const activationContent: ToolContent = {
  aboutTitle: 'Activation Hooks Generator Online',
  aboutLead:
    'Every WordPress activation hook you need, in the order they really run. `register_activation_hook()` seeds options, creates tables through `dbDelta()` and schedules cron; `register_deactivation_hook()` clears schedules without touching data; and a separate `uninstall.php` does the deleting, because that is the only file WordPress runs when a plugin is actually deleted.',
  aboutSupport:
    'It also handles the ordering problem nobody warns you about: rewrite rules cannot be flushed during activation, because your post types are not registered yet. The generator flags a flush during activation and performs it on the next `wp_loaded`, which is the only sequence that produces working permalinks. Free, no account, generated in your browser.',
  spec: {
    hook: 'register_activation_hook() / register_deactivation_hook() / uninstall.php',
    outputs: 'A main plugin file, an include, or a standalone `uninstall.php`',
    requires: 'WordPress 2.0 or newer for the lifecycle hooks; PHP 7.4+ for the generated syntax',
  },

  whyTitle: 'Why generated lifecycle routines beat a hand-rolled activation function',
  whyIntro:
    'Activation runs exactly once, in a request where almost nothing is loaded, and the mistakes it causes surface weeks later: permalinks that 404, a cron event that outlives the plugin, a database column that never arrives on existing installs because `install()` is never called again. Each of those is a structural problem, so the generator writes the structure rather than a single function.',
  features: [
    {
      title: 'Three routines that do their own job',
      body: 'Activation checks requirements and calls `install()`; `install()` is written to be safe to run more than once; deactivation clears scheduled events and flushes rules but deletes nothing, because deactivation also happens on every update.',
    },
    {
      title: 'A requirement gate that fails politely',
      body: 'Optional PHP and WordPress version checks use `version_compare()` against `PHP_VERSION` and `get_bloginfo( \'version\' )`, then call `deactivate_plugins( plugin_basename( __FILE__ ) )` and `wp_die()` with a back link — a message instead of a fatal error on an old host.',
    },
    {
      title: 'Rewrite rules flushed at the only moment that works',
      body: 'Activation sets a flag option; a `wp_loaded` callback sees the flag, deletes it and calls `flush_rewrite_rules()` once. Flushing during activation itself would run before your post type exists, which is why so many plugins 404 until someone opens Settings → Permalinks.',
    },
    {
      title: 'An upgrade routine keyed to a version option',
      body: 'The plugin version is written to an option, and a `plugins_loaded` check re-runs `install()` whenever the constant is ahead of the stored value. Without it, new options and new `dbDelta()` columns never reach sites that already had the plugin — a warning the generator raises if you turn it off.',
    },
    {
      title: 'A custom table built with dbDelta()',
      body: 'Naming a table produces the `$wpdb->prefix` lookup, `get_charset_collate()`, the `require_once ABSPATH . \'wp-admin/includes/upgrade.php\'` line and a `CREATE TABLE` in the exact shape `dbDelta()` insists on — one field per line, two spaces after `PRIMARY KEY`, no backticks.',
    },
    {
      title: 'A real uninstall.php, at three levels',
      body: 'Its own output mode, guarded by `defined( \'WP_UNINSTALL_PLUGIN\' ) || exit`. Leave everything, remove options and schedules, or take the custom table and the plugin\'s own posts too — with warnings on the irreversible choices, plus role migration so nobody is left with no role at all.',
    },
  ],

  howTitle: 'How does the Activation Hooks Generator work?',
  howIntro: 'Four steps that produce two files: the lifecycle block for your main plugin file, and `uninstall.php` beside it.',
  steps: [
    {
      title: 'Identify the plugin',
      body: 'Set the function prefix, the current version and the minimum PHP and WordPress versions the requirement gate should enforce.',
    },
    {
      title: 'List what it creates',
      body: 'Name the options to seed, the custom table to build with `dbDelta()`, the cron hooks to schedule and any custom roles. Everything listed here is also what uninstall knows to remove.',
    },
    {
      title: 'Choose the behaviours',
      body: 'Toggle requirement checks, the deferred rewrite flush, cron scheduling, the version-gated upgrade routine and multisite-aware network activation.',
    },
    {
      title: 'Set the uninstall level and export',
      body: 'Pick how much deletion is appropriate, then export the plugin file and switch the output mode to save `uninstall.php` alongside it.',
    },
  ],
  example: {
    title: 'Worked example — activation that defers the rewrite flush',
    intro:
      'The part of the output that solves the ordering problem: activation only records that a flush is needed, and `wp_loaded` performs it once, after every post type has been registered on `init`.',
    code: `/**
 * Seed everything this plugin needs. Safe to run more than once.
 */
function acme_install() {
\t// Rewrite rules cannot be built here — the post type is not registered yet.
\t// Flag it and flush on the next load, once init has run.
\tupdate_option( 'acme_flush_rules', 1 );

\tupdate_option( 'acme_version', ACME_VERSION );
}

/**
 * Flush rewrite rules once, after everything is registered.
 */
function acme_maybe_flush_rules() {
\tif ( ! get_option( 'acme_flush_rules' ) ) {
\t\treturn;
\t}

\tdelete_option( 'acme_flush_rules' );
\tflush_rewrite_rules();
}
add_action( 'wp_loaded', 'acme_maybe_flush_rules' );

register_activation_hook( __FILE__, 'acme_activate' );
register_deactivation_hook( __FILE__, 'acme_deactivate' );`,
    note:
      'Both `register_*_hook()` calls must sit in the main plugin file, because `__FILE__` is how WordPress identifies which plugin they belong to. Move them into an include and the path no longer matches the plugin file, so the hooks never fire.',
  },
  refLinks: [
    {
      href: 'https://developer.wordpress.org/reference/functions/register_activation_hook/',
      title: 'register_activation_hook() — developer reference',
      description: 'The signature, and why the first argument has to be the main plugin file.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/register_deactivation_hook/',
      title: 'register_deactivation_hook() — developer reference',
      description: 'What runs on deactivation, including during an update.',
    },
    {
      href: 'https://developer.wordpress.org/plugins/plugin-basics/activation-deactivation-hooks/',
      title: 'Activation / Deactivation Hooks — Plugin Handbook',
      description: 'The official guidance on what belongs in each routine.',
    },
    {
      href: 'https://developer.wordpress.org/plugins/plugin-basics/uninstall-methods/',
      title: 'Uninstall Methods — Plugin Handbook',
      description: 'uninstall.php versus register_uninstall_hook(), and the WP_UNINSTALL_PLUGIN guard.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/dbdelta/',
      title: 'dbDelta() — developer reference',
      description: 'The formatting rules the CREATE TABLE statement has to follow to be diffed correctly.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/flush_rewrite_rules/',
      title: 'flush_rewrite_rules() — developer reference',
      description: 'Why it is expensive, and why it must run after post types are registered.',
    },
  ],

  faqTitle: 'Plugin activation & uninstall — frequently asked questions',
  faqIntro: 'The lifecycle questions that come up when a plugin has to install something.',
  faqs: [
    {
      question: 'Where do I call register_activation_hook()?',
      answer:
        'In the main plugin file — the one with the plugin header — passing `__FILE__` as the first argument. WordPress uses that path to work out which plugin the hook belongs to. Called from an include, `__FILE__` resolves to the include instead, the path does not match any known plugin, and the hook silently never fires.',
    },
    {
      question: 'Should I call flush_rewrite_rules() on activation?',
      answer:
        'Not directly. During activation your post types and taxonomies have not been registered yet, because `init` has not run in that request, so a flush there rebuilds rules that do not include them. The reliable pattern is to set a flag option during activation and call `flush_rewrite_rules()` once on a later `init` or `wp_loaded`, then delete the flag. It is an expensive call, so it must never run on every page load.',
    },
    {
      question: 'What is the difference between deactivation and uninstall?',
      answer:
        'Deactivation happens whenever the plugin is switched off, which includes every automatic update and every debugging session. Uninstall happens only when someone deletes the plugin from the Plugins screen. So deactivation should stop things — clear scheduled events, drop transients — and uninstall is the only correct place to delete options, tables or content.',
    },
    {
      question: 'Should I use uninstall.php or register_uninstall_hook()?',
      answer:
        '`uninstall.php` in the plugin folder is the recommended option and takes precedence when both exist. It runs in isolation with the plugin\'s own code not loaded, so it must not call your plugin\'s functions, and it has to begin with `defined( \'WP_UNINSTALL_PLUGIN\' ) || exit;` to stop anyone requesting it directly.',
    },
    {
      question: 'How do I run code when my plugin is updated?',
      answer:
        'There is no update hook. Activation does not re-fire on an update, so the standard approach is a version option: store the version during install, then compare it against your version constant on `plugins_loaded` and re-run the install routine when the code is ahead. That also covers sites updated by pushing files over the top, which never triggers any hook at all.',
    },
    {
      question: 'Does the activation hook run for every site on multisite?',
      answer:
        'No. A network activation fires the hook once, with `$network_wide` set to true, not once per site. To seed every site you have to loop `get_sites()` with `switch_to_blog()` and `restore_current_blog()` yourself. On a network with hundreds of sites that loop can exceed the request timeout, so a batched upgrade routine is safer than doing it all during activation.',
    },
  ],

  related: [
    { id: 'plugin-header', note: 'The main plugin file these hooks have to live in, with its version constant.' },
    { id: 'cron', note: 'The events scheduled on activation and cleared on deactivation.' },
    { id: 'wp-config', note: 'Environment constants worth checking before an install routine writes anything.' },
    { id: 'hooks', note: 'plugins_loaded, wp_loaded and init — the hooks the upgrade and flush routines ride on.' },
    { id: 'post-type', note: 'The registration whose rewrite rules make the deferred flush necessary.' },
    { id: 'user-role', note: 'Roles added on activation need migrating and removing on uninstall.' },
  ],
};
