import type { ToolContent } from '../toolContentTypes';

export const wcOrderStatusContent: ToolContent = {
  aboutTitle: 'Custom Order Status Generator Online',
  aboutLead:
    'Register a WooCommerce custom order status — Awaiting pickup, Ready to dispatch, Sent to warehouse — as a real `register_post_status()` call plus the `wc_order_statuses` filter that puts it in the admin dropdown, the orders list filters and the bulk "Change status to" actions. The `wc-` prefix, the `_n_noop()` count label and the position in the list are all handled for you.',
  aboutSupport:
    'The slug field shows the resolved status string and its length against the 20-character database limit as you type, so you find out about a truncation problem here rather than after orders have been saved with it. Free to use, no account, nothing uploaded.',
  spec: {
    hook: 'register_post_status() + wc_order_statuses',
    outputs: 'A snippet, a `functions.php` block, or a standalone plugin file',
    requires: 'WooCommerce 2.2 or newer, PHP 7.4+',
  },

  whyTitle: 'Why the Custom Order Status Generator beats a hand-written register_post_status() call',
  whyIntro:
    'A WooCommerce order status is two registrations that have to agree with each other: a WordPress post status whose name starts with `wc-`, and an entry in the `wc_order_statuses` array whose key is that same prefixed string. Get the prefix wrong in one place and the status registers but never appears; make the slug too long and MySQL truncates it in the `post_status` column, so the value stored on the order stops matching the value you registered. The generator writes both halves from one slug and checks the failure cases before you paste.',
  features: [
    {
      title: 'The wc- prefix applied once, everywhere',
      body: 'You type `awaiting-pickup`; the generator emits `wc-awaiting-pickup` in `register_post_status()`, in the `wc_order_statuses` key, and in the CSS selector for the badge. There is no second place to keep in sync.',
    },
    {
      title: 'A live length check against the 20-character column',
      body: 'The `post_status` column is `varchar(20)`. A resolved status longer than that is a hard error, with a one-click fix that shortens the slug — because a truncated status is silently written to the database and then never matches what you registered.',
    },
    {
      title: 'Core statuses are refused',
      body: 'Re-registering `wc-pending`, `wc-processing`, `wc-on-hold`, `wc-completed`, `wc-cancelled`, `wc-refunded` or `wc-failed` is an error with a rename fix, because it overwrites core’s own label and count text rather than adding anything.',
    },
    {
      title: 'A properly formed label_count',
      body: 'The count label is emitted as a real `_n_noop()` with singular and plural forms and the count span markup WordPress expects, not a plain string — which is what makes the "Awaiting pickup (3)" filter link render correctly.',
    },
    {
      title: 'Exact placement in the status list',
      body: 'Choose which core status yours sits after and the generator writes the rebuild loop that inserts it at that point, preserving order. Choose the end and it appends with a single assignment instead.',
    },
    {
      title: 'An optional coloured admin badge',
      body: 'Turn it on and you get an `admin_head` style block targeting `mark.order-status.status-your-slug`, with the hex values validated. Leave it off and no CSS is emitted at all.',
    },
  ],

  howTitle: 'How does the Custom Order Status Generator work?',
  howIntro:
    'Four steps. Name the status, decide where it appears, colour it if you want to, then export.',
  steps: [
    {
      title: 'Name it',
      body: 'Enter the label shoppers and staff see and the slug it is stored under. Pick which existing status it should follow in the list, and set the function prefix and text domain.',
    },
    {
      title: 'Set its visibility',
      body: 'Three toggles map straight onto `register_post_status()` arguments: exclude from search, show in the "All" orders list, and show in the status filter list above the orders table.',
    },
    {
      title: 'Give it a badge colour',
      body: 'Optional. Set a background and foreground hex pair and the generator adds the admin stylesheet block so the status reads as its own thing in the orders table rather than inheriting the default grey.',
    },
    {
      title: 'Clear the checks, then export',
      body: 'Fix anything flagged — a slug over 20 characters, a core status name, an invalid hex — then copy the snippet or download it as a `functions.php` block or a plugin file.',
    },
  ],
  example: {
    title: 'Worked example — an "Awaiting pickup" status after Processing',
    intro:
      'The registration and the list entry, exactly as the tool emits them. The badge CSS block is omitted here for length.',
    code: `function acme_register_order_status() {
\tregister_post_status(
\t\t'wc-awaiting-pickup',
\t\tarray(
\t\t\t'label'                     => _x( 'Awaiting pickup', 'Order status', 'acme' ),
\t\t\t'public'                    => false,
\t\t\t'exclude_from_search'       => false,
\t\t\t'show_in_admin_all_list'    => true,
\t\t\t'show_in_admin_status_list' => true,
\t\t\t'label_count'               => _n_noop(
\t\t\t\t'Awaiting pickup <span class="count">(%s)</span>',
\t\t\t\t'Awaiting pickup <span class="count">(%s)</span>',
\t\t\t\t'acme'
\t\t\t),
\t\t)
\t);
}
add_action( 'init', 'acme_register_order_status' );

function acme_order_statuses( $order_statuses ) {
\t$new_statuses = array();

\tforeach ( $order_statuses as $key => $status ) {
\t\t$new_statuses[ $key ] = $status;

\t\tif ( 'wc-processing' === $key ) {
\t\t\t$new_statuses['wc-awaiting-pickup'] = _x( 'Awaiting pickup', 'Order status', 'acme' );
\t\t}
\t}

\treturn $new_statuses;
}
add_filter( 'wc_order_statuses', 'acme_order_statuses' );`,
    note:
      'This code is identical whether or not High-Performance Order Storage is enabled. An order’s status is a plain string in either backend, stored in the `wc-` prefixed form, so nothing here needs an HPOS-specific branch.',
  },
  refLinks: [
    {
      href: 'https://developer.wordpress.org/reference/functions/register_post_status/',
      title: 'register_post_status() — WordPress developer reference',
      description: 'Every argument the generated registration uses, including label_count, show_in_admin_all_list and exclude_from_search.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/_n_noop/',
      title: '_n_noop() — WordPress developer reference',
      description: 'Why the count label is registered as a deferred plural rather than a translated string.',
    },
    {
      href: 'https://woocommerce.github.io/code-reference/files/woocommerce-includes-wc-order-functions.html',
      title: 'wc-order-functions.php — WooCommerce code reference',
      description: 'wc_get_order_statuses(), wc_get_order_status_name() and the helpers that read the registered list.',
    },
    {
      href: 'https://woocommerce.github.io/code-reference/hooks/hooks.html',
      title: 'WooCommerce hook reference',
      description: 'The wc_order_statuses filter and the woocommerce_order_status_* actions your status will fire.',
    },
    {
      href: 'https://developer.woocommerce.com/docs/features/orders/',
      title: 'Orders — WooCommerce developer documentation',
      description: 'How WooCommerce models orders, statuses and their transitions.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/get_post_stati/',
      title: 'get_post_stati() — WordPress developer reference',
      description: 'How to inspect which statuses are actually registered when debugging a status that will not appear.',
    },
  ],

  faqTitle: 'WooCommerce custom order statuses — frequently asked questions',
  faqIntro: 'What people run into when adding a status to the order workflow.',
  faqs: [
    {
      question: 'Why does my custom order status need the wc- prefix?',
      answer:
        'WooCommerce identifies its own order statuses by that prefix. Internally it strips `wc-` when comparing, so `$order->get_status()` returns `awaiting-pickup` while the database column holds `wc-awaiting-pickup`. Register the post status without the prefix and WooCommerce will not treat it as an order status at all — it will not appear in the dropdown, the filters or the bulk actions.',
    },
    {
      question: 'Why is my custom order status missing from the bulk actions dropdown?',
      answer:
        'WooCommerce builds the "Change status to" bulk actions from the array returned by the `wc_order_statuses` filter, and only includes statuses with `show_in_admin_status_list` enabled. If you registered the post status but never added it to that filter — or turned that argument off — the status exists but has nowhere to be selected from.',
    },
    {
      question: 'How long can an order status slug be?',
      answer:
        'The resolved status, prefix included, must fit in 20 characters, because `post_status` is a `varchar(20)` column. MySQL truncates anything longer without raising an error, so the value written to the order no longer matches the one you registered and the order effectively falls out of every status filter. This generator counts the characters for you and blocks the export.',
    },
    {
      question: 'Do custom order statuses work with High-Performance Order Storage?',
      answer:
        'Yes, and the code is the same. A status is a plain string column value in both the legacy `wp_posts` table and the HPOS `wc_orders` table, so `register_post_status()` plus the `wc_order_statuses` filter is all that is needed either way. What does change under HPOS is how you *query* orders by that status — use `wc_get_orders()` rather than a `WP_Query` on `shop_order`.',
    },
    {
      question: 'Can a custom order status trigger an email?',
      answer:
        'Yes. WooCommerce fires `woocommerce_order_status_{status}` on every transition, including yours, so an email class can hook `woocommerce_order_status_awaiting-pickup` and send from there. It also fires `woocommerce_order_status_changed` with the old status, the new status and the order.',
    },
    {
      question: 'Will orders in a custom status count towards reports and stock?',
      answer:
        'Not automatically. WooCommerce treats only a fixed set of statuses as paid, and reduces stock on transitions into those. A custom status is inert unless you opt it in — for example by filtering `woocommerce_order_is_paid_statuses` or `woocommerce_valid_order_statuses_for_payment_complete`. Decide that deliberately rather than assuming a new status behaves like Processing.',
    },
  ],

  related: [
    { id: 'wc-order-query', note: 'Query orders in your new status the HPOS-safe way, with the wc- prefixed value.' },
    { id: 'wc-email', note: 'Send a transactional email on the woocommerce_order_status_ hook your status fires.' },
    { id: 'wc-account-endpoint', note: 'Give customers a My Account tab listing only their orders in this status.' },
    { id: 'post-status', note: 'The same register_post_status() call for ordinary posts and custom post types.' },
    { id: 'hooks', note: 'Hook the woocommerce_order_status_changed transition with the right argument count.' },
    { id: 'plugin-header', note: 'Ship the status as a plugin so deactivating the theme does not remove it.' },
  ],
};
