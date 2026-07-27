import { escPhp, slugify as baseSlugify, withCredit, type ValidationIssue } from '../lib/codegen';

export type OutputMode = 'snippet' | 'functions' | 'plugin';
export type NoticeType = 'success' | 'info' | 'warning' | 'error';
export type PersistMode = 'none' | 'user' | 'user-days' | 'site';

export interface AdminNotice {
  prefix: string;
  textDomain: string;
  codeStyle: 'procedural' | 'class';
  id: string;
  type: NoticeType;
  strong: string;
  message: string;
  actionLabel: string;
  actionPage: string;
  dismissible: boolean;
  persist: PersistMode;
  snoozeDays: string;
  altStyle: boolean;
  capability: string;
  screens: string[];
}

export const TYPES: [NoticeType, string, string][] = [
  ['success', 'Success', '#00A32A'],
  ['info', 'Info', '#72AEE6'],
  ['warning', 'Warning', '#DBA617'],
  ['error', 'Error', '#D63638'],
];
export const TYPE_COLOR: Record<NoticeType, string> = Object.fromEntries(TYPES.map(([id, , color]) => [id, color])) as Record<NoticeType, string>;

export const SCREENS: [string, string][] = [
  ['dashboard', 'Dashboard'], ['plugins', 'Plugins'], ['edit-post', 'Posts list'], ['post', 'Post editor'],
  ['options-general', 'Settings → General'], ['themes', 'Themes'], ['upload', 'Media'],
];

export const CAPS: [string, string][] = [
  ['manage_options', 'manage_options — admins'],
  ['edit_others_posts', 'edit_others_posts — editors'],
  ['edit_posts', 'edit_posts — contributors and up'],
  ['activate_plugins', 'activate_plugins — admins'],
];

const OPEN_SCRIPT = '<' + 'script>';
const CLOSE_SCRIPT = '</' + 'script>';

function fnSlug(s: string): string {
  return baseSlugify(s).replace(/-/g, '_');
}
function pascal(s: string): string {
  return String(s || '').split(/[^A-Za-z0-9]+/).filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('_');
}
function indent(text: string, depth: number): string {
  const pad = '\t'.repeat(depth);
  return text.split('\n').map((l) => (l ? pad + l : '')).join('\n');
}

export interface DerivedNotice {
  pre: string;
  td: string;
  id: string;
  cls: string;
  isClass: boolean;
  key: string;
  screens: string[];
  ajax: boolean;
}

export function derive(an: AdminNotice): DerivedNotice {
  const pre = fnSlug(an.prefix) || 'acme';
  return {
    pre,
    td: baseSlugify(an.textDomain) || pre.replace(/_/g, '-'),
    id: fnSlug(an.id) || pre + '_notice',
    cls: (pascal(an.prefix || 'Acme') || 'Acme') + '_Admin_Notice',
    isClass: an.codeStyle === 'class',
    key: pre + '_' + ((fnSlug(an.id) || 'notice').replace(new RegExp('^' + pre + '_?'), '') || 'notice') + '_dismissed',
    screens: an.screens || [],
    ajax: an.dismissible && an.persist !== 'none',
  };
}

export const PERSIST_NOTE: Record<PersistMode, (an: AdminNotice, d: DerivedNotice) => string> = {
  none: () => 'Clicking the X hides it in the DOM only. Next page load, it is back.',
  user: (_an, d) => 'Writes ' + d.key + ' to user meta over AJAX — each person dismisses their own copy, permanently.',
  'user-days': (an) => 'A per-user transient, so the notice returns after ' + (parseInt(an.snoozeDays, 10) || 30) + ' days. Right for "finish setting this up" nudges.',
  site: () => 'One option for the whole site. Simple, but whoever clicks first decides for everyone.',
};

interface CodeBlock {
  name: string;
  hook: string;
  doc: string;
  body: string;
}

