import { escPhp, withCredit, type ValidationIssue } from '../lib/codegen';

export type OutputMode = 'snippet' | 'functions' | 'plugin';
export type Recurrence = 'hourly' | 'twicedaily' | 'daily' | 'weekly' | 'custom' | 'single';
export type FirstRun = 'now' | 'hour' | 'tomorrow' | 'midnight';
export type Job = 'sync' | 'cleanup' | 'email' | 'custom';
export type CodeStyle = 'procedural' | 'class';

export const RECURRENCE: [Recurrence, string][] = [
  ['hourly', 'hourly — every 3600s'],
  ['twicedaily', 'twicedaily — every 12h'],
  ['daily', 'daily — every 24h'],
  ['weekly', 'weekly — every 7 days'],
  ['custom', 'A custom interval'],
  ['single', 'Once, not recurring'],
];
export const JOBS: [Job, string][] = [['sync', 'Fetch and store'], ['cleanup', 'Delete old rows'], ['email', 'Send a digest'], ['custom', 'Write my own']];
export const JOB_BODY: Record<Job, string> = {
  sync: "$response = wp_remote_get(\n\t'https://api.example.com/products',\n\tarray(\n\t\t'timeout' => 20,\n\t)\n);\n\nif ( is_wp_error( $response ) ) {\n\terror_log( '[cron] fetch failed: ' . $response->get_error_message() );\n\treturn;\n}\n\n$items = json_decode( wp_remote_retrieve_body( $response ), true );\n\nif ( ! is_array( $items ) ) {\n\treturn;\n}\n\nforeach ( $items as $item ) {\n\t// Upsert each item here.\n}\n\nupdate_option( 'acme_last_sync', time(), false );",
  cleanup: "$stale = get_posts(\n\tarray(\n\t\t'post_type'      => 'acme_log',\n\t\t'post_status'    => 'any',\n\t\t'posts_per_page' => 200,\n\t\t'date_query'     => array(\n\t\t\tarray(\n\t\t\t\t'before' => '30 days ago',\n\t\t\t),\n\t\t),\n\t\t'fields'         => 'ids',\n\t)\n);\n\nforeach ( $stale as $post_id ) {\n\twp_delete_post( $post_id, true );\n}",
  email: "$recipients = array( get_option( 'admin_email' ) );\n$subject    = __( 'Your weekly digest', 'acme' );\n$message    = __( 'Here is what happened this week.', 'acme' );\n\nforeach ( $recipients as $recipient ) {\n\twp_mail( $recipient, $subject, $message );\n}",
  custom: '// The work goes here.',
};

export interface CronArg {
  name: string;
  value: string;
  description: string;
}

export interface CronEvent {
  prefix: string;
  textDomain: string;
  codeStyle: CodeStyle;
  hook: string;
  recurrence: Recurrence;
  firstRun: FirstRun;
  intervalName: string;
  intervalMinutes: string;
  job: Job;
  body: string;
  args: CronArg[];
  nextScheduledGuard: boolean;
  unschedule: boolean;
  lock: boolean;
}

