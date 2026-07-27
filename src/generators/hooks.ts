import { escPhp, withCredit, type ValidationIssue } from '../lib/codegen';

export type HookKind = 'action' | 'filter';
export type CallbackStyle = 'named' | 'closure' | 'method';
export type OutputMode = 'snippet' | 'functions' | 'plugin';

export interface HookParam {
  name: string;
  type: string;
  description: string;
}

export interface KnownHook {
  kind: HookKind;
  desc: string;
  params: [string, string, string][];
}

export const HOOKS: Record<string, KnownHook> = {
  init: { kind: 'action', desc: 'Fires after WordPress has finished loading but before any headers are sent. The place to register post types, taxonomies and rewrite rules.', params: [] },
  wp_loaded: { kind: 'action', desc: 'Fires once all of WordPress, plugins and the theme are fully loaded.', params: [] },
  admin_init: { kind: 'action', desc: 'Fires as an admin screen or script is being initialised — before any admin output.', params: [] },
  admin_menu: { kind: 'action', desc: 'Fires when the admin menu is built. Register settings pages here.', params: [] },
  wp_enqueue_scripts: { kind: 'action', desc: 'The only correct hook for enqueueing front-end scripts and styles.', params: [] },
  admin_enqueue_scripts: { kind: 'action', desc: 'Enqueue assets for admin screens. Gate on the hook suffix.', params: [['$hook_suffix', 'string', 'The current admin page.']] },
  template_redirect: { kind: 'action', desc: 'Fires before the template is chosen — the right moment to redirect.', params: [] },
  save_post: { kind: 'action', desc: 'Fires once a post has been saved. Check for autosave and revisions first.', params: [['$post_id', 'int', 'Post ID.'], ['$post', 'WP_Post', 'Post object.'], ['$update', 'bool', 'Whether this is an existing post being updated.']] },
  wp_insert_post: { kind: 'action', desc: 'Fires once a post has been inserted into the database.', params: [['$post_id', 'int', 'Post ID.'], ['$post', 'WP_Post', 'Post object.'], ['$update', 'bool', 'Whether this is an update.']] },
  transition_post_status: { kind: 'action', desc: 'Fires when a post changes status — the reliable way to catch a publish.', params: [['$new_status', 'string', 'New post status.'], ['$old_status', 'string', 'Old post status.'], ['$post', 'WP_Post', 'Post object.']] },
  user_register: { kind: 'action', desc: 'Fires immediately after a new user is registered.', params: [['$user_id', 'int', 'New user ID.']] },
  wp_footer: { kind: 'action', desc: 'Prints scripts or data before the closing body tag on the front end.', params: [] },
  wp_head: { kind: 'action', desc: 'Prints scripts or data in the head. Prefer wp_enqueue_scripts for assets.', params: [] },
  rest_api_init: { kind: 'action', desc: 'Fires when preparing to serve a REST request. Register routes and fields here.', params: [['$wp_rest_server', 'WP_REST_Server', 'Server object.']] },
  widgets_init: { kind: 'action', desc: 'Fires after all default widgets have been registered. Register sidebars here.', params: [] },
  after_setup_theme: { kind: 'action', desc: 'Fires after the theme is loaded — the place for add_theme_support().', params: [] },
  pre_get_posts: { kind: 'action', desc: 'Fires after the query variable object is created but before the query runs. Modify the main query here rather than running a second one.', params: [['$query', 'WP_Query', 'The query object, passed by reference.']] },
  the_content: { kind: 'filter', desc: 'Filters the post content before it is displayed. Runs on every post render, so keep it cheap.', params: [['$content', 'string', 'Post content.']] },
  the_title: { kind: 'filter', desc: 'Filters the post title. Fires in menus and admin lists too, so check the context.', params: [['$post_title', 'string', 'The post title.'], ['$post_id', 'int', 'The post ID.']] },
  excerpt_length: { kind: 'filter', desc: 'Filters the number of words in an automatically generated excerpt.', params: [['$number', 'int', 'The maximum number of words.']] },
  excerpt_more: { kind: 'filter', desc: 'Filters the string appended to a trimmed excerpt.', params: [['$more_string', 'string', 'The more string.']] },
  body_class: { kind: 'filter', desc: 'Filters the list of CSS body class names for the current post or page.', params: [['$classes', 'string[]', 'Array of body class names.'], ['$css_class', 'string[]', 'Additional class names added.']] },
  upload_mimes: { kind: 'filter', desc: 'Filters the list of allowed upload mime types and file extensions.', params: [['$mimes', 'array', 'Mime types keyed by file extension regex.'], ['$user', 'int|WP_User', 'User ID or object.']] },
  wp_nav_menu_items: { kind: 'filter', desc: 'Filters the HTML list content for navigation menus.', params: [['$items', 'string', 'The HTML list content.'], ['$args', 'stdClass', 'Menu arguments.']] },
  query_vars: { kind: 'filter', desc: 'Filters the public query variables WordPress recognises.', params: [['$public_query_vars', 'string[]', 'The array of public query variables.']] },
  cron_schedules: { kind: 'filter', desc: 'Filters the non-default cron schedules. Add custom intervals here.', params: [['$schedules', 'array', 'Existing schedules keyed by name.']] },
  login_redirect: { kind: 'filter', desc: 'Filters the URL a user is redirected to after logging in.', params: [['$redirect_to', 'string', 'The redirect destination.'], ['$requested_redirect_to', 'string', 'The requested destination.'], ['$user', 'WP_User|WP_Error', 'The logged-in user or an error.']] },
  wp_mail_from: { kind: 'filter', desc: 'Filters the from address used by wp_mail().', params: [['$from_email', 'string', 'The from email address.']] },
};

