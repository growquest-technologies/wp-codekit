import type { ToolContent } from '../toolContentTypes';

export const postTypeContent: ToolContent = {
  aboutTitle: 'Post Type Generator Online',
  aboutLead:
    'Describe the thing you are modelling — a Book, a Case Study, an Event — and this WordPress custom post type generator writes the whole `register_post_type()` call for you: all thirty-four labels derived from your singular and plural, the `supports` array, the taxonomies it is attached to, rewrite rules, REST arguments and capability mapping. Copy it as a bare snippet, a `functions.php` block, or a self-contained plugin file.',
  aboutSupport:
    'A Permalinks tab shows the single, archive and feed URLs your rewrite settings will actually produce, so you can see what a custom slug or `with_front` does before you flush anything. Free, no account, and nothing you type leaves the browser.',
  spec: {
    hook: 'register_post_type()',
    outputs: 'A snippet, a `functions.php` block, or a standalone plugin file',
    requires: 'WordPress 4.7+ for the REST arguments (5.9+ for `rest_namespace`), PHP 7.4+',
  },

  whyTitle: 'Why the register_post_type generator beats a copied CPT snippet',
  whyIntro:
    'The snippet you find on a blog registers four labels and hopes for the best. Then an editor asks why the admin menu says "Posts", why the archive 404s, why the block editor will not load on the new type, or why two plugins fought over the key `event`. This generator writes the labels in full, checks the key against the rules WordPress actually enforces, and puts the rewrite flush in the one place it belongs.',
  features: [
    {
      title: 'Every label, not just four',
      body: 'Thirty-four labels are derived from your singular and plural — `all_items`, `not_found_in_trash`, `item_scheduled`, `filter_by_date`, the featured-image strings. Ten essentials are written out by default; flip one toggle to emit the complete set, or override any single label by hand.',
    },
    {
      title: 'The 20-character key limit, enforced',
      body: 'The `post_type` column is 20 characters wide. A longer key is flagged as an error with a one-click truncate, and anything outside lowercase letters, numbers, dashes and underscores gets a Sanitise key fix.',
    },
    {
      title: 'Reserved keys caught before you ship',
      body: '`post`, `page`, `attachment`, `revision`, `nav_menu_item`, `wp_block`, `wp_template`, `author`, `order`, `theme` and the rest of the reserved list are rejected outright, and an unprefixed key gets a suggested project prefix you can apply in one click.',
    },
    {
      title: 'Block editor checks that matter',
      body: 'Ask for `editor` support with `show_in_rest` off and the generator warns that the type will silently fall back to the classic editor, with a Turn on REST fix. Mark the type hierarchical without `page-attributes` and it points out that the Parent selector will never appear.',
    },
    {
      title: 'A permalink preview before you flush',
      body: 'The Permalinks tab renders the single-post URL, the archive URL and the feed URL from your rewrite slug, `with_front`, `has_archive` and archive slug — the fastest way to spot a rewrite that will collide with a page of the same name.',
    },
    {
      title: 'Rewrite flushing in the right place',
      body: 'Plugin output adds a `register_activation_hook()` that registers the type and then calls `flush_rewrite_rules()` once. The `functions.php` output uses `after_switch_theme` instead. The bare snippet flushes nothing, because calling it on every `init` is the classic way to make a site slow.',
    },
  ],

  howTitle: 'How does the custom post type generator work?',
  howIntro:
    'Four steps. Name the thing, say how it behaves, tune the details you care about, then export.',
  steps: [
    {
      title: 'Name it',
      body: 'Type the singular. The plural and the post type key are derived as you go — the key is slugified and capped at 20 characters — and you can override either. Add a description if the type needs one in the REST schema.',
    },
    {
      title: 'Set the behaviour and the content',
      body: 'Toggle public, hierarchical, `show_in_rest` and `has_archive`, then pick the `supports` features and the taxonomies to attach. Built-in categories and tags are one click; custom taxonomy slugs can be typed in.',
    },
    {
      title: 'Open Labels and Advanced if you need them',
      body: 'Override any generated label, then set the admin menu position and Dashicon, REST base and namespace, permalink slug and `with_front`, `query_var`, and the capability type — `post`, `page` or a custom singular/plural pair with `map_meta_cap`.',
    },
    {
      title: 'Clear the checks, then export',
      body: 'Work through the Checks tab — most items have a one-click fix — choose Snippet, `functions.php` or Plugin file, then copy or download the `.php`.',
    },
  ],
  example: {
    title: 'Worked example — a public Books post type with archives and REST',
    intro:
      'Key `book`, singular Book, plural Books, public with an archive, block editor on, attached to the built-in category taxonomy. This is the Snippet output exactly as it copies.',
    code: `/**
 * Register the Books post type.
 */
function mytheme_register_book_post_type() {
\t$labels = array(
\t\t'name'          => __( 'Books', 'textdomain' ),
\t\t'singular_name' => __( 'Book', 'textdomain' ),
\t\t'menu_name'     => __( 'Books', 'textdomain' ),
\t\t'add_new_item'  => __( 'Add New Book', 'textdomain' ),
\t\t'new_item'      => __( 'New Book', 'textdomain' ),
\t\t'edit_item'     => __( 'Edit Book', 'textdomain' ),
\t\t'view_item'     => __( 'View Book', 'textdomain' ),
\t\t'all_items'     => __( 'All Books', 'textdomain' ),
\t\t'search_items'  => __( 'Search Books', 'textdomain' ),
\t\t'not_found'     => __( 'No books found.', 'textdomain' ),
\t);

\t$args = array(
\t\t'labels'       => $labels,
\t\t'public'       => true,
\t\t'show_in_rest' => true,
\t\t'supports'     => array( 'title', 'editor', 'thumbnail', 'excerpt' ),
\t\t'taxonomies'   => array( 'category' ),
\t\t'has_archive'  => true,
\t);

\tregister_post_type( 'book', $args );
}
add_action( 'init', 'mytheme_register_book_post_type' );`,
    note:
      'Arguments left at their WordPress defaults are omitted, which is why there is no `hierarchical => false` or `query_var => true` line here. Switch to Plugin file and the same code arrives with a header block and an activation hook that flushes rewrite rules once.',
  },
  refLinks: [
    {
      href: 'https://developer.wordpress.org/reference/functions/register_post_type/',
      title: 'register_post_type() — WordPress developer reference',
      description: 'Every argument this generator writes, plus the reserved post type names and the version each argument arrived in.',
    },
    {
      href: 'https://developer.wordpress.org/plugins/post-types/registering-custom-post-types/',
      title: 'Registering custom post types — Plugin Handbook',
      description: 'The official walkthrough, including why registration belongs on the init action.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/flush_rewrite_rules/',
      title: 'flush_rewrite_rules() — WordPress developer reference',
      description: 'Why this is expensive and must never run on every page load.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/register_activation_hook/',
      title: 'register_activation_hook() — WordPress developer reference',
      description: 'The hook the plugin output uses to flush rewrite rules exactly once.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/get_post_type_archive_link/',
      title: 'get_post_type_archive_link() — WordPress developer reference',
      description: 'How the archive URL previewed in the Permalinks tab is resolved at runtime.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/register_taxonomy/',
      title: 'register_taxonomy() — WordPress developer reference',
      description: 'The other half of the pairing when you attach a custom taxonomy to your new type.',
    },
  ],

  faqTitle: 'Custom post types — frequently asked questions',
  faqIntro: 'The questions that come up every time a new post type goes into a real site.',
  faqs: [
    {
      question: 'Why does my custom post type show a 404 on single posts?',
      answer:
        'Almost always stale rewrite rules. WordPress caches the rule set in the database, so a newly registered post type has no matching rule until the rules are rebuilt. Visit Settings > Permalinks once, or let the generated activation hook call `flush_rewrite_rules()` for you. Never call it on `init` — it rewrites an option on every request.',
    },
    {
      question: 'How long can a custom post type name be?',
      answer:
        'Twenty characters. The `post_type` column in the posts table is 20 characters wide, so a longer key registers without complaint but breaks the moment WordPress tries to save a post with it. The generator raises this as an error and offers a one-click truncate.',
    },
    {
      question: 'Should I register a post type in my theme or in a plugin?',
      answer:
        'In a plugin, in almost every case. Content belongs to the site, not to the design: put `register_post_type()` in a theme and switching themes makes every post of that type vanish from the admin. Use the Plugin file output, or a site-specific functionality plugin. The `functions.php` output exists for the cases where the type genuinely is part of the theme.',
    },
    {
      question: 'Why does my custom post type open the classic editor instead of blocks?',
      answer:
        'The block editor is a REST client. Without `show_in_rest => true` there is no REST route for the type, so WordPress falls back to the classic editor. Turn REST on and make sure `editor` is in the `supports` array; the generator warns when you have one without the other.',
    },
    {
      question: 'How do I add categories and tags to a custom post type?',
      answer:
        "Pass them in the `taxonomies` argument — the generator's Taxonomies chips write `'taxonomies' => array( 'category', 'post_tag' )` for you. That registers the relationship at the same time as the post type. For a taxonomy declared elsewhere, `register_taxonomy_for_object_type()` does the same job after the fact.",
    },
    {
      question: 'Can I change the post type key after posts exist?',
      answer:
        'Not safely. The key is stored in the `post_type` column of every row, so renaming it in code orphans all existing content — the posts stay in the database but nothing queries them. If you must rename, run a database update on `post_type` as part of the change, and flush rewrite rules afterwards.',
    },
  ],

  related: [
    { id: 'taxonomy', note: 'Register the taxonomy you just listed in the taxonomies argument, with labels and admin column.' },
    { id: 'post-meta', note: 'Give the new type typed, REST-visible custom fields the block editor can actually read.' },
    { id: 'meta-box', note: 'Build the editor panel that fills those fields, nonce and sanitised save handler included.' },
    { id: 'post-status', note: 'Add a review or archived status scoped to this post type.' },
    { id: 'wp-query', note: 'Query the new type on the front end, with the loop and pagination written out.' },
    { id: 'list-table', note: 'Replace the default admin list with sortable columns and bulk actions for the type.' },
  ],
};
