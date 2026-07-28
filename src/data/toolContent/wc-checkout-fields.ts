import type { ToolContent } from '../toolContentTypes';

export const wcCheckoutFieldsContent: ToolContent = {
  aboutTitle: 'Checkout Fields Generator Online',
  aboutLead:
    'A WooCommerce checkout field generator that writes both halves of the job: the field itself and the code that stores what the shopper typed. Pick classic checkout and you get a `woocommerce_checkout_fields` filter plus a save handler on `woocommerce_checkout_create_order`; pick Blocks checkout and you get `woocommerce_register_additional_checkout_field()` calls with correctly namespaced ids.',
  aboutSupport:
    'Switching output mode rewrites the whole file, because the two checkouts are genuinely different APIs rather than two flavours of the same one. Free to use, no account, and nothing you enter leaves the browser.',
  spec: {
    hook: 'woocommerce_checkout_fields / woocommerce_register_additional_checkout_field()',
    outputs: 'A standalone plugin file, in classic or Blocks flavour',
    requires: 'WooCommerce 3.0+ for classic, WooCommerce 8.9+ for the Blocks field API, PHP 7.4+',
  },

  whyTitle: 'Why the checkout field generator beats a functions.php one-liner',
  whyIntro:
    'Adding the field is the easy part. The snippets people find online stop at the `woocommerce_checkout_fields` filter and leave the value nowhere — not on the order, not in the admin, not in an email. And on a store running the Blocks Checkout, that filter does not render anything at all, because the block-based checkout never loads the classic form template. This generator writes the field, the save and the admin display together, in the flavour your store actually runs.',
  features: [
    {
      title: 'Two real output modes, not one with a caveat',
      body: 'Classic mode writes the `woocommerce_checkout_fields` filter with the section-keyed array WooCommerce expects. Blocks mode writes `woocommerce_register_additional_checkout_field()` calls on `woocommerce_init` instead — a different function, different locations, different storage.',
    },
    {
      title: 'Namespaced ids the Blocks API will accept',
      body: 'The Blocks field API rejects any id without a slash in it. The generator builds every id as `prefix/field-name` automatically, and shows you the exact `$order->get_meta()` call to read the value back.',
    },
    {
      title: 'A save handler that survives HPOS',
      body: 'Classic mode saves on `woocommerce_checkout_create_order`, before the order row is written, using `$order->update_meta_data()`. That works identically whether the order ends up in `wp_posts` or in the High-Performance Order Storage tables — unlike a `woocommerce_checkout_update_order_meta` handler calling `update_post_meta()`.',
    },
    {
      title: 'The values actually appear on the order screen',
      body: 'Any billing field gets a display callback on `woocommerce_admin_order_data_after_billing_address`, and shipping fields get one on `woocommerce_admin_order_data_after_shipping_address`, so the data is visible to whoever packs the order.',
    },
    {
      title: 'Collisions and empty selects are caught',
      body: 'Two fields that resolve to the same `location_key` combination are an error, because the second silently overwrites the first. A select with no choices is an error too, with a one-click fix that adds two placeholder options.',
    },
    {
      title: 'An honest note about running both',
      body: 'The Checks tab always reminds you that classic and Blocks are separate rendering paths — a store where any shopper could still land on a shortcode checkout needs both outputs, not one instead of the other.',
    },
  ],

  howTitle: 'How does the Checkout Fields Generator work?',
  howIntro:
    'Four steps. Choose the checkout you are targeting, describe the fields, set the naming, then export.',
  steps: [
    {
      title: 'Pick the output mode',
      body: 'Classic checkout or Blocks checkout. This changes which locations are available: billing, shipping and order notes for classic; address, contact info and additional order info for Blocks.',
    },
    {
      title: 'Add the fields',
      body: 'Give each field a key, a label and a type — text, select or checkbox. Set its location, mark it required if it is, add a placeholder, and for a select list the choices as `value:Label` pairs.',
    },
    {
      title: 'Set the naming',
      body: 'Choose the function prefix and text domain. These become the generated function names, the translation domain on every label, and in Blocks mode the namespace in front of every field id.',
    },
    {
      title: 'Clear the checks, then export',
      body: 'Resolve any duplicate keys, missing labels or empty selects flagged in the Checks tab, then copy the file or download it as a ready plugin.',
    },
  ],
  example: {
    title: 'Worked example — an optional VAT number on classic checkout',
    intro:
      'One optional billing text field, saved onto the order before it is written. Doc blocks and the admin display callback trimmed for length; everything else is exactly what classic mode emits.',
    code: `function acme_checkout_fields( $fields ) {
\t$fields['billing']['billing_vat_id'] = array(
\t\t'label'       => __( 'VAT number', 'acme' ),
\t\t'required'    => false,
\t\t'class'       => array( 'form-row-wide' ),
\t\t'placeholder' => __( 'e.g. GB123456789', 'acme' ),
\t);

\treturn $fields;
}
add_filter( 'woocommerce_checkout_fields', 'acme_checkout_fields' );

function acme_save_checkout_fields( $order, $data ) {
\tif ( ! empty( $_POST['billing_vat_id'] ) ) {
\t\t$order->update_meta_data( '_billing_vat_id', sanitize_text_field( wp_unslash( $_POST['billing_vat_id'] ) ) );
\t}
}
add_action( 'woocommerce_checkout_create_order', 'acme_save_checkout_fields', 10, 2 );`,
    note:
      'The same field in Blocks mode is a single `woocommerce_register_additional_checkout_field()` call on `woocommerce_init` with the id `acme/vat-id` — the slash is mandatory — and no save handler at all, because WooCommerce persists additional checkout fields itself.',
  },
  refLinks: [
    {
      href: 'https://developer.woocommerce.com/docs/block-development/extensible-blocks/cart-and-checkout-blocks/additional-checkout-fields/',
      title: 'Additional checkout fields — WooCommerce developer docs',
      description: 'The official reference for woocommerce_register_additional_checkout_field(), its locations, types and id rules.',
    },
    {
      href: 'https://developer.woocommerce.com/docs/block-development/tutorials/how-to-additional-checkout-fields-guide/',
      title: 'How to add additional checkout fields — guide',
      description: 'A worked walkthrough of registering, validating and reading a Blocks checkout field.',
    },
    {
      href: 'https://developer.woocommerce.com/docs/code-snippets/customising-checkout-fields/',
      title: 'Customising checkout fields using actions and filters',
      description: 'The classic-checkout filters, including woocommerce_checkout_fields and the per-section variants.',
    },
    {
      href: 'https://woocommerce.github.io/code-reference/classes/WC-Order.html',
      title: 'WC_Order in the code reference',
      description: 'update_meta_data() and get_meta() — how the generated code writes and reads the field on an order.',
    },
    {
      href: 'https://developer.woocommerce.com/docs/features/orders/high-performance-order-storage/',
      title: 'High-Performance Order Storage — WooCommerce developer docs',
      description: 'Why order meta must be written through the order object rather than update_post_meta().',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/sanitize_text_field/',
      title: 'sanitize_text_field() — WordPress developer reference',
      description: 'The sanitiser applied to every posted value in the generated classic save handler.',
    },
  ],

  faqTitle: 'WooCommerce checkout fields — frequently asked questions',
  faqIntro: 'The questions store builders ask most often when adding fields to checkout.',
  faqs: [
    {
      question: 'Why does my custom checkout field not show up on the Blocks Checkout?',
      answer:
        'Because the Blocks Checkout does not render the classic checkout templates, so the `woocommerce_checkout_fields` filter never runs. Fields for the block-based checkout must be registered with `woocommerce_register_additional_checkout_field()` on the `woocommerce_init` hook. The two systems are independent: a field added to one does not appear in the other.',
    },
    {
      question: 'Do I need both the classic and the Blocks version?',
      answer:
        'If any shopper can still reach a shortcode-based checkout page — an older checkout page, a payment-specific flow, a plugin that redirects to one — then yes, you need both, and both should write to a meta key you agree on up front. If the store has fully migrated to the Cart and Checkout blocks, the Blocks registration alone is enough.',
    },
    {
      question: 'Where is the value of a custom checkout field stored?',
      answer:
        "On the order, as order meta. The generated classic handler writes it with `$order->update_meta_data()` inside `woocommerce_checkout_create_order`, which runs before the order is saved, so one write covers both storage backends. Read it back later with `$order->get_meta( '_billing_vat_id' )`. Blocks fields are stored and read by WooCommerce itself under the namespaced id.",
    },
    {
      question: 'How do I make a custom checkout field required?',
      answer:
        'In classic mode set `required` to `true` in the field array and WooCommerce enforces it in its own checkout validation, showing the standard error notice. In Blocks mode set the `required` key on the registration call. Marking a field required does not retroactively affect orders already placed without it.',
    },
    {
      question: 'Why is my checkout field value missing from the order confirmation email?',
      answer:
        'Saving the value onto the order does not print it anywhere. The order edit screen needs a callback on `woocommerce_admin_order_data_after_billing_address` — which this generator writes for you — and emails need a separate hook such as `woocommerce_email_order_meta_fields` or `woocommerce_email_order_meta`. Nothing surfaces order meta automatically.',
    },
    {
      question: 'Can I add a field to the shipping section only?',
      answer:
        "Yes. In classic mode choose the shipping location and the field is added to `$fields['shipping']`, which WooCommerce only renders when the order is being shipped to a different address. In Blocks mode the equivalent location is `address`, which applies to both billing and shipping — the Blocks API has no shipping-only location.",
    },
  ],

  related: [
    { id: 'wc-cart-fee', note: 'Charge a surcharge or apply a discount based on what the shopper entered at checkout.' },
    { id: 'wc-order-query', note: 'Find the orders that carry your new field using an HPOS-safe meta clause.' },
    { id: 'wc-email', note: 'Print the collected value in a transactional email through your own template.' },
    { id: 'wc-product-fields', note: 'The admin-side equivalent, for data the store owner enters on the product.' },
    { id: 'hooks', note: 'Correctly signed callbacks when you need to extend the checkout beyond a field.' },
    { id: 'plugin-header', note: 'The plugin file header the generated checkout code already ships inside.' },
  ],
};