export const SUGGESTED = ['init', 'the_content', 'save_post', 'wp_enqueue_scripts', 'pre_get_posts', 'body_class', 'excerpt_length', 'admin_menu'];
export const PRIORITY_NOTES: Record<string, string> = { '1': 'Very early — before almost everything else on this hook.', '5': 'Early.', '10': 'The default. Runs in registration order alongside other tens.', '20': 'Late — after most plugins.', '99': 'Very late — a common way to win a conflict.', '999': 'Last resort. If you need this, something else is fighting you.' };

export interface Hook {
  hook: string;
  kind: HookKind;
  fnName: string;
  priority: string;
  acceptedArgs: string;
  callbackStyle: CallbackStyle;
  className: string;
  params: HookParam[];
  body: string;
  includeRemove: boolean;
  guardAdmin: boolean;
}

function fnSlug(s: string): string {
  return String(s || '').toLowerCase().trim().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
}
function varSlug(s: string): string {
  const v = String(s || '').trim().replace(/^\$+/, '').replace(/[^A-Za-z0-9_]+/g, '_');
  return '$' + (v || 'value');
}

export function activeParams(hk: Hook): HookParam[] {
  const n = parseInt(hk.acceptedArgs, 10) || 0;
  return hk.params.slice(0, n);
}

export function paramsFor(hook: string, kind: HookKind): HookParam[] {
  const known = HOOKS[hook];
  if (known) return known.params.map(([name, type, description]) => ({ name, type, description }));
  return kind === 'filter' ? [{ name: '$value', type: 'mixed', description: 'The value being filtered.' }] : [];
}

export function maxArgsFor(hk: Hook): number {
  const known = HOOKS[String(hk.hook || '').trim()];
  return Math.max(known ? known.params.length : hk.params.length, 4);
}

export function freshProject(): Hook {
  return {
    hook: 'the_content',
    kind: 'filter',
    fnName: 'mytheme_append_signature',
    priority: '10',
    acceptedArgs: '1',
    callbackStyle: 'named',
    className: 'My_Plugin',
    params: paramsFor('the_content', 'filter'),
    body: "if ( ! is_singular( 'post' ) || ! in_the_loop() || ! is_main_query() ) {\n\treturn $content;\n}\n\n$content .= '<p class=\"signature\">Thanks for reading.</p>';",
    includeRemove: false,
    guardAdmin: false,
  };
}

