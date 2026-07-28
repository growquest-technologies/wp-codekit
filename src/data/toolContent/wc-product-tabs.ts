import type { ToolContent } from '../toolContentTypes';

export const wcProductTabsContent: ToolContent = {
  aboutTitle: 'Product Tab Generator Online',
  aboutLead:
    'Add or remove tabs on the single product page through the `woocommerce_product_tabs` filter. Register a WooCommerce custom product tab with its own title, priority and render callback, unset the core Description, Additional information or Reviews tabs, and get one clean filter function that does both instead of three snippets fighting each other.',
  aboutSupport:
    'The Reference tab lists the core tabs with the priorities WooCommerce assigns them — Description 10, Additional information 20, Reviews 30 — so you can see exactly where your own tab will land before you paste anything. Free to use, no account, nothing uploaded.',
  spec: {
    hook: 'woocommerce_product_tabs',
    outputs: 'A snippet, a `functions.php` block, or a standalone plugin file',
    requires: 'WooCommerce 2.0 or newer, PHP 7.4+',
  },

  whyTitle: 'Why the Product Tab Generator beats a hand-written woocommerce_product_tabs filter',
  whyIntro:
    'The filter itself is simple; the ways it goes wrong are not. Reuse a core tab key and you replace the Description tab instead of adding a tab. Forget the callback and the tab renders as an empty pill. Add and remove in two separate filter callbacks and the ordering depends on which one WordPress happens to run first. This generator writes one filter that unsets and adds together, with the callbacks alongside it, and checks the keys before you ship.',
  features: [
    {
      title: 'Core tab keys are rejected',
      body: 'A new tab whose key resolves to `description`, `additional_information` or `reviews` is a hard error, with a message saying plainly that it would overwrite the core tab rather than add one.',
    },
    {
      title: 'Add and remove in a single filter',
      body: 'The `unset()` calls for the core tabs you switched off and the assignments for your new tabs live in the same callback, in that order, so there is no dependency on which filter runs first.',
    },
    {
      title: 'Priority drives the order, and it is yours to set',
      body: 'Each tab gets an explicit numeric `priority`. Core uses 10, 20 and 30, so a tab at 15 lands between Description and Additional information. A non-numeric priority is a warning and falls back to 50.',
    },
    {
      title: 'A real callback per tab',
      body: 'Every new tab gets its own named render function containing your content, escaped through `wp_kses_post( wpautop( … ) )` and wrapped in `__()` with your text domain — not a `// TODO` comment.',
    },
    {
      title: 'Duplicate and blank keys caught',
      body: 'Two new tabs sharing a key is an error because the second overwrites the first, a tab with no title is an error because it renders as a blank pill, and a tab with no content is flagged as a tip since its callback would still print an empty paragraph.',
    },
    {
      title: 'An honest note about removing Reviews',
      body: 'Unsetting the reviews tab only hides it from the tab strip. The Checks tab says so, and points you at WooCommerce → Settings → Products, where reviews are actually enabled or disabled.',
    },
  ],

  howTitle: 'How does the Product Tab Generator work?',
  howIntro:
    'Four steps. Decide which core tabs stay, add your own, set the ordering, then export.',
  steps: [
    {
      title: 'Choose which core tabs to keep',
      body: 'Toggle Description, Additional information and Reviews. Anything switched off becomes an `unset()` call inside the generated filter.',
    },
    {
      title: 'Add your own tabs',
      body: 'For each new tab set a key, the title shown on the pill, and the content it renders. The key becomes the array key and part of the callback function name.',
    },
    {
      title: 'Set the priority',
      body: 'Give each tab a numeric priority to place it against the core values of 10, 20 and 30. Lower numbers appear first in the strip.',
    },
    {
      title: 'Clear the checks, then export',
      body: 'Resolve any core-key collisions, duplicate keys or missing titles, then copy the snippet or download it as a `functions.php` block or a plugin file.',
    },
  ],
  example: {
    title: 'Worked example — a Sizing tab, with Reviews removed',
    intro:
      'One new tab at priority 15, so it sits between Description and Additional information, and the reviews tab unset. This is the whole output, doc blocks trimmed.',
    code: `function acme_product_tabs( $tabs ) {
\tunset( $tabs['reviews'] );

\t$tabs['sizing'] = array(
\t\t'title'    => __( 'Sizing', 'acme' ),
\t\t'priority' => 15,
\t\t'callback' => 'acme_tab_sizing',
\t);

\treturn $tabs;
}
add_filter( 'woocommerce_product_tabs', 'acme_product_tabs' );

function acme_tab_sizing() {
\techo wp_kses_post( wpautop( __( 'Runs true to size. If you are between sizes, we recommend sizing up.', 'acme' ) ) );
}`,
    note:
      'WooCommerce hides the Description tab automatically on a product with no description, and the Additional information tab on a product with no attributes or dimensions. A custom tab has no such rule — it appears on every product until you add your own condition inside the filter.',
  },
  refLinks: [
    {
      href: 'https://woocommerce.github.io/code-reference/hooks/hooks.html',
      title: 'WooCommerce hook reference',
      description: 'The woocommerce_product_tabs filter and the single-product template hooks around it.',
    },
    {
      href: 'https://developer.woocommerce.com/docs/theming/theme-development/template-structure/',
      title: 'Template structure and overriding templates',
      description: 'Where single-product/tabs/tabs.php lives and how to override it in a child theme when a filter is not enough.',
    },
    {
      href: 'https://woocommerce.github.io/code-reference/files/woocommerce-includes-wc-template-functions.html',
      title: 'wc-template-functions.php — WooCommerce code reference',
      description: 'woocommerce_default_product_tabs() — the function that defines the three core tabs and their priorities.',
    },
    {
      href: 'https://woocommerce.github.io/code-reference/files/woocommerce-includes-wc-template-hooks.html',
      title: 'wc-template-hooks.php — WooCommerce code reference',
      description: 'How the tabs output is attached to woocommerce_after_single_product_summary, if you need to move it.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/add_filter/',
      title: 'add_filter() — WordPress developer reference',
      description: 'Priority and accepted argument count on the filter callback itself, which is distinct from the tab priority.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/wp_kses_post/',
      title: 'wp_kses_post() — WordPress developer reference',
      description: 'The escaping applied to every generated tab callback before the content is printed.',
    },
  ],

  faqTitle: 'WooCommerce product tabs — frequently asked questions',
  faqIntro: 'The questions that come up when changing the tabs on the single product page.',
  faqs: [
    {
      question: 'How do I change the order of WooCommerce product tabs?',
      answer:
        'Each tab in the `woocommerce_product_tabs` array has a `priority` key and WooCommerce sorts by it before rendering. Core assigns Description 10, Additional information 20 and Reviews 30, so setting your tab to 15 places it second. You can also reorder core tabs by reassigning their priority inside the same filter.',
    },
    {
      question: 'How do I remove the Additional information tab?',
      answer:
        "Call `unset( $tabs['additional_information'] )` inside a `woocommerce_product_tabs` filter and return the array. Note that WooCommerce already hides that tab on products with no attributes, no weight and no dimensions, so if it is showing there is data behind it that customers will no longer see.",
    },
    {
      question: 'Why is my custom product tab empty?',
      answer:
        'Either the `callback` key is missing from the tab array, or it names a function that does not exist at render time. WooCommerce calls that function to print the panel contents; without a valid callback the pill appears but the panel is blank. The generated code always writes a matching named function for every tab it adds.',
    },
    {
      question: 'Can I show a product tab only for certain products?',
      answer:
        'Yes — the filter runs on every single product page, so you can inspect the product before adding the tab. Use `global $product;` inside the filter callback and test whatever matters: a category with `has_term()`, a product type with `$product->get_type()`, or a custom field with `$product->get_meta()`. Only add the array entry when the condition passes.',
    },
    {
      question: 'Does removing the reviews tab disable reviews?',
      answer:
        'No. Unsetting the tab removes it from the tab strip only; reviews remain enabled, review data stays attached to the product, and the star rating still shows elsewhere in the template. To actually switch reviews off, use the Enable product reviews setting under WooCommerce → Settings → Products, or turn off comments per product.',
    },
    {
      question: 'Do product tabs work with block themes and the Product Details block?',
      answer:
        'The `woocommerce_product_tabs` filter drives the classic single-product template, which block themes still use through the Product Classic Template block or a shortcode-based product page. A fully block-based product page built from individual blocks does not render that tab strip at all, so a filter alone will not add a tab there — you would need the equivalent block or a template that includes the classic tabs output.',
    },
  ],

  related: [
    { id: 'wc-product-fields', note: 'Create the product fields whose values your new tab is going to display.' },
    { id: 'wc-cart-fee', note: 'Turn a product attribute you surface in a tab into a real cart surcharge.' },
    { id: 'wc-account-endpoint', note: 'The same add-a-tab idea, applied to the customer My Account area instead.' },
    { id: 'wc-email', note: 'Reuse the same content in a transactional email through your own template file.' },
    { id: 'hooks', note: 'Correctly signed filter callbacks with the right priority and accepted argument count.' },
    { id: 'shortcode', note: 'Wrap the tab content in a shortcode so editors can place it elsewhere too.' },
  ],
};
