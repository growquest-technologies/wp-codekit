import type { ToolContent } from '../toolContentTypes';

export const wcProductFieldsContent: ToolContent = {
  aboutTitle: 'Product Fields Generator Online',
  aboutLead:
    'Build a WooCommerce custom product field — a manufacturer part number, an assembly-difficulty select, a care-instructions textarea — and get the markup, the sanitiser and the save handler as one coherent block of PHP. Fields go into the General, Inventory or Shipping tab, or into a brand-new Product Data tab registered through `woocommerce_product_data_tabs` and `woocommerce_product_data_panels`.',
  aboutSupport:
    'The Preview tab draws the actual Product Data metabox — the tab rail, the label column, the input WooCommerce would render for each field type — so you can see the panel before pasting anything into a live store. Free to use, no account, and nothing you type leaves the browser.',
  spec: {
    hook: 'woocommerce_process_product_meta',
    outputs: 'A snippet, a `functions.php` block, or a standalone plugin file',
    requires: 'WooCommerce 3.0 or newer (CRUD product objects), PHP 7.4+',
  },

  whyTitle: 'Why the Product Fields Generator beats a copy-pasted woocommerce_wp_text_input snippet',
  whyIntro:
    'The usual snippet is one `woocommerce_wp_text_input()` call plus an `update_post_meta()` line, and it works right up until the meta key collides with something WooCommerce already owns, or the select saves a value that was never in its own options list. This generator writes the render side and the save side together, picks the right sanitiser per field type, and audits the meta keys before you paste anything near a catalogue.',
  features: [
    {
      title: 'Core meta keys are blocked outright',
      body: 'Twenty-eight of WooCommerce’s own keys — `_price`, `_regular_price`, `_sale_price`, `_sku`, `_stock`, `_weight`, `_tax_class` and the rest — raise a hard error, with the message naming what you would corrupt: pricing, stock levels or product data.',
    },
    {
      title: 'A sanitiser chosen per field type',
      body: 'Text emits `wc_clean()`, textarea `sanitize_textarea_field()`, number `absint()`, price `wc_format_decimal()`, URL `esc_url_raw()`, and a select is checked against `in_array()` on its own option values before it is allowed to save.',
    },
    {
      title: 'CRUD writes, not raw postmeta',
      body: 'The save handler uses `$product->update_meta_data()` followed by one `$product->save()`. The legacy `update_post_meta()` path is still offered, but it is flagged as a recommendation with a one-click switch, because it bypasses the product object WooCommerce may already hold in memory for that save.',
    },
    {
      title: 'Reserved tab ids caught before they overwrite core',
      body: 'A new Product Data tab whose id resolves to `general`, `inventory`, `shipping`, `linked_product`, `attribute`, `variations` or `advanced` is rejected, and a tab with no label is an error rather than a blank pill in the rail.',
    },
    {
      title: 'A real Product Data metabox preview',
      body: 'The Preview tab renders the tab rail with your new tab in place, the label column, tooltips as the grey ? icon, and the exact input control WooCommerce draws for each type — text, textarea, checkbox or select with your parsed choices.',
    },
    {
      title: 'Optional REST and block-editor exposure',
      body: "Switch it on and every field also gets a `register_post_meta()` call on the `product` post type, typed as string, number or boolean, with an `auth_callback` that checks `current_user_can( 'edit_product', $post_id )` for that specific product.",
    },
  ],

  howTitle: 'How does the Product Fields Generator work?',
  howIntro:
    'Four steps. Say where the fields live, describe them, choose how they are written and shown, then export.',
  steps: [
    {
      title: 'Choose the placement',
      body: 'Pick an existing tab (General, Inventory, Shipping) or a new one, set the tab label and id if it is new, then set the meta key prefix, function prefix and text domain. Optionally limit the fields to Simple, Variable, Grouped or External products.',
    },
    {
      title: 'Add the fields',
      body: 'For each field give an id, a label and a type. Add a description, turn it into a tooltip, and for a select list the choices as `value:Label` pairs. The full meta key is shown as you type, prefix included.',
    },
    {
      title: 'Set the save and display behaviour',
      body: 'Keep the CRUD save method, decide whether the values print on the single product page (after the SKU row or after the short description), whether empty values are hidden, and whether the keys are cleaned up on uninstall.',
    },
    {
      title: 'Clear the checks, then export',
      body: 'Fix anything flagged in the Checks tab — colliding keys, an empty select, a reserved tab id — then copy the snippet or download it as a `functions.php` block or a standalone plugin file.',
    },
  ],
  example: {
    title: 'Worked example — a manufacturer part number on the General tab',
    intro:
      'One text field in the General tab, limited to Simple and Variable products, saved through the product object. Doc blocks trimmed; everything else is exactly what the tool emits.',
    code: `function acme_add_product_fields() {
\techo '<div class="options_group show_if_simple show_if_variable">';

\twoocommerce_wp_text_input( array(
\t\t'id'          => '_acme_manufacturer_part_no',
\t\t'label'       => __( 'Manufacturer part number', 'acme' ),
\t\t'desc_tip'    => true,
\t\t'description' => __( 'Printed on the packing slip.', 'acme' ),
\t) );

\techo '</div>';
}
add_action( 'woocommerce_product_options_general_product_data', 'acme_add_product_fields' );

function acme_save_product_fields( $post_id ) {
\t$product = wc_get_product( $post_id );

\tif ( ! $product ) {
\t\treturn;
\t}

\tif ( isset( $_POST['_acme_manufacturer_part_no'] ) ) {
\t\t$product->update_meta_data( '_acme_manufacturer_part_no', wc_clean( wp_unslash( $_POST['_acme_manufacturer_part_no'] ) ) );
\t}

\t$product->save();
}
add_action( 'woocommerce_process_product_meta', 'acme_save_product_fields' );`,
    note:
      'There is no nonce check and no capability check in the save handler, and that is deliberate. `WC_Meta_Box_Product_Data::save()` runs first, verifies the `woocommerce_meta_nonce` field, bails on autosaves and revisions, and checks `edit_post` for that product — only then does it fire `woocommerce_process_product_meta`. The Reference tab spells out that sequence.',
  },
  refLinks: [
    {
      href: 'https://woocommerce.github.io/code-reference/files/woocommerce-includes-admin-wc-meta-box-functions.html',
      title: 'wc-meta-box-functions.php — WooCommerce code reference',
      description: 'The definitions of woocommerce_wp_text_input(), woocommerce_wp_select(), woocommerce_wp_checkbox() and the rest, with every argument they accept.',
    },
    {
      href: 'https://woocommerce.github.io/code-reference/classes/WC-Product.html',
      title: 'WC_Product in the code reference',
      description: 'update_meta_data(), get_meta() and save() — the CRUD methods this generator writes against.',
    },
    {
      href: 'https://developer.woocommerce.com/docs/features/products/',
      title: 'Products — WooCommerce developer documentation',
      description: 'How WooCommerce models products, product types and their data.',
    },
    {
      href: 'https://developer.woocommerce.com/docs/features/products/adding-a-custom-field-to-variable-products/',
      title: 'Adding a custom field to variable products',
      description: 'The separate hooks you need when a value has to differ per variation rather than per product.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/register_post_meta/',
      title: 'register_post_meta() — WordPress developer reference',
      description: 'The function behind the optional REST and block-editor exposure, including show_in_rest and auth_callback.',
    },
    {
      href: 'https://woocommerce.github.io/code-reference/hooks/hooks.html',
      title: 'WooCommerce hook reference',
      description: 'Every action and filter in core, including the product data tab, panel and save hooks.',
    },
  ],

  faqTitle: 'WooCommerce custom product fields — frequently asked questions',
  faqIntro: 'The questions that come up most often when adding fields to the Product Data metabox.',
  faqs: [
    {
      question: 'Why is my custom product field not saving?',
      answer:
        'Almost always because the input’s `id` and the `$_POST` key you read do not match, or because the handler is not on `woocommerce_process_product_meta`. `woocommerce_wp_text_input()` uses the `id` argument as the field name, so the save handler must read `$_POST` with that same string. Checkboxes are the other common cause: an unchecked box posts nothing at all, so it must be handled with `isset()` rather than an equality test.',
    },
    {
      question: 'Do I need a nonce check when saving on woocommerce_process_product_meta?',
      answer:
        'No. WooCommerce’s own product data metabox handler runs first: it verifies the `woocommerce_meta_nonce` field, skips autosaves and revisions, and checks that the current user can edit that specific product. Only after all of that does it fire `woocommerce_process_product_meta`. Adding your own nonce check there is harmless but redundant.',
    },
    {
      question: 'Should product meta keys start with an underscore?',
      answer:
        'It is the convention WooCommerce itself follows, and this generator defaults to it. An underscore marks the key as protected, which hides it from the generic Custom Fields panel. On products that panel is disabled anyway, so the underscore is about consistency with core rather than about hiding data. What matters far more is that the key is namespaced with your own prefix so it can never collide with `_price`, `_sku` or `_stock`.',
    },
    {
      question: 'Can I add a custom field to a specific product type only?',
      answer:
        'Yes, with two caveats. Selecting product types adds `show_if_simple`, `show_if_variable` and similar classes to the wrapper, which is CSS-level hiding, and the generated save handler additionally checks `$product->get_type()` before writing anything. The tab itself still opens for every product type — only the fields inside it are hidden and skipped.',
    },
    {
      question: 'How do I add a custom field to a product variation instead?',
      answer:
        'A field added to the Product Data tabs lives on the parent product and is shared by every variation. A per-variation field is a different box entirely: render it on `woocommerce_variation_options_pricing` or `woocommerce_product_after_variable_attributes`, and save it on `woocommerce_save_product_variation`, which passes both the variation id and its loop index.',
    },
    {
      question: 'What value does a WooCommerce checkbox field actually store?',
      answer:
        "The string `yes` or `no`, never `1` or `0` — that is woocommerce_wp_checkbox()'s own convention, and the generated save handler follows it. Read it back with a strict comparison such as `'yes' === $product->get_meta( $key, true )`. A loose truthy test is wrong here, because the string `'0'` is falsy in PHP while the string `'no'` is not.",
    },
  ],

  related: [
    { id: 'wc-product-tabs', note: 'Show these values in their own tab on the single product page, not just in the admin.' },
    { id: 'wc-cart-fee', note: 'Charge a surcharge based on a product field you just added, such as an assembly flag.' },
    { id: 'wc-checkout-fields', note: 'The checkout-side equivalent, for data collected from the shopper rather than the store owner.' },
    { id: 'post-meta', note: 'The register_post_meta() call behind the REST toggle, with full control over type, schema and auth.' },
    { id: 'meta-box', note: 'The same idea for a non-product post type, where you do have to write the nonce and capability checks yourself.' },
    { id: 'plugin-header', note: 'Wrap the generated fields in a proper, updatable plugin instead of a theme file.' },
  ],
};
