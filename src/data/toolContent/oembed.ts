import type { ToolContent } from '../toolContentTypes';

export const oembedContent: ToolContent = {
  aboutTitle: 'oEmbed Provider Generator Online',
  aboutLead:
    'Paste a URL, get an embed. For a service that publishes an oEmbed endpoint that is a single `wp_oembed_add_provider()` call, and this generator writes it with the pattern, the endpoint and the regex flag in the right order. For a service with no endpoint at all, it switches to `wp_embed_register_handler()` and builds the regex, the iframe and a responsive wrapper instead.',
  aboutSupport:
    'A live pattern tester sits in the form: paste a real URL from the service and it tells you whether the wildcard pattern matches and what it captured, before you paste anything into a site. Free, no account, and nothing is sent anywhere.',
  spec: {
    hook: 'wp_oembed_add_provider() / wp_embed_register_handler() on init',
    outputs: 'A snippet, a `functions.php` block, or a standalone plugin file',
    requires: 'WordPress 4.0 or newer, PHP 7.4+',
  },

  whyTitle: 'Why the wp_oembed_add_provider generator beats a one-line snippet',
  whyIntro:
    'The registration is trivial. What costs time is everything around it: a pattern with no wildcard that matches exactly one URL, an `http://` pattern that never matches the `https://` URLs people actually paste, an endpoint with `?url=` already in it that WordPress then appends to, and embeds cached in post meta that keep showing the old markup long after you fixed the code.',
  features: [
    {
      title: 'Provider or handler, from the same form',
      body: 'A provider is one call and always renders whatever the service returns. A handler is your own regex and your own iframe, needed when the service publishes no endpoint — and permanently your maintenance problem when their embed URL changes. The generator explains which you are choosing and writes either.',
    },
    {
      title: 'A live pattern tester',
      body: 'Paste a real URL from the service and the form reports whether the pattern matches and which id was captured. A test URL that does not match raises a warning with the reason, so you never register a pattern that quietly matches nothing.',
    },
    {
      title: 'Endpoint mistakes caught first',
      body: 'An endpoint that already contains `url=` or `format=` is an error with a one-click strip, because WordPress appends both itself and the resulting request is malformed. Insecure endpoints are rejected, and a pattern with no wildcard, a double wildcard or an `http://` scheme each gets its own warning and fix.',
    },
    {
      title: 'Handler markup that behaves on a phone',
      body: 'The generated iframe carries `loading="lazy"`, a translated `title` attribute built from the captured id, optional `allowfullscreen`, and a responsive wrapper using the padding trick for a 16:9, 4:3, 1:1 or 9:16 ratio. Without the wrapper an embed keeps whatever fixed size you gave it and overflows on narrow screens.',
    },
    {
      title: 'The caching problem, addressed',
      body: 'Successful embeds are cached in post meta under `_oembed_` keys and never expire on their own, so the generator can include the one-off cleanup query you run after changing an endpoint or the markup. The `oembed_ttl` filter is offered separately, with the note that it only governs how long a failed lookup is remembered.',
    },
    {
      title: 'Honest advice about the extras',
      body: 'Adding your host to `allowed_redirect_hosts` is offered, and immediately flagged: it has nothing to do with embedding and widens what `wp_safe_redirect()` will follow. Providers get a reminder that if the endpoint 404s the URL degrades to a plain link, which is a much better failure than a broken iframe.',
    },
  ],

  howTitle: 'How does the oEmbed Provider Generator work?',
  howIntro: 'Four steps, and the pattern is tested against a real URL before you leave the page.',
  steps: [
    {
      title: 'Pick provider or handler',
      body: 'Check the service documentation for an `/oembed` endpoint or a `.well-known` entry first. If it has one, choose provider. If it genuinely has none, choose handler.',
    },
    {
      title: 'Describe the URL',
      body: 'Give the service a name, a function prefix and the URL pattern people paste, using `*` where the id varies. Add the oEmbed endpoint for a provider, or the iframe URL template with `%1$s` for a handler.',
    },
    {
      title: 'Test and tune',
      body: 'Paste a real URL into the test field and confirm the capture. For handlers, set the aspect ratio, the responsive wrapper and fullscreen; for either, decide whether to include the cache-flush routine or an `oembed_ttl` filter.',
    },
    {
      title: 'Export as a plugin',
      body: 'Clear the Checks tab and take the plugin output. Embeds usually outlive the design, and a URL that stops embedding after a theme switch is a confusing bug to chase.',
    },
  ],
  example: {
    title: 'Worked example — registering a provider and clearing stale embeds',
    intro:
      'One registration on `init`, plus the one-off cleanup you run after changing the endpoint. Note that the endpoint has no query string: WordPress appends `?url=` and `&format=json` itself.',
    code: `/**
 * Register the Acme Video oEmbed provider.
 *
 * WordPress appends ?url= and &format=json itself.
 */
function acme_register_provider() {
\twp_oembed_add_provider(
\t\t'https://video.example.com/watch/*',
\t\t'https://video.example.com/oembed',
\t\tfalse // Whether the first argument is a regex.
\t);
}
add_action( 'init', 'acme_register_provider' );

/**
 * Cached embeds live in post meta and never expire on their own.
 * Run this once after changing the endpoint or the markup.
 */
function acme_flush_embed_cache() {
\tglobal $wpdb;

\t// phpcs:ignore WordPress.DB.DirectDatabaseQuery.NoCaching
\t$wpdb->query( "DELETE FROM {$wpdb->postmeta} WHERE meta_key LIKE '_oembed_%'" );
}`,
    note:
      'The third argument tells WordPress whether the first one is a full regex. Left as `false`, the pattern is a glob and each `*` is expanded internally, which is what you want for a URL shape like `/watch/{id}`.',
  },
  refLinks: [
    {
      href: 'https://developer.wordpress.org/reference/functions/wp_oembed_add_provider/',
      title: 'wp_oembed_add_provider() — developer reference',
      description: 'The format, provider and regex arguments, and when registration takes effect.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/wp_embed_register_handler/',
      title: 'wp_embed_register_handler() — developer reference',
      description: 'The fallback for services with no oEmbed endpoint: id, regex, callback and priority.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/wp_oembed_remove_provider/',
      title: 'wp_oembed_remove_provider() — developer reference',
      description: 'Unregistering a provider, which is how you replace one of core\'s with your own.',
    },
    {
      href: 'https://developer.wordpress.org/reference/classes/wp_oembed/',
      title: 'WP_oEmbed — class reference',
      description: 'The class behind it all, including the built-in provider list and discovery.',
    },
    {
      href: 'https://developer.wordpress.org/reference/hooks/oembed_ttl/',
      title: 'oembed_ttl — hook reference',
      description: 'How long a failed oEmbed lookup is cached before WordPress tries again.',
    },
    {
      href: 'https://wordpress.org/documentation/article/embeds/',
      title: 'Embeds — WordPress documentation',
      description: 'The services core already supports, and how auto-embedding behaves in the editor.',
    },
  ],

  faqTitle: 'oEmbed providers & handlers — frequently asked questions',
  faqIntro: 'The questions that come up when a pasted URL does not turn into an embed.',
  faqs: [
    {
      question: 'How do I add a custom oEmbed provider in WordPress?',
      answer:
        'Call `wp_oembed_add_provider( $pattern, $endpoint, $is_regex )` from a callback on `init`, passing the URL shape users paste (with `*` wildcards), the service\'s oEmbed endpoint and `false` unless your pattern is a full regex. Never put `?url=` or `&format=json` in the endpoint — WordPress adds both when it makes the request.',
    },
    {
      question: 'Why does my URL show as a plain link instead of an embed?',
      answer:
        'Auto-embedding only happens when the URL is alone on its own line or in its own paragraph or Embed block; a URL inside a sentence is left as text. Beyond that: the provider may not be registered by the time the content renders, the endpoint may be returning an error (in which case WordPress deliberately falls back to a link), or an old result may be cached against that post.',
    },
    {
      question: 'What do I do when a service has no oEmbed endpoint?',
      answer:
        'Use `wp_embed_register_handler()` instead. You supply a unique id, a full PCRE pattern with delimiters and a callback that receives the regex matches, the attributes and the original URL, and returns the markup. You are then responsible for the iframe, its sizing and its privacy attributes forever — so check the service\'s documentation for an endpoint before committing to this.',
    },
    {
      question: 'How do I clear the WordPress oEmbed cache?',
      answer:
        'Successful responses are stored as post meta with keys beginning `_oembed_`, and they do not expire. Deleting those meta rows forces WordPress to fetch again the next time the post is rendered. Until you do, a post keeps showing the markup that was returned when it was first saved, which is why changing an endpoint appears to have no effect on old content.',
    },
    {
      question: 'Can I change the markup a provider returns?',
      answer:
        'Yes, with filters rather than by changing the provider. `oembed_result` receives the raw HTML the service returned, and `embed_oembed_html` receives the final HTML just before it is printed — that is the usual place to wrap an embed in a responsive container or strip an attribute. Neither changes what is cached unless you clear the existing `_oembed_` meta.',
    },
    {
      question: 'Do I need to register a provider at all?',
      answer:
        'Often not. Core ships a list of supported services and, for URLs it does not recognise, it can discover an endpoint from the page\'s own `link rel="alternate"` oEmbed tag. Registering explicitly is what you do when the service publishes an endpoint but no discovery link, when you want to avoid the extra discovery request, or when you are replacing one of core\'s providers — for which `wp_oembed_remove_provider()` comes first.',
    },
  ],

  related: [
    { id: 'hooks', note: 'oembed_result and embed_oembed_html are ordinary filters and need correct signatures.' },
    { id: 'plugin-header', note: 'Wrap the registration in a plugin so embeds survive a theme change.' },
    { id: 'enqueue', note: 'Any CSS the responsive wrapper needs has to be enqueued properly.' },
    { id: 'activation', note: 'Run the embed cache cleanup once from an upgrade routine rather than on every load.' },
    { id: 'shortcode', note: 'The alternative when you want explicit attributes instead of a bare URL.' },
    { id: 'block-pattern', note: 'Ship the embed inside a ready-made layout for editors to drop in.' },
  ],
};
