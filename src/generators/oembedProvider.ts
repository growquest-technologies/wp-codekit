import { escPhp, withCredit, type ValidationIssue } from '../lib/codegen';

export type OutputMode = 'snippet' | 'functions' | 'plugin';
export type OembedMode = 'provider' | 'handler';
export type AspectRatio = '16-9' | '4-3' | '1-1' | '9-16';

export const RATIOS: Record<AspectRatio, string> = { '16-9': '56.25%', '4-3': '75%', '1-1': '100%', '9-16': '177.78%' };

export interface OembedProvider {
  mode: OembedMode;
  name: string;
  prefix: string;
  pattern: string;
  endpoint: string;
  embedTemplate: string;
  isRegex: boolean;
  ratio: AspectRatio;
  cacheHours: string;
  responsiveWrapper: boolean;
  allowFullscreen: boolean;
  cacheNote: boolean;
  filterTtl: boolean;
  allowUnsafe: boolean;
  testUrl: string;
}

function fnSlug(s: string): string {
  return String(s || '').toLowerCase().trim().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
}
function slugify(s: string): string {
  return String(s || '').toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
}

function patternToRegex(pattern: string): string {
  const raw = String(pattern || '').trim();
  if (!raw) return '#^$#i';
  const escaped = raw.replace(/[.\\+?^$(){}|[\]/]/g, (c) => '\\' + c);
  const body = escaped.replace(/\*/g, '([^\\/\\?&]+)');
  return '#' + body + '#i';
}

interface Derived {
  pre: string;
  slug: string;
  regex: string;
  isProvider: boolean;
}

function derive(oe: OembedProvider): Derived {
  const pre = fnSlug(oe.prefix) || 'acme';
  return {
    pre,
    slug: slugify(oe.name) || 'acme-video',
    regex: patternToRegex(oe.pattern),
    isProvider: oe.mode !== 'handler',
  };
}
export { derive as deriveOembed };

