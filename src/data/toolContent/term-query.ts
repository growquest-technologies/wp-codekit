import type { ToolContent } from '../toolContentTypes';

export const termQueryContent: ToolContent = {
  aboutTitle: 'WP_Term_Query Generator Online',
  aboutLead:
    'Build a `WP_Term_Query` argument array — taxonomy, `hide_empty`, `parent` or `child_of`, include and exclude lists, term meta clauses, ordering, `number` and `fields` — and get back the class with a linked term list, a ready-made filter dropdown, or just the args for `get_terms()`.',
  aboutSupport:
    'A Reference tab restates the query in plain English, explains what the current hierarchy setting returns, and documents every argument with its type. Free, no account, and the whole thing runs client-side.',
  spec: {
    hook: 'new WP_Term_Query( $args )',
    outputs: 'The class with a term list, a `get_terms()` filter dropdown, or a bare args array',
    requires: 'WordPress 4.6 or newer, PHP 7.4+',
  },

  whyTitle: 'Why the WP_Term_Query builder beats a bare get_terms() call',
  whyIntro:
    'Term queries fail in ways that look like content problems. A category menu loses its top level because `hide_empty` counted only direct posts. `include` silently overrides the `parent` filter you also set. `child_of` returns nothing because the taxonomy is flat. None of these produce an error — they produce a list that is quietly wrong, which is exactly what this generator checks for.',
  features: [
    {
      title: 'The disappearing-parent bug, caught and fixed',
      body: '`hide_empty` on a hierarchical taxonomy drops parent terms whose posts all live in children — the reason a category menu loses its top level. The generator warns on that exact combination and offers a one-click `pad_counts`, which rolls descendant counts into the parent.',
    },
    {
      title: 'parent and child_of kept apart',
      body: 'They do different jobs: `parent` returns direct children only, `child_of` returns the whole subtree at every depth. Setting both is flagged with a "Keep child_of" fix, and using `child_of` on a flat taxonomy is an error because it can only ever return nothing.',
    },
    {
      title: 'include and exclude take IDs, and it checks',
      body: 'A non-numeric value in either list is an error naming the offending entry and pointing you at the `slug` argument. Setting `include` alongside `exclude` or `parent` warns that `include` wins and the other filter does nothing at all.',
    },
    {
      title: 'fields => count validated against the rest',
      body: 'Asking for a count while `number` is set is a warning, because the limit caps the rows counted and makes the number wrong — with a one-click "Clear number". Ordering a count is flagged as pointless work.',
    },
    {
      title: 'Ordering checked for the arguments it needs',
      body: '`orderby => include` without an include list is an error, and so is `meta_value_num` with no term meta clause to take the key from. Ordering by `count` ascending gets a nudge, since putting the emptiest terms first is rarely the intent, and `term_order` is flagged as meaningful mostly for WooCommerce attributes.',
    },
    {
      title: 'Term meta cache kept honest',
      body: 'Filtering on term meta while `update_term_meta_cache` is off is a warning, because every `get_term_meta()` call in your loop then goes back to the database one term at a time. One click restores the cache.',
    },
  ],

  howTitle: 'How does the term query generator work?',
  howIntro:
    'Say which terms, say how they should come back, and add term meta clauses only if you actually filter on them.',
  steps: [
    {
      title: 'Choose which terms',
      body: 'Set the taxonomy, decide whether to hide empty terms, and pick a hierarchy filter — `parent` for direct children only, or `child_of` for the whole subtree. Add a name search or an exact slug lookup.',
    },
    {
      title: 'Include or exclude specific terms',
      body: 'Both take comma-separated term IDs. Switch exclusion to `exclude_tree` when you want a term and everything under it gone, not just the term itself.',
    },
    {
      title: 'Set order and shape',
      body: 'Choose `orderby` and direction, cap the list with `number`, and pick `fields` — full objects, `ids`, `names`, `slugs`, `id=>name` or a single `count`. Toggle `pad_counts` and the term meta cache.',
    },
    {
      title: 'Add term meta if needed, then export',
      body: 'Each clause takes a key, a comparison and a value. Clear the Checks tab, then take the class with its linked list, the filter dropdown, or the args array on its own.',
    },
  ],
  example: {
    title: 'Worked example — a category filter dropdown, ten busiest first',
    intro:
      'The ten categories with the most posts, excluding Uncategorized (term 1), with `pad_counts` on so a parent category reflects everything filed beneath it. This is the dropdown output mode, ready to drop into a filter form.',
    code: `$terms = get_terms( array(
\t'taxonomy'   => 'category',
\t'hide_empty' => true,
\t'exclude'    => array( 1 ),
\t'orderby'    => 'count',
\t'order'      => 'DESC',
\t'number'     => 10,
\t'pad_counts' => true,
) );

if ( ! is_wp_error( $terms ) && $terms ) {
\techo '<select name="category">';
\techo '<option value="">' . esc_html__( 'All', 'mytheme' ) . '</option>';

\tforeach ( $terms as $term ) {
\t\tprintf(
\t\t\t'<option value="%1$s">%2$s (%3$s)</option>',
\t\t\tesc_attr( $term->slug ),
\t\t\tesc_html( $term->name ),
\t\t\tesc_html( number_format_i18n( $term->count ) )
\t\t);
\t}

\techo '</select>';
}`,
    note:
      'The `is_wp_error()` guard matters: `get_terms()` returns a `WP_Error` when the taxonomy does not exist, and iterating that object without checking is a fatal error rather than an empty list.',
  },
  refLinks: [
    {
      href: 'https://developer.wordpress.org/reference/classes/wp_term_query/',
      title: 'WP_Term_Query — WordPress developer reference',
      description: 'The class introduced in WordPress 4.6 that all term fetching now runs through.',
    },
    {
      href: 'https://developer.wordpress.org/reference/classes/wp_term_query/__construct/',
      title: 'WP_Term_Query::__construct() — every accepted argument',
      description: 'taxonomy, hide_empty, parent, child_of, include, exclude, fields, pad_counts and the rest.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/get_terms/',
      title: 'get_terms() — WordPress developer reference',
      description: 'The wrapper the dropdown output uses, and the WP_Error it can return.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/register_taxonomy/',
      title: 'register_taxonomy() — WordPress developer reference',
      description: 'Where hierarchical is set, which decides whether child_of and pad_counts do anything.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/get_term_meta/',
      title: 'get_term_meta() — WordPress developer reference',
      description: 'Reading the term meta these clauses filter on, and why the cache flag matters in a loop.',
    },
    {
      href: 'https://developer.wordpress.org/reference/hooks/pre_get_terms/',
      title: 'pre_get_terms — action reference',
      description: 'Adjust a term query globally before it runs, rather than at each call site.',
    },
  ],

  faqTitle: 'WP_Term_Query — frequently asked questions',
  faqIntro: 'The questions that come up when a term list is missing entries or ordered strangely.',
  faqs: [
    {
      question: 'What is the difference between get_terms() and WP_Term_Query?',
      answer:
        '`get_terms()` is a wrapper: since WordPress 4.6 it instantiates `WP_Term_Query` and returns the result. The practical differences are the return shape and the error path — `get_terms()` can return a `WP_Error` for an unknown taxonomy, so it needs an `is_wp_error()` guard, while the class returns an empty result. Since WordPress 4.5, `get_terms()` also takes the taxonomy inside the single arguments array rather than as a first parameter.',
    },
    {
      question: 'Why are my parent categories missing from get_terms()?',
      answer:
        "`hide_empty` defaults to true and compares against each term's own count, which only counts posts assigned directly to that term. A parent category whose posts all sit in subcategories has a count of zero and is dropped. Add `'pad_counts' => true`, which rolls descendant counts up into each parent so the hierarchy survives.",
    },
    {
      question: 'What is the difference between parent and child_of?',
      answer:
        '`parent` matches terms whose immediate parent is the ID you give, so you get one level. `child_of` matches every descendant at any depth. `parent => 0` is the way to fetch top-level terms only. Setting both is contradictory, and `child_of` on a non-hierarchical taxonomy returns nothing at all because there is no tree to walk.',
    },
    {
      question: 'Can I pass slugs to the include argument?',
      answer:
        'No — `include` and `exclude` accept term IDs only, and a slug in either list is silently discarded. Use the `slug` argument for slug matching (it accepts a string or an array), or resolve slugs to IDs with `get_term_by()` first. Note also that setting `include` makes `exclude` and `parent` inert; core applies include last and it wins.',
    },
    {
      question: 'How do I order terms by a custom term meta value?',
      answer:
        "Set `orderby` to `meta_value_num` (or `meta_value` for text) and supply a `meta_key`, which this generator takes from your first term meta clause. As with posts, the ordering JOIN excludes terms that have no value for that key, so terms missing the meta disappear from the list rather than sorting last.",
    },
    {
      question: 'How do I just count the terms in a taxonomy?',
      answer:
        "Set `'fields' => 'count'` and the query returns a single integer instead of a list. Leave `number` unset — a limit caps the rows counted and makes the number wrong — and set `orderby` to `none`, since sorting a count achieves nothing. `wp_count_terms()` is the one-line alternative when you have no other filters.",
    },
  ],

  related: [
    { id: 'tax-query', note: 'Once you have the term IDs or slugs, this builds the clause that filters posts by them.' },
    { id: 'wp-query', note: 'The post-side query that the dropdown output is usually built to filter.' },
    { id: 'meta-query', note: 'The same clause shape against postmeta, with casts checked per comparison.' },
    { id: 'user-query', note: 'The user-side equivalent, sharing the fields and number arguments.' },
    { id: 'taxonomy', note: 'Register the taxonomy, including the hierarchical flag that child_of and pad_counts depend on.' },
    { id: 'term-meta', note: 'Add the term fields these meta clauses filter and order on, plus their edit forms.' },
  ],
};
