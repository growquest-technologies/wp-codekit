import { escPhp, type ValidationIssue } from '../lib/codegen';

export type Environment = 'local' | 'development' | 'staging' | 'production';
export type ConfigMode = 'inline' | 'env';

export const ENVS: [Environment, string][] = [
  ['local', 'Local'],
  ['development', 'Development'],
  ['staging', 'Staging'],
  ['production', 'Production'],
];

export const SALT_KEYS = ['AUTH_KEY', 'SECURE_AUTH_KEY', 'LOGGED_IN_KEY', 'NONCE_KEY', 'AUTH_SALT', 'SECURE_AUTH_SALT', 'LOGGED_IN_SALT', 'NONCE_SALT'];

export const GROUPS: [string, [string, string][]][] = [
  ['Debugging', [
    ['WP_DEBUG', 'The master switch. On means PHP notices are raised, and every deprecation is reported.'],
    ['WP_DEBUG_LOG', 'Writes to wp-content/debug.log instead of the screen. The pair you want on a live site if you must debug at all.'],
    ['WP_DEBUG_DISPLAY', 'Prints errors into the page. Leaks paths and query fragments to visitors.'],
    ['SCRIPT_DEBUG', 'Loads unminified core CSS and JS. Only useful while working on core or a block.'],
    ['SAVEQUERIES', 'Records every query for inspection. Expensive — memory grows with the page.'],
  ]],
  ['Content and updates', [
    ['DISALLOW_FILE_EDIT', 'Removes the plugin and theme file editors from the admin.'],
    ['DISALLOW_FILE_MODS', 'Blocks all installs and updates from the admin — for sites deployed from git.'],
    ['WP_AUTO_UPDATE_CORE', 'minor for security releases only, true for everything, false for none.'],
    ['AUTOSAVE_INTERVAL', "Seconds between editor autosaves. 60 is core's default."],
    ['WP_POST_REVISIONS', 'How many revisions to keep. A number, or false to keep none.'],
    ['EMPTY_TRASH_DAYS', 'How long trashed content survives before permanent deletion.'],
  ]],
  ['Performance and cron', [
    ['WP_CACHE', 'Tells a drop-in object or page cache to engage. Harmless without one.'],
    ['DISABLE_WP_CRON', 'Stops cron running on page loads. Pair it with a real crontab or nothing runs.'],
    ['WP_CRON_LOCK_TIMEOUT', 'Seconds before a stuck cron run is considered abandoned.'],
    ['CONCATENATE_SCRIPTS', 'Combines admin scripts. Off helps when debugging admin JS.'],
  ]],
  ['Security and URLs', [
    ['FORCE_SSL_ADMIN', 'Forces https for logins and the admin.'],
    ['WP_SITEURL', 'Hard-codes the site URL, so a database from another environment cannot redirect you away.'],
    ['WP_HOME', 'Hard-codes the home URL alongside WP_SITEURL.'],
    ['WP_MEMORY_LIMIT', 'PHP memory for the front end.'],
    ['WP_MAX_MEMORY_LIMIT', 'A higher ceiling for admin tasks like image resizing.'],
  ]],
];

