import type { ToolContent } from '../toolContentTypes';

export const wcAccountEndpointContent: ToolContent = {
  aboutTitle: 'My Account Endpoint Generator Online',
  aboutLead:
    'Add a WooCommerce My Account endpoint — a Loyalty Points tab, a Downloads-style archive, a support page — with all four pieces wired together: `add_rewrite_endpoint()`, the `woocommerce_get_query_vars` entry, the `woocommerce_account_menu_items` insertion and the `woocommerce_account_{slug}_endpoint` content callback. The rewrite-rule flush is handled on activation, not on every page load.',
  aboutSupport:
    'You pick which existing item the new tab sits after, and the generator writes the rebuild loop that puts it exactly there while preserving the order of everything else. Free to use, no account, nothing uploaded.',
  spec: {
    hook: 'add_rewrite_endpoint() + woocommerce_account_menu_items',
    outputs: 'A snippet, a `functions.php` block, or a standalone plugin file',
    requires: 'WooCommerce 2.6 or newer (tabbed My Account), PHP 7.4+',
  },

  whyTitle: 'Why the My Account Endpoint Generator beats a four-snippet copy-paste',
  whyIntro:
    'Every tutorial on this splits the job across four snippets from four different pages, and the one people always miss is the flush. An endpoint registered on `init` does not exist in the rewrite rules until they are rebuilt once, so the tab appears in the sidebar and then 404s when clicked — which reads like a broken URL rather than a missing flush. This generator writes all four pieces, plus the activation-time flush, in one file.',
  features: [
    {
      title: 'The flush is wired to activation, not to init',
      body: 'A `register_activation_hook()` callback sets a flag option; a `wp_loaded` callback flushes once and deletes the flag. That ordering matters — flushing during activation would run before your `init` registration, so the rules would rebuild without the endpoint in them.',
    },
    {
      title: 'Deactivation cleans up after itself',
      body: "`register_deactivation_hook( __FILE__, 'flush_rewrite_rules' )` is emitted too, so the endpoint's rules are dropped when the plugin is switched off instead of lingering in the rewrite array.",
    },
    {
      title: 'The query var WooCommerce actually reads',
      body: 'Registering the rewrite endpoint alone is not enough on a My Account page. The generator also adds the slug to `woocommerce_get_query_vars`, which is the map WooCommerce consults when deciding which endpoint template to render.',
    },
    {
      title: 'Exact placement in the account menu',
      body: 'Choose the item your tab follows — Dashboard, Orders, Downloads, Addresses, Payment methods, Account details — or place it immediately before Log out. The generator writes the rebuild loop that inserts it there rather than appending and hoping.',
    },
    {
      title: 'Core endpoint slugs are refused',
      body: '`dashboard`, `orders`, `downloads`, `edit-address`, `payment-methods`, `edit-account`, `customer-logout` and `lost-password` are all rejected with a rename fix, because re-registering one overwrites core’s own page.',
    },
    {
      title: 'Static text or a real callback',
      body: 'Choose static content and you get a translated, `wp_kses_post()`-escaped paragraph. Choose a callback and you get a stub with `get_current_user_id()` already in hand, which is the value almost every account page needs first.',
    },
  ],

  howTitle: 'How does the My Account Endpoint Generator work?',
  howIntro:
    'Four steps. Name the tab, place it, decide what it renders, then export and flush.',
  steps: [
    {
      title: 'Name the tab',
      body: 'Set the menu label shoppers see in the sidebar and the slug that becomes the URL segment after `/my-account/`. Set the function prefix and text domain alongside it.',
    },
    {
      title: 'Place it in the menu',
      body: 'Pick which existing item the tab should follow, or place it just before Log out. The generated filter rebuilds the array in order rather than appending blindly.',
    },
    {
      title: 'Choose the content',
      body: 'Either write static text, which is emitted as a translated and escaped paragraph, or switch to a callback stub if the page needs to query anything for the logged-in customer.',
    },
    {
      title: 'Export, then flush once',
      body: 'Copy the snippet or download the plugin. If you pasted it into `functions.php` rather than activating a plugin, visit Settings → Permalinks and save once — that rebuilds the rewrite rules the endpoint needs.',
    },
  ],
  example: {
    title: 'Worked example — a Loyalty Points tab after Orders',
    intro:
      'The registration, the query var and the menu insertion. The content callback and the flush helpers are omitted here for length.',
    code: `function acme_add_endpoint() {
\tadd_rewrite_endpoint( 'loyalty-points', EP_ROOT | EP_PAGES );
}
add_action( 'init', 'acme_add_endpoint' );

function acme_query_vars( $vars ) {
\t$vars['loyalty-points'] = 'loyalty-points';

\treturn $vars;
}
add_filter( 'woocommerce_get_query_vars', 'acme_query_vars' );

function acme_menu_item( $items ) {
\t$new_items = array();

\tforeach ( $items as $key => $label ) {
\t\t$new_items[ $key ] = $label;

\t\tif ( 'orders' === $key ) {
\t\t\t$new_items['loyalty-points'] = __( 'Loyalty Points', 'acme' );
\t\t}
\t}

\treturn $new_items;
}
add_filter( 'woocommerce_account_menu_items', 'acme_menu_item' );`,
    note:
      'The content hook takes the slug verbatim, so this endpoint renders from `woocommerce_account_loyalty-points_endpoint` — hyphens and all. That is WooCommerce’s own naming, not a typo, and the generator emits it to match your slug exactly.',
  },
  refLinks: [
    {
      href: 'https://developer.wordpress.org/reference/functions/add_rewrite_endpoint/',
      title: 'add_rewrite_endpoint() — WordPress developer reference',
      description: 'The function behind the tab, including what EP_ROOT and EP_PAGES actually mask.',
    },
    {
      href: 'https://developer.woocommerce.com/docs/best-practices/urls-and-routing/woocommerce-endpoints/',
      title: 'WooCommerce endpoints — developer docs',
      description: 'How WooCommerce uses rewrite endpoints for My Account, checkout and order-received pages.',
    },
    {
      href: 'https://developer.woocommerce.com/docs/best-practices/urls-and-routing/customizing-endpoint-urls/',
      title: 'Customising endpoint URLs',
      description: 'Renaming endpoint slugs, and why saving permalinks is required after any endpoint change.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/flush_rewrite_rules/',
      title: 'flush_rewrite_rules() — WordPress developer reference',
      description: 'Why this is an expensive operation that belongs on activation rather than on init.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/register_activation_hook/',
      title: 'register_activation_hook() — WordPress developer reference',
      description: 'The hook the generated flush flag is set from, and its file-path requirements.',
    },
    {
      href: 'https://woocommerce.github.io/code-reference/files/woocommerce-includes-wc-account-functions.html',
      title: 'wc-account-functions.php — WooCommerce code reference',
      description: 'wc_get_account_menu_items(), wc_get_endpoint_url() and the helpers around the My Account area.',
    },
  ],

  faqTitle: 'WooCommerce My Account endpoints — frequently asked questions',
  faqIntro: 'The questions that come up when adding a tab to the customer account area.',
  faqs: [
    {
      question: 'Why does my new My Account tab return a 404?',
      answer:
        'The rewrite rules have not been rebuilt since the endpoint was registered. Go to Settings → Permalinks and click Save Changes once — you do not need to alter anything. If the code lives in a plugin, the generated activation flag handles this automatically on activation; if it lives in `functions.php`, there is no activation event, so the manual save is the fix.',
    },
    {
      question: 'What do EP_ROOT and EP_PAGES mean in add_rewrite_endpoint()?',
      answer:
        'They are the endpoint mask — the set of URL types the endpoint is attached to. `EP_PAGES` attaches it to pages, which is what the My Account page is; `EP_ROOT` attaches it to the site root. Combining them with the bitwise OR, as `EP_ROOT | EP_PAGES`, covers both and is what WooCommerce uses for its own account endpoints.',
    },
    {
      question: 'Why is my tab visible in the menu but blank when opened?',
      answer:
        'The content hook name did not match. WooCommerce renders `woocommerce_account_{slug}_endpoint`, using the slug verbatim, so a slug of `loyalty-points` needs `woocommerce_account_loyalty-points_endpoint`. It is also worth checking that the slug was added to `woocommerce_get_query_vars`, without which WooCommerce does not recognise the endpoint on the account page at all.',
    },
    {
      question: 'How do I control where the tab appears in the menu?',
      answer:
        'The `woocommerce_account_menu_items` filter receives an ordered associative array. Appending your item puts it after Log out, which is almost never what you want. Rebuild the array in a `foreach` loop and insert your key after the item it should follow — that is what this generator writes, based on the position you choose.',
    },
    {
      question: 'Should I flush rewrite rules on every page load?',
      answer:
        'No. `flush_rewrite_rules()` regenerates and re-saves the entire rewrite array, which is measurable work on a busy store and is entirely wasted after the first run. The correct pattern is to flush once, on activation — or, as the generated code does, set a flag on activation and flush on the next `wp_loaded`, after the endpoint itself has been registered on `init`.',
    },
    {
      question: 'Can I restrict a My Account endpoint to certain customers?',
      answer:
        'Yes, inside the content callback. Everything under My Account already requires a logged-in user, so the useful checks are `get_current_user_id()` for who is looking, `current_user_can()` for a capability, or `wc_get_customer_order_count()` for a purchase-history condition. The menu item itself can be hidden by returning early from the `woocommerce_account_menu_items` filter for users who should not see the tab.',
    },
  ],

  related: [
    { id: 'wc-order-query', note: 'Fetch the current customer’s orders to render inside your new account tab.' },
    { id: 'wc-order-status', note: 'Build the workflow status the tab is going to report on.' },
    { id: 'wc-email', note: 'Email the customer when the data behind their new tab changes.' },
    { id: 'wc-checkout-fields', note: 'Collect the data at checkout that your account tab then displays back.' },
    { id: 'activation', note: 'Activation, deactivation and uninstall routines, including the rewrite flush pattern.' },
    { id: 'user-role', note: 'Create the customer role or capability your endpoint checks before rendering.' },
  ],
};
