import type { ToolContent } from '../toolContentTypes';

export const dashboardWidgetContent: ToolContent = {
  aboutTitle: 'Dashboard Widget Generator Online',
  aboutLead:
    'Build a WordPress dashboard widget with `wp_add_dashboard_widget()` and get back a complete, commented file: the `wp_dashboard_setup` callback, a capability gate, the render function, and — if you want one — the Configure form behind the widget title with its own nonce check. Four content sources are built in: a single escaped paragraph, a `get_posts()` list with edit links, a cached `wp_remote_get()` stats call, or a saved option driven by the Configure form.',
  aboutSupport:
    'The Preview tab draws the widget as it will appear on the dashboard, in the column and at the priority you picked, next to the core boxes you chose to remove. Export as a snippet, a `functions.php` block or a plugin file, procedural or class. Free, no account, nothing uploaded.',
  spec: {
    hook: 'wp_add_dashboard_widget()',
    outputs: 'A snippet, a `functions.php` block, or a standalone plugin file — procedural or class style',
    requires: 'WordPress 5.6 or newer for the `$context` and `$priority` arguments, PHP 7.4+',
  },

  whyTitle: 'Why the Dashboard Widget Generator beats a copied wp_add_dashboard_widget snippet',
  whyIntro:
    'The three-argument version of `wp_add_dashboard_widget()` is easy and every tutorial shows it. What they leave out is that the widget id is global across every plugin on the site, that `$context` and `$priority` only exist from WordPress 5.6, that an uncached HTTP call in a render callback blocks the dashboard for every admin, and that a Configure form without a nonce is a write endpoint anyone can hit. This generator writes all of that in and then checks the result.',
  features: [
    {
      title: 'Column and priority, with the version caveat',
      body: 'Left, right, third and fourth columns at high, core, default or low priority. The `$context` and `$priority` arguments were only added in WordPress 5.6, so the checker says so whenever you move the widget off the defaults — below that version they are ignored and the box lands in the normal column.',
    },
    {
      title: 'Remote stats that cannot stall the dashboard',
      body: 'The remote source wraps `wp_remote_get()` in a transient with a timeout, handles `is_wp_error()` and a non-200 response code separately, and refuses to generate with no cache window — an uncached request in a dashboard widget makes every admin page load wait on someone else\'s server.',
    },
    {
      title: 'A Configure form with a real nonce',
      body: 'Turn on the config callback and you get the form behind the widget\'s Configure link, complete with `wp_nonce_field()`, a `wp_verify_nonce()` check on the POST, `sanitize_text_field()` on the value and an `update_option()` write. The checker also notices when the form saves a message the current content source never reads.',
    },
    {
      title: 'Core widgets cleared properly',
      body: 'Tick the core boxes you want gone and the generator emits `remove_meta_box()` with the correct context for each one — Quick Draft and Events and News are in the side column, Activity and At a Glance are not. Getting that argument wrong is why most removal snippets silently do nothing.',
    },
    {
      title: 'Honest about force-to-top',
      body: 'The generator will rewrite `$wp_meta_boxes` to pin your widget above everything else, and it warns you in the same breath that this overrides each user\'s own drag order on every dashboard load. Clients ask for it; a week later they ask why they cannot move it.',
    },
    {
      title: 'Prefix and capability checked',
      body: 'Dashboard ids are global, so an unprefixed id can silently replace another plugin\'s widget — flagged with a one-click prefix fix. A `read` capability is flagged too, because on a membership site that means every subscriber.',
    },
  ],

  howTitle: 'How does the Dashboard Widget Generator work?',
  howIntro:
    'Four steps. Name the widget, pick what it shows, decide which core boxes to clear, then check and export.',
  steps: [
    {
      title: 'Name and place the widget',
      body: 'Set the widget id, title and function prefix, choose the capability that can see it, and place it in a column at a priority. The placement note under the field spells out what that combination means before a user drags it somewhere else.',
    },
    {
      title: 'Choose what it shows',
      body: 'Static copy, a recent-posts list, remote stats or a saved option. Each source reveals its own fields — post type, status and count for the query; endpoint and cache minutes for the remote call — and the generated render function changes to match.',
    },
    {
      title: 'Clear the core boxes',
      body: 'Optionally remove Activity, At a Glance, Quick Draft, Events and News, Site Health or the PHP nag. The checker pushes back on removing Activity and Site Health, since both hide information you will be asked about later.',
    },
    {
      title: 'Review the checks and export',
      body: 'Add the capability gate and Configure form if you need them, clear the warnings, then copy the snippet or download the file as a plugin or a `functions.php` block.',
    },
  ],
  example: {
    title: 'Worked example — a static widget in the right column, editors and up',
    intro:
      'The complete output for a one-paragraph widget pinned to the side column at high priority. Note the seven-argument call: the fourth argument is the control callback, which must be `null` when you are not using one.',
    code: `/**
 * Register the dashboard widget.
 */
function acme_setup() {
\tif ( ! current_user_can( 'edit_posts' ) ) {
\t\treturn;
\t}

\twp_add_dashboard_widget(
\t\t'acme_overview',
\t\t__( 'Acme Overview', 'acme' ),
\t\t'acme_render',
\t\tnull,
\t\tarray(),
\t\t'side',
\t\t'high'
\t);
}
add_action( 'wp_dashboard_setup', 'acme_setup' );

/**
 * Print the widget body.
 */
function acme_render() {
\techo '<p>' . esc_html__( 'Everything is running. Nothing needs your attention today.', 'acme' ) . '</p>';
}`,
    note:
      'Switch the source to a recent-posts list and `acme_render()` becomes a `get_posts()` call with `suppress_filters => false`, an empty-state message, and `get_edit_post_link()` on every row — a drafts list with working edit links is the widget clients actually use.',
  },
  refLinks: [
    {
      href: 'https://developer.wordpress.org/reference/functions/wp_add_dashboard_widget/',
      title: 'wp_add_dashboard_widget() — WordPress developer reference',
      description: 'The full signature, including the $context and $priority arguments added in WordPress 5.6.',
    },
    {
      href: 'https://developer.wordpress.org/reference/hooks/wp_dashboard_setup/',
      title: 'wp_dashboard_setup — WordPress developer reference',
      description: 'The action every dashboard widget must register on, and when it fires.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/remove_meta_box/',
      title: 'remove_meta_box() — WordPress developer reference',
      description: 'How core dashboard boxes are removed, and why the context argument has to be right.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/wp_remote_get/',
      title: 'wp_remote_get() — WordPress developer reference',
      description: 'The HTTP API call behind the remote-stats source, including the timeout argument.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/set_transient/',
      title: 'set_transient() — WordPress developer reference',
      description: 'The cache layer that keeps a remote widget from blocking every dashboard load.',
    },
    {
      href: 'https://developer.wordpress.org/reference/hooks/wp_network_dashboard_setup/',
      title: 'wp_network_dashboard_setup — WordPress developer reference',
      description: 'The multisite equivalent, used when you tick the network dashboard option.',
    },
  ],

  faqTitle: 'WordPress dashboard widgets — frequently asked questions',
  faqIntro: 'What developers ask most often when adding or removing boxes on the WordPress dashboard.',
  faqs: [
    {
      question: 'How do I show a dashboard widget only to administrators?',
      answer:
        'Wrap the `wp_add_dashboard_widget()` call in `if ( ! current_user_can( \'manage_options\' ) ) { return; }` inside your `wp_dashboard_setup` callback. Gating the render function instead still registers the box, so other roles see an empty widget with a title. This generator emits the gate at registration time.',
    },
    {
      question: 'Why is my widget always in the left column even though I set the context?',
      answer:
        'The `$context` and `$priority` arguments of `wp_add_dashboard_widget()` were added in WordPress 5.6. On older versions they are ignored and the widget falls back to the normal column. Also remember that once a user drags a box, their own arrangement is stored in user meta and wins over your context on every later load.',
    },
    {
      question: 'How do I remove the default WordPress dashboard widgets?',
      answer:
        'Call `remove_meta_box( $id, \'dashboard\', $context )` on `wp_dashboard_setup`. The context has to match where core put the box: `dashboard_quick_press` and `dashboard_primary` are in the side column, `dashboard_activity`, `dashboard_right_now` and `dashboard_site_health` are in normal. Pass the wrong context and nothing happens, with no error.',
    },
    {
      question: 'How do I add the Configure link to a dashboard widget?',
      answer:
        'Pass a fourth argument to `wp_add_dashboard_widget()` — the control callback. Core then prints a Configure link in the widget header and renders your callback in place of the widget body when it is clicked. The form posts back to the same screen, so it needs its own nonce; the generator writes `wp_nonce_field()` and the matching `wp_verify_nonce()` check.',
    },
    {
      question: 'Can a dashboard widget fetch data from an external API?',
      answer:
        'Yes, but cache it. The render callback runs synchronously while the dashboard is being built, so an uncached `wp_remote_get()` adds its full round trip to every admin page load, for every admin. Store the decoded response in a transient with a sensible window, set an explicit timeout, and handle both `is_wp_error()` and a non-200 response code.',
    },
    {
      question: 'How do I force my widget to the top of the dashboard?',
      answer:
        'There is no argument for it — you have to reorder `$wp_meta_boxes[\'dashboard\']` yourself after core has populated it, moving your id to the front of the relevant context and priority bucket. It works, but it runs on every dashboard load and it overrides the position each user chose by dragging, which usually generates a support request.',
    },
  ],

  related: [
    { id: 'settings-page', note: 'Give the widget a settings screen to read its saved options from.' },
    { id: 'admin-notice', note: 'The other way to get a message in front of an admin — one line, one action, dismissible.' },
    { id: 'list-table', note: 'When the widget outgrows a box, promote the same data to a full admin table.' },
    { id: 'user-role', note: 'Define the role whose capability decides who sees the widget.' },
    { id: 'toolbar', note: 'A toolbar node reaches the same people on every screen, not just the dashboard.' },
    { id: 'cron', note: 'Warm the transient on a schedule so the widget never waits on a remote call.' },
  ],
};
