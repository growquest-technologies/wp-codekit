import type { ToolContent } from '../toolContentTypes';

export const metaQueryContent: ToolContent = {
  aboutTitle: 'Meta Query Generator Online',
  aboutLead:
    'Filter posts by custom field with the right comparison and the right cast. This WordPress meta_query generator builds each clause from a key, a `compare`, a value and a `type` — `CHAR`, `NUMERIC`, `DECIMAL(10,2)`, `DATE`, `DATETIME`, `TIME` or `BINARY` — sets the `relation` between clauses, and hands back a `WP_Query`, a bare args array or a `pre_get_posts` callback.',
  aboutSupport:
    'A Reference tab restates the filter as a sentence, documents every clause key, and lists which comparisons need a numeric or date cast to behave. Free to use, no account, and everything runs in your browser.',
  spec: {
    hook: "'meta_query' => array( ... ) — WP_Meta_Query",
    outputs: 'A `WP_Query` with its loop, an args array for `get_posts()`, or a `pre_get_posts` callback',
    requires: 'WordPress 3.1 or newer; 4.1+ for nested clause groups, PHP 7.4+',
  },

  whyTitle: 'Why the meta_query builder beats a hand-written clause array',
  whyIntro:
    'Post meta is stored as text. Every numeric filter you write is really a `CAST` instruction to MySQL, and if you leave the `type` at its `CHAR` default a price of 9 sorts above a price of 10 and your "under £50" filter returns the £500 items. The generator treats that as an error rather than a footnote, and checks five more failures beside it.',
  features: [
    {
      title: 'The CHAR-versus-NUMERIC trap is an error',
      body: 'Comparing with `>`, `>=`, `<`, `<=`, `BETWEEN` or `NOT BETWEEN` while the cast is `CHAR` is flagged by clause number with the reason spelled out — MySQL compares text, so "9" comes out greater than "10" — and a one-click "Cast to NUMERIC" fix.',
    },
    {
      title: 'BETWEEN is checked for exactly two values',
      body: '`BETWEEN` and `NOT BETWEEN` need two comma-separated values. One or three is an error naming the count you actually supplied, not a query that silently matches nothing.',
    },
    {
      title: 'Date casts validated against the value',
      body: 'A clause cast to `DATE` or `DATETIME` whose value is not shaped `Y-m-d` is an error, because MySQL casts anything else to NULL and the clause then matches no rows at all.',
    },
    {
      title: 'Sorting kept consistent with filtering',
      body: 'Casting a key to a number for filtering while ordering by `meta_value` sorts it as text — flagged with a "Sort numerically" fix that switches to `meta_value_num`. Ordering by any meta key also gets a reminder that posts without that key are dropped entirely by the JOIN.',
    },
    {
      title: 'Comparisons matched to intent',
      body: 'A plain `=` with several comma-separated values gets a one-click "Use IN". `EXISTS` and `NOT EXISTS` ignore the value field, so filling it in raises a warning. `LIKE` gets a note that WordPress adds the `%` wildcards for you, and that a leading wildcard means no index can be used.',
    },
    {
      title: 'JOIN cost stated per clause',
      body: 'Each clause is a JOIN against `wp_postmeta`. The generator says so, and tells you when the total is worth timing rather than assuming. `no_found_rows` is offered for the short unpaginated lists that do not need a count query.',
    },
  ],

  howTitle: 'How does the meta query generator work?',
  howIntro:
    'Clauses first, then the query that carries them. The plain-English restatement updates as you type, so "price is at most 5000, and in_stock is 1" is readable before the PHP is.',
  steps: [
    {
      title: 'Add a clause per custom field',
      body: 'Enter the meta key exactly as it is stored — `_price`, `event_date`, `featured` — one clause per field you want to filter on.',
    },
    {
      title: 'Choose the comparison and the value',
      body: 'Pick from `=`, `!=`, the four inequalities, `LIKE`, `NOT LIKE`, `IN`, `NOT IN`, `BETWEEN`, `NOT BETWEEN`, `EXISTS` and `NOT EXISTS`. `IN` and `BETWEEN` take comma-separated values; `EXISTS` takes none.',
    },
    {
      title: 'Set the cast',
      body: 'Leave it `CHAR` for text equality. Switch to `NUMERIC` or `DECIMAL(10,2)` for anything you compare with an inequality, `DATE` or `DATETIME` for stored dates, `BINARY` only when you need case-sensitive matching such as a token.',
    },
    {
      title: 'Set the relation and the surrounding query, then export',
      body: 'Choose `AND` or `OR` between clauses, set the post type, page size, ordering and `no_found_rows`, clear the Checks tab, then copy the query, the args array or the `pre_get_posts` version.',
    },
  ],
  example: {
    title: 'Worked example — products under 5000, in stock, cheapest first',
    intro:
      'Two clauses joined with `AND`. The price clause is cast to `NUMERIC` because it uses `<=`; the stock flag stays `CHAR` because it is an exact match. Sorting uses `meta_value_num` so 10 comes after 9.',
    code: `$args = array(
\t'post_type'      => 'product',
\t'posts_per_page' => 12,
\t'orderby'        => 'meta_value_num',
\t'order'          => 'ASC',
\t'meta_key'       => 'price',
\t'meta_query'     => array(
\t\t'relation' => 'AND',
\t\tarray(
\t\t\t'key'     => 'price',
\t\t\t'value'   => 5000,
\t\t\t'compare' => '<=',
\t\t\t'type'    => 'NUMERIC',
\t\t),
\t\tarray(
\t\t\t'key'   => 'in_stock',
\t\t\t'value' => '1',
\t\t),
\t),
);`,
    note:
      'Note what is missing: the second clause emits no `compare` and no `type`, because `=` and `CHAR` are the defaults. Ordering by a meta key also requires the separate top-level `meta_key` argument, which the generator adds for you.',
  },
  refLinks: [
    {
      href: 'https://developer.wordpress.org/reference/classes/wp_meta_query/',
      title: 'WP_Meta_Query — WordPress developer reference',
      description: 'The class that turns meta_query into the JOINs and WHERE conditions MySQL runs.',
    },
    {
      href: 'https://developer.wordpress.org/reference/classes/wp_meta_query/__construct/',
      title: 'WP_Meta_Query::__construct() — clause keys',
      description: 'key, value, compare, type and relation, with every accepted comparison and cast.',
    },
    {
      href: 'https://developer.wordpress.org/reference/classes/wp_query/__construct/',
      title: 'WP_Query::__construct() — every accepted argument',
      description: 'Where meta_query, meta_key and orderby fit among the other query variables.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/register_post_meta/',
      title: 'register_post_meta() — WordPress developer reference',
      description: 'Give the meta key a declared type and REST exposure before you query it.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/get_post_meta/',
      title: 'get_post_meta() — WordPress developer reference',
      description: 'How the value is read back in the loop, and why single vs array matters.',
    },
    {
      href: 'https://developer.wordpress.org/reference/hooks/pre_get_posts/',
      title: 'pre_get_posts — action reference',
      description: 'Attach the meta filter to the main query instead of running a second one.',
    },
  ],

  faqTitle: 'meta_query — frequently asked questions',
  faqIntro: 'The recurring questions when a custom-field filter returns the wrong rows.',
  faqs: [
    {
      question: 'Why does my meta_query think 9 is greater than 10?',
      answer:
        "Because `wp_postmeta.meta_value` is a `LONGTEXT` column and the default cast is `CHAR`, so MySQL compares the values as strings — and as strings, \"9\" sorts after \"10\". Add `'type' => 'NUMERIC'` to the clause (or `DECIMAL(10,2)` for money) and MySQL casts before comparing. The same applies to sorting: use `orderby => meta_value_num`, not `meta_value`.",
    },
    {
      question: 'Why do posts disappear when I order by a meta key?',
      answer:
        'Ordering by `meta_value` or `meta_value_num` requires the top-level `meta_key` argument, and that adds an inner JOIN — so any post without that meta key is excluded from the results entirely, not just sorted last. If you need every post regardless, either backfill the key on save, or add a `relation => OR` meta_query containing your real clause plus a `NOT EXISTS` clause for the same key.',
    },
    {
      question: 'How do I query posts that do not have a meta key at all?',
      answer:
        "Use `'compare' => 'NOT EXISTS'` and omit the value. WordPress writes a LEFT JOIN with an `IS NULL` test. Note that a key which exists with an empty string is not the same as a missing key — `NOT EXISTS` will not match it, so if your save routine writes empty values you need `'compare' => '='` against `''` as well.",
    },
    {
      question: 'Can I query a serialised array stored in post meta?',
      answer:
        'Not reliably. A serialised array is one text blob, so the only tool available is `LIKE` against a fragment of the serialisation, which breaks as soon as a value is a substring of another or the array shape changes. The correct fix is to store one row per value — call `add_post_meta()` repeatedly with the same key — or move the values into a taxonomy, which is indexed and joins properly.',
    },
    {
      question: 'How do I combine AND and OR in a meta_query?',
      answer:
        'Nest clause groups, supported since WordPress 4.1. An entry in `meta_query` can itself be an array with its own `relation`, so "featured is 1 AND (colour is red OR colour is blue)" is an outer `relation => AND` containing the featured clause and an inner array with `relation => OR` and the two colour clauses. A flat list only supports a single relation across all clauses.',
    },
    {
      question: 'Why is my meta_query so slow?',
      answer:
        '`wp_postmeta` is indexed on `meta_key` and `post_id`, but not on `meta_value` — the column is too long to index usefully. So filtering by key is cheap and filtering by value is a scan of every row carrying that key, once per clause, each one a separate JOIN. Two clauses is normal; four is a query worth profiling with Query Monitor. If a value is genuinely filterable content, a taxonomy term is the indexed alternative.',
    },
  ],

  related: [
    { id: 'wp-query', note: 'The full query around these clauses, including pagination and the cache flags.' },
    { id: 'tax-query', note: 'When the value is really a category of thing, a term joins faster than a meta value.' },
    { id: 'date-query', note: 'Filter on the post date rather than a stored date field — no JOIN required.' },
    { id: 'user-query', note: 'The same clause shape against wp_usermeta, for filtering users by profile field.' },
    { id: 'post-meta', note: 'Register the key with a type and a sanitise callback so the stored values are consistent.' },
    { id: 'meta-box', note: 'Build the editor UI that writes these meta values in the first place.' },
  ],
};