/** Mirrors the source's onHookChange handler: typing a known hook name auto-fills kind/params/acceptedArgs. */
export function onHookNameChange(hk: Hook, value: string): Hook {
  const next: Hook = JSON.parse(JSON.stringify(hk));
  next.hook = value;
  const known = HOOKS[value.trim()];
  if (known) {
    next.kind = known.kind;
    next.params = paramsFor(value.trim(), known.kind);
    next.acceptedArgs = String(Math.max(known.kind === 'filter' ? 1 : 0, known.params.length));
  }
  return next;
}

/** Mirrors the source's pickHook (used by the suggestion chips). */
export function pickHook(hk: Hook, name: string): Hook {
  const next: Hook = JSON.parse(JSON.stringify(hk));
  const known = HOOKS[name];
  next.hook = name;
  if (known) {
    next.kind = known.kind;
    next.params = paramsFor(name, known.kind);
    next.acceptedArgs = String(Math.min(next.params.length, known.kind === 'filter' ? Math.max(1, next.params.length) : next.params.length));
    if (known.kind === 'filter' && next.params.length === 0) next.acceptedArgs = '1';
  }
  return next;
}

export function setKind(hk: Hook, kind: HookKind): Hook {
  const next: Hook = JSON.parse(JSON.stringify(hk));
  next.kind = kind;
  if (kind === 'filter' && !next.params.length) {
    next.params = [{ name: '$value', type: 'mixed', description: 'The value being filtered.' }];
    next.acceptedArgs = '1';
  }
  return next;
}

export function setAcceptedArgs(hk: Hook, value: string): Hook {
  const next: Hook = JSON.parse(JSON.stringify(hk));
  next.acceptedArgs = value;
  const need = parseInt(value, 10) || 0;
  while (next.params.length < need) next.params.push({ name: '$arg' + (next.params.length + 1), type: 'mixed', description: '' });
  return next;
}

function indent(text: string, depth: number): string {
  const pad = new Array(depth + 1).join('\t');
  return text.split('\n').map((l) => (l ? pad + l : '')).join('\n');
}

