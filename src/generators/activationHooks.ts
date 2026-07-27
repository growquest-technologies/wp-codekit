import type { ValidationIssue } from '../lib/codegen';

export type OutputMode = 'plugin' | 'snippet' | 'uninstall';
export type UninstallMode = 'none' | 'options' | 'all';

export interface ActivationHooks {
  prefix: string;
  version: string;
  minPhp: string;
  minWp: string;
  options: string;
  table: string;
  cronHooks: string;
  roles: string;
  requirementChecks: boolean;
  flushRules: boolean;
  scheduleCron: boolean;
  upgradeRoutine: boolean;
  networkAware: boolean;
  uninstall: UninstallMode;
  postTypeCleanup: boolean;
}

function fnSlug(s: string): string {
  return String(s || '').toLowerCase().trim().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
}
function indent(text: string, depth: number): string {
  const p = new Array(depth + 1).join('\t');
  return text.split('\n').map((l) => (l ? p + l : '')).join('\n');
}
function list(str: string): string[] {
  return String(str || '').split(',').map((v) => fnSlug(v)).filter(Boolean);
}

const CREDIT = '// Generated with WP CodeKit — powered by GrowQuest (https://growquest.io).\n';

interface Derived {
  pre: string;
  options: string[];
  table: string;
  crons: string[];
  roles: string[];
  versionKey: string;
}

function derive(ah: ActivationHooks): Derived {
  const pre = fnSlug(ah.prefix) || 'acme';
  return {
    pre,
    options: list(ah.options),
    table: fnSlug(ah.table),
    crons: list(ah.cronHooks),
    roles: list(ah.roles),
    versionKey: pre + '_version',
  };
}

export function freshProject(): ActivationHooks {
  return {
    prefix: 'acme', version: '1.2.0', minPhp: '7.4', minWp: '6.0',
    options: 'acme_settings', table: 'acme_events', cronHooks: 'acme_sync_products', roles: '',
    requirementChecks: true, flushRules: true, scheduleCron: true, upgradeRoutine: true, networkAware: false,
    uninstall: 'options', postTypeCleanup: false,
  };
}

