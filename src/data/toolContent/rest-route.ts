import type { ToolContent } from '../toolContentTypes';

export const restRouteContent: ToolContent = {
  aboutTitle: 'REST Route Generator Online',
  aboutLead:
    'A `register_rest_route` generator that produces the whole endpoint: the registration on `rest_api_init`, a named permission callback, a typed `args` schema with `sanitize_callback` and `validate_callback` on every parameter, and a handler that returns through `rest_ensure_response()`. You choose the namespace, the route and the methods; it writes the rest.',
  aboutSupport:
    'The Calling it tab shows the finished endpoint URL with your default query arguments applied, plus ready examples for `apiFetch`, plain `fetch` with an `X-WP-Nonce` header, and curl with an application password. Free to use, no account, and the code is built in your browser.',
  spec: {
    hook: 'register_rest_route() on rest_api_init',
    outputs: 'A snippet, a `functions.php` block, or a standalone plugin file',
    requires: 'WordPress 5.5+ (permission_callback is mandatory from that release), PHP 7.4+',
  },

  whyTitle: 'Why the register_rest_route generator beats a copied endpoint',
  whyIntro:
    'Custom endpoints go wrong in two directions. Either they are too open — a public write route that anyone on the internet can call — or they are unvalidated, taking whatever `$request->get_param()` returns straight into a query. The args schema and the permission callback are the two things this generator refuses to leave blank.',
  features: [
    {
      title: 'A permission callback, always',
      body: 'WordPress 5.5 made `permission_callback` mandatory and triggers a `_doing_it_wrong()` notice without it. Every route here gets a real named function: return `true` for a genuinely public read, `is_user_logged_in()`, or a `current_user_can()` check that returns a `WP_Error` with `rest_authorization_required_code()` when it fails.',
    },
    {
      title: 'Public writes flagged as an error',
      body: 'A public permission callback on a POST, PUT, PATCH or DELETE route is an open door, so it is reported as an error with a one-click switch to requiring `edit_posts`. Mixing a public GET with writes on the same route raises a warning of its own.',
    },
    {
      title: 'A schema WordPress validates before your callback runs',
      body: 'Each argument emits `type`, plus `required`, `default`, `enum` or `minimum`/`maximum` where you set them, a `sanitize_callback` matched to the type (`absint`, `floatval`, `rest_sanitize_boolean`, `sanitize_email`, `esc_url_raw` or `sanitize_text_field`) and `validate_callback` set to `rest_validate_request_arg`.',
    },
    {
      title: 'Route parameters read properly',
      body: 'Named capture groups such as `(?P<id>[\\d]+)` are detected and pulled into the handler with `$request->get_param()`. Writing `/items/{id}` instead is an error — WordPress routes use PCRE named groups, not braces — and a capture with no matching argument entry is flagged as neither sanitised nor documented.',
    },
    {
      title: 'Namespace conventions checked',
      body: 'The `vendor/v1` shape is what makes it possible to change the response later without breaking clients, so a namespace that does not match is flagged. Registering into the `wp/` namespace is an error: that one belongs to core.',
    },
    {
      title: 'Handlers you can run immediately',
      body: 'Start from a `WP_Query` list that maps posts to id, title and link, an option read/write pair with a `WP_Error` branch when the save fails, or an empty stub. Optional extras add a `register_rest_field()` example and `Cache-Control` headers — with a warning if you try to cache an authenticated route.',
    },
  ],

  howTitle: 'How does the REST Route Generator work?',
  howIntro: 'Four steps, and the finished URL is shown as you type so you can see exactly what you are building.',
  steps: [
    {
      title: 'Define the endpoint',
      body: 'Set the namespace, the route and a function prefix, then choose a handler style. The full path — `/wp-json/myplugin/v1/items` — updates live underneath.',
    },
    {
      title: 'Choose methods and permissions',
      body: 'Pick the HTTP methods the route answers, then the permission level: public, any logged-in user, a named capability, editors or administrators. Each choice explains what it really allows.',
    },
    {
      title: 'Declare the arguments',
      body: 'Add each parameter with a type, an optional format (email, URI, date-time, enum, min/max range), a default and whether it is required. Required arguments with a default are flagged, since the default can never apply.',
    },
    {
      title: 'Test the call, then export',
      body: 'Use the Calling it tab to copy an `apiFetch`, `fetch` or curl example, clear the Checks tab, then copy or download the endpoint as a snippet, a `functions.php` block or a plugin file.',
    },
  ],
  example: {
    title: 'Worked example — a public GET route with a validated per_page argument',
    intro:
      'The registration half of a `myplugin/v1` endpoint. The handler and the permission function are generated below it in the same file.',
    code: `/**
 * Register the /items endpoint.
 */
function myplugin_register_items_route() {
\tregister_rest_route(
\t\t'myplugin/v1',
\t\t'/items',
\t\tarray(
\t\t\tarray(
\t\t\t\t'methods'             => WP_REST_Server::READABLE,
\t\t\t\t'callback'            => 'myplugin_items_get',
\t\t\t\t'permission_callback' => 'myplugin_items_permission',
\t\t\t\t'args'                => array(
\t\t\t\t\t'per_page' => array(
\t\t\t\t\t\t'type'              => 'integer',
\t\t\t\t\t\t'default'           => 10,
\t\t\t\t\t\t'minimum'           => 1,
\t\t\t\t\t\t'maximum'           => 50,
\t\t\t\t\t\t'sanitize_callback' => 'absint',
\t\t\t\t\t\t'validate_callback' => 'rest_validate_request_arg',
\t\t\t\t\t),
\t\t\t\t),
\t\t\t),
\t\t)
\t);
}
add_action( 'rest_api_init', 'myplugin_register_items_route' );`,
    note:
      'Because `minimum` and `maximum` are declared, a request for `per_page=500` is rejected by WordPress with a 400 before `myplugin_items_get()` ever runs. The permission callback is written as its own named function rather than `__return_true`, so making the route public later is a decision you can find in the code.',
  },
  refLinks: [
    {
      href: 'https://developer.wordpress.org/reference/functions/register_rest_route/',
      title: 'register_rest_route() — developer reference',
      description: 'The namespace, route and args parameters, and the mandatory permission_callback.',
    },
    {
      href: 'https://developer.wordpress.org/rest-api/extending-the-rest-api/adding-custom-endpoints/',
      title: 'Adding custom endpoints — REST API Handbook',
      description: 'The official walkthrough for registering routes and returning responses.',
    },
    {
      href: 'https://developer.wordpress.org/rest-api/extending-the-rest-api/routes-and-endpoints/',
      title: 'Routes and endpoints — REST API Handbook',
      description: 'How namespaces, routes, methods and named regex captures fit together.',
    },
    {
      href: 'https://developer.wordpress.org/rest-api/extending-the-rest-api/schema/',
      title: 'Schema — REST API Handbook',
      description: 'What the args schema validates, and how sanitising and validating differ.',
    },
    {
      href: 'https://developer.wordpress.org/reference/hooks/rest_api_init/',
      title: 'rest_api_init — hook reference',
      description: 'The only hook where route registration is guaranteed to be seen.',
    },
    {
      href: 'https://developer.wordpress.org/rest-api/using-the-rest-api/authentication/',
      title: 'Authentication — REST API Handbook',
      description: 'Cookie plus nonce for in-site requests, application passwords for external clients.',
    },
  ],

  faqTitle: 'WordPress REST API routes — frequently asked questions',
  faqIntro: 'The questions developers hit when adding their first custom endpoint.',
  faqs: [
    {
      question: 'What does "missing the required permission_callback argument" mean?',
      answer:
        'Since WordPress 5.5 every registered route must declare `permission_callback`, and omitting it triggers a `_doing_it_wrong()` notice. Add a callback that returns `true`, `false` or a `WP_Error`. For a route that really is meant to be public, core\'s own guidance is to use `__return_true` — the requirement exists so that being public is an explicit decision rather than an oversight.',
    },
    {
      question: 'Is __return_true safe as a permission callback?',
      answer:
        'For a read-only endpoint that exposes nothing private, yes — it is the documented way to declare a public route. It is not safe on anything that writes, deletes or reads private data, because a public route is reachable by anyone on the internet without a cookie or a key. Use `current_user_can()` with the capability that matches the operation for those.',
    },
    {
      question: 'How do I add a URL parameter such as /items/123 to a REST route?',
      answer:
        'Put a named PCRE capture group in the route: `/items/(?P<id>[\\d]+)`. WordPress puts the capture into the request, so the handler reads it with `$request->get_param( \'id\' )`. Declare it in the `args` array as well so it is sanitised and validated, and note that `{id}` braces are not WordPress syntax — that route simply never matches.',
    },
    {
      question: 'Why do I get rest_no_route or a 404 from my custom endpoint?',
      answer:
        'Usually one of four things: the registration is not on `rest_api_init`, so it runs too late or not at all; the namespace or route in the URL does not match what was registered exactly, including the leading slash; the code lives in a plugin that is not active or a theme that is not the current one; or the HTTP method you are sending is not in the `methods` list, which returns 404 rather than 405 in some setups. Requesting `/wp-json/myplugin/v1` lists everything actually registered in that namespace.',
    },
    {
      question: 'How do I authenticate a request to my custom endpoint?',
      answer:
        'From JavaScript inside WordPress, the logged-in cookie is used automatically as long as you send the REST nonce in an `X-WP-Nonce` header — `apiFetch` does this for you. From outside WordPress, use an application password over HTTPS with basic auth, which is core functionality since 5.6. There is no way to authenticate with a plain cookie alone; without the nonce the request is treated as logged out.',
    },
    {
      question: 'What namespace should I use for my endpoints?',
      answer:
        'A vendor prefix and a version: `myplugin/v1`. The vendor part keeps your routes from colliding with another plugin\'s, and the version is what lets you ship a `v2` with a different response shape while old clients keep working. Never register into `wp/v2` — that namespace is core\'s, and anything you add there can be overwritten by a core release.',
    },
  ],

  related: [
    { id: 'hooks', note: 'rest_api_init is an ordinary action, and the callback still has to be signed correctly.' },
    { id: 'enqueue', note: 'Localise rest_url() and a wp_rest nonce so your script can call the route.' },
    { id: 'plugin-header', note: 'Endpoints belong in a plugin, not a theme that might be switched away.' },
    { id: 'cron', note: 'The scheduled job that populates or refreshes whatever this endpoint returns.' },
    { id: 'post-meta', note: 'register_post_meta with show_in_rest exposes fields on core routes without a custom endpoint.' },
    { id: 'post-type', note: 'A post type with show_in_rest already has a full CRUD route — check before writing your own.' },
  ],
};