export function buildCode(hk: Hook, mode: OutputMode): string {
  const hook = String(hk.hook || 'init').trim();
  const isFilter = hk.kind === 'filter';
  const fn = fnSlug(hk.fnName) || fnSlug(hk.hook) + '_callback';
  const params = activeParams(hk);
  const sigParams = params.map((p) => varSlug(p.name)).join(', ');
  const rawBody = String(hk.body || '').replace(/\n+$/, '') || '// Your code here.';
  const retVar = params.length ? varSlug(params[0].name) : '$value';
  const guardBlock = hk.guardAdmin ? 'if ( is_admin() ) {\n\treturn' + (isFilter ? ' ' + retVar : '') + ';\n}\n\n' : '';
  const fullBody = guardBlock + rawBody + (isFilter ? '\n\nreturn ' + retVar + ';' : '');

  let doc = '/**\n * ' + (isFilter ? 'Filter' : 'Callback for') + ' ' + hook + '.\n';
  if (params.length) {
    doc += ' *\n';
    const w = params.reduce((m, p) => Math.max(m, (p.type || 'mixed').length), 0);
    params.forEach((p) => {
      const line = ' * @param ' + (p.type || 'mixed') + ' '.repeat(Math.max(1, w - (p.type || 'mixed').length + 1)) + varSlug(p.name) + ' ' + (p.description || '');
      doc += line.replace(/\s+$/, '') + '\n';
    });
  }
  if (isFilter) doc += ' *\n * @return ' + ((params[0] && params[0].type) || 'mixed') + ' Filtered value.\n';
  doc += ' */\n';

  const adder = isFilter ? 'add_filter' : 'add_action';
  const extraArgs = (String(hk.priority) !== '10' || params.length > 1) ? ', ' + (hk.priority || '10') + (params.length > 1 ? ', ' + params.length : '') : '';

  let out = '';
  if (mode === 'plugin') {
    out += "<?php\n/**\n * Plugin Name:       " + hook + " hook\n * Description:       Hooks into " + hook + ".\n * Version:           1.0.0\n * Requires PHP:      7.4\n */\n\ndefined( 'ABSPATH' ) || exit;\n\n";
  } else if (mode === 'functions') {
    out += "<?php\n// Add to your theme's functions.php.\n\n";
  }

  if (hk.callbackStyle === 'closure') {
    out += doc;
    out += adder + "(\n\t'" + escPhp(hook) + "',\n\tstatic function ( " + sigParams + ' ) {\n' + indent(fullBody, 2) + '\n\t}' + extraArgs + '\n);\n';
  } else if (hk.callbackStyle === 'method') {
    const cls = hk.className || 'My_Plugin';
    out += 'class ' + cls + ' {\n\n\tpublic function register() {\n\t\t' + adder + "( '" + escPhp(hook) + "', array( $this, '" + fn + "' )" + extraArgs + ' );\n\t}\n\n' + indent(doc, 1) + '\tpublic function ' + fn + '( ' + sigParams + ' ) {\n' + indent(fullBody, 2) + '\n\t}\n}\n\n( new ' + cls + '() )->register();\n';
  } else {
    out += doc + 'function ' + fn + '( ' + sigParams + ' ) {\n' + indent(fullBody, 1) + '\n}\n';
    out += adder + "( '" + escPhp(hook) + "', '" + fn + "'" + extraArgs + ' );\n';
  }

  if (hk.includeRemove && hk.callbackStyle === 'named') {
    out += '\n// Remove it again from elsewhere:\n// ' + (isFilter ? 'remove_filter' : 'remove_action') + "( '" + escPhp(hook) + "', '" + fn + "'" + (String(hk.priority) !== '10' ? ', ' + (hk.priority || '10') : '') + ' );\n';
  }
  return withCredit(out);
}

export function validate(hk: Hook): ValidationIssue[] {
  const out: ValidationIssue[] = [];
  const add = (severity: ValidationIssue['severity'], message: string, fix?: string, fixLabel?: string) => out.push({ severity, message, fix, fixLabel });
  const hook = String(hk.hook || '').trim();
  const known = HOOKS[hook];
  const params = activeParams(hk);
  if (!hook) add('error', 'A hook name is required.');
  else if (/\s/.test(hook)) add('error', 'Hook names cannot contain spaces.');
  else if (!known) add('recommendation', '"' + hook + '" is not in the built-in reference. Double-check the spelling — a typo in a hook name fails silently, forever.');
  if (known && known.kind !== hk.kind) add('error', '"' + hook + '" is ' + (known.kind === 'filter' ? 'a filter, not an action — use add_filter() and return a value' : 'an action, not a filter — actions have no return value') + '.', 'swapKind', 'Switch to ' + known.kind);
  if (known && parseInt(hk.acceptedArgs, 10) > known.params.length) add('error', hook + ' only passes ' + known.params.length + ' parameter(s) — asking for more throws an ArgumentCountError on PHP 8.', 'clampArgs', 'Set to ' + known.params.length);
  if (!fnSlug(hk.fnName)) add('warning', 'No function name — one will be derived from the hook, which risks colliding with another plugin.');
  else if (fnSlug(hk.fnName).indexOf('_') === -1) add('recommendation', 'Prefix the function name so it cannot clash: every callback lives in the global namespace.');
  const p = parseInt(hk.priority, 10);
  if (isNaN(p)) add('error', 'Priority must be a number.');
  else if (p > 100) add('recommendation', 'A priority above 100 usually means you are fighting another plugin. Worth finding out which.');
  if (hk.kind === 'filter' && !params.length) add('warning', 'A filter with zero accepted args cannot return the value it is meant to filter.', 'oneArg', 'Accept 1 argument');
  if (hk.kind === 'filter' && /\becho\b|\bprint\b/.test(hk.body)) add('warning', 'Filters must return, not print. Echoing inside a filter dumps output wherever the filter happens to run.');
  if (hk.kind === 'action' && /\breturn\s+\$/.test(hk.body)) add('recommendation', 'Actions ignore return values — returning a variable here does nothing.');
  if (hook === 'save_post' && !/wp_is_post_autosave|DOING_AUTOSAVE|wp_is_post_revision/.test(hk.body)) add('warning', 'save_post also fires for autosaves and revisions. Guard with wp_is_post_autosave() and wp_is_post_revision() or you will save twice.');
  if (hook === 'pre_get_posts' && !/is_admin|is_main_query/.test(hk.body)) add('error', 'pre_get_posts runs for every query including the admin. Without an is_admin() and is_main_query() guard you will break the dashboard.', 'guardQuery', 'Insert the guard');
  if (hook === 'the_content' && !/is_singular|in_the_loop|is_main_query/.test(hk.body)) add('recommendation', 'the_content fires in feeds, excerpts and widgets too. Most filters want an is_singular() and in_the_loop() guard.');
  if (hook === 'init' && /get_current_user|wp_get_current_user/.test(hk.body)) add('warning', 'The current user is not reliably set until after init. Use wp_loaded or later.');
  if (hk.callbackStyle === 'closure' && hk.includeRemove) add('warning', 'A closure cannot be removed with remove_action or remove_filter — there is no handle to reference.');
  if (hk.callbackStyle === 'closure') add('recommendation', 'Closures are tidy but unremovable and unmockable. Named functions age better in a plugin.');
  return out;
}

