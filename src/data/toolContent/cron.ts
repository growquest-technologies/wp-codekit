import type { ToolContent } from '../toolContentTypes';

export const cronContent: ToolContent = {
  aboutTitle: 'Cron Event Generator Online',
  aboutLead:
    'A complete `wp_schedule_event` example built around your own hook name, not a snippet you have to finish. Scheduling is the easy half: this also writes the `wp_next_scheduled()` guard that stops duplicate events, the transient lock that stops two overlapping requests running the same job twice, and the deactivation routine that clears the schedule when the plugin is switched off.',
  aboutSupport:
    'The Reference tab carries the part most tutorials skip — the built-in schedule lengths, the `DISABLE_WP_CRON` plus crontab recipe for sites where timing matters, the WP-CLI commands for listing and firing an event by hand, and why a timestamp built with `strtotime()` follows the server clock rather than the site timezone. Free, and generated entirely in your browser.',
  spec: {
    hook: 'wp_schedule_event() / wp_schedule_single_event()',
    outputs: 'A snippet, a `functions.php` block, or a standalone plugin file with activation and deactivation hooks',
    requires: 'WordPress 3.0 or newer, PHP 7.4+',
  },

  whyTitle: 'Why the WP-Cron generator beats a bare wp_schedule_event() call',
  whyIntro:
    'The failure modes are all invisible until they are expensive. An unguarded schedule call adds another copy of the event on every page load. A deactivated plugin leaves its event behind forever. And the job that "runs daily" quietly runs whenever the next visitor arrives, because WP-Cron is not cron.',
  features: [
    {
      title: 'The duplicate guard, on by default',
      body: 'Every schedule call is wrapped in `wp_next_scheduled()` first. Turn that off and the generator raises an error, because the classic symptom — a daily job that fires forty times a day — comes from exactly this.',
    },
    {
      title: 'Custom intervals via cron_schedules',
      body: 'Choose an interval in minutes and the generator adds a `cron_schedules` filter with the seconds calculated and a translated display name. Anything under five minutes is flagged: WP-Cron cannot honour it, since it only runs when a page is loaded and never twice in one request.',
    },
    {
      title: 'An overlap lock, not just a schedule',
      body: 'A transient lock is written around the callback body with a five-minute expiry, so two simultaneous requests cannot both run a due event. On a busy site that is a real race, and anything non-idempotent runs twice without it.',
    },
    {
      title: 'Cleanup that matches the schedule call',
      body: 'Deactivation clears the hook with `wp_clear_scheduled_hook()`. Add arguments to the event and the cleanup switches to `wp_next_scheduled()` plus `wp_unschedule_event()` with the identical argument array — the only way to find an event that was scheduled with arguments.',
    },
    {
      title: 'Output that knows where it will live',
      body: 'The plugin output wires scheduling to `register_activation_hook()` and cleanup to `register_deactivation_hook()`. The snippet and `functions.php` outputs schedule on `init` instead, because a theme has no activation hook, and say so in a comment.',
    },
    {
      title: 'Four job bodies to start from',
      body: 'A `wp_remote_get()` fetch with a timeout and both failure branches handled, a bounded `get_posts()` cleanup batch, a `wp_mail()` digest, or your own code. The guards and the lock are generated around whichever you choose.',
    },
  ],

  howTitle: 'How does the Cron Event Generator work?',
  howIntro: 'Four steps to a scheduled task that can be deactivated cleanly and debugged from WP-CLI.',
  steps: [
    {
      title: 'Name the event',
      body: 'Give the hook a prefixed name — this is the action WP-Cron fires, and anything else on the site can hook it too. Pick a recurrence (hourly, twicedaily, daily, weekly, a custom interval, or a one-off) and when the first run should happen.',
    },
    {
      title: 'Describe the work',
      body: 'Choose a starting job body or write your own, and add any arguments the event should be scheduled with. Argument values are passed through to the callback and become part of the event\'s identity.',
    },
    {
      title: 'Set the safety net',
      body: 'Keep or drop the `wp_next_scheduled()` guard, the transient overlap lock and the deactivation cleanup. Each one is explained in the Checks tab when it is missing.',
    },
    {
      title: 'Export where it belongs',
      body: 'Switch to the plugin output for anything that matters — that is the only shape with real activation and deactivation hooks — then copy or download the file.',
    },
  ],
  example: {
    title: 'Worked example — a daily sync scheduled on activation',
    intro:
      'A `daily` event whose first run is queued for tomorrow at 03:00, guarded against double scheduling and cleared when the plugin is deactivated.',
    code: `/**
 * Schedule the event, once.
 */
function acme_schedule() {
\tif ( wp_next_scheduled( 'acme_sync_products' ) ) {
\t\treturn;
\t}

\twp_schedule_event(
\t\tstrtotime( 'tomorrow 03:00' ),
\t\t'daily',
\t\t'acme_sync_products'
\t);
}

/**
 * Clear the event. Runs on deactivation — an orphaned event survives the plugin.
 */
function acme_unschedule() {
\twp_clear_scheduled_hook( 'acme_sync_products' );
}

register_activation_hook( __FILE__, 'acme_schedule' );
register_deactivation_hook( __FILE__, 'acme_unschedule' );`,
    note:
      'The callback itself sits between these two functions in the full output, with the transient lock around your job body and `add_action( \'acme_sync_products\', \'acme_run\' )` underneath it.',
  },
  refLinks: [
    {
      href: 'https://developer.wordpress.org/reference/functions/wp_schedule_event/',
      title: 'wp_schedule_event() — developer reference',
      description: 'The timestamp, recurrence, hook and args parameters, and what the function returns on failure.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/wp_next_scheduled/',
      title: 'wp_next_scheduled() — developer reference',
      description: 'The guard against double scheduling, and why the args array must match exactly.',
    },
    {
      href: 'https://developer.wordpress.org/reference/hooks/cron_schedules/',
      title: 'cron_schedules — hook reference',
      description: 'The filter that adds a custom interval, with its interval and display keys.',
    },
    {
      href: 'https://developer.wordpress.org/plugins/cron/',
      title: 'WP-Cron — Plugin Handbook',
      description: 'The official explanation of how WP-Cron differs from a system cron daemon.',
    },
    {
      href: 'https://developer.wordpress.org/plugins/cron/hooking-wp-cron-into-the-system-task-scheduler/',
      title: 'Hooking WP-Cron into the system task scheduler',
      description: 'The documented way to disable the page-load trigger and drive wp-cron.php from real cron.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/wp_clear_scheduled_hook/',
      title: 'wp_clear_scheduled_hook() — developer reference',
      description: 'Clearing every event for a hook, and how it differs from wp_unschedule_event().',
    },
  ],

  faqTitle: 'WP-Cron & scheduled events — frequently asked questions',
  faqIntro: 'The questions that come up whenever a scheduled task does not run when it was supposed to.',
  faqs: [
    {
      question: 'Why does my WP-Cron event run late, or not at all?',
      answer:
        'WP-Cron is not a real cron daemon. It only checks for due events when someone loads a page, so on a low-traffic site a job scheduled for 09:00 runs whenever the next visitor arrives, which might be hours later. On a site behind a password, a staging copy or a new site with no traffic, it may not run at all until you visit it yourself.',
    },
    {
      question: 'How do I make WordPress scheduled tasks run on time?',
      answer:
        'Set `define( \'DISABLE_WP_CRON\', true );` in `wp-config.php` to stop the page-load trigger, then add a real system cron entry that hits the site every few minutes — either requesting `wp-cron.php?doing_wp_cron` or running `wp cron event run --due-now` through WP-CLI. Disabling the trigger without adding the crontab is worse than doing nothing: then nothing scheduled runs at all.',
    },
    {
      question: 'How do I add a custom cron interval, such as every 15 minutes?',
      answer:
        'Filter `cron_schedules` and add a key with `interval` in seconds and a translated `display` name, then pass that key as the recurrence to `wp_schedule_event()`. The filter has to be registered before the event is scheduled, or WordPress will not recognise the recurrence. Intervals shorter than about five minutes are unreliable, because WP-Cron only fires on page loads and never twice within one request.',
    },
    {
      question: 'Why is my cron event scheduled multiple times?',
      answer:
        'Because the schedule call ran more than once. Calling `wp_schedule_event()` on `init` without checking `wp_next_scheduled()` first adds another event on every single page load. Guard it, or schedule from an activation hook, which only fires once. To clean up an existing mess, `wp_clear_scheduled_hook()` removes every queued event for that hook.',
    },
    {
      question: 'How do I unschedule an event that was scheduled with arguments?',
      answer:
        'Arguments are part of the event\'s identity, so you have to pass the identical array back: `wp_next_scheduled( \'my_hook\', $args )` to get the timestamp, then `wp_unschedule_event( $timestamp, \'my_hook\', $args )`. `wp_clear_scheduled_hook( \'my_hook\', $args )` does the same for every occurrence. Calling either with no arguments will not match an event that was scheduled with them.',
    },
    {
      question: 'Does wp_schedule_event() use the site timezone?',
      answer:
        'No. It takes a Unix timestamp, which is timezone-free, and WP-Cron compares it against UTC. A timestamp built with `strtotime( \'tomorrow 03:00\' )` resolves against the server clock, so a site set to Europe/Lisbon on a US-hosted server can run its "overnight" job in the afternoon. When the hour genuinely matters, build the timestamp from `wp_date()` or add the site\'s GMT offset.',
    },
  ],

  related: [
    { id: 'activation', note: 'The activation and deactivation hooks this generator schedules and clears from.' },
    { id: 'wp-config', note: 'Where DISABLE_WP_CRON and WP_CRON_LOCK_TIMEOUT are defined.' },
    { id: 'hooks', note: 'Your cron callback is an ordinary action callback and has to be signed like one.' },
    { id: 'rest-route', note: 'Cron often calls out to an API; a route is how something calls back in.' },
    { id: 'plugin-header', note: 'The main plugin file, which is the only place register_activation_hook works.' },
    { id: 'wp-query', note: 'Build the bounded query your cleanup or digest job will loop over.' },
  ],
};