export function testMatch(oe: OembedProvider): { ok: boolean | null; detail: string } {
  const url = String(oe.testUrl || '').trim();
  if (!url) return { ok: null, detail: 'Paste a URL to test the pattern.' };
  const raw = String(oe.pattern || '').trim();
  if (!raw) return { ok: false, detail: 'No pattern to match against.' };
  try {
    const jsRe = new RegExp(patternToRegex(raw).replace(/^#|#i$/g, ''), 'i');
    const m = url.match(jsRe);
    if (!m) return { ok: false, detail: 'The pattern does not match this URL.' };
    return { ok: true, detail: m[1] ? 'Captured: ' + m[1] : 'Matched, but no capture group — a handler needs one.' };
  } catch {
    return { ok: false, detail: 'The pattern produces an invalid regex.' };
  }
}

export function freshProject(): OembedProvider {
  return {
    mode: 'provider', name: 'Acme Video', prefix: 'acme',
    pattern: 'https://video.example.com/watch/*',
    endpoint: 'https://video.example.com/oembed',
    embedTemplate: 'https://video.example.com/embed/%1$s',
    isRegex: false, ratio: '16-9', cacheHours: '24',
    responsiveWrapper: true, allowFullscreen: true, cacheNote: true, filterTtl: false, allowUnsafe: false,
    testUrl: 'https://video.example.com/watch/abc123',
  };
}

export function buildCode(oe: OembedProvider, mode: OutputMode): string {
  const d = derive(oe);
  const pre = d.pre;
  const hours = parseInt(oe.cacheHours, 10) || 24;

  let out = '';
  if (mode === 'plugin') {
    out += '<?php\n/**\n * Plugin Name:       ' + (oe.name || 'oEmbed provider') + ' embeds\n * Description:       Auto-embeds ' + (oe.name || 'the service') + ' URLs pasted into the editor.\n * Version:           1.0.0\n * Requires PHP:      7.4\n */\n\ndefined( \'ABSPATH\' ) || exit;\n\n';
  } else if (mode === 'functions') {
    out += "<?php\n// Add to your theme's functions.php.\n\n";
  } else {
    out += '<?php\n\n';
  }

  if (d.isProvider) {
    out += '/**\n * Register the ' + (oe.name || 'service') + ' oEmbed provider.\n *\n * WordPress appends ?url= and &format=json itself.\n */\nfunction ' + pre + '_register_provider() {\n\twp_oembed_add_provider(\n\t\t\'' + escPhp(String(oe.pattern || '').trim()) + "',\n\t\t'" + escPhp(String(oe.endpoint || '').trim()) + "',\n\t\t" + (oe.isRegex ? 'true' : 'false') + " // Whether the first argument is a regex.\n\t);\n}\nadd_action( 'init', '" + pre + "_register_provider' );\n";
  } else {
    out += '/**\n * Turn a ' + (oe.name || 'service') + ' URL into an embed.\n *\n * @param array  $matches The regex captures.\n * @param array  $attr    Embed attributes.\n * @param string $url     The original URL.\n * @return string\n */\nfunction ' + pre + '_embed_handler( $matches, $attr, $url ) {\n\tif ( empty( $matches[1] ) ) {\n\t\treturn esc_url( $url );\n\t}\n\n\t$src = sprintf(\n\t\t\'' + escPhp(String(oe.embedTemplate || 'https://example.com/embed/%1$s').trim()) + "',\n\t\trawurlencode( $matches[1] )\n\t);\n\n\t$iframe = sprintf(\n\t\t'<iframe src=\"%1$s\" title=\"%2$s\" frameborder=\"0\" loading=\"lazy\"" + (oe.allowFullscreen ? ' allowfullscreen' : '') + ' allow="encrypted-media; picture-in-picture"></iframe>\',\n\t\tesc_url( $src ),\n\t\tesc_attr( sprintf(\n\t\t\t/* translators: %s: the item id. */\n\t\t\t__( \'' + escPhp(oe.name || 'Embedded') + ' item %s\', \'' + d.slug + "' ),\n\t\t\t$matches[1]\n\t\t) )\n\t);\n\n";
    if (oe.responsiveWrapper) {
      out += '\treturn sprintf(\n\t\t\'<div class="' + d.slug + '-embed" style="position:relative;padding-bottom:' + RATIOS[oe.ratio] + ';height:0;overflow:hidden;">%s</div>\',\n\t\tstr_replace( \'<iframe \', \'<iframe style="position:absolute;top:0;left:0;width:100%%;height:100%%;" \', $iframe )\n\t);\n}\n';
    } else {
      out += '\treturn $iframe;\n}\n';
    }
    out += "add_action( 'init', function () {\n\twp_embed_register_handler(\n\t\t'" + d.slug + "',\n\t\t'" + escPhp(d.regex) + "',\n\t\t'" + pre + "_embed_handler'\n\t);\n} );\n";
  }

  if (oe.cacheNote) {
    out += '\n/**\n * Cached embeds live in post meta and never expire on their own.\n * Run this once after changing the endpoint or the markup.\n */\nfunction ' + pre + "_flush_embed_cache() {\n\tglobal $wpdb;\n\n\t// phpcs:ignore WordPress.DB.DirectDatabaseQuery.NoCaching\n\t$wpdb->query( \"DELETE FROM {$wpdb->postmeta} WHERE meta_key LIKE '_oembed_%'\" );\n}\n";
  }
  if (oe.filterTtl) {
    out += '\n/**\n * How long a failed lookup is remembered before WordPress retries.\n *\n * @return int\n */\nfunction ' + pre + '_oembed_ttl() {\n\treturn ' + hours + " * HOUR_IN_SECONDS;\n}\nadd_filter( 'oembed_ttl', '" + pre + "_oembed_ttl' );\n";
  }
  if (oe.allowUnsafe) {
    out += '\n/**\n * Allow this host to be embedded even when it is not a known provider.\n *\n * @param string[] $hosts Allowed hosts.\n * @return string[]\n */\nfunction ' + pre + '_allowed_hosts( $hosts ) {\n\t$hosts[] = \'' + escPhp(String(oe.pattern || '').replace(/^https?:\/\//, '').split('/')[0]) + "';\n\n\treturn $hosts;\n}\nadd_filter( 'allowed_redirect_hosts', '" + pre + "_allowed_hosts' );\n";
  }
  return withCredit(out);
}

export function validate(oe: OembedProvider): ValidationIssue[] {
  const d = derive(oe);
  const out: ValidationIssue[] = [];
  const add = (severity: ValidationIssue['severity'], message: string, targetId?: string, fix?: string, fixLabel?: string) => out.push({ severity, message, targetId, fix, fixLabel });
  const pattern = String(oe.pattern || '').trim();
  if (!String(oe.name || '').trim()) add('warning', 'No service name, so the handler id and the iframe title both read as generic.', 'name');
  if (!pattern) add('error', 'A URL pattern is required — without it nothing is ever matched.', 'pattern');
  else {
    if (!/^https?:\/\//.test(pattern)) add('error', 'The pattern must start with http:// or https://.', 'pattern');
    if (pattern.indexOf('*') === -1) add('warning', 'No wildcard in the pattern, so only that exact URL matches. Add * where the id varies.', 'pattern', 'addWildcard', 'Add a wildcard');
    if (pattern.indexOf('http://') === 0) add('warning', 'An http pattern will not match the https URLs users actually paste.', 'pattern', 'useHttps', 'Use https');
    if (/\*\*/.test(pattern)) add('warning', 'Two consecutive wildcards produce a greedy capture that swallows the rest of the URL.', 'pattern');
  }
  if (d.isProvider) {
    const ep = String(oe.endpoint || '').trim();
    if (!ep) add('error', 'A provider needs its oEmbed endpoint URL.', 'endpoint');
    else {
      if (!/^https:\/\//.test(ep)) add('error', 'The endpoint must be https — WordPress will not call an insecure oEmbed endpoint from a secure site.', 'endpoint');
      if (/[?&](url|format)=/.test(ep)) add('error', 'The endpoint already contains url= or format=. WordPress appends both, so this produces a malformed request.', 'endpoint', 'stripQuery', 'Strip the query');
    }
    add('recommendation', 'Providers depend on the service staying up. If the endpoint 404s, the URL renders as a plain link — which is a reasonable failure, unlike a broken iframe.');
  } else {
    const tpl = String(oe.embedTemplate || '').trim();
    if (!tpl) add('error', 'A handler needs an embed URL template.', 'embedTemplate');
    else {
      if (tpl.indexOf('%1$s') === -1) add('error', 'The template has no %1$s, so the captured id is never inserted.', 'embedTemplate');
      if (!/^https:\/\//.test(tpl)) add('error', 'The embed URL must be https, or browsers will block it as mixed content.', 'embedTemplate');
    }
    if (pattern.indexOf('*') === -1) add('error', 'A handler needs at least one wildcard, since %1$s comes from the first capture group.', 'pattern');
    add('recommendation', 'A handler builds the iframe itself, so its markup, sizing and privacy attributes are yours to maintain. Check whether the service publishes an oEmbed endpoint first.');
  }
  const test = testMatch(oe);
  if (test.ok === false && String(oe.testUrl || '').trim()) add('warning', 'The test URL does not match the pattern: ' + test.detail, 'testUrl');
  if (!oe.responsiveWrapper && !d.isProvider) add('recommendation', 'A bare iframe keeps whatever fixed size you give it. The responsive wrapper is what stops embeds overflowing on phones.', undefined, 'addWrapper', 'Add the wrapper');
  if (!oe.allowFullscreen && !d.isProvider) add('recommendation', 'No allowfullscreen, so a video embed cannot go full screen.');
  if (oe.allowUnsafe) add('warning', 'Adding the host to allowed_redirect_hosts is unrelated to embedding and widens what wp_safe_redirect() will follow. Only keep it if you know you need it.', undefined, 'dropUnsafe', 'Remove it');
  if (!oe.cacheNote) add('recommendation', 'Embed responses are cached in post meta indefinitely. Without a flush routine, changing the endpoint leaves old posts showing the old embed.', undefined, 'addFlush', 'Include the flush');
  const hours = parseInt(oe.cacheHours, 10);
  if (oe.filterTtl && (!hours || hours < 1)) add('error', 'Set a cache lifetime of at least one hour.', 'cacheHours');
  if (oe.filterTtl && hours > 720) add('recommendation', hours + ' hours is over a month. oembed_ttl only governs failed lookups — a long window means a service outage keeps embeds broken for weeks.');
  return out;
}

export function applyFix(oe: OembedProvider, kind: string): OembedProvider {
  const p: OembedProvider = JSON.parse(JSON.stringify(oe));
  if (kind === 'addWildcard') p.pattern = String(p.pattern || '').replace(/\/?$/, '/*');
  if (kind === 'useHttps') p.pattern = String(p.pattern || '').replace(/^http:\/\//, 'https://');
  if (kind === 'stripQuery') p.endpoint = String(p.endpoint || '').split('?')[0];
  if (kind === 'addWrapper') p.responsiveWrapper = true;
  if (kind === 'dropUnsafe') p.allowUnsafe = false;
  if (kind === 'addFlush') p.cacheNote = true;
  return p;
}

export function referenceInfo(oe: OembedProvider) {
  const d = derive(oe);
  return {
    isProvider: d.isProvider,
    functionName: d.isProvider ? 'wp_oembed_add_provider()' : 'wp_embed_register_handler()',
    args: d.isProvider
      ? ([
        ['$format', 'The URL pattern users paste. A glob with * by default, or a full regex when the third argument is true.'],
        ['$provider', 'The oEmbed endpoint. WordPress appends ?url= and &format=json, so never include them.'],
        ['$regex', 'Whether $format is a regex. Default false.'],
        ['wp_oembed_remove_provider()', 'Takes the same pattern and unregisters it — the way to replace a core provider with your own.'],
        ['oembed_result', 'Filters the html a provider returned, if you need to add a wrapper or strip an attribute.'],
      ] as [string, string][])
      : ([
        ['$id', 'A unique handler id. Also decides ordering against core’s own handlers.'],
        ['$regex', 'A full PCRE pattern with delimiters. Capture groups become $matches in your callback.'],
        ['$callback', 'Receives $matches, $attr, $url and $rawattr. Must return the final markup, escaped.'],
        ['$priority', 'Lower runs first. Core’s own handlers sit at 10.'],
        ['wp_embed_unregister_handler()', 'Removes a handler by id and priority.'],
      ] as [string, string][]),
    testing: '// In the editor, paste the bare URL on its own line.\n\n// Or check from WP-CLI:\nwp eval \'echo wp_oembed_get( "' + String(oe.testUrl || 'https://example.com/watch/abc').trim() + '" );\'\n\n// Clear one post’s cached embeds:\nwp post meta list <id> | grep _oembed',
  };
}
