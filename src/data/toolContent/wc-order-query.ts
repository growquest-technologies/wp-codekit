import type { ToolContent } from '../toolContentTypes';

export const wcOrderQueryContent: ToolContent = {
  aboutTitle: 'Order Query Generator Online',
  aboutLead:
    'Build a `wc_get_orders()` call by picking statuses, a customer, a date window and meta clauses, and get back a working query with the loop already written. This is the HPOS-safe way to query orders: under High-Performance Order Storage, orders live in dedicated `wc_orders` tables rather than `wp_posts`, so a `WP_Query` on `shop_order` simply stops finding anything.',
  aboutSupport:
    'The Reference tab restates your query in plain English — which statuses, which customer, which window, how many rows — next to the full argument list, so you can check the intent without reading the array. Free to use, no account, nothing you type leaves the browser.',
  spec: {
    hook: 'wc_get_orders()',
    outputs: 'A full query with loop, a paginated query, or just the args array',
    requires: 'WooCommerce 3.0 or newer; 8.2+ for meta_query under HPOS, PHP 7.4+',
  },

  whyTitle: 'Why the wc_get_orders generator beats a WP_Query on shop_order',
  whyIntro:
    'Every "get all WooCommerce orders" snippet older than a couple of years reaches for `WP_Query` or `get_posts()` with `post_type => shop_order`. On a store with High-Performance Order Storage enabled that query returns nothing at all, silently, because the orders are no longer posts. `wc_get_orders()` is the abstraction WooCommerce itself maintains and it behaves identically in both storage modes — this tool builds the arguments for it and flags the ones that will be ignored.',
  features: [
    {
      title: 'Statuses in the form the column actually holds',
      body: 'Statuses are emitted `wc-` prefixed, matching the raw value in both the legacy posts table and the HPOS orders table. One status emits a plain string, several emit an array. Selecting `wc-checkout-draft` alongside real statuses raises a note, because those are unfinished Block Checkout sessions rather than orders.',
    },
    {
      title: 'Date arguments that will not be silently dropped',
      body: "A single date becomes `'>2026-01-01'` or `'<2026-07-01'`; two become the `start...end` range form. Anything that is not `yyyy-mm-dd` is a hard error, because `wc_get_orders()` ignores a malformed date rather than complaining about it.",
    },
    {
      title: 'Customer ids validated before they reach the query',
      body: 'The customer field takes one or more numeric user ids and rejects anything else as an error, so a name or an email pasted in by mistake never becomes a query that quietly matches nothing. WooCommerce’s own `customer` argument also accepts a billing email, which is how you reach guest orders — swap the value once you have the args.',
    },
    {
      title: 'Meta clauses in either shape',
      body: 'One clause emits the flat `meta_key` / `meta_value` / `meta_compare` form; two or more emit a real `meta_query` with an AND or OR relation. `EXISTS` and `NOT EXISTS` drop the value automatically, and a clause with a value it will ignore is flagged.',
    },
    {
      title: 'Three output shapes',
      body: 'A query with a ready `foreach` loop printing order number, translated status name and formatted total; a paginated variant adding `paginate => true` and unpacking `orders`, `total` and `max_num_pages`; or just the args array to drop into code you already have.',
    },
    {
      title: 'Honest warnings about cost',
      body: 'No limit set, or `limit => -1`, is a warning with a one-click fix back to 20. Ordering by `meta_value` with no meta clause to take the key from is an error. More than one meta clause raises a note about testing against your store’s real order volume under HPOS.',
    },
  ],

  howTitle: 'How does the Order Query Generator work?',
  howIntro:
    'Four steps. Filter by status, narrow by customer and date, add meta clauses, then choose the shape of the result.',
  steps: [
    {
      title: 'Pick the statuses',
      body: 'Select any combination of the core statuses plus the Block Checkout draft status. Leave them all unselected and every non-trashed status is included, which the Checks tab points out.',
    },
    {
      title: 'Narrow by customer and date',
      body: 'Add one or more numeric customer ids, choose which date field to filter on — created, modified, completed or paid — and set an after date, a before date, or both for a range.',
    },
    {
      title: 'Add meta clauses',
      body: 'Optional. Add clauses with a key, a comparison operator and a value, and set the relation to AND or OR when there is more than one.',
    },
    {
      title: 'Choose the output shape',
      body: 'Set the limit, ordering and return type, then switch between the full query with its loop, the paginated form, or the bare args array, and copy or download the result.',
    },
  ],
  example: {
    title: 'Worked example — the 20 most recent processing and completed orders',
    intro:
      'Two statuses, a limit and the default date ordering, with the loop the tool writes for full order objects. This is the whole output.',
    code: `$args   = array(
\t'status'  => array( 'wc-processing', 'wc-completed' ),
\t'limit'   => 20,
\t'orderby' => 'date',
);
$orders = wc_get_orders( $args );

foreach ( $orders as $order ) {
\tprintf(
\t\t'<li>#%1$s — %2$s — %3$s</li>',
\t\tesc_html( $order->get_order_number() ),
\t\tesc_html( wc_get_order_status_name( $order->get_status() ) ),
\t\twp_kses_post( wc_price( $order->get_total() ) )
\t);
}`,
    note:
      'Switch the return type to ids and the loop changes to iterate plain integers, so you can hydrate only the rows you actually render with `wc_get_order()`. On a store with tens of thousands of orders that is the difference between loading 20 objects and loading all of them.',
  },
  refLinks: [
    {
      href: 'https://developer.woocommerce.com/docs/features/orders/wc-get-orders/',
      title: 'wc_get_orders() and order queries — WooCommerce developer docs',
      description: 'The official argument reference for wc_get_orders() and WC_Order_Query.',
    },
    {
      href: 'https://developer.woocommerce.com/docs/features/orders/high-performance-order-storage/',
      title: 'High-Performance Order Storage — WooCommerce developer docs',
      description: 'What HPOS changes about where orders are stored, and why WP_Query on shop_order stops working.',
    },
    {
      href: 'https://developer.woocommerce.com/docs/features/orders/high-performance-order-storage/wc-order-query-improvements/',
      title: 'HPOS order querying APIs',
      description: 'The meta_query, field_query and date_query arguments available on HPOS stores from WooCommerce 8.2.',
    },
    {
      href: 'https://developer.woocommerce.com/docs/features/orders/high-performance-order-storage/recipe-book/',
      title: 'HPOS extension recipe book',
      description: 'Practical patterns for making extension code work under both storage backends.',
    },
    {
      href: 'https://woocommerce.github.io/code-reference/classes/WC-Order-Query.html',
      title: 'WC_Order_Query in the code reference',
      description: 'The class wc_get_orders() wraps, including how arguments are mapped per storage backend.',
    },
    {
      href: 'https://woocommerce.github.io/code-reference/files/woocommerce-includes-wc-order-functions.html',
      title: 'wc-order-functions.php — WooCommerce code reference',
      description: 'wc_get_orders(), wc_get_order() and wc_get_order_status_name(), all used by the generated code.',
    },
  ],

  faqTitle: 'wc_get_orders — frequently asked questions',
  faqIntro: 'What developers ask when querying WooCommerce orders in code.',
  faqs: [
    {
      question: 'Why does WP_Query with post_type shop_order return nothing?',
      answer:
        'Because the store has High-Performance Order Storage enabled and its orders are no longer posts. Under HPOS they live in the dedicated `wc_orders` tables, so a `WP_Query` or `get_posts()` call against `shop_order` matches zero rows without raising an error. `wc_get_orders()` reads from whichever backend the store is using, which is why it is the only safe way to query orders in extension code.',
    },
    {
      question: 'What is the default limit for wc_get_orders()?',
      answer:
        'It falls back to the site’s own `posts_per_page` setting, which is 10 out of the box but can be anything a site owner has changed it to. That is a poor thing to depend on, which is why this generator always writes the `limit` argument explicitly. Set `-1` for no limit if you genuinely need every match, but be aware that it hydrates a full `WC_Order` object per row unless you also switch the return type to ids.',
    },
    {
      question: 'Does wc_get_orders() support meta_query?',
      answer:
        'Yes. It accepts the flat `meta_key` / `meta_value` / `meta_compare` form and a full `meta_query` array with the same syntax as `WP_Query`, translated through `WC_Order_Query`. On HPOS stores the richer `meta_query`, `field_query` and `date_query` arguments have been available since WooCommerce 8.2. Flat, single-level clauses are the reliable case; deeply nested relation groups have historically had gaps between the two backends, so test them against your own data.',
    },
    {
      question: 'How do I query orders by date range?',
      answer:
        'Pass the date field you care about — `date_created`, `date_modified`, `date_completed` or `date_paid` — with a string value. A leading `>` means on or after, a leading `<` means on or before, and `start...end` with three dots is an inclusive range. Dates must be `yyyy-mm-dd`; a malformed value is ignored rather than rejected, so the query quietly returns more than you expected.',
    },
    {
      question: 'How do I find a guest customer’s orders?',
      answer:
        'A guest order has a customer id of 0, so filtering by user id will never return it. WooCommerce’s `customer` argument accepts either a customer id or a billing email, so pass the email address instead; `billing_email` works as a dedicated argument too. Remember the same person can have both guest and account orders under one address, so an email filter is usually the more complete answer.',
    },
    {
      question: 'How do I paginate the results?',
      answer:
        'Add `paginate => true` and the return value changes shape: instead of an array of orders you get an object with `orders`, `total` and `max_num_pages` properties. That is what an admin list or a customer-facing order history needs, and it is the second output mode this generator offers.',
    },
  ],

  related: [
    { id: 'wc-order-status', note: 'Register the custom status you then filter this query by.' },
    { id: 'wc-account-endpoint', note: 'Render the query results in a new My Account tab for the logged-in customer.' },
    { id: 'wc-checkout-fields', note: 'Add the order meta your query clauses are going to match on.' },
    { id: 'wc-email', note: 'Email customers based on the set of orders a query like this returns.' },
    { id: 'wp-query', note: 'The post-side equivalent, for products, posts and anything still living in wp_posts.' },
    { id: 'meta-query', note: 'Build the meta clause separately when the comparison and casting need more care.' },
  ],
};