export function applyFix(hk: Hook, kind: string): Hook {
  const p: Hook = JSON.parse(JSON.stringify(hk));
  const known = HOOKS[String(p.hook || '').trim()];
  if (kind === 'swapKind' && known) {
    p.kind = known.kind;
    p.params = paramsFor(p.hook, known.kind);
  }
  if (kind === 'clampArgs' && known) p.acceptedArgs = String(known.params.length);
  if (kind === 'oneArg') {
    p.acceptedArgs = '1';
    if (!p.params.length) p.params = [{ name: '$value', type: 'mixed', description: 'The value being filtered.' }];
  }
  if (kind === 'guardQuery') p.body = 'if ( is_admin() || ! $query->is_main_query() ) {\n\treturn;\n}\n\n' + p.body;
  return p;
}

/** Data for the "Reference" panel: signature, params and the matching remove_ call. */
export function referenceInfo(hk: Hook) {
  const hookName = String(hk.hook || '').trim();
  const known = HOOKS[hookName];
  const isFilter = hk.kind === 'filter';
  const params = activeParams(hk);
  const fnName = fnSlug(hk.fnName) || fnSlug(hk.hook) + '_callback';
  const refParams = known ? known.params.map(([name, type, description]) => ({ name, type, description })) : params;
  return {
    kindLabel: (known ? 'Core ' : 'Custom ') + (isFilter ? 'filter — must return a value' : 'action — returns nothing'),
    description: known ? known.desc : 'This hook is not in the built-in reference. Check the parameter list against the source before relying on it.',
    signature: (isFilter ? 'apply_filters' : 'do_action') + "( '" + hookName + "'" + (known && known.params.length ? ', ' + known.params.map((p) => p[0]).join(', ') : '') + ' )',
    params: refParams,
    removeSnippet: hk.callbackStyle === 'closure'
      ? '// A closure has no handle — it cannot be removed.\n// Use a named function if anything might need to unhook it.'
      : (isFilter ? 'remove_filter' : 'remove_action') + "( '" + hookName + "', " + (hk.callbackStyle === 'method' ? "array( $instance, '" + fnName + "' )" : "'" + fnName + "'") + (String(hk.priority) !== '10' ? ', ' + hk.priority : '') + ' );',
  };
}
