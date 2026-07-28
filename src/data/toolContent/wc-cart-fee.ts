import type { ToolContent } from '../toolContentTypes';

/**
 * Transcribed from the design handoff (`design-reference/Cart Fees Generator.dc.html`),
 * which is the canonical example of this section's voice and depth. Every other
 * tool's content follows this shape.
 */
export const wcCartFeeContent: ToolContent = {
  aboutTitle: 'Cart Fees & Discount Generator Online',
  aboutLead:
    'Build the WooCommerce cart fee you actually need — a cash-on-delivery surcharge, a weight-based handling charge, a wholesale-only discount — and copy it out as clean, commented PHP. Every rule becomes a real condition on `woocommerce_cart_calculate_fees`, so the file you download is the file that runs.',
  aboutSupport:
    'The sample cart above recalculates as you type: change the subtotal, apply a coupon, switch the payment gateway, and watch the WooCommerce totals box respond exactly as it would at checkout. Free to use, no account, and nothing you enter leaves the browser.',
  spec: {
    hook: 'woocommerce_cart_calculate_fees',
    outputs: 'A snippet, a `functions.php` block, or a standalone plugin file',
    requires: 'WooCommerce 3.2 or newer, PHP 7.4+',
  },

  whyTitle: 'Why the Cart Fees Generator beats a generic fee snippet',
  whyIntro:
    'Most "add a cart fee" snippets on the web are one hard-coded `add_fee()` call with a comment telling you to change the number. That holds up until the fee needs to apply only to cash on delivery, only above £100, only in the UK — or until a taxable negative fee quietly distorts your VAT reporting. This generator writes the conditions together with the fee, then audits the result against the mistakes that cost the most time to find in production.',
  features: [
    {
      title: 'Conditions that actually compile',
      body: 'Minimum and maximum subtotal, item count, cart weight, destination country, shipping method, payment gateway, user role and product category each emit a real guard clause — never a `// TODO` comment for you to finish.',
    },
    {
      title: 'Only the helpers you use',
      body: '`shipping_method_matches()`, `user_has_role()` and `cart_has_category()` are written into the file only when one of your rules needs them, so there is no dead code to justify in review.',
    },
    {
      title: 'A sample cart that does the arithmetic',
      body: 'Set a subtotal, coupon, item count, weight, country and gateway, then see which rules fire, what each one computes to, and the reason every skipped rule was skipped.',
    },
    {
      title: 'Seven costly traps checked for you',
      body: 'Duplicate fee ids from `sanitize_title()` collisions, gateway conditions with no checkout refresh, taxable negative fees, uncapped percentages, tax-inclusive basis on a taxable fee, a missing `is_admin()` guard and impossible min/max ranges. Most are one click to fix.',
    },
    {
      title: 'A percentage basis you choose deliberately',
      body: 'Take percentages from `get_subtotal()` before coupons, `get_cart_contents_total()` after coupons, or the subtotal including tax — the choice is named in the generated code so the next developer knows what you meant.',
    },
    {
      title: 'Honest advice about discounts',
      body: 'Negative fees work, and the generator writes them — but it also tells you when a coupon is the better answer for a shopper-visible discount, and can append the programmatic coupon alternative alongside.',
    },
  ],

  howTitle: 'How does the Cart Fees Generator work?',
  howIntro:
    'Four steps, no PHP required until you paste the result. Say what the fee is, say when it applies, prove it against a sample cart, then export.',
  steps: [
    {
      title: 'Set the basics',
      body: 'Pick a function prefix and text domain, then decide where percentages are measured from and whether country rules read the shipping or billing address.',
    },
    {
      title: 'Describe the fee',
      body: 'Name it, then choose a flat amount, a percentage of the cart, an amount per item or per unit of weight. Cap it, make it taxable, or flip it to a discount.',
    },
    {
      title: 'Add the conditions',
      body: 'Attach as many conditions as the rule needs. Each one is checked live against the sample cart, so you can see the rule turn on and off as you tune the numbers.',
    },
    {
      title: 'Review, then export',
      body: 'Clear the flagged errors and warnings, then copy the snippet or download the `.php` file as a plugin, a `functions.php` block or a bare snippet.',
    },
  ],
  example: {
    title: 'Worked example — £4.90 cash-on-delivery fee, waived over £100',
    intro:
      'One rule, two conditions: gateway is `cod` and subtotal is at most 100. This is the whole output, formatted exactly as it downloads.',
    code: `add_action( 'woocommerce_cart_calculate_fees', 'acme_cart_fees', 20 );

function acme_cart_fees( $cart ) {
\tif ( is_admin() && ! defined( 'DOING_AJAX' ) ) {
\t\treturn;
\t}

\tif ( ! $cart instanceof WC_Cart || $cart->is_empty() ) {
\t\treturn;
\t}

\t$subtotal = (float) $cart->get_subtotal();
\t$payment  = (string) WC()->session->get( 'chosen_payment_method' );

\t// Cash on delivery — a flat 4.90.
\t$amount = 4.90;

\tif ( $subtotal <= 100.00 && in_array( $payment, array( 'cod' ), true ) ) {
\t\t$cart->add_fee( __( 'Cash on delivery', 'acme' ), $amount, false );
\t}
}`,
    note:
      'Because this fee depends on the chosen gateway, the generator also emits the one line of jQuery that fires `update_checkout` when the shopper switches payment method — without it WooCommerce shows a stale total until the page reloads.',
  },
  refLinks: [
    {
      href: 'https://woocommerce.github.io/code-reference/hooks/hooks.html',
      title: 'WooCommerce hook reference',
      description: 'Every action and filter in WooCommerce core, including the cart fee hooks.',
    },
    {
      href: 'https://woocommerce.github.io/code-reference/classes/WC-Cart.html',
      title: 'WC_Cart::add_fee() in the code reference',
      description: 'The method signature this generator writes against — name, amount, taxable, tax class.',
    },
    {
      href: 'https://developer.woocommerce.com/docs/',
      title: 'WooCommerce developer documentation',
      description: 'Official guides for extending WooCommerce, including cart and checkout behaviour.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/add_action/',
      title: 'add_action() — WordPress developer reference',
      description: 'How the hook, callback, priority and argument count fit together.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/sanitize_title/',
      title: 'sanitize_title() — WordPress developer reference',
      description: 'How WooCommerce derives a fee id from your fee name, and why two names can collide.',
    },
    {
      href: 'https://woocommerce.com/document/coupon-management/',
      title: 'Coupon management — WooCommerce docs',
      description: 'When a coupon is the right tool for a discount instead of a negative fee.',
    },
  ],

  faqTitle: 'Cart fees & discounts — frequently asked questions',
  faqIntro: 'The questions that come up most often when adding conditional fees to a WooCommerce store.',
  faqs: [
    {
      question: 'Can I charge a cart fee only for one payment method?',
      answer:
        "Yes — add a gateway condition to the rule and the generator reads `WC()->session->get( 'chosen_payment_method' )` for you. It also emits the small script that triggers `update_checkout` when the shopper switches method, which is the step most snippets leave out.",
    },
    {
      question: 'How do I create a discount rather than a surcharge?',
      answer:
        'Switch the rule to a discount and the amount is passed to `add_fee()` as a negative number. It works, but a coupon is usually the better answer when the shopper should see a named saving — the generator says so, and can output the programmatic coupon alternative next to your code.',
    },
    {
      question: 'Are WooCommerce cart fees taxable?',
      answer:
        'Only if you say so. The third argument of `add_fee()` controls it and defaults to `false` in the generated code. Marking a negative fee as taxable is flagged as a warning, because a taxable discount distorts the tax lines on the order.',
    },
    {
      question: 'Where should I paste the generated PHP?',
      answer:
        "A child theme's `functions.php`, a code snippets plugin, or the standalone plugin file the generator can produce. Never the parent theme — an update will erase it. Pick the matching output mode before you copy.",
    },
    {
      question: "Why doesn't the fee update until the page reloads?",
      answer:
        'Checkout only recalculates when something asks it to. Fees that depend on the gateway, the shipping method or the address need an `update_checkout` trigger; without one WooCommerce keeps showing the total it last calculated.',
    },
    {
      question: 'Can I add several fees at once?',
      answer:
        'As many as you need — each rule becomes its own `add_fee()` call with its own conditions. Give every fee a distinct name: WooCommerce derives the fee id from the name, so two similar names can collide and silently drop one of the fees. The generator checks for that.',
    },
  ],

  related: [
    { id: 'wc-product-fields', note: 'Add custom fields to the Product Data box — an existing tab or a new one — and save their values.' },
    { id: 'wc-checkout-fields', note: 'Collect the extra checkout data your fee conditions might read.' },
    { id: 'wc-shipping-method', note: 'Build the shipping method your fee rules match on by id.' },
    { id: 'hooks', note: 'Correctly signed callbacks with the right priority and accepted argument count.' },
    { id: 'user-role', note: 'Create the wholesale or trade role your fee conditions check for.' },
    { id: 'plugin-header', note: 'Wrap the generated fee logic in a proper, updatable plugin file.' },
  ],
};
