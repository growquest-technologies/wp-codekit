import type { ToolContent } from '../toolContentTypes';

export const taxQueryContent: ToolContent = {
  aboutTitle: 'Tax Query Generator Online',
  aboutLead:
    'Write a `tax_query` where the `field` matches the values you actually have. This tax_query generator builds one clause per taxonomy — taxonomy slug, field, operator, terms and `include_children` — sets the `relation` between them, and wraps the result in a `WP_Query`, a bare args array or a `pre_get_posts` callback.',
  aboutSupport:
    'A Reference tab restates the clause set in plain English, documents every clause key with its type, and shows the nested-group syntax you need when one relation is not enough. Free, client-side only, nothing uploaded.',
  spec: {
    hook: "'tax_query' => array( ... ) — WP_Tax_Query",
    outputs: 'A `WP_Query` with its loop, an args array for `get_posts()`, or a `pre_get_posts` callback',
    requires: 'WordPress 3.1 or newer; 4.1+ for nested clause groups, PHP 7.4+',
  },

  whyTitle: 'Why the tax_query builder beats hand-writing the clause array',
  whyIntro:
    'A `tax_query` fails quietly. Give it a taxonomy that is not registered, or terms that do not match the field you named, and `WP_Tax_Query` drops the clause instead of erroring — so the query returns everything and looks like a caching bug. This builder catches those mismatches while you are still typing them.',
  features: [
    {
      title: 'Field and terms checked against each other',
      body: 'Asking to match on `term_id` or `term_taxonomy_id` while your term list contains a word is an error, named with the offending value and a one-click "Match on slug" fix. The reverse — matching on `slug` when every term you listed is numeric — is a warning with a "Match on term_id" fix.',
    },
    {
      title: 'Empty clauses are errors, not silence',
      body: 'A clause with no taxonomy, or with an operator that needs terms and has none, is flagged as an error with the exact reason: the clause is dropped and the query returns everything.',
    },
    {
      title: 'include_children advice that knows your taxonomy',
      body: 'It recognises hierarchical taxonomies such as `category` and `product_cat`. Turning `include_children` off on one of them warns that posts in child terms will stop matching; leaving it on for a flat taxonomy such as `post_tag` is flagged as harmless noise.',
    },
    {
      title: 'The JOIN count is stated out loud',
      body: 'Every clause is a JOIN against `wp_term_relationships`. Two or more clauses with `AND` gets a note that each condition must match the same post; more than three clauses gets a warning to measure the query before shipping it.',
    },
    {
      title: 'Operators that read the way you meant',
      body: '`AND` with a single term behaves identically to `IN` and is called out as misleading. `EXISTS` and `NOT EXISTS` ignore the terms field entirely, so listing terms alongside them raises a warning. A single `category` clause on `term_id` is pointed at `category__in`, which does the same thing in one line.',
    },
    {
      title: 'Nested groups documented, not guessed',
      body: 'The Reference tab shows the exact shape of a nested `tax_query` — an outer `relation`, a plain clause, then an inner array with its own `relation` — which is the only way to express "A and (B or C)".',
    },
  ],

  howTitle: 'How does the tax query generator work?',
  howIntro:
    'Clauses first, then the query that carries them. The plain-English restatement in the Reference tab updates as you go, so you can read the filter back before you trust it.',
  steps: [
    {
      title: 'Add a clause per taxonomy',
      body: 'Set the taxonomy slug — `category`, `post_tag`, `product_cat` or your own — then choose whether your values are term IDs, slugs, names or term_taxonomy_ids.',
    },
    {
      title: 'Pick the operator and list the terms',
      body: '`IN` matches any of them, `NOT IN` excludes, `AND` requires every one, and `EXISTS` / `NOT EXISTS` only ask whether the post has any term in that taxonomy. Terms are comma separated. Toggle `include_children` per clause.',
    },
    {
      title: 'Set the relation and the query around it',
      body: 'Choose `AND` or `OR` between clauses, then set the post type, `posts_per_page`, ordering, `fields` and the `no_found_rows` and meta-cache flags for the query that wraps them.',
    },
    {
      title: 'Clear the checks, then export',
      body: 'Apply the suggested field swaps, then take the full `WP_Query` with its loop, the args array alone, or the `pre_get_posts` version that filters the archive instead of duplicating it.',
    },
  ],
  example: {
    title: 'Worked example — posts in Guides or Tutorials, excluding anything tagged archived',
    intro:
      'Two clauses joined with `AND`: the post must be in one of two categories and must not carry the archived tag. `include_children` is left at its default of true on the category clause, so posts filed in a subcategory still match.',
    code: `$args = array(
\t'post_type'      => 'post',
\t'posts_per_page' => 12,
\t'tax_query'      => array(
\t\t'relation' => 'AND',
\t\tarray(
\t\t\t'taxonomy' => 'category',
\t\t\t'field'    => 'slug',
\t\t\t'terms'    => array( 'guides', 'tutorials' ),
\t\t),
\t\tarray(
\t\t\t'taxonomy' => 'post_tag',
\t\t\t'field'    => 'slug',
\t\t\t'terms'    => 'archived',
\t\t\t'operator' => 'NOT IN',
\t\t),
\t),
);`,
    note:
      'The `operator` key is only written when it is not the default `IN`, and `include_children` only when you turn it off — so the array stays as short as the intent requires.',
  },
  refLinks: [
    {
      href: 'https://developer.wordpress.org/reference/classes/wp_tax_query/',
      title: 'WP_Tax_Query — WordPress developer reference',
      description: 'The class that parses tax_query and builds the JOIN and WHERE clauses.',
    },
    {
      href: 'https://developer.wordpress.org/reference/classes/wp_tax_query/__construct/',
      title: 'WP_Tax_Query::__construct() — clause keys',
      description: 'taxonomy, field, terms, operator, include_children and relation, with accepted values.',
    },
    {
      href: 'https://developer.wordpress.org/reference/classes/wp_query/__construct/',
      title: 'WP_Query::__construct() — every accepted argument',
      description: 'Where tax_query sits among the rest of the query variables.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/register_taxonomy/',
      title: 'register_taxonomy() — WordPress developer reference',
      description: 'How a taxonomy becomes queryable, and why hierarchical changes include_children behaviour.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/get_terms/',
      title: 'get_terms() — WordPress developer reference',
      description: 'Fetch the term IDs or slugs you are about to filter on.',
    },
    {
      href: 'https://developer.wordpress.org/reference/hooks/pre_get_posts/',
      title: 'pre_get_posts — action reference',
      description: 'The hook the third output mode uses to filter an archive rather than run a second query.',
    },
  ],

  faqTitle: 'tax_query — frequently asked questions',
  faqIntro: 'What people ask on the support forums when a taxonomy filter returns the wrong posts.',
  faqs: [
    {
      question: 'How do I combine AND and OR in the same tax_query?',
      answer:
        'Nest a clause group. Since WordPress 4.1 an entry in a `tax_query` can itself be an array with its own `relation`, so "in Guides AND (tagged php OR tagged js)" is an outer `relation => AND` containing one plain category clause and one inner array with `relation => OR` and two tag clauses. A single flat list only supports one relation for all clauses, which is why mixing them without nesting silently gives the wrong result.',
    },
    {
      question: 'Why is my tax_query returning every post instead of filtering?',
      answer:
        'Almost always a dropped clause. `WP_Tax_Query` discards a clause whose taxonomy is not registered at the time the query runs, or whose `terms` array is empty after sanitising, and the query then runs with no taxonomy condition at all. Check the taxonomy slug spelling, confirm registration happens on `init` before the query, and make sure your terms variable is not an empty array.',
    },
    {
      question: 'Should I use slug or term_id in a tax_query?',
      answer:
        'Whichever matches the values you hold, and set `field` to say so. `term_id` is stable across renames and is what most code has to hand; `slug` is readable and survives an export/import into a site with different IDs. Avoid `name` — display names are not unique across a taxonomy, so a name match can hit a term you did not mean. A mismatch between `field` and your values means the clause matches nothing.',
    },
    {
      question: 'Does a category query include posts in child categories?',
      answer:
        'Yes, by default. `include_children` defaults to true, so filtering on a parent category also returns posts filed only in its children. Set it to `false` when you want the parent term alone. On a flat taxonomy such as `post_tag` the setting does nothing, because there is no hierarchy to walk.',
    },
    {
      question: 'How many tax_query clauses is too many?',
      answer:
        'Each clause adds a JOIN against `wp_term_relationships` and `wp_term_taxonomy`. Two is routine, three is worth timing, and beyond that the query plan degrades quickly on a large site. If you regularly filter on four or more taxonomies at once, consider precomputing the combination into a single term or a lookup table rather than asking MySQL to intersect four sets on every page load.',
    },
    {
      question: 'What is the difference between tax_query and category__in or tag__in?',
      answer:
        'None functionally — `category__in`, `category__not_in`, `tag__in` and friends are shorthand that WordPress converts into `tax_query` clauses internally. Use the shorthand when you have one simple condition on a core taxonomy; use `tax_query` when you need a custom taxonomy, a non-ID field, the `AND` operator or more than one clause.',
    },
  ],

  related: [
    { id: 'wp-query', note: 'The full query around these clauses, including ordering, pagination and cache flags.' },
    { id: 'meta-query', note: 'The other clause type, when the value you filter on lives in postmeta rather than a term.' },
    { id: 'date-query', note: 'Add a date range to the same query without guessing the boundary behaviour.' },
    { id: 'term-query', note: 'Fetch the terms themselves to build the filter UI that feeds this query.' },
    { id: 'taxonomy', note: 'Register the taxonomy first — an unregistered slug makes the clause vanish.' },
    { id: 'post-type', note: 'Create the post type the taxonomy is attached to and this query fetches.' },
  ],
};