function fnSlug(s: string): string {
  return String(s || '').toLowerCase().trim().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
}
function slugify(s: string): string {
  return String(s || '').toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
}
function pascal(s: string): string {
  return String(s || '').split(/[^A-Za-z0-9]+/).filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('_');
}
function indent(text: string, depth: number): string {
  const p = new Array(depth + 1).join('\t');
  return text.split('\n').map((l) => (l ? p + l : '')).join('\n');
}
function padTo(s: string, w: number): string {
  return s + new Array(Math.max(0, w - s.length) + 1).join(' ');
}
function varSlug(s: string): string {
  const v = String(s || '').trim().replace(/^\$+/, '').replace(/[^A-Za-z0-9_]+/g, '_');
  return '$' + (v || 'arg');
}
function argLiteral(v: string): string {
  const s = String(v == null ? '' : v).trim();
  if (s === '') return "''";
  if (/^-?\d+$/.test(s)) return s;
  if (s === 'true' || s === 'false' || s === 'null') return s;
  if (/^array\(/.test(s)) return s;
  return "'" + escPhp(s) + "'";
}

interface Derived {
  pre: string;
  td: string;
  hook: string;
  cls: string;
  isClass: boolean;
  single: boolean;
  custom: boolean;
  intervalName: string;
  seconds: number;
  args: CronArg[];
}

function derive(cr: CronEvent): Derived {
  const pre = fnSlug(cr.prefix) || 'acme';
  return {
    pre,
    td: slugify(cr.textDomain) || pre.replace(/_/g, '-'),
    hook: fnSlug(cr.hook) || pre + '_event',
    cls: (pascal(cr.prefix || 'Acme') || 'Acme') + '_Cron',
    isClass: cr.codeStyle === 'class',
    single: cr.recurrence === 'single',
    custom: cr.recurrence === 'custom',
    intervalName: fnSlug(cr.intervalName) || 'every_fifteen_minutes',
    seconds: Math.max(1, parseInt(cr.intervalMinutes, 10) || 15) * 60,
    args: (cr.args || []).filter((a) => String(a.name || '').trim()),
  };
}

function firstRunExpr(cr: CronEvent): string {
  return ({
    now: 'time()',
    hour: 'time() + HOUR_IN_SECONDS',
    tomorrow: "strtotime( 'tomorrow 03:00' )",
    midnight: "strtotime( 'tomorrow midnight' )",
  } as Record<FirstRun, string>)[cr.firstRun] || 'time()';
}

export function freshProject(): CronEvent {
  return {
    prefix: 'acme', textDomain: 'acme', codeStyle: 'procedural',
    hook: 'acme_sync_products', recurrence: 'daily', firstRun: 'tomorrow',
    intervalName: 'every_fifteen_minutes', intervalMinutes: '15',
    job: 'sync', body: JOB_BODY.sync,
    args: [],
    nextScheduledGuard: true, unschedule: true, lock: true,
  };
}

interface Block {
  name: string;
  params?: string;
  hook?: string | null;
  hookArgs?: number;
  filter?: string;
  doc: string;
  body: string;
}

export function buildCode(cr: CronEvent, mode: OutputMode): string {
  const d = derive(cr);
  const pre = d.pre, isClass = d.isClass;
  const blocks: Block[] = [];
  const argsArray = d.args.length ? 'array( ' + d.args.map((a) => argLiteral(a.value)).join(', ') + ' )' : '';
  const schedule = d.single
    ? 'wp_schedule_single_event(\n' + indent([firstRunExpr(cr), "'" + escPhp(d.hook) + "'"].concat(argsArray ? [argsArray] : []).join(',\n'), 1) + '\n);'
    : 'wp_schedule_event(\n' + indent([firstRunExpr(cr), "'" + (d.custom ? d.intervalName : cr.recurrence) + "'", "'" + escPhp(d.hook) + "'"].concat(argsArray ? [argsArray] : []).join(',\n'), 1) + '\n);';

  blocks.push({
    name: 'schedule',
    doc: '/**\n * Schedule the event, once.\n */\n',
    body: cr.nextScheduledGuard
      ? 'if ( wp_next_scheduled( ' + (d.args.length ? "'" + escPhp(d.hook) + "', " + argsArray : "'" + escPhp(d.hook) + "'") + ' ) ) {\n\treturn;\n}\n\n' + schedule
      : schedule,
  });

  if (d.custom) {
    blocks.push({
      name: 'schedules', params: '$schedules', hook: null, filter: 'cron_schedules',
      doc: '/**\n * Add the custom interval.\n *\n * @param array $schedules Existing schedules.\n * @return array\n */\n',
      body: "$schedules['" + d.intervalName + "'] = array(\n\t'interval' => " + d.seconds + ",\n\t'display'  => __( 'Every " + (parseInt(cr.intervalMinutes, 10) || 15) + " minutes', '" + d.td + "' ),\n);\n\nreturn $schedules;",
    });
  }

  const sig = d.args.map((a) => varSlug(a.name)).join(', ');
  let body = '';
  if (cr.lock) body += "if ( get_transient( '" + pre + "_running' ) ) {\n\treturn;\n}\n\nset_transient( '" + pre + "_running', time(), 5 * MINUTE_IN_SECONDS );\n\n";
  body += cr.body || JOB_BODY[cr.job] || '';
  if (cr.lock) body += "\n\ndelete_transient( '" + pre + "_running' );";
  let doc = '/**\n * The work itself.\n';
  if (d.args.length) {
    doc += ' *\n';
    d.args.forEach((a) => { doc += (' * @param mixed ' + varSlug(a.name) + ' ' + (a.description || '')).replace(/\s+$/, '') + '\n'; });
  }
  doc += ' */\n';
  blocks.push({ name: 'run', params: sig, hook: d.hook, hookArgs: d.args.length, doc, body });

  if (cr.unschedule) {
    blocks.push({
      name: 'unschedule',
      doc: '/**\n * Clear the event. Runs on deactivation — an orphaned event survives the plugin.\n */\n',
      body: d.args.length
        ? '$timestamp = wp_next_scheduled( ' + "'" + escPhp(d.hook) + "', " + argsArray + ' );\n\nif ( $timestamp ) {\n\twp_unschedule_event( $timestamp, ' + "'" + escPhp(d.hook) + "', " + argsArray + ' );\n}'
        : "wp_clear_scheduled_hook( '" + escPhp(d.hook) + "' );",
    });
  }

  let out = '';
  if (mode === 'plugin') {
    out += '<?php\n/**\n * Plugin Name:       ' + d.hook.replace(/_/g, ' ') + '\n * Description:       Scheduled task: ' + d.hook + '.\n * Version:           1.0.0\n * Requires PHP:      7.4\n * Text Domain:       ' + d.td + "\n */\n\ndefined( 'ABSPATH' ) || exit;\n\n";
  } else if (mode === 'functions') {
    out += "<?php\n// Add to your theme's functions.php.\n\n";
  }

  if (isClass) {
    out += 'final class ' + d.cls + ' {\n\n\t/**\n\t * Wire the class into WordPress.\n\t */\n\tpublic function hooks() {\n';
    const lines: string[] = [];
    if (d.custom) lines.push("add_filter( 'cron_schedules', array( $this, 'schedules' ) );");
    lines.push("add_action( '" + d.hook + "', array( $this, 'run' )" + (d.args.length ? ', 10, ' + d.args.length : '') + ' );');
    if (mode === 'plugin') {
      lines.push("register_activation_hook( __FILE__, array( $this, 'schedule' ) );");
      if (cr.unschedule) lines.push("register_deactivation_hook( __FILE__, array( $this, 'unschedule' ) );");
    } else {
      lines.push("add_action( 'init', array( $this, 'schedule' ) );");
    }
    out += indent(lines.join('\n'), 2) + '\n\t}\n\n';
    blocks.forEach((b) => { out += indent(b.doc, 1) + '\tpublic function ' + b.name + (b.params ? '( ' + b.params + ' )' : '()') + ' {\n' + indent(b.body, 2) + '\n\t}\n\n'; });
    out += '}\n\n( new ' + d.cls + '() )->hooks();\n';
  } else {
    out += blocks.map((b) => {
      let s = b.doc + 'function ' + pre + '_' + b.name + (b.params ? '( ' + b.params + ' )' : '()') + ' {\n' + indent(b.body, 1) + '\n}\n';
      if (b.filter) s += "add_filter( '" + b.filter + "', '" + pre + '_' + b.name + "' );\n";
      else if (b.hook) s += "add_action( '" + b.hook + "', '" + pre + '_' + b.name + "'" + (b.hookArgs ? ', 10, ' + b.hookArgs : '') + ' );\n';
      return s;
    }).join('\n');
    out += '\n';
    if (mode === 'plugin') {
      out += "register_activation_hook( __FILE__, '" + pre + "_schedule' );\n";
      if (cr.unschedule) out += "register_deactivation_hook( __FILE__, '" + pre + "_unschedule' );\n";
    } else {
      out += '// In a theme there is no activation hook, so check on every load instead.\n' + "add_action( 'init', '" + pre + "_schedule' );\n";
      if (cr.unschedule) out += '// Call ' + pre + '_unschedule() from switch_theme if the event should not outlive the theme.\n';
    }
  }
  return withCredit(out);
}

export function validate(cr: CronEvent): ValidationIssue[] {
  const d = derive(cr);
  const out: ValidationIssue[] = [];
  const add = (severity: ValidationIssue['severity'], message: string, targetId?: string, fix?: string, fixLabel?: string) => out.push({ severity, message, targetId, fix, fixLabel });
  if (!String(cr.hook || '').trim()) add('error', 'A hook name is required — it is what WP-Cron fires and what you unschedule later.', 'hook');
  else if (fnSlug(cr.hook) !== String(cr.hook).trim()) add('warning', '"' + cr.hook + '" is not a safe hook name. Lowercase with underscores keeps it consistent with core.', 'hook', 'fixHook', 'Use ' + fnSlug(cr.hook));
  if (fnSlug(cr.hook).indexOf(d.pre) !== 0) add('warning', 'The hook is not prefixed with "' + d.pre + '". Cron hooks are global; a generic name like sync_data is asking to be fired by someone else’s plugin.', 'hook', 'prefixHook', 'Prefix it');
  if (!cr.nextScheduledGuard) add('error', 'Nothing checks wp_next_scheduled() first, so every run of this code schedules another copy. The classic symptom is a job that fires forty times a day.', undefined, 'addGuard', 'Add the guard');
  if (!cr.unschedule) add('warning', 'No unschedule routine. Deactivating the plugin leaves the event in the cron array forever, firing a hook nothing listens to.', undefined, 'addUnschedule', 'Add the cleanup');
  if (d.custom) {
    const mins = parseInt(cr.intervalMinutes, 10);
    if (!mins) add('error', 'Set the interval length in minutes.', 'intervalMinutes');
    else if (mins < 5) add('warning', 'A ' + mins + '-minute interval is finer than WP-Cron can honour on most sites: it only runs when someone loads a page, and it will not run twice in the same request.');
    else if (mins % 60 === 0 && mins / 60 === 1) add('recommendation', 'That is hourly — the built-in schedule does the same thing without a filter.');
  }
  if (!d.single && cr.recurrence === 'hourly' && cr.job === 'sync') add('recommendation', 'An hourly remote fetch is 24 outbound requests a day per site. If the data changes daily, so should the schedule.');
  if (d.args.length && !cr.unschedule) add('recommendation', 'Events with arguments can only be found by passing the identical argument array to wp_next_scheduled(). Without the cleanup routine that is easy to get wrong later.');
  if (d.args.length > 3) add('recommendation', d.args.length + ' arguments is a lot to keep in sync between the schedule call and the guard. Consider one array argument.');
  if (!cr.lock) add('recommendation', 'No overlap lock. On a busy site two simultaneous page loads can both fire a due event, so anything non-idempotent runs twice.', undefined, 'addLock', 'Add the transient lock');
  if (cr.firstRun === 'now' && !d.single) add('recommendation', 'Scheduling the first run at time() means it fires on the very next page load — including the request that just activated the plugin.');
  if (cr.firstRun === 'tomorrow' || cr.firstRun === 'midnight') add('recommendation', 'strtotime() reads the server clock, not the site timezone. If "3am" has to mean 3am locally, build the timestamp from wp_date() instead.');
  if (d.single && cr.recurrence === 'single' && cr.nextScheduledGuard) add('recommendation', 'For a genuinely one-off event the guard is usually unnecessary — you normally want to queue one per trigger, not one per site.');
  if (cr.job === 'cleanup' && /wp_delete_post\( \$post_id, true \)/.test(cr.body || '')) add('recommendation', 'That deletion bypasses the trash. Deliberate for logs; unrecoverable for anything a client might want back.');
  return out;
}

export function applyFix(cr: CronEvent, kind: string): CronEvent {
  const p: CronEvent = JSON.parse(JSON.stringify(cr));
  if (kind === 'fixHook') p.hook = fnSlug(p.hook);
  if (kind === 'prefixHook') p.hook = fnSlug(p.prefix) + '_' + fnSlug(p.hook).replace(new RegExp('^' + fnSlug(p.prefix) + '_?'), '');
  if (kind === 'addGuard') p.nextScheduledGuard = true;
  if (kind === 'addUnschedule') p.unschedule = true;
  if (kind === 'addLock') p.lock = true;
  return p;
}

export function referenceInfo(cr: CronEvent) {
  const d = derive(cr);
  const everyLabel = d.single ? 'once' : d.custom ? 'every ' + (parseInt(cr.intervalMinutes, 10) || 15) + ' minutes' : cr.recurrence;
  const firstLabel = ({ now: 'the next page load', hour: 'an hour from activation', tomorrow: 'tomorrow at 03:00 server time', midnight: 'the next midnight, server time' } as Record<FirstRun, string>)[cr.firstRun];
  return {
    scheduleNote: d.hook + ' runs ' + everyLabel + ', starting ' + firstLabel + '. '
      + (cr.nextScheduledGuard ? 'Guarded against double-scheduling.' : 'Not guarded — it will schedule again on every run of this code.')
      + (cr.lock ? ' Locked against overlap for five minutes.' : ''),
    functionName: d.single ? 'wp_schedule_single_event()' : 'wp_schedule_event()',
    subtitle: d.single ? 'Fires once, then the event is gone' : 'Recurring — re-queued after every run',
    signature: d.single
      ? 'wp_schedule_single_event(\n\t$timestamp,\n\t$hook,\n\t$args = array(),\n\t$wp_error = false\n);'
      : 'wp_schedule_event(\n\t$timestamp,\n\t$recurrence,\n\t$hook,\n\t$args = array(),\n\t$wp_error = false\n);',
    schedules: padTo('hourly', 16) + '3600s\n' + padTo('twicedaily', 16) + '43200s\n' + padTo('daily', 16) + '86400s\n' + padTo('weekly', 16) + '604800s'
      + (d.custom ? '\n' + padTo(d.intervalName, 16) + d.seconds + 's   (yours)' : ''),
    realCron: "// wp-config.php\ndefine( 'DISABLE_WP_CRON', true );\n\n// crontab -e — every five minutes, quietly\n*/5 * * * * cd /var/www/site && wp cron event run --due-now > /dev/null 2>&1",
    cli: 'wp cron event list\nwp cron event run ' + d.hook + '\nwp cron event delete ' + d.hook + '\nwp cron test',
  };
}
