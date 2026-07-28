import type { ToolContent } from '../toolContentTypes';

export const wcPaymentGatewayContent: ToolContent = {
  aboutTitle: 'Payment Gateway Generator Online',
  aboutLead:
    'A WooCommerce payment gateway boilerplate that is actually complete: a `WC_Payment_Gateway` subclass with its settings fields, a `process_payment()` that returns the result array WooCommerce requires, and the `woocommerce_payment_gateways` registration. Choose an offline gateway — bank transfer, pay on collection, invoice — or a redirect gateway that sends the shopper to a processor and comes back through a webhook.',
  aboutSupport:
    'The Reference tab covers the four things that decide whether a gateway works in production: the exact `process_payment()` return shape, when to use `update_status()` versus `payment_complete()`, why stock is reduced with `wc_reduce_stock_levels()`, and how the `woocommerce_api_{class}` webhook endpoint is dispatched. Free to use, no account, nothing uploaded.',
  spec: {
    hook: 'WC_Payment_Gateway + woocommerce_payment_gateways',
    outputs: 'A standalone plugin file, in offline or redirect flavour',
    requires: 'WooCommerce 3.0 or newer, PHP 7.4+',
  },

  whyTitle: 'Why this payment gateway boilerplate beats the tutorial you were about to copy',
  whyIntro:
    'Most gateway tutorials stop at the settings screen. The parts that break in production are further down: a `process_payment()` that returns the wrong shape leaves the shopper on a spinning Place Order button with no error; a hand-built redirect URL skips `get_return_url()` and lands them on a page that does not know the order; calling `payment_complete()` for money that has not arrived marks unpaid orders as paid. This generator writes those parts correctly and names the trade-offs in the code.',
  features: [
    {
      title: 'A process_payment() that returns the right array',
      body: "Both modes end with `array( 'result' => 'success', 'redirect' => ... )`. Offline mode redirects through `$this->get_return_url( $order )`, which applies the `woocommerce_get_return_url` filter and honours force-SSL and multisite settings that a hand-built URL will not.",
    },
    {
      title: 'Offline mode does the whole offline dance',
      body: 'It sets the order to `on-hold` with a note, calls `wc_reduce_stock_levels( $order_id )` — the current, non-deprecated way — and empties the cart. Turn on instructions and you also get `thankyou_page()` and an `email_instructions()` callback that only prints while the order is still on hold and only to the customer.',
    },
    {
      title: 'Redirect mode ships a real webhook entry point',
      body: 'The constructor registers `woocommerce_api_` plus the lowercased class name, which is what WooCommerce dispatches when a request hits `?wc-api=YourClassName`. The handler loads the order, returns a 400 if it cannot, and marks the point where you must verify the processor’s signature before trusting the payload.',
    },
    {
      title: 'Settings fields wired to the Settings API',
      body: 'Enable/Disable, Title and Description in both modes; Instructions in offline mode; Test mode plus a `password`-type API key field in redirect mode. `process_admin_options()` is bound to `woocommerce_update_options_payment_gateways_` plus the gateway id so the screen saves.',
    },
    {
      title: 'Declared safely, registered once',
      body: 'The class is defined inside a `plugins_loaded` callback behind a `class_exists()` guard, so the file cannot fatal when WooCommerce is inactive, and the gateway is appended to the `woocommerce_payment_gateways` array rather than replacing it.',
    },
    {
      title: 'Checks on the fields that end up on every order',
      body: 'A missing gateway id is an error because it becomes the `payment_method` value stored on every order placed through it. A missing checkout title or admin method title is an error too, and instructions that are enabled but empty are flagged as a warning.',
    },
  ],

  howTitle: 'How does the Payment Gateway Generator work?',
  howIntro:
    'Four steps. Choose the flavour, name the gateway, fill in the mode-specific detail, then export.',
  steps: [
    {
      title: 'Choose offline or redirect',
      body: 'Offline builds a manual-confirmation gateway that puts the order on hold. Redirect builds one that sends the shopper to an external processor and confirms the payment through a webhook.',
    },
    {
      title: 'Name the gateway',
      body: 'Set the gateway id, the title the shopper sees next to the radio button at checkout, the method title and description shown in WooCommerce → Settings → Payments, and the checkout description under the title. The class name is derived from your prefix and shown as you type.',
    },
    {
      title: 'Fill in the mode-specific parts',
      body: 'Offline: write the payment instructions and decide whether they appear on the order-received page and in emails. Redirect: decide whether test mode is on by default, which adds the sandbox endpoint branch and the API key setting.',
    },
    {
      title: 'Clear the checks, then export',
      body: 'Resolve anything flagged, then copy or download the plugin file. Activate it and the gateway appears under WooCommerce → Settings → Payments, disabled until the store owner enables it.',
    },
  ],
  example: {
    title: 'Worked example — the offline process_payment()',
    intro:
      'The heart of an offline gateway, exactly as the tool emits it. The order goes on hold, stock comes down, the cart is cleared, and the shopper is sent to the order-received page.',
    code: `public function process_payment( $order_id ) {
\t$order = wc_get_order( $order_id );

\t$order->update_status( 'on-hold', __( 'Awaiting manual payment confirmation.', 'acme' ) );

\twc_reduce_stock_levels( $order_id );
\tWC()->cart->empty_cart();

\treturn array(
\t\t'result'   => 'success',
\t\t'redirect' => $this->get_return_url( $order ),
\t);
}`,
    note:
      "`update_status( 'on-hold' )` is correct here precisely because the money has not arrived yet. `payment_complete()` is reserved for a gateway that has verified the payment — it also fires `woocommerce_payment_complete`, which other plugins act on, so calling it for an unconfirmed offline payment triggers fulfilment that should not have started.",
  },
  refLinks: [
    {
      href: 'https://developer.woocommerce.com/docs/features/payments/payment-gateway-api/',
      title: 'Payment Gateway API — WooCommerce developer docs',
      description: 'The official reference for extending WC_Payment_Gateway, including supports flags and the payment flow.',
    },
    {
      href: 'https://developer.woocommerce.com/docs/features/payments/payment-gateway-plugin-base/',
      title: 'WooCommerce payment gateway plugin base',
      description: 'The canonical minimal gateway plugin, the same structure this generator emits.',
    },
    {
      href: 'https://woocommerce.github.io/code-reference/classes/WC-Payment-Gateway.html',
      title: 'WC_Payment_Gateway in the code reference',
      description: 'Every property and method on the base class, including get_return_url() and process_admin_options().',
    },
    {
      href: 'https://developer.woocommerce.com/docs/extensions/core-concepts/woocommerce-plugin-api-callback/',
      title: 'WooCommerce plugin API callback',
      description: 'How the wc-api query var dispatches to the woocommerce_api_{class} action used by redirect mode.',
    },
    {
      href: 'https://developer.woocommerce.com/docs/extensions/settings-and-config/settings-api/',
      title: 'WooCommerce Settings API',
      description: 'The field types available to init_form_fields() and how init_settings() populates get_option().',
    },
    {
      href: 'https://woocommerce.github.io/code-reference/classes/WC-Order.html',
      title: 'WC_Order in the code reference',
      description: 'update_status(), payment_complete(), get_total() and the other order methods a gateway calls.',
    },
  ],

  faqTitle: 'WooCommerce payment gateways — frequently asked questions',
  faqIntro: 'What developers ask when writing a gateway rather than installing one.',
  faqs: [
    {
      question: 'What must process_payment() return?',
      answer:
        'An array with a `result` key of `success` or `failure` and a `redirect` key holding the URL to send the shopper to. Anything else — returning nothing, returning `true`, echoing output — leaves the Place Order button spinning with no error, because the checkout AJAX response cannot be parsed. Build the success URL with `$this->get_return_url( $order )` rather than by hand.',
    },
    {
      question: 'Why does my custom payment gateway not appear at checkout?',
      answer:
        'Work through four things in order: the class must be added to the array returned by the `woocommerce_payment_gateways` filter; the gateway must be enabled in WooCommerce → Settings → Payments, since the generated default is `no`; `is_available()` must return true, which by default requires the gateway to be enabled and the cart total to be payable; and the gateway must support the products in the cart through its `$this->supports` array.',
    },
    {
      question: 'When should I call payment_complete() instead of update_status()?',
      answer:
        "Call `payment_complete()` only when you have confirmed that the money actually arrived — typically inside a verified webhook. It moves the order to processing or completed depending on the products, records the transaction, reduces stock and fires `woocommerce_payment_complete`, which other extensions listen for. For a payment you are still waiting on, use `update_status( 'on-hold', $note )` as the offline mode does.",
    },
    {
      question: 'How do I handle the webhook or IPN callback from a processor?',
      answer:
        'Register an action on `woocommerce_api_` followed by the lowercased class name in the constructor. WooCommerce dispatches it whenever a request hits `?wc-api=YourClassName`, before the theme loads. Inside the handler, verify the request against the processor’s signature or a shared secret *before* touching the order — an unverified handler that calls `payment_complete()` will mark any order paid for anyone who guesses the URL.',
    },
    {
      question: 'Can I use one gateway class in both test and live mode?',
      answer:
        'Yes, and that is what redirect mode generates: a `testmode` checkbox setting read into `$this->testmode` in the constructor, which then selects the sandbox or production endpoint when building the redirect URL. Keep separate API key settings for each environment if your processor issues different credentials, and never log the key.',
    },
    {
      question: 'Does a custom gateway work with the Checkout block?',
      answer:
        'The PHP class still handles the payment, but the block-based checkout does not render classic gateway markup. A gateway with no fields, like the offline one this generator produces, needs a small block integration registering it as a payment method so it appears in the block UI. A gateway with `has_fields` set to true needs a JavaScript component for its input fields.',
    },
  ],

  related: [
    { id: 'wc-order-status', note: 'Add the workflow status your gateway moves orders into after payment.' },
    { id: 'wc-email', note: 'Send your own transactional email when a gateway-specific status transition happens.' },
    { id: 'wc-shipping-method', note: 'The same settings-backed class pattern, on the shipping side of checkout.' },
    { id: 'wc-order-query', note: 'Query the orders placed through this gateway by payment method or a meta key it wrote.' },
    { id: 'rest-route', note: 'A namespaced, permission-checked REST endpoint when wc-api is too blunt for your callback.' },
    { id: 'plugin-header', note: 'The plugin header and bootstrap the gateway file needs, with Requires Plugins declared.' },
  ],
};