export function buildCode(an: AdminNotice, mode: OutputMode): string {
  const d = derive(an);
  const pre = d.pre, td = d.td, isClass = d.isClass;
  const blocks: CodeBlock[] = [];
  const cls = 'notice notice-' + an.type + (an.dismissible ? ' is-dismissible' : '') + (an.altStyle ? ' notice-alt' : '');
  const t = (s: string) => "esc_html__( '" + escPhp(s) + "', '" + td + "' )";

  let guards = '';
  if (an.capability) guards += "if ( ! current_user_can( '" + escPhp(an.capability) + "' ) ) {\n\treturn;\n}\n\n";
  if (d.screens.length) {
    guards += '$screen = get_current_screen();\n\nif ( ! $screen || ! in_array( $screen->id, array( ' + d.screens.map((s) => "'" + s + "'").join(', ') + " ), true ) ) {\n\treturn;\n}\n\n";
  }
  if (an.persist === 'user') guards += "if ( get_user_meta( get_current_user_id(), '" + d.key + "', true ) ) {\n\treturn;\n}\n\n";
  else if (an.persist === 'user-days') guards += "if ( get_transient( '" + d.key + "_' . get_current_user_id() ) ) {\n\treturn;\n}\n\n";
  else if (an.persist === 'site') guards += "if ( get_option( '" + d.key + "' ) ) {\n\treturn;\n}\n\n";
  let body = guards;

  let inner = '<p>';
  const args: string[] = [];
  if (an.strong) {
    inner += '<strong>%1$s</strong> %2$s';
    args.push(t(an.strong));
    args.push(t(an.message || ''));
  } else {
    inner += '%1$s';
    args.push(t(an.message || ''));
  }
  inner += '</p>';
  if (an.actionLabel) {
    const n = args.length + 1;
    inner += '<p><a href="%' + (n + 1) + '$s" class="button button-primary">%' + n + '$s</a></p>';
    args.push(t(an.actionLabel));
    args.push("esc_url( admin_url( '" + escPhp(an.actionPage || 'options-general.php') + "' ) )");
  }
  body += 'printf(\n\t\'<div class="' + cls + '" data-notice="' + d.id + '">' + inner + '</div>\',\n' + indent(args.join(',\n'), 1) + '\n);';
  blocks.push({ name: 'notice', hook: 'admin_notices', doc: '/**\n * Print the notice.\n */\n', body });

  if (d.ajax) {
    blocks.push({
      name: 'dismiss_script',
      hook: 'admin_footer',
      doc: '/**\n * Send the dismissal back so it sticks. Printed only where the notice itself would appear.\n */\n',
      body:
        guards +
        "$nonce = wp_create_nonce( '" +
        d.key +
        "' );\n?>\n" +
        OPEN_SCRIPT +
        "\ndocument.addEventListener( 'click', function ( event ) {\n\tvar button = event.target.closest( '[data-notice=\"" +
        d.id +
        "\"] .notice-dismiss' );\n\n\tif ( ! button ) {\n\t\treturn;\n\t}\n\n\twindow.fetch( ajaxurl, {\n\t\tmethod: 'POST',\n\t\tcredentials: 'same-origin',\n\t\theaders: { 'Content-Type': 'application/x-www-form-urlencoded' },\n\t\tbody: new URLSearchParams( {\n\t\t\taction: '" +
        pre +
        "_dismiss_notice',\n\t\t\tnonce: '<?php echo esc_js( $nonce ); ?>'\n\t\t} )\n\t} );\n} );\n" +
        CLOSE_SCRIPT +
        '\n<?php',
    });
    let handler = "check_ajax_referer( '" + d.key + "', 'nonce' );\n\nif ( ! is_user_logged_in() ) {\n\twp_send_json_error( null, 403 );\n}\n\n";
    if (an.persist === 'user') handler += "update_user_meta( get_current_user_id(), '" + d.key + "', time() );";
    else if (an.persist === 'user-days') handler += "set_transient( '" + d.key + "_' . get_current_user_id(), time(), " + (parseInt(an.snoozeDays, 10) || 30) + ' * DAY_IN_SECONDS );';
    else handler += "update_option( '" + d.key + "', time(), false );";
    handler += '\n\nwp_send_json_success();';
    blocks.push({ name: 'dismiss', hook: 'wp_ajax_' + pre + '_dismiss_notice', doc: '/**\n * Store the dismissal.\n */\n', body: handler });
  }

  let out = '';
  if (mode === 'plugin') {
    out += '<?php\n/**\n * Plugin Name:       ' + (an.strong || 'Admin notice') + '\n * Description:       Shows an admin notice' + (d.screens.length ? ' on ' + d.screens.length + ' screen' + (d.screens.length === 1 ? '' : 's') : '') + '.\n * Version:           1.0.0\n * Requires PHP:      7.4\n * Text Domain:       ' + td + "\n */\n\ndefined( 'ABSPATH' ) || exit;\n\n";
  } else if (mode === 'functions') {
    out += "<?php\n// Add to your theme's functions.php.\n\n";
  }

  if (isClass) {
    out += 'final class ' + d.cls + ' {\n\n';
    const hookLines = blocks.map((b) => "add_action( '" + b.hook + "', array( $this, '" + b.name + "' ) );");
    out += '\t/**\n\t * Wire the class into WordPress.\n\t */\n\tpublic function hooks() {\n' + indent(hookLines.join('\n'), 2) + '\n\t}\n\n';
    blocks.forEach((b) => {
      out += indent(b.doc, 1) + '\tpublic function ' + b.name + '() {\n' + indent(b.body, 2) + '\n\t}\n\n';
    });
    out += '}\n\n( new ' + d.cls + '() )->hooks();\n';
  } else {
    out += blocks.map((b) => b.doc + 'function ' + pre + '_' + b.name + '() {\n' + indent(b.body, 1) + '\n}\n' + "add_action( '" + b.hook + "', '" + pre + '_' + b.name + "' );\n").join('\n');
  }
  return withCredit(out);
}