export const PRESETS: Record<Environment, { on: string[] }> = {
  local: { on: ['WP_DEBUG', 'WP_DEBUG_LOG', 'WP_DEBUG_DISPLAY', 'SCRIPT_DEBUG', 'SAVEQUERIES', 'WP_MEMORY_LIMIT', 'WP_MAX_MEMORY_LIMIT', 'AUTOSAVE_INTERVAL', 'DISABLE_WP_CRON', 'WP_CRON_LOCK_TIMEOUT'] },
  development: { on: ['WP_DEBUG', 'WP_DEBUG_LOG', 'SCRIPT_DEBUG', 'WP_MEMORY_LIMIT', 'WP_MAX_MEMORY_LIMIT', 'DISALLOW_FILE_EDIT', 'WP_POST_REVISIONS'] },
  staging: { on: ['WP_DEBUG', 'WP_DEBUG_LOG', 'DISALLOW_FILE_EDIT', 'DISALLOW_FILE_MODS', 'WP_MEMORY_LIMIT', 'WP_MAX_MEMORY_LIMIT', 'FORCE_SSL_ADMIN', 'WP_SITEURL', 'WP_HOME', 'WP_AUTO_UPDATE_CORE', 'WP_CACHE'] },
  production: { on: ['DISALLOW_FILE_EDIT', 'DISALLOW_FILE_MODS', 'WP_MEMORY_LIMIT', 'WP_MAX_MEMORY_LIMIT', 'FORCE_SSL_ADMIN', 'WP_AUTO_UPDATE_CORE', 'WP_CACHE', 'WP_POST_REVISIONS', 'EMPTY_TRASH_DAYS', 'DISABLE_WP_CRON', 'WP_CRON_LOCK_TIMEOUT'] },
};

export interface WpConfig {
  env: Environment;
  mode: ConfigMode;
  dbName: string;
  dbUser: string;
  dbPassword: string;
  dbHost: string;
  prefix: string;
  siteUrl: string;
  memory: string;
  constants: string[];
  salts: Record<string, string>;
}

function padTo(s: string, w: number): string {
  return s + new Array(Math.max(0, w - s.length) + 1).join(' ');
}

