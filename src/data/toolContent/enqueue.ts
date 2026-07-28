import type { ToolContent } from '../toolContentTypes';

export const enqueueContent: ToolContent = {
  aboutTitle: 'Scripts & Styles Generator Online',
  aboutLead:
    'A `wp_enqueue_script` generator that writes the whole registration, not just the one line. Each asset gets a prefixed handle, a real URL helper (`get_theme_file_uri()` or `plugins_url()`), its dependency array, a `filemtime()` version for cache busting and, for scripts, the WordPress 6.3 loading-strategy array — all inside a callback attached to the correct hook for its context.',
  aboutSupport:
    'The Load map tab lists every asset beside the hook it rides on and where it ends up in the page, so you can see at a glance that the admin script really is gated on `$hook_suffix` and the deferred script really is in the footer. Free, no sign-up, and nothing leaves your browser.',
  spec: {
    hook: 'wp_enqueue_scripts / admin_enqueue_scripts / enqueue_block_editor_assets / login_enqueue_scripts',
    outputs: 'A snippet, a `functions.php` block, or a standalone plugin file',
    requires: 'WordPress 6.3+ for the defer/async strategy argument; PHP 7.4+',
  },

  whyTitle: 'Why the wp_enqueue_script generator beats a hand-written enqueue block',
  whyIntro:
    'The function call is easy. What goes wrong is everything around it: an unprefixed handle that replaces core jQuery, a version argument left at `null` so browsers keep serving yesterday\'s CSS, admin assets loaded on every screen in the dashboard, and `wp_head` used for scripts that should have been queued. Each of those has a check here.',
  features: [
    {
      title: 'The right hook for each context',
      body: 'Front end, admin screens, block editor and login screen map to `wp_enqueue_scripts`, `admin_enqueue_scripts`, `enqueue_block_editor_assets` and `login_enqueue_scripts`. Assets are grouped into one callback per context, and the admin callback is generated with a `$hook_suffix` check so it does not fire on every dashboard page.',
    },
    {
      title: 'Cache busting that is actually correct',
      body: '`filemtime()` versioning resolves through `get_theme_file_path()` or `plugin_dir_path( __FILE__ )` depending on where the files live. You can also use a version constant or a fixed string; choosing `null` raises a warning, because the version then falls back to the WordPress version and your edits never reach a returning visitor.',
    },
    {
      title: 'Handle collisions caught before deployment',
      body: 'Naming an asset `jquery`, `wp-element`, `lodash` or any of the other core handles is an error with a one-click prefix fix. Two assets of the same type sharing a handle is an error too — WordPress silently ignores the second enqueue.',
    },
    {
      title: 'Loading strategies, not just footer flags',
      body: 'Defer and async emit the WordPress 6.3 argument array (`in_footer` plus `strategy`) rather than the old boolean. Loading in the head is flagged as render-blocking, and an async script that declares dependencies raises a warning, since async ignores order.',
    },
    {
      title: 'Typed wp_localize_script rows',
      body: 'Pass data to JavaScript without hand-writing the array: pick `admin_url( \'admin-ajax.php\' )`, `wp_create_nonce()`, `esc_url_raw( rest_url() )`, a translated string or raw PHP, and the keys are aligned in the output. A localised script with no object name is an error.',
    },
    {
      title: 'Conditional loading and the usual extras',
      body: 'Restrict front-end assets to `is_front_page()`, `is_singular()`, `is_post_type_archive()`, `is_page_template()`, `has_shortcode()` or `has_block()`. Optional blocks move jQuery to the footer, add `wp_set_script_translations()` or dequeue the core block stylesheet — with a warning that the last one breaks default block styling.',
    },
  ],

  howTitle: 'How does the Scripts & Styles Generator work?',
  howIntro: 'Four steps from an empty assets folder to a registration block you can paste.',
  steps: [
    {
      title: 'Say where the files live',
      body: 'Theme or plugin — that decides whether URLs come from `get_theme_file_uri()` or `plugins_url( …, __FILE__ )`. Set the handle prefix, the asset folder and the version strategy.',
    },
    {
      title: 'Add each script and stylesheet',
      body: 'For every asset: script or style, handle, file path, context, comma-separated dependencies, and either a media attribute or a loading strategy.',
    },
    {
      title: 'Localise and narrow',
      body: 'Attach data rows to any script, then choose whether front-end assets load everywhere or only on a matching page, template, shortcode or block.',
    },
    {
      title: 'Check the load map, then export',
      body: 'The Load map tab shows each handle, its hook and its final position in the page. Clear the Checks tab, then copy or download as a snippet, a `functions.php` block or a plugin file.',
    },
  ],
  example: {
    title: 'Worked example — one deferred theme script with localised data',
    intro:
      'A theme asset in `assets/js/main.js`, deferred to the footer, versioned by file modification time, with the AJAX URL and a nonce handed to JavaScript.',
    code: `/**
 * Enqueue front end assets.
 */
function mytheme_enqueue_front_assets() {
\twp_enqueue_script(
\t\t'mytheme-main',
\t\tget_theme_file_uri( 'assets/js/main.js' ),
\t\tarray(),
\t\tfilemtime( get_theme_file_path( 'assets/js/main.js' ) ),
\t\tarray(
\t\t\t'in_footer' => true,
\t\t\t'strategy'  => 'defer',
\t\t)
\t);

\twp_localize_script(
\t\t'mytheme-main',
\t\t'mythemeData',
\t\tarray(
\t\t\t'ajaxUrl' => admin_url( 'admin-ajax.php' ),
\t\t\t'nonce'   => wp_create_nonce( 'mytheme_nonce' ),
\t\t)
\t);
}
add_action( 'wp_enqueue_scripts', 'mytheme_enqueue_front_assets' );`,
    note:
      '`filemtime()` reads the filesystem on every request. That is ideal in development, where every save busts the cache; for a high-traffic production site, switch the version strategy to a theme or plugin version constant.',
  },
  refLinks: [
    {
      href: 'https://developer.wordpress.org/reference/functions/wp_enqueue_script/',
      title: 'wp_enqueue_script() — developer reference',
      description: 'The handle, source, dependencies, version and args parameters, including the strategy array.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/wp_enqueue_style/',
      title: 'wp_enqueue_style() — developer reference',
      description: 'The stylesheet equivalent, including the media argument this generator writes.',
    },
    {
      href: 'https://developer.wordpress.org/reference/hooks/wp_enqueue_scripts/',
      title: 'wp_enqueue_scripts — hook reference',
      description: 'The only correct hook for front-end assets, and why wp_head is not it.',
    },
    {
      href: 'https://developer.wordpress.org/reference/hooks/admin_enqueue_scripts/',
      title: 'admin_enqueue_scripts — hook reference',
      description: 'The admin equivalent, and the $hook_suffix parameter used to target one screen.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/wp_localize_script/',
      title: 'wp_localize_script() — developer reference',
      description: 'How PHP values reach JavaScript, and why it must run after the script is registered.',
    },
    {
      href: 'https://developer.wordpress.org/themes/basics/including-css-javascript/',
      title: 'Including CSS & JavaScript — Theme Handbook',
      description: 'The official pattern for theme assets, dependencies and versioning.',
    },
  ],

  faqTitle: 'Enqueueing scripts and styles — frequently asked questions',
  faqIntro: 'The questions developers ask most often about loading assets in WordPress.',
  faqs: [
    {
      question: 'Which hook should I use to enqueue scripts in WordPress?',
      answer:
        'Front-end assets go on `wp_enqueue_scripts`. Admin assets go on `admin_enqueue_scripts`, which passes `$hook_suffix` so you can load them on one screen instead of the whole dashboard. Block editor assets go on `enqueue_block_editor_assets`, and the login page has its own hook, `login_enqueue_scripts`. They are four different hooks; using the front-end one in the admin loads nothing.',
    },
    {
      question: 'How do I stop browsers caching my CSS after I change it?',
      answer:
        'Pass a version as the fourth argument that changes when the file does. `filemtime( get_theme_file_path( \'assets/css/main.css\' ) )` uses the file\'s modification time, so every save produces a new URL. Passing `null` is the common mistake: WordPress then appends the WordPress version, which does not change when your file does.',
    },
    {
      question: 'What is the difference between wp_register_script() and wp_enqueue_script()?',
      answer:
        'Registering records the handle, URL, dependencies and version without adding the file to the page. Enqueueing is what actually outputs it. Register once early when several conditions might request the same file, then call `wp_enqueue_script( \'handle\' )` with no other arguments where you need it. If you only ever load it in one place, enqueueing directly is enough.',
    },
    {
      question: 'How do I add defer or async to an enqueued script?',
      answer:
        'Since WordPress 6.3 the fifth argument accepts an array: `array( \'in_footer\' => true, \'strategy\' => \'defer\' )`. Defer keeps execution order, so it is safe with dependencies; async does not, so an async script that depends on another can run before it. Before 6.3 the fifth argument was only the `in_footer` boolean and you had to filter `script_loader_tag`.',
    },
    {
      question: 'Why is my script loading but my jQuery code not running?',
      answer:
        'Core loads jQuery in no-conflict mode, so the `$` shortcut is not defined globally. Wrap your code in `jQuery( function ( $ ) { … } );` or use `jQuery` directly. The other common cause is a missing dependency: if `jquery` is not in the dependency array, your file can be printed before jQuery is.',
    },
    {
      question: 'How do I pass a PHP value, like an AJAX URL or nonce, to my JavaScript?',
      answer:
        '`wp_localize_script( \'handle\', \'objectName\', array( … ) )` prints the array as a JavaScript object before your file loads. It must be called after the script is registered or enqueued, using the same handle. For anything that is not translation-related, `wp_add_inline_script()` is the more modern alternative and can inject arbitrary JavaScript rather than only an object.',
    },
  ],

  related: [
    { id: 'hooks', note: 'Anything outside the four enqueue hooks still needs a correctly signed callback.' },
    { id: 'plugin-header', note: 'Plugin-based assets need path and URL constants defined in the main file.' },
    { id: 'rest-route', note: 'The endpoint the nonce and rest_url() you just localised will call.' },
    { id: 'wp-config', note: 'SCRIPT_DEBUG and CONCATENATE_SCRIPTS control how core serves its own assets.' },
    { id: 'block-pattern', note: 'Editor-side assets pair with the patterns and blocks they style.' },
    { id: 'theme-json', note: 'Block themes express much of their styling in theme.json instead of a stylesheet.' },
  ],
};
