import type { ToolContent } from '../toolContentTypes';

export const postStatusContent: ToolContent = {
  aboutTitle: 'Post Status Generator Online',
  aboutLead:
    'Build a custom post status in WordPress — In review, Awaiting legal, Archived — and get more than the bare `register_post_status()` call. The generator writes the registration with a properly nooped `label_count`, the `display_post_states` filter that labels the post in the list table, the classic-editor Status dropdown entry, and an optional `pre_get_posts` helper so posts in the status still appear under All.',
  aboutSupport:
    'A Reference tab explains every argument and what it actually changes in the admin, including the ones whose defaults are derived from `internal` rather than from `public`. Free, no account, and nothing you type leaves the browser.',
  spec: {
    hook: 'register_post_status() on init',
    outputs: 'A snippet, a `functions.php` block, or a standalone plugin file',
    requires: 'WordPress 3.0 or newer, PHP 7.4+',
  },

  whyTitle: 'Why a custom post status needs more than register_post_status()',
  whyIntro:
    'Registering a status takes six lines and gives you almost nothing: the status exists, but nobody can select it, no post shows it in the list table, and the filter link at the top of the screen is missing. The visible half of the feature is four separate hooks that no reference page collects in one place. This generator writes them together and tells you which ones you have left out.',
  features: [
    {
      title: 'The 20-character limit and the core status list',
      body: 'The `post_status` column is 20 characters wide, so a longer slug registers but silently fails to save on a post. `publish`, `draft`, `pending`, `private`, `future`, `trash`, `auto-draft` and `inherit` are refused outright, because re-registering one overrides core behaviour site-wide.',
    },
    {
      title: 'label_count built with _n_noop()',
      body: 'The count label needs singular and plural forms and a `%s` placeholder for the number. Leave the placeholder out and the filter link shows the label with no count at all — a warning with a one-click fix that rebuilds the string for you.',
    },
    {
      title: 'Contradictory flags caught',
      body: '`public` and `internal` together is an error, because `internal` is core plumbing for `auto-draft` and `inherit`. A public status that is not excluded from search is a warning, since unfinished posts then surface in site search and in feeds. A status that is neither public nor in either admin list is an error: nobody would ever see it.',
    },
    {
      title: 'The label beside the title',
      body: 'Without a `display_post_states` filter a post in your status looks identical to a published one in the posts list. The generator adds the filter, correctly registered with two accepted arguments, and warns when you turn it off.',
    },
    {
      title: 'An honest classic-editor dropdown',
      body: 'PHP-registered statuses do not appear in the block editor status control. The generator emits the `post_submitbox_misc_actions` snippet that adds the option to the classic editor and Quick Edit, and states in a code comment and in the Checks tab that this is exactly what it does and does not cover.',
    },
    {
      title: 'The All view, handled deliberately',
      body: 'Turn `show_in_admin_all_list` off and posts vanish from the default view. An optional `pre_get_posts` helper adds the status back for the main admin query only, scoped by `get_current_screen()` and skipped when a status filter is already active.',
    },
  ],

  howTitle: 'How does the custom post status generator work?',
  howIntro:
    'Name the status, decide how visible it is, add the pieces that make it usable, then export.',
  steps: [
    {
      title: 'Name the status',
      body: 'Enter the label editors will see and the slug stored in the database, plus the count label used in the filter link. The slug is lowercased and dashed, and capped at the 20 characters the column allows.',
    },
    {
      title: 'Scope it to post types',
      body: 'Choose `post`, `page`, `product` or type any custom post type slug. The list is written into the registration args and reused by the editor dropdown and the query helper, which is what actually keeps the status from being offered everywhere.',
    },
    {
      title: 'Set the visibility flags',
      body: 'Toggle public, internal, exclude from search, the two admin list flags and `date_floating`. The Checks tab explains the consequence of each combination rather than just listing the arguments.',
    },
    {
      title: 'Add the usable parts, then export',
      body: 'Turn on the list-table label, the classic-editor dropdown and the All-view helper as needed, clear the checks, then copy the snippet or download the plugin file.',
    },
  ],
  example: {
    title: 'Worked example — an In review status on posts',
    intro:
      'Not public, excluded from search, visible in both admin lists, with a floating date so the publish date is only set on publish. This is the registration exactly as it is generated.',
    code: `/**
 * Register the In review status.
 */
function acme_register_status() {
\tregister_post_status(
\t\t'in-review',
\t\tarray(
\t\t\t'label'                     => _x( 'In review', 'post status', 'acme' ),
\t\t\t'label_count'               => _n_noop(
\t\t\t\t'In review <span class="count">(%s)</span>',
\t\t\t\t'In review <span class="count">(%s)</span>',
\t\t\t\t'acme'
\t\t\t),
\t\t\t'public'                    => false,
\t\t\t'internal'                  => false,
\t\t\t'exclude_from_search'       => true,
\t\t\t'show_in_admin_all_list'    => true,
\t\t\t'show_in_admin_status_list' => true,
\t\t\t'date_floating'             => true,
\t\t\t'post_type'                 => array( 'post' ),
\t\t)
\t);
}
add_action( 'init', 'acme_register_status' );`,
    note:
      'Leave the list-table label and the editor dropdown toggles on and the generator appends the `display_post_states` filter and the `post_submitbox_misc_actions` callback beneath this, in the same file.',
  },
  refLinks: [
    {
      href: 'https://developer.wordpress.org/reference/functions/register_post_status/',
      title: 'register_post_status() — WordPress developer reference',
      description: 'Every argument and, importantly, which defaults are derived from internal rather than public.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/_n_noop/',
      title: '_n_noop() — WordPress developer reference',
      description: 'How the singular and plural count label is registered for translation without being translated yet.',
    },
    {
      href: 'https://developer.wordpress.org/reference/hooks/display_post_states/',
      title: 'display_post_states — WordPress developer reference',
      description: 'The filter that puts the status label beside the post title in the list table.',
    },
    {
      href: 'https://developer.wordpress.org/reference/hooks/post_submitbox_misc_actions/',
      title: 'post_submitbox_misc_actions — WordPress developer reference',
      description: 'The classic-editor Publish box hook the generated dropdown snippet uses.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/get_post_stati/',
      title: 'get_post_stati() — WordPress developer reference',
      description: 'Listing registered statuses, and filtering them by any registered argument.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/wp_insert_post/',
      title: 'wp_insert_post() — WordPress developer reference',
      description: 'Setting the status programmatically, which is often the most reliable route in the block editor.',
    },
  ],

  faqTitle: 'Custom post statuses — frequently asked questions',
  faqIntro: 'What people actually run into after registering their first custom status.',
  faqs: [
    {
      question: 'Why does my custom post status not appear in the block editor?',
      answer:
        'Because the block editor does not read PHP-registered statuses into its status control. `register_post_status()` makes the status real for queries, the list table and the classic editor, but Gutenberg builds its own list. The practical routes are Quick Edit, a classic-editor dropdown snippet, setting the status programmatically with `wp_insert_post()`, or a small block-editor plugin.',
    },
    {
      question: 'How do I add a custom status to the editor Status dropdown?',
      answer:
        'In the classic editor, hook `post_submitbox_misc_actions` and append an `<option>` to `select#post_status`, updating `#post-status-display` when the current post already uses it. That is exactly what this generator emits. It affects the classic editor and Quick Edit only.',
    },
    {
      question: 'Where should register_post_status() be called?',
      answer:
        'On the `init` action, and not before it. The reference is explicit that the function must not be used before `init`, because the status registry is set up as part of that hook. Registering it in a plugin file at load time gives inconsistent results.',
    },
    {
      question: 'What is the maximum length of a post status slug?',
      answer:
        'Twenty characters. `post_status` is a 20-character column in the posts table, so a longer slug registers happily and then fails when a post is saved with it — the database write is rejected and the change silently does not stick. The generator raises this as an error.',
    },
    {
      question: 'Can I limit a custom post status to one post type?',
      answer:
        'Partly. The `post_type` array is stored on the registered status object, and the generated helpers use it: the classic-editor dropdown only appends the option when `$post->post_type` matches, and the query helper only adds the status for those types. Core itself does not gate statuses by post type, so those guards are what does the limiting.',
    },
    {
      question: 'What does date_floating actually do?',
      answer:
        'It leaves `post_date` unset until the post is published, the way `draft` behaves. That is right for a status that sits before publication in a workflow, and wrong for anything users see dated — an archived post with a floating date loses its original publish date the first time it moves.',
    },
  ],

  related: [
    { id: 'post-type', note: 'Create the post type the status is scoped to, in the same workflow.' },
    { id: 'meta-box', note: 'A review-notes panel to sit alongside the status in the editor.' },
    { id: 'post-meta', note: 'Register the reviewer or due-date fields the workflow needs, visible to REST.' },
    { id: 'wp-query', note: 'Query posts in the new status, including the post_status argument on the front end.' },
    { id: 'list-table', note: 'A custom admin table when the default posts list cannot show the workflow well enough.' },
    { id: 'wc-order-status', note: 'The WooCommerce equivalent, with the wc- prefix and the order bulk actions wired in.' },
  ],
};