function randomSalt(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_[]{}<>~`+=,.;:/?|';
  let out = '';
  const buf = new Uint32Array(64);
  try {
    (window.crypto || (window as unknown as { msCrypto: Crypto }).msCrypto).getRandomValues(buf);
  } catch {
    for (let i = 0; i < 64; i++) buf[i] = Math.floor(Math.random() * 4294967295);
  }
  for (let i = 0; i < 64; i++) out += chars.charAt(buf[i] % chars.length);
  return out;
}

export function freshSalts(): Record<string, string> {
  const out: Record<string, string> = {};
  SALT_KEYS.forEach((k) => (out[k] = randomSalt()));
  return out;
}

export function freshProject(): WpConfig {
  return {
    env: 'production',
    mode: 'inline',
    dbName: 'acme_wp',
    dbUser: 'acme_wp',
    dbPassword: '',
    dbHost: 'localhost',
    prefix: 'wp_',
    siteUrl: 'https://example.com',
    memory: '256M',
    constants: PRESETS.production.on.slice(),
    salts: freshSalts(),
  };
}

function constValue(wc: WpConfig, name: string): string {
  switch (name) {
    case 'WP_DEBUG': return 'true';
    case 'WP_DEBUG_LOG': return 'true';
    case 'WP_DEBUG_DISPLAY': return 'true';
    case 'SCRIPT_DEBUG': return 'true';
    case 'SAVEQUERIES': return 'true';
    case 'DISALLOW_FILE_EDIT': return 'true';
    case 'DISALLOW_FILE_MODS': return 'true';
    case 'WP_AUTO_UPDATE_CORE': return "'minor'";
    case 'AUTOSAVE_INTERVAL': return '120';
    case 'WP_POST_REVISIONS': return wc.env === 'production' ? '5' : '10';
    case 'EMPTY_TRASH_DAYS': return '14';
    case 'WP_CACHE': return 'true';
    case 'DISABLE_WP_CRON': return 'true';
    case 'WP_CRON_LOCK_TIMEOUT': return '300';
    case 'CONCATENATE_SCRIPTS': return 'false';
    case 'FORCE_SSL_ADMIN': return 'true';
    case 'WP_SITEURL': return "'" + escPhp(String(wc.siteUrl || '').trim()) + "'";
    case 'WP_HOME': return "'" + escPhp(String(wc.siteUrl || '').trim()) + "'";
    case 'WP_MEMORY_LIMIT': return "'" + escPhp(String(wc.memory || '256M').trim()) + "'";
    case 'WP_MAX_MEMORY_LIMIT': return "'512M'";
    default: return 'true';
  }
}
export { constValue };

const CREDIT = '// Generated with WP CodeKit — powered by GrowQuest (https://growquest.io).\n';

export function buildCode(wc: WpConfig, mode: ConfigMode): string {
  const on = wc.constants || [];
  const has = (n: string) => on.indexOf(n) >= 0;
  let out = '<?php\n' + CREDIT + '/**\n * WordPress configuration — ' + wc.env + '.\n *\n * Everything must be defined before the require at the bottom.\n */\n\n';

  out += '// ** Database ** //\n';
  if (mode === 'env') {
    out += "define( 'DB_NAME', getenv( 'DB_NAME' ) );\ndefine( 'DB_USER', getenv( 'DB_USER' ) );\ndefine( 'DB_PASSWORD', getenv( 'DB_PASSWORD' ) );\ndefine( 'DB_HOST', getenv( 'DB_HOST' ) ?: 'localhost' );\n";
  } else {
    out += "define( 'DB_NAME', '" + escPhp(String(wc.dbName || '').trim()) + "' );\ndefine( 'DB_USER', '" + escPhp(String(wc.dbUser || '').trim()) + "' );\ndefine( 'DB_PASSWORD', '" + escPhp(String(wc.dbPassword || '').trim()) + "' );\ndefine( 'DB_HOST', '" + escPhp(String(wc.dbHost || 'localhost').trim()) + "' );\n";
  }
  out += "define( 'DB_CHARSET', 'utf8mb4' );\ndefine( 'DB_COLLATE', '' );\n\n";
  out += "$table_prefix = '" + escPhp(String(wc.prefix || 'wp_').trim()) + "';\n\n";

  out += '// ** Environment ** //\n';
  out += "define( 'WP_ENVIRONMENT_TYPE', '" + wc.env + "' );\n\n";

  const groups: [string, string[]][] = [
    ['Debugging', ['WP_DEBUG', 'WP_DEBUG_LOG', 'WP_DEBUG_DISPLAY', 'SCRIPT_DEBUG', 'SAVEQUERIES', 'CONCATENATE_SCRIPTS']],
    ['Content and updates', ['DISALLOW_FILE_EDIT', 'DISALLOW_FILE_MODS', 'WP_AUTO_UPDATE_CORE', 'AUTOSAVE_INTERVAL', 'WP_POST_REVISIONS', 'EMPTY_TRASH_DAYS']],
    ['Performance and cron', ['WP_CACHE', 'DISABLE_WP_CRON', 'WP_CRON_LOCK_TIMEOUT']],
    ['Security and URLs', ['FORCE_SSL_ADMIN', 'WP_SITEURL', 'WP_HOME', 'WP_MEMORY_LIMIT', 'WP_MAX_MEMORY_LIMIT']],
  ];
  groups.forEach((g) => {
    const items = g[1].filter(has);
    if (!items.length) return;
    out += '// ** ' + g[0] + ' ** //\n';
    const w = items.reduce((m, n) => Math.max(m, n.length), 0);
    items.forEach((n) => {
      if (n === 'WP_DEBUG_DISPLAY' && !has('WP_DEBUG')) return;
      out += "define( '" + padTo(n + "',", w + 2) + ' ' + constValue(wc, n) + ' );\n';
    });
    if (has('WP_DEBUG') && has('WP_DEBUG_LOG') && !has('WP_DEBUG_DISPLAY') && g[0] === 'Debugging') {
      out += "define( '" + padTo("WP_DEBUG_DISPLAY',", w + 2) + " false );\n@ini_set( 'display_errors', 0 );\n";
    }
    out += '\n';
  });

  out += '// ** Authentication salts — unique to this site ** //\n';
  const saltW = SALT_KEYS.reduce((m, k) => Math.max(m, k.length), 0);
  SALT_KEYS.forEach((k) => {
    out += "define( '" + padTo(k + "',", saltW + 2) + " '" + escPhp((wc.salts && wc.salts[k]) || '') + "' );\n";
  });
  out += '\n';

  out += "// ** Absolute path and bootstrap ** //\nif ( ! defined( 'ABSPATH' ) ) {\n\tdefine( 'ABSPATH', __DIR__ . '/' );\n}\n\nrequire_once ABSPATH . 'wp-settings.php';\n";
  return out;
}

export function validate(wc: WpConfig): ValidationIssue[] {
  const out: ValidationIssue[] = [];
  const add = (severity: ValidationIssue['severity'], message: string, targetId?: string, fix?: string, fixLabel?: string) => out.push({ severity, message, targetId, fix, fixLabel });
  const on = wc.constants || [];
  const has = (n: string) => on.indexOf(n) >= 0;
  const prod = wc.env === 'production' || wc.env === 'staging';

  if (wc.mode !== 'env') {
    if (!String(wc.dbName || '').trim()) add('error', 'DB_NAME is empty — WordPress cannot connect.', 'dbName');
    if (!String(wc.dbUser || '').trim()) add('error', 'DB_USER is empty.', 'dbUser');
    if (!String(wc.dbPassword || '').trim()) add('warning', 'DB_PASSWORD is empty. Fine on a local box with a socket, wrong anywhere else.', 'dbPassword');
    if (prod) add('warning', 'Credentials are hard-coded in a ' + wc.env + ' config. Reading them from environment variables keeps them out of the repo.', undefined, 'useEnv', 'Read from getenv()');
  }
  if (!/_$/.test(String(wc.prefix || ''))) add('error', 'The table prefix must end with an underscore, or table names run together.', 'prefix', 'fixPrefix', 'Add the underscore');
  if (String(wc.prefix || '') === 'wp_' && prod) add('recommendation', 'wp_ is the default prefix. Changing it is weak security on its own, but it does stop the laziest automated attacks.', 'prefix');
  if (String(wc.memory || '') && !/^\d+M$/.test(String(wc.memory).trim())) add('error', 'WP_MEMORY_LIMIT should look like 256M.', 'memory');
  else if (parseInt(wc.memory, 10) < 128) add('warning', 'A memory limit under 128M will fail on image-heavy uploads and large plugin sets.', 'memory');

  if (has('WP_DEBUG_DISPLAY') && prod) add('error', 'WP_DEBUG_DISPLAY on a ' + wc.env + ' site prints PHP errors, file paths and sometimes queries to visitors.', undefined, 'hideErrors', 'Turn it off');
  if (has('WP_DEBUG') && prod && !has('WP_DEBUG_LOG')) add('warning', 'WP_DEBUG is on without WP_DEBUG_LOG, so errors have nowhere to go but the page.', undefined, 'logOnly', 'Log to file');
  if (has('SAVEQUERIES') && prod) add('error', 'SAVEQUERIES keeps every query in memory for every request. On a live site that is a measurable slowdown for no benefit.', undefined, 'dropSaveQueries', 'Turn it off');
  if (has('SCRIPT_DEBUG') && prod) add('warning', 'SCRIPT_DEBUG serves unminified core assets to every visitor.', undefined, 'dropScriptDebug', 'Turn it off');
  if (has('WP_DEBUG_LOG') && !has('WP_DEBUG')) add('warning', 'WP_DEBUG_LOG does nothing without WP_DEBUG.', undefined, 'enableDebug', 'Turn WP_DEBUG on');
  if (!has('DISALLOW_FILE_EDIT') && prod) add('warning', 'The plugin and theme file editors are available in the admin. One compromised admin account becomes arbitrary PHP.', undefined, 'noFileEdit', 'Disable the editors');
  if (has('DISALLOW_FILE_MODS') && !prod) add('recommendation', 'DISALLOW_FILE_MODS blocks plugin installs from the admin — deliberate for deployed sites, painful while developing.');
  if (has('DISABLE_WP_CRON') && !has('WP_CRON_LOCK_TIMEOUT')) add('recommendation', 'With WP-Cron disabled you need a real crontab hitting wp-cron.php. Nothing scheduled runs otherwise.');
  if (!has('FORCE_SSL_ADMIN') && prod) add('warning', 'Logins are not forced over https, so credentials can travel in the clear.', undefined, 'forceSsl', 'Force SSL for admin');
  if (has('WP_SITEURL') && !String(wc.siteUrl || '').trim()) add('error', 'WP_SITEURL is enabled but no URL is set.', 'siteUrl');
  if (String(wc.siteUrl || '').indexOf('http://') === 0 && prod) add('warning', 'The site URL uses http on a ' + wc.env + ' environment.', 'siteUrl');
  if (has('WP_AUTO_UPDATE_CORE') && wc.env === 'production') add('recommendation', 'minor keeps security releases automatic while leaving major versions to you. That is the sane default for a client site.');
  const salts = wc.salts || {};
  const missing = SALT_KEYS.filter((k) => !salts[k] || String(salts[k]).length < 60);
  if (missing.length) add('error', missing.length + ' salt' + (missing.length === 1 ? '' : 's') + ' missing or too short. Generate a fresh set.', undefined, 'regenSalts', 'Generate salts');
  if (wc.env === 'local' && has('FORCE_SSL_ADMIN')) add('warning', 'FORCE_SSL_ADMIN on a local site without a certificate will lock you out of the admin.', undefined, 'dropSsl', 'Turn it off');
  if (!has('WP_POST_REVISIONS') && !prod) add('recommendation', 'Revisions are unlimited. On a busy editorial site that is thousands of rows in wp_posts.');
  return out;
}

export function applyFix(wc: WpConfig, kind: string): WpConfig {
  const p: WpConfig = JSON.parse(JSON.stringify(wc));
  p.constants = p.constants || [];
  const drop = (n: string) => {
    const i = p.constants.indexOf(n);
    if (i >= 0) p.constants.splice(i, 1);
  };
  const addC = (n: string) => {
    if (p.constants.indexOf(n) === -1) p.constants.push(n);
  };
  if (kind === 'useEnv') p.mode = 'env';
  if (kind === 'fixPrefix') p.prefix = String(p.prefix || 'wp').replace(/_*$/, '') + '_';
  if (kind === 'hideErrors') drop('WP_DEBUG_DISPLAY');
  if (kind === 'logOnly') { addC('WP_DEBUG_LOG'); drop('WP_DEBUG_DISPLAY'); }
  if (kind === 'dropSaveQueries') drop('SAVEQUERIES');
  if (kind === 'dropScriptDebug') drop('SCRIPT_DEBUG');
  if (kind === 'enableDebug') addC('WP_DEBUG');
  if (kind === 'noFileEdit') addC('DISALLOW_FILE_EDIT');
  if (kind === 'forceSsl') addC('FORCE_SSL_ADMIN');
  if (kind === 'dropSsl') drop('FORCE_SSL_ADMIN');
  if (kind === 'regenSalts') p.salts = freshSalts();
  return p;
}

export const REF_ARGS: [string, string][] = [
  ['WP_DEBUG with WP_DEBUG_LOG', 'The only debug pairing safe on a live site: errors are recorded, never printed. Add WP_DEBUG_DISPLAY false to be certain.'],
  ['WP_ENVIRONMENT_TYPE', 'local, development, staging or production. Core reads it; plugins should.'],
  ['DISALLOW_FILE_EDIT / DISALLOW_FILE_MODS', 'The first removes the file editors, the second blocks all installs and updates. Both belong on a deployed site.'],
  ['$table_prefix', 'A variable, not a constant, and it must end in an underscore.'],
  ['FORCE_SSL_ADMIN', 'Forces https for login and admin. Behind a proxy you may also need to trust HTTP_X_FORWARDED_PROTO.'],
  ['WP_SITEURL / WP_HOME', 'Hard-coding these stops a copied database redirecting you to the wrong domain — and makes the Settings fields read-only.'],
  ['Salts', 'Eight random strings that key cookies and nonces. Changing them invalidates every session immediately.'],
];
