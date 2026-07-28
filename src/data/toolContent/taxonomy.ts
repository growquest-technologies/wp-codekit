import type { ToolContent } from '../toolContentTypes';

export const taxonomyContent: ToolContent = {
  aboutTitle: 'Taxonomy Generator Online',
  aboutLead:
    'A WordPress custom taxonomy generator that writes the complete `register_taxonomy()` call — hierarchical like categories or flat like tags, attached to any post types you name, with the full label set, the admin column, REST exposure, term capabilities and a default term. Export it as a snippet, a `functions.php` block, or a plugin file.',
  aboutSupport:
    'The Permalinks tab previews the term archive URL your rewrite settings will produce, including nested paths when hierarchical URLs are on. Everything runs in the browser: no account, no upload, nothing stored on a server.',
  spec: {
    hook: 'register_taxonomy()',
    outputs: 'A snippet, a `functions.php` block, or a standalone plugin file',
    requires: 'WordPress 4.7+ for the REST arguments (5.5+ for `default_term`, 5.9+ for `rest_namespace`), PHP 7.4+',
  },

  whyTitle: 'Why the custom taxonomy generator beats a hand-written register_taxonomy() call',
  whyIntro:
    'Taxonomy keys share a namespace with WordPress query variables. Register one called `type`, `name`, `status` or `order` and the front end starts 404ing or falling through to the home page, with nothing in the logs to explain it. This generator checks your key against the full reserved-terms list, writes the label set with the right translation contexts, and tells you when a setting will quietly do nothing.',
  features: [
    {
      title: 'The reserved query-variable list, checked',
      body: 'All eighty-five reserved terms — `name`, `type`, `title`, `status`, `order`, `terms`, `year`, `page`, `s`, `p` and the rest — are rejected as errors, because a taxonomy key that collides with a query var breaks term archives site-wide. Rewrite slugs and custom `query_var` values are checked against the same list.',
    },
    {
      title: 'The 32-character key limit',
      body: 'The `taxonomy` column is 32 characters wide, not 20 like post types. Anything longer is an error with a one-click truncate, and an unprefixed key gets a suggested project prefix.',
    },
    {
      title: 'Labels with the right gettext context',
      body: '`name` and `singular_name` are emitted with `_x()` and the `taxonomy general name` / `taxonomy singular name` contexts that core itself uses, so translators see the same strings they already know. The hierarchical set (`parent_item`, `filter_by_item`) and the flat set (`popular_items`, `separate_items_with_commas`) swap automatically.',
    },
    {
      title: 'Warnings for settings that will do nothing',
      body: 'Hierarchical URLs on a flat taxonomy, a default term on a tag-style taxonomy, a generic count callback on a hierarchical one, and a taxonomy attached to no post type at all — each is flagged with the reason it will not behave the way the name suggests.',
    },
    {
      title: 'Registration order you can control',
      body: 'The `init` priority is exposed and defaults to 0, so the taxonomy exists before a post type registers its own rewrite rules. Register at the default priority 10 with post types attached and the generator reminds you why 0 is usually safer.',
    },
    {
      title: 'The admin column and the block editor panel',
      body: '`show_admin_column` makes terms visible and filterable in the posts list, and `show_in_rest` is what puts the term panel in the block editor sidebar. Leave either off and the Checks tab says exactly what you lose.',
    },
  ],

  howTitle: 'How does the taxonomy generator work?',
  howIntro:
    'Name it, choose its shape, attach it to something, then export. The code panel updates on every keystroke.',
  steps: [
    {
      title: 'Name the taxonomy',
      body: 'Enter the singular — Genre, Ingredient, Region. The plural and the taxonomy key follow automatically, slugified and capped at 32 characters, and both can be overridden.',
    },
    {
      title: 'Choose hierarchical or flat',
      body: 'Hierarchical behaves like categories, with a parent selector and checkbox meta box. Flat behaves like tags, with a comma-separated input. The label set changes with the choice.',
    },
    {
      title: 'Attach it to post types',
      body: 'Pick the built-in `post`, `page` and `attachment`, or type any custom post type slug. A taxonomy with nothing attached registers fine but never appears in the admin, which the Checks tab flags.',
    },
    {
      title: 'Tune, check, export',
      body: 'Open Advanced for REST base and namespace, the rewrite slug, term capabilities and a default term, clear the checks, then copy the snippet or download the file.',
    },
  ],
  example: {
    title: 'Worked example — a hierarchical Genres taxonomy on posts',
    intro:
      'Key `genre`, hierarchical, public, with the admin column and the block editor panel on. This is the Snippet output verbatim.',
    code: `/**
 * Register the Genres taxonomy.
 */
function mytheme_register_genre_taxonomy() {
\t$labels = array(
\t\t'name'              => _x( 'Genres', 'taxonomy general name', 'textdomain' ),
\t\t'singular_name'     => _x( 'Genre', 'taxonomy singular name', 'textdomain' ),
\t\t'menu_name'         => __( 'Genres', 'textdomain' ),
\t\t'all_items'         => __( 'All Genres', 'textdomain' ),
\t\t'edit_item'         => __( 'Edit Genre', 'textdomain' ),
\t\t'add_new_item'      => __( 'Add New Genre', 'textdomain' ),
\t\t'new_item_name'     => __( 'New Genre Name', 'textdomain' ),
\t\t'search_items'      => __( 'Search Genres', 'textdomain' ),
\t\t'not_found'         => __( 'No genres found.', 'textdomain' ),
\t\t'parent_item'       => __( 'Parent Genre', 'textdomain' ),
\t\t'parent_item_colon' => __( 'Parent Genre:', 'textdomain' ),
\t);

\t$args = array(
\t\t'labels'            => $labels,
\t\t'hierarchical'      => true,
\t\t'public'            => true,
\t\t'show_admin_column' => true,
\t\t'show_in_rest'      => true,
\t);

\tregister_taxonomy( 'genre', 'post', $args );
}
add_action( 'init', 'mytheme_register_genre_taxonomy', 0 );`,
    note:
      'Note the priority 0 on the `init` hook. Registering the taxonomy before post types means a post type that includes this slug in its rewrite rules can see it. Attach more than one post type and the second argument becomes an array instead of a string.',
  },
  refLinks: [
    {
      href: 'https://developer.wordpress.org/reference/functions/register_taxonomy/',
      title: 'register_taxonomy() — WordPress developer reference',
      description: 'Every argument, the full label list, and the reserved terms that must not be used as a key.',
    },
    {
      href: 'https://developer.wordpress.org/plugins/taxonomies/working-with-custom-taxonomies/',
      title: 'Working with custom taxonomies — Plugin Handbook',
      description: 'The official guide to hierarchical versus flat taxonomies and when each fits.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/register_taxonomy_for_object_type/',
      title: 'register_taxonomy_for_object_type() — WordPress developer reference',
      description: 'Attach an existing taxonomy to another post type without re-registering it.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/flush_rewrite_rules/',
      title: 'flush_rewrite_rules() — WordPress developer reference',
      description: 'Why term archives 404 until the rules are rebuilt, and where to rebuild them.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/wp_set_post_terms/',
      title: 'wp_set_post_terms() — WordPress developer reference',
      description: 'Assigning terms programmatically once the taxonomy is registered.',
    },
    {
      href: 'https://developer.wordpress.org/reference/classes/wp_term_query/',
      title: 'WP_Term_Query — WordPress developer reference',
      description: 'The class you will use to list the terms your new taxonomy holds.',
    },
  ],

  faqTitle: 'Custom taxonomies — frequently asked questions',
  faqIntro: 'What people actually ask once a custom taxonomy is live on a site.',
  faqs: [
    {
      question: 'What is the difference between a hierarchical and a non-hierarchical taxonomy?',
      answer:
        'Hierarchical taxonomies work like categories: terms can have parents, the editor shows a checkbox list, and URLs can nest. Non-hierarchical taxonomies work like tags: a flat list, a comma-separated input, no parents. Set `hierarchical => true` for the first and `false` for the second; the label set differs too, which is why the generator swaps `parent_item` for `separate_items_with_commas` when you flip the toggle.',
    },
    {
      question: 'Why do my custom taxonomy archive pages return a 404?',
      answer:
        'Two usual causes. Rewrite rules are stale — re-save Settings > Permalinks or flush once on activation. Or the taxonomy key collides with a reserved WordPress query variable such as `type`, `name`, `status` or `order`, in which case the request is parsed as something else entirely. The generator checks the key and the rewrite slug against the full reserved list.',
    },
    {
      question: 'How do I show a custom taxonomy in the block editor sidebar?',
      answer:
        'Set `show_in_rest => true`. The block editor reads taxonomies over the REST API, so a taxonomy without REST exposure registers correctly, appears in the classic editor, and is simply absent from the block editor panel. `show_ui` alone is not enough.',
    },
    {
      question: 'Can one taxonomy be shared by several post types?',
      answer:
        'Yes. Pass an array as the second argument to `register_taxonomy()`, or call `register_taxonomy_for_object_type()` later for a type registered elsewhere. Terms are shared across every attached type, so a term archive lists all of them unless you filter the query.',
    },
    {
      question: 'How do I set a default term for a custom taxonomy?',
      answer:
        'Use the `default_term` argument, added in WordPress 5.5. Give it a name, a slug and optionally a description, and WordPress assigns that term to any post saved with no term selected — the same way Uncategorised works for core categories. It suits category-style taxonomies; on a tag-style one it usually just clutters things.',
    },
    {
      question: 'Should the taxonomy or the post type be registered first?',
      answer:
        'Register the taxonomy first, at `init` priority 0, and the post type at the default priority 10. That order matters when the post type rewrite rules reference the taxonomy slug. The generator defaults the taxonomy hook to priority 0 for exactly this reason.',
    },
  ],

  related: [
    { id: 'post-type', note: 'Create the custom post type this taxonomy is attached to, with the taxonomies argument prefilled.' },
    { id: 'term-meta', note: 'Add colour, tagline or layout fields to the terms, on both the add and edit screens.' },
    { id: 'post-meta', note: 'Typed post fields for the data that belongs on the post rather than on the term.' },
    { id: 'meta-box', note: 'An editor panel for fields the taxonomy meta box cannot cover.' },
    { id: 'tax-query', note: 'Build the nested tax_query clauses that filter posts by these terms.' },
    { id: 'term-query', note: 'List the terms themselves, with hide_empty, ordering and meta clauses.' },
  ],
};