export function freshProject(): AdminNotice {
  return {
    prefix: 'acme', textDomain: 'acme', codeStyle: 'procedural',
    id: 'acme_setup', type: 'warning',
    strong: 'Acme Toolkit:', message: 'add your API key to finish setting up.',
    actionLabel: 'Open settings', actionPage: 'options-general.php?page=acme-toolkit',
    dismissible: true, persist: 'user', snoozeDays: '30', altStyle: false,
    capability: 'manage_options', screens: ['dashboard', 'plugins'],
  };
}

export function validate(an: AdminNotice): ValidationIssue[] {
  const d = derive(an);
  const out: ValidationIssue[] = [];
  const add = (severity: ValidationIssue['severity'], message: string, targetId?: string, fix?: string, fixLabel?: string) => out.push({ severity, message, targetId, fix, fixLabel });

  if (!String(an.message || '').trim()) add('error', 'The notice has no message — it will render as an empty coloured bar.', 'message');
  if (!String(an.id || '').trim()) add('error', 'A notice id is required: it keys the dismissal record and the data-notice hook the script listens on.', 'id');
  if (!d.screens.length) add('warning', 'No screens selected, so this notice appears on every single admin page — the fastest way to make a client stop reading your notices.', 'screens', 'scopeDashboard', 'Limit to the dashboard');
  if (an.dismissible && an.persist === 'none') add('warning', 'The notice is dismissible but nothing is stored, so it comes straight back on the next page load. That reads as broken.', 'persist', 'persistUser', 'Remember per user');
  if (!an.dismissible && an.persist !== 'none') add('recommendation', 'Dismissal is stored but there is no X to click. Turn dismissible on or drop the persistence.', 'dismissible');
  if (an.persist === 'site') add('warning', 'Storing dismissal site-wide means the first admin to close it closes it for everyone, including people who never saw it.', 'persist', 'persistUser', 'Store per user');
  if (an.type === 'error' && !/error|fail|cannot|missing|expired|invalid/i.test(String(an.message) + String(an.strong))) add('recommendation', 'An error notice for something that is not an error trains people to ignore the red ones. warning or info usually fits better.', 'type');
  if (an.type === 'success' && an.persist === 'user') add('recommendation', 'A success notice remembered forever is unusual — most confirmations should appear once and go.', 'persist');
  if (/<[a-z]/i.test(String(an.message || ''))) add('warning', 'The message contains HTML. The generated code escapes it with esc_html, so tags will print as text. Use the lead-in and button fields instead.', 'message');
  if (String(an.message || '').length > 200) add('recommendation', 'At ' + String(an.message).length + ' characters this is a paragraph, not a notice. Notices work when they are one line and one action.', 'message');
  if (an.actionLabel && !String(an.actionPage || '').trim()) add('error', 'The button has a label but no target, so it will link to the admin root.', 'actionPage');
  if (!an.capability) add('warning', 'No capability check, so every role that can see the admin sees this notice.', 'capability', 'setCap', 'Require manage_options');
  if (an.persist === 'user-days') {
    const days = parseInt(an.snoozeDays, 10);
    if (!days) add('error', 'Set a snooze length in days, or the transient expires immediately and the notice never goes away.', 'snoozeDays');
    else if (days > 365) add('recommendation', days + ' days is effectively forever — user meta is simpler than a year-long transient.', 'snoozeDays');
  }
  if (an.altStyle) add('recommendation', 'notice-alt gives the flat background core uses inside plugin rows. At the top of a page it looks unfinished.', 'altStyle');
  return out;
}

export function applyFix(an: AdminNotice, kind: string): AdminNotice {
  const p: AdminNotice = JSON.parse(JSON.stringify(an));
  if (kind === 'scopeDashboard') p.screens = ['dashboard'];
  if (kind === 'persistUser') {
    p.persist = 'user';
    p.dismissible = true;
  }
  if (kind === 'setCap') p.capability = 'manage_options';
  return p;
}