export function buildCode(ah: ActivationHooks, mode: OutputMode): string {
  const d = derive(ah);
  const pre = d.pre;
  const version = String(ah.version || '1.0.0').trim();

  if (mode === 'uninstall') {
    let out = '<?php\n' + CREDIT + '/**\n * Runs only when the plugin is deleted from the Plugins screen.\n *\n * Never called on deactivation, so this is the one safe place to delete data.\n */\n\ndefined( \'WP_UNINSTALL_PLUGIN\' ) || exit;\n\n';
    if (ah.uninstall === 'none') {
      return out + '// Data is deliberately left in place, so reinstalling restores everything.\n';
    }
    if (d.options.length) {
      out += '$options = array(\n' + indent(d.options.concat([d.versionKey]).map((o) => "'" + o + "',").join('\n'), 1) + '\n);\n\nforeach ( $options as $option ) {\n\tdelete_option( $option );\n\tdelete_site_option( $option );\n}\n\n';
    }
    if (d.crons.length) {
      out += d.crons.map((c) => "wp_clear_scheduled_hook( '" + c + "' );").join('\n') + '\n\n';
    }
    if (d.roles.length) {
      out += '// Move anyone holding a custom role somewhere safe, then remove it.\nforeach ( array( ' + d.roles.map((r) => "'" + r + "'").join(', ') + ' ) as $role ) {\n\tforeach ( get_users( array( \'role\' => $role, \'fields\' => \'ID\' ) ) as $user_id ) {\n\t\t$user = new WP_User( $user_id );\n\t\t$user->remove_role( $role );\n\n\t\tif ( ! $user->roles ) {\n\t\t\t$user->add_role( \'subscriber\' );\n\t\t}\n\t}\n\n\tremove_role( $role );\n}\n\n';
    }
    if (ah.uninstall === 'all' && d.table) {
      out += 'global $wpdb;\n\n// phpcs:ignore WordPress.DB.DirectDatabaseQuery.SchemaChange\n$wpdb->query( "DROP TABLE IF EXISTS {$wpdb->prefix}' + d.table + '" );\n\n';
    }
    if (ah.uninstall === 'all' && ah.postTypeCleanup) {
      out += '// Delete the plugin’s own content.\n$posts = get_posts(\n\tarray(\n\t\t\'post_type\'      => \'' + pre + "',\n\t\t'post_status'    => 'any',\n\t\t'numberposts'    => -1,\n\t\t'fields'         => 'ids',\n\t)\n);\n\nforeach ( $posts as $post_id ) {\n\twp_delete_post( $post_id, true );\n}\n\n";
    }
    out += '// Object caches keep their own copies.\nwp_cache_flush();\n';
    return out;
  }

  let out = '';
  if (mode === 'plugin') {
    out += '<?php\n' + CREDIT + '/**\n * Plugin Name:       ' + (ah.prefix ? ah.prefix.charAt(0).toUpperCase() + ah.prefix.slice(1) : 'Acme') + ' plugin\n * Description:       Lifecycle routines: activation, deactivation and upgrades.\n * Version:           ' + version + '\n * Requires PHP:      ' + (ah.minPhp || '7.4') + '\n * Requires at least: ' + (ah.minWp || '6.0') + "\n */\n\ndefined( 'ABSPATH' ) || exit;\n\n";
  } else {
    out += '<?php\n' + CREDIT + "\ndefined( 'ABSPATH' ) || exit;\n\n";
  }

  out += "define( '" + pre.toUpperCase() + "_VERSION', '" + version.replace(/'/g, "\\'") + "' );\n\n";

  let act = '';
  if (ah.requirementChecks) {
    act += "if ( version_compare( PHP_VERSION, '" + String(ah.minPhp || '7.4').trim() + "', '<' ) || version_compare( get_bloginfo( 'version' ), '" + String(ah.minWp || '6.0').trim() + "', '<' ) ) {\n\tdeactivate_plugins( plugin_basename( __FILE__ ) );\n\twp_die(\n\t\tesc_html__( 'This plugin needs PHP " + String(ah.minPhp || '7.4').trim() + ' and WordPress ' + String(ah.minWp || '6.0').trim() + " or newer.', '" + pre + "' ),\n\t\t'',\n\t\tarray( 'back_link' => true )\n\t);\n}\n\n";
  }
  if (ah.networkAware) {
    act += "if ( $network_wide && is_multisite() ) {\n\tforeach ( get_sites( array( 'fields' => 'ids' ) ) as $blog_id ) {\n\t\tswitch_to_blog( $blog_id );\n\t\t" + pre + '_install();\n\t\trestore_current_blog();\n\t}\n\n\treturn;\n}\n\n';
  }
  act += pre + '_install();';

  let install = '';
  if (d.options.length) {
    install += '$defaults = array(\n' + indent(d.options.map((o) => "'" + o + "' => array(),").join('\n'), 1) + '\n);\n\nforeach ( $defaults as $option => $value ) {\n\tadd_option( $option, $value );\n}\n\n';
  }
  if (d.table) {
    install += 'global $wpdb;\n\n$table   = $wpdb->prefix . \'' + d.table + "';\n$charset = $wpdb->get_charset_collate();\n\nrequire_once ABSPATH . 'wp-admin/includes/upgrade.php';\n\ndbDelta(\n\t\"CREATE TABLE {$table} (\n\t\tid bigint(20) unsigned NOT NULL AUTO_INCREMENT,\n\t\tcreated datetime NOT NULL DEFAULT '0000-00-00 00:00:00',\n\t\tpost_id bigint(20) unsigned NOT NULL DEFAULT 0,\n\t\tpayload longtext NOT NULL,\n\t\tPRIMARY KEY  (id),\n\t\tKEY post_id (post_id)\n\t) {$charset}\"\n);\n\n";
  }
  if (ah.flushRules) {
    install += '// Rewrite rules cannot be built here — the post type is not registered yet.\n// Flag it and flush on the next load, once init has run.\nupdate_option( \'' + pre + "_flush_rules', 1 );\n\n";
  }
  if (ah.scheduleCron && d.crons.length) {
    install += d.crons.map((c) => 'if ( ! wp_next_scheduled( \'' + c + "' ) ) {\n\twp_schedule_event( strtotime( 'tomorrow 03:00' ), 'daily', '" + c + "' );\n}").join('\n\n') + '\n\n';
  }
  install += "update_option( '" + d.versionKey + "', " + pre.toUpperCase() + '_VERSION );';

  let deact = '';
  if (d.crons.length) deact += d.crons.map((c) => "wp_clear_scheduled_hook( '" + c + "' );").join('\n') + '\n\n';
  if (ah.flushRules) deact += 'flush_rewrite_rules();\n\n';
  deact += '// Nothing is deleted here. Deactivation happens on every update.';

  interface Block { name: string; params?: string; hook?: string; doc: string; body: string }
  const blocks: Block[] = [
    { name: 'activate', params: ah.networkAware ? '$network_wide' : '', doc: '/**\n * Fires once when the plugin is activated.\n' + (ah.networkAware ? ' *\n * @param bool $network_wide Whether this is a network activation.\n' : '') + ' */\n', body: act },
    { name: 'install', doc: '/**\n * Seed everything this plugin needs. Safe to run more than once.\n */\n', body: install },
    { name: 'deactivate', doc: '/**\n * Fires when the plugin is deactivated — including on every update.\n */\n', body: deact },
  ];
  if (ah.upgradeRoutine) {
    blocks.push({
      name: 'maybe_upgrade', hook: 'plugins_loaded',
      doc: '/**\n * Run install again when the stored version is behind the code.\n */\n',
      body: "$stored = get_option( '" + d.versionKey + "', '0' );\n\nif ( version_compare( $stored, " + pre.toUpperCase() + "_VERSION, '>=' ) ) {\n\treturn;\n}\n\n" + pre + '_install();',
    });
  }
  if (ah.flushRules) {
    blocks.push({
      name: 'maybe_flush_rules', hook: 'wp_loaded',
      doc: '/**\n * Flush rewrite rules once, after everything is registered.\n */\n',
      body: "if ( ! get_option( '" + pre + "_flush_rules' ) ) {\n\treturn;\n}\n\ndelete_option( '" + pre + "_flush_rules' );\nflush_rewrite_rules();",
    });
  }

  out += blocks.map((b) => {
    let s = b.doc + 'function ' + pre + '_' + b.name + (b.params ? '( ' + b.params + ' )' : '()') + ' {\n' + indent(b.body, 1) + '\n}\n';
    if (b.hook) s += "add_action( '" + b.hook + "', '" + pre + '_' + b.name + "' );\n";
    return s;
  }).join('\n');

  out += "\nregister_activation_hook( __FILE__, '" + pre + "_activate' );\nregister_deactivation_hook( __FILE__, '" + pre + "_deactivate' );\n";
  if (ah.uninstall !== 'none') out += '\n// Deletion is handled by uninstall.php — see the other output mode.\n';
  return out;
}

export function validate(ah: ActivationHooks): ValidationIssue[] {
  const d = derive(ah);
  const out: ValidationIssue[] = [];
  const add = (severity: ValidationIssue['severity'], message: string, targetId?: string, fix?: string, fixLabel?: string) => out.push({ severity, message, targetId, fix, fixLabel });
  if (!/^\d+\.\d+(\.\d+)?$/.test(String(ah.version || '').trim())) add('error', 'The version must look like 1.2.0 — version_compare() needs a real version string to gate upgrades.', 'version');
  if (!ah.upgradeRoutine) add('warning', 'No upgrade routine. Bumping the plugin version will never re-run install(), so new options and table columns never arrive on existing sites.', undefined, 'addUpgrade', 'Add the upgrade check');
  if (!ah.requirementChecks) add('recommendation', 'No PHP or WordPress version guard. Without one, an old host activates the plugin and gets a fatal error instead of a message.', undefined, 'addChecks', 'Add the guard');
  if (ah.flushRules) add('recommendation', 'Rewrite rules are flagged during activation and flushed on wp_loaded — the only ordering that works, since post types register on init.');
  if (!ah.flushRules) add('recommendation', 'No rewrite flush. If this plugin registers a post type or taxonomy, its permalinks will 404 until someone visits Settings → Permalinks.', undefined, 'addFlush', 'Flush after activation');
  if (ah.scheduleCron && !d.crons.length) add('error', 'Cron scheduling is on but no hook names are listed.', 'cronHooks');
  if (d.crons.length && !ah.scheduleCron) add('recommendation', 'The cron hooks are cleared on deactivation but never scheduled on activation. Deliberate if another file schedules them.');
  if (!d.options.length) add('warning', 'No options listed, so nothing is seeded on activation and nothing is deleted on uninstall.', 'options');
  if (d.table) {
    add('recommendation', 'dbDelta() is generated for ' + d.table + '. Its formatting rules are strict: two spaces after PRIMARY KEY, one field per line, no backticks around the table name.');
    if (!ah.upgradeRoutine) add('warning', 'A custom table with no upgrade routine can never gain a column. dbDelta only runs when install() does.', undefined, 'addUpgrade', 'Add the upgrade check');
  }
  if (ah.uninstall === 'all' && d.table) add('warning', 'Uninstall drops the ' + d.table + ' table. That is correct and irreversible — make sure the plugin is the sole owner of that data.');
  if (ah.uninstall === 'none') add('recommendation', 'Nothing is deleted on uninstall. Kind to users who reinstall, untidy for everyone else — the plugin directory guidelines expect cleanup.');
  if (ah.uninstall === 'all' && ah.postTypeCleanup) add('warning', 'Uninstall deletes every ' + d.pre + ' post permanently, bypassing the trash. A client who deletes the plugin to "tidy up" loses that content.');
  if (d.roles.length && ah.uninstall === 'none') add('warning', 'Custom roles are listed but uninstall removes nothing, so the role stays in the database forever.');
  if (ah.networkAware) add('recommendation', 'Network activation loops every site with switch_to_blog(). On a network with hundreds of sites that request can time out — a batched upgrade routine is safer.');
  if (!ah.networkAware) add('recommendation', 'Not multisite-aware: a network activation would seed only the current site.', undefined, 'addNetwork', 'Handle network activation');
  return out;
}

export function applyFix(ah: ActivationHooks, kind: string): ActivationHooks {
  const p: ActivationHooks = JSON.parse(JSON.stringify(ah));
  if (kind === 'addUpgrade') p.upgradeRoutine = true;
  if (kind === 'addChecks') p.requirementChecks = true;
  if (kind === 'addFlush') p.flushRules = true;
  if (kind === 'addNetwork') p.networkAware = true;
  return p;
}

export function dataNote(ah: ActivationHooks): string {
  const d = derive(ah);
  return d.options.length + ' option' + (d.options.length === 1 ? '' : 's') + (d.table ? ' · 1 table' : '') + (d.crons.length ? ' · ' + d.crons.length + ' cron' : '');
}

export function summaryNote(ah: ActivationHooks): string {
  const d = derive(ah);
  return 'Version ' + (ah.version || '1.0.0') + ' is stored in ' + d.versionKey + '. '
    + (ah.upgradeRoutine ? 'install() re-runs on plugins_loaded whenever the code is ahead of the stored version.' : 'Nothing re-runs install() after the first activation.');
}

export const REF_ARGS: [string, string][] = [
  ['register_activation_hook( __FILE__, … )', '__FILE__ must be the main plugin file. Called from an include, the path is wrong and the hook never fires.'],
  ['register_deactivation_hook( __FILE__, … )', 'Runs on every deactivation, including updates. Clear schedules and caches here; never delete data.'],
  ['uninstall.php', 'A file beside the plugin, guarded by WP_UNINSTALL_PLUGIN. Runs only on delete, and takes precedence over register_uninstall_hook().'],
  ['dbDelta()', 'Creates or alters a table by diffing your CREATE TABLE against the real schema. Requires wp-admin/includes/upgrade.php and very particular formatting.'],
];
