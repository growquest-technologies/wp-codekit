import type { ToolContent } from '../toolContentTypes';

export const wpConfigContent: ToolContent = {
  aboutTitle: 'wp-config.php Generator Online',
  aboutLead:
    'The file everyone copies from the last project, written properly instead. This wp-config generator asks which environment you are building for, then emits the database block, `$table_prefix`, `WP_ENVIRONMENT_TYPE`, eight fresh salts and the debug, cache and security constants that suit that environment — with a warning for every one that does not.',
  aboutSupport:
    'Salts are generated in your browser with `crypto.getRandomValues()`, so the eight keys in the output are unique to you and were never transmitted anywhere. Switch to the `getenv()` output mode and the same file becomes safe to commit, because the credentials move to the environment instead.',
  spec: {
    hook: 'define() in wp-config.php',
    outputs: 'A complete `wp-config.php`, with credentials inline or read from `getenv()`',
    requires: 'WordPress 5.5+ for `WP_ENVIRONMENT_TYPE`; PHP 7.4+',
  },

  whyTitle: 'Why a generated wp-config.php beats the one you inherited',
  whyIntro:
    'Most config files on live sites are a development file that was never tidied up. `WP_DEBUG_DISPLAY` still prints paths to visitors, `SAVEQUERIES` still holds every query in memory, and the salts are the ones from the tutorial the site was built from. Each of those is a specific, checkable mistake, so the generator checks for them.',
  features: [
    {
      title: 'Four environment presets',
      body: 'Local, development, staging and production each load a different constant set, and each writes `WP_ENVIRONMENT_TYPE` so `wp_get_environment_type()` reports the truth — the flag plugins read before deciding whether to email real customers.',
    },
    {
      title: 'Debug settings that cannot leak',
      body: 'Turn on `WP_DEBUG` and `WP_DEBUG_LOG` without display, and the generator also writes `WP_DEBUG_DISPLAY` false plus `@ini_set( \'display_errors\', 0 )` — the pairing that keeps errors in `debug.log` and off the page.',
    },
    {
      title: 'Production mistakes flagged as errors',
      body: '`WP_DEBUG_DISPLAY` or `SAVEQUERIES` on a live site is an error with a one-click fix, `SCRIPT_DEBUG` is a warning, and a missing `DISALLOW_FILE_EDIT` or `FORCE_SSL_ADMIN` is called out for what it is: an admin account away from arbitrary PHP.',
    },
    {
      title: 'Eight salts, generated locally',
      body: 'All eight keys and salts are 64 random characters from `crypto.getRandomValues()`. Anything shorter than 60 characters, or missing, is an error with a regenerate button beside it.',
    },
    {
      title: 'Credentials out of the repository',
      body: 'The `getenv()` mode reads `DB_NAME`, `DB_USER`, `DB_PASSWORD` and `DB_HOST` from the environment with a `localhost` fallback, and hard-coded credentials in a staging or production config raise a warning that offers the switch.',
    },
    {
      title: 'The small things that bite',
      body: 'A `$table_prefix` without a trailing underscore is an error, a memory limit that is not in `256M` form is rejected, and `FORCE_SSL_ADMIN` on a local site with no certificate is flagged before it locks you out of the admin.',
    },
  ],

  howTitle: 'How does the wp-config.php generator work?',
  howIntro:
    'Four steps, and nothing you type is sent anywhere — the database password and the salts exist only in this browser tab.',
  steps: [
    {
      title: 'Choose the environment',
      body: 'Local, development, staging or production. The choice loads a sensible preset of constants and sets `WP_ENVIRONMENT_TYPE` to match.',
    },
    {
      title: 'Fill in the site details',
      body: 'Database name, user, password and host, the table prefix, the site URL and the memory limit. Or leave them and switch the output mode to read from environment variables.',
    },
    {
      title: 'Tune the constants',
      body: 'Toggle anything across Debugging, Content and updates, Performance and cron, and Security and URLs. Each toggle shows the value that will be written and warns when it is wrong for the environment you picked.',
    },
    {
      title: 'Generate salts and export',
      body: 'Press New salts for a fresh set, clear the Checks tab, then copy or download `wp-config.php`.',
    },
  ],
  example: {
    title: 'Worked example — the constants block from a production preset',
    intro:
      'This is the middle of the generated file: everything above it is the database block and `$table_prefix`, everything below is the eight salts and the `require_once ABSPATH . \'wp-settings.php\';` line.',
    code: `// ** Environment ** //
define( 'WP_ENVIRONMENT_TYPE', 'production' );

// ** Content and updates ** //
define( 'DISALLOW_FILE_EDIT',  true );
define( 'DISALLOW_FILE_MODS',  true );
define( 'WP_AUTO_UPDATE_CORE', 'minor' );
define( 'WP_POST_REVISIONS',   5 );
define( 'EMPTY_TRASH_DAYS',    14 );

// ** Performance and cron ** //
define( 'WP_CACHE',             true );
define( 'DISABLE_WP_CRON',      true );
define( 'WP_CRON_LOCK_TIMEOUT', 300 );

// ** Security and URLs ** //
define( 'FORCE_SSL_ADMIN',     true );
define( 'WP_MEMORY_LIMIT',     '256M' );
define( 'WP_MAX_MEMORY_LIMIT', '512M' );`,
    note:
      '`DISABLE_WP_CRON` is only half of a fix: it stops WP-Cron running on page loads, so a real crontab has to hit `wp-cron.php` (or run `wp cron event run --due-now`) or nothing scheduled runs at all. The generator says so in the Checks tab.',
  },
  refLinks: [
    {
      href: 'https://developer.wordpress.org/apis/wp-config-php/',
      title: 'Editing wp-config.php — Common APIs Handbook',
      description: 'The canonical list of constants WordPress reads from the configuration file.',
    },
    {
      href: 'https://developer.wordpress.org/advanced-administration/wordpress/wp-config/',
      title: 'wp-config.php — Advanced Administration Handbook',
      description: 'Every documented setting, including the database, memory and multisite constants.',
    },
    {
      href: 'https://developer.wordpress.org/advanced-administration/debug/debug-wordpress/',
      title: 'Debugging in WordPress',
      description: 'How WP_DEBUG, WP_DEBUG_LOG, WP_DEBUG_DISPLAY and SCRIPT_DEBUG interact.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/wp_get_environment_type/',
      title: 'wp_get_environment_type() — developer reference',
      description: 'The function that reads WP_ENVIRONMENT_TYPE, and the four values it accepts.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/wp_salt/',
      title: 'wp_salt() — developer reference',
      description: 'What the eight keys and salts are used for, and what happens when they change.',
    },
    {
      href: 'https://developer.wordpress.org/advanced-administration/security/hardening/',
      title: 'Hardening WordPress',
      description: 'The official reasoning behind DISALLOW_FILE_EDIT, FORCE_SSL_ADMIN and file permissions.',
    },
  ],

  faqTitle: 'wp-config.php — frequently asked questions',
  faqIntro: 'What developers ask most often when configuring a WordPress site for a new environment.',
  faqs: [
    {
      question: 'How do I enable WP_DEBUG without showing errors to visitors?',
      answer:
        'Set `WP_DEBUG` to true, `WP_DEBUG_LOG` to true and `WP_DEBUG_DISPLAY` to false, then add `@ini_set( \'display_errors\', 0 )` because some hosts override the constant. Errors are then written to `wp-content/debug.log` and nothing is printed into the page. Move the log outside the web root, or deny it in the server config, since it can contain paths and query fragments.',
    },
    {
      question: 'What happens if I change the WordPress salts?',
      answer:
        'Every existing login cookie and nonce becomes invalid immediately, so all users — including you — are logged out and have to sign in again. Nothing else is affected: no content, no settings, no passwords. That is exactly why regenerating the salts is the first step after a suspected compromise.',
    },
    {
      question: 'Do the constants have to go before wp-settings.php?',
      answer:
        'Yes. The last line of `wp-config.php` is `require_once ABSPATH . \'wp-settings.php\';`, and that is where WordPress boots. A `define()` placed after it is ignored silently, which is the usual reason a debug or memory constant "does not work". Put everything above that line.',
    },
    {
      question: 'Should I change the wp_ table prefix?',
      answer:
        'Changing it on a new install costs nothing and blocks the laziest automated attacks that assume `wp_posts`. It is not a security control on its own, and changing it on an existing site means renaming every table plus rewriting serialised option and usermeta keys, which is far more risk than the benefit. Whatever you choose, the prefix must end with an underscore or the table names run together.',
    },
    {
      question: 'Is it safe to commit wp-config.php to git?',
      answer:
        'Not with the credentials and salts inline. Either keep the file out of version control entirely, or use the environment-variable output so the file contains `getenv( \'DB_PASSWORD\' )` rather than the password itself. Either way the file should sit outside the web root or be denied by the server — it holds the keys to the whole site.',
    },
    {
      question: 'What does WP_ENVIRONMENT_TYPE actually do?',
      answer:
        'Since WordPress 5.5 it records which environment the site is: `local`, `development`, `staging` or `production`. Core uses it to decide whether to auto-update, and any plugin can call `wp_get_environment_type()` to branch on it — which is how you stop a staging copy sending real order emails. It defaults to `production` when unset, so setting it on non-production sites is the part that matters.',
    },
  ],

  related: [
    { id: 'cron', note: 'The other half of DISABLE_WP_CRON: the event itself, and a real crontab to fire it.' },
    { id: 'activation', note: 'Version gates and requirement checks for the plugin that reads these constants.' },
    { id: 'plugin-header', note: 'Requires PHP and Requires at least, so an unsuitable host never activates the plugin.' },
    { id: 'hooks', note: 'Anything conditional on wp_get_environment_type() still needs a correctly signed callback.' },
    { id: 'enqueue', note: 'SCRIPT_DEBUG only affects core assets — your own cache busting comes from the version argument.' },
    { id: 'user-role', note: 'DISALLOW_FILE_EDIT removes the editors; capabilities decide who reaches the rest.' },
  ],
};
