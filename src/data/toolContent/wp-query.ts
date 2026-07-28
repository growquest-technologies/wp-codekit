import type { ToolContent } from '../toolContentTypes';

export const wpQueryContent: ToolContent = {
  aboutTitle: 'WP_Query Generator Online',
  aboutLead:
    'Build a `WP_Query` argument array from a form and get the query, the loop and the `wp_reset_postdata()` call back as one block of PHP. This wp_query generator covers post types and statuses, ordering, taxonomy and meta clauses, date bounds, author and ID filters, and the cache flags that decide how expensive the query actually is.',
  aboutSupport:
    'A Summary tab restates the query in plain English, lists every argument it will emit, and scores the result on a cost meter from Light to Very heavy so you can see a second JOIN or an unbounded `posts_per_page` land before you ship it. Free, no account, and nothing you type leaves the browser.',
  spec: {
    hook: 'new WP_Query( $args )',
    outputs: 'A query plus its loop, a `pre_get_posts` callback, or a shortcode with output buffering',
    requires: 'WordPress 4.1 or newer for nested tax and meta clause groups, PHP 7.4+',
  },

  whyTitle: 'Why this WP_Query builder beats copying an args array off a forum post',
  whyIntro:
    'The arguments are easy. What costs time is everything the array does not say out loud: that `posts_per_page => -1` will load the whole table, that `paged` and `no_found_rows` cannot both be on, that a `>` comparison against a `CHAR` cast makes MySQL decide "9" is larger than "10". This builder writes the array and audits it against those exact failures.',
  features: [
    {
      title: 'A cost meter, not a vibe',
      body: 'Every clause, an unbounded page size, `orderby => rand` and a search term each add to a score that resolves to Light, Moderate, Heavy or Very heavy, with a one-line note telling you whether to cache it or reach for Query Monitor.',
    },
    {
      title: 'The pagination contradiction is an error',
      body: 'Turning `paged` on while `no_found_rows` is set is flagged as an error, not a warning, with a one-click fix — pagination needs the found-rows count, and a query missing it silently renders a single page.',
    },
    {
      title: 'It offers no_found_rows when you should have it',
      body: 'A query with no pagination and no offset gets a tip to set `no_found_rows`, which drops the extra `SQL_CALC_FOUND_ROWS` pass MySQL otherwise runs on every request. One click applies it.',
    },
    {
      title: 'Meta casts checked against the comparison',
      body: 'A clause comparing with `>`, `>=`, `<`, `<=`, `BETWEEN` or `NOT BETWEEN` while cast to `CHAR` is called out by clause number, because text ordering puts "9" above "10". Ordering by `meta_value` instead of `meta_value_num` gets the same treatment.',
    },
    {
      title: 'Three output shapes from one form',
      body: 'The same arguments render as a secondary query with its loop, a `pre_get_posts` callback that adjusts the main query instead of running a second one, or a registered shortcode. Set `fields => ids` and the loop changes to a plain `foreach` over `$query->posts` — no post objects hydrated.',
    },
    {
      title: 'Plain English before PHP',
      body: 'The Summary tab writes the query as a sentence — how many of which post type, filtered by which taxonomy and meta, ordered how, paginated or not — so you can check the intent without reading the array.',
    },
  ],

  howTitle: 'How does the WP_Query generator work?',
  howIntro:
    'The form runs top to bottom in the order the query is assembled: what to fetch, how to filter it, then the advanced arguments most queries never need.',
  steps: [
    {
      title: 'Choose what to fetch',
      body: 'Pick built-in post types or add your own slug, choose the statuses, set `posts_per_page`, decide whether the query paginates, and set `orderby` and `order`. Ordering by a meta value reveals the meta key field.',
    },
    {
      title: 'Add taxonomy and meta clauses',
      body: 'Each taxonomy clause takes a taxonomy, a field (`slug`, `term_id`, `name` or `term_taxonomy_id`), an operator and a comma-separated term list. Each meta clause takes a key, a comparison, a value and a cast. Set the relation to `AND` or `OR` once both lists have more than one entry.',
    },
    {
      title: 'Open the advanced sections if you need them',
      body: 'Authors, dates, search, `post__in` and `post__not_in` live under one collapsible section; `fields`, `no_found_rows`, the meta and term cache flags and `suppress_filters` live under the other.',
    },
    {
      title: 'Clear the Checks tab, then export',
      body: 'Apply the one-click fixes, choose the loop, `pre_get_posts` or shortcode output, then copy the snippet or download the `.php` file.',
    },
  ],
  example: {
    title: 'Worked example — six latest posts, no pagination, no count query',
    intro:
      'A sidebar list. Because it never paginates, `no_found_rows` is on, which removes the row-counting pass MySQL would otherwise run alongside the main query.',
    code: `$args = array(
\t'post_type'      => 'post',
\t'post_status'    => 'publish',
\t'posts_per_page' => 6,
\t'orderby'        => 'date',
\t'order'          => 'DESC',
\t'no_found_rows'  => true,
);

$query = new WP_Query( $args );

if ( $query->have_posts() ) {
\techo '<ul class="mytheme-list">';
\twhile ( $query->have_posts() ) {
\t\t$query->the_post();
\t\tprintf(
\t\t\t'<li><a href="%s">%s</a></li>',
\t\t\tesc_url( get_permalink() ),
\t\t\tesc_html( get_the_title() )
\t\t);
\t}
\techo '</ul>';
\twp_reset_postdata();
} else {
\techo '<p>' . esc_html__( 'Nothing found.', 'textdomain' ) . '</p>';
}`,
    note:
      '`wp_reset_postdata()` is emitted for you. Without it the global `$post` is left pointing at the last row of this query, and every template tag after the loop — including the ones in your footer — reports the wrong post.',
  },
  refLinks: [
    {
      href: 'https://developer.wordpress.org/reference/classes/wp_query/',
      title: 'WP_Query — WordPress developer reference',
      description: 'The class itself: properties, methods and the conditional helpers available on a query object.',
    },
    {
      href: 'https://developer.wordpress.org/reference/classes/wp_query/__construct/',
      title: 'WP_Query::__construct() — every accepted argument',
      description: 'The canonical list of query variables, their types and their defaults.',
    },
    {
      href: 'https://developer.wordpress.org/reference/hooks/pre_get_posts/',
      title: 'pre_get_posts — action reference',
      description: 'How to change the main query on an archive instead of running a second one beside it.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/wp_reset_postdata/',
      title: 'wp_reset_postdata() — WordPress developer reference',
      description: 'Why a secondary loop has to restore the global post before the template continues.',
    },
    {
      href: 'https://developer.wordpress.org/themes/basics/the-loop/',
      title: 'The Loop — Theme Handbook',
      description: 'The have_posts() and the_post() pattern the generated code follows.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/get_posts/',
      title: 'get_posts() — WordPress developer reference',
      description: 'The thin wrapper around WP_Query, and the defaults it quietly changes.',
    },
  ],

  faqTitle: 'WP_Query — frequently asked questions',
  faqIntro: 'The questions that come up every time someone writes a custom loop.',
  faqs: [
    {
      question: 'What is the difference between WP_Query, get_posts() and query_posts()?',
      answer:
        '`WP_Query` is the class; you instantiate it, loop it, then call `wp_reset_postdata()`. `get_posts()` wraps it and returns a plain array of post objects, but changes some defaults — notably it sets `suppress_filters` to true and `no_found_rows` to true, so plugin filters and pagination counts are skipped. `query_posts()` replaces the main query globally and should never be used; it breaks pagination and conditional tags on the page it runs in. Use `pre_get_posts` when you mean to change the main query.',
    },
    {
      question: 'Why should I use pre_get_posts instead of a second WP_Query on an archive page?',
      answer:
        'On an archive, WordPress has already run the main query before your template loads. Adding a second `WP_Query` means the database does the work twice and the page still paginates against the query you ignored, so page 2 shows the wrong posts. Hooking `pre_get_posts` and calling `$query->set()` modifies the query WordPress was going to run anyway. Always guard the callback with `if ( is_admin() || ! $query->is_main_query() ) { return; }` or you will change every query on the site, including the admin post list.',
    },
    {
      question: 'Is posts_per_page => -1 bad?',
      answer:
        'It is unbounded, which is the problem. `-1` removes the LIMIT clause, so the query returns every matching row and PHP hydrates a post object for each one. That is fine against fifty posts and fatal against fifty thousand, and the failure only appears once real content exists. If you genuinely need everything, set `fields => ids` so no post objects are built, and cache the result.',
    },
    {
      question: 'How do I paginate a custom WP_Query?',
      answer:
        "Pass `'paged' => get_query_var( 'paged' ) ? absint( get_query_var( 'paged' ) ) : 1` in the arguments, then render links with `paginate_links()` using `$query->max_num_pages` as the total. `no_found_rows` must stay off, because `max_num_pages` is derived from the found-rows count that flag removes. On a static front page the query var is `page` rather than `paged`.",
    },
    {
      question: 'What does no_found_rows actually do?',
      answer:
        'It tells WordPress to skip counting how many rows matched in total. Normally the query runs with `SQL_CALC_FOUND_ROWS` and then issues a `SELECT FOUND_ROWS()` to populate `$query->found_posts` and `max_num_pages`. If nothing on the page shows a total or a pager, that work is wasted, and on a large table the counting pass can cost more than fetching the rows.',
    },
    {
      question: 'Do I need wp_reset_postdata() after every WP_Query?',
      answer:
        'After any loop that called `$query->the_post()`, yes. `the_post()` overwrites the global `$post`, so template tags such as `get_the_title()` or `comments_template()` used later in the page report data from your secondary loop instead of the real one. If you never call `the_post()` — for example when you iterate `$query->posts` with `fields => ids` — there is nothing to reset.',
    },
  ],

  related: [
    { id: 'tax-query', note: 'Build the taxonomy clauses on their own, with the field and operator checked against your terms.' },
    { id: 'meta-query', note: 'Work out the compare and cast for a custom field before dropping the clause into these args.' },
    { id: 'date-query', note: 'Date ranges, rolling windows and calendar parts, with the inclusive boundary spelled out.' },
    { id: 'term-query', note: 'Query the terms themselves when you need a filter list rather than the posts.' },
    { id: 'post-type', note: 'Register the post type this query fetches, with the right rewrite and archive settings.' },
    { id: 'post-meta', note: 'Register the meta key the meta clauses filter on so it has a type and REST exposure.' },
  ],
};
