import type { ToolContent } from '../toolContentTypes';

export const wcShippingMethodContent: ToolContent = {
  aboutTitle: 'Shipping Method Generator Online',
  aboutLead:
    'Generate a WooCommerce custom shipping method as a complete `WC_Shipping_Method` subclass — constructor, `init()`, `init_form_fields()` and `calculate_shipping()` — plus the two registrations that make it selectable inside a shipping zone. The class is declared on `woocommerce_shipping_init`, so it is never parsed before WooCommerce’s own base class exists.',
  aboutSupport:
    'The Reference tab explains the parts of the API that are easy to get wrong: the difference between `id` and `instance_id`, why `init_settings()` has to run before any `get_option()` call, and when to use `instance_form_fields` rather than `form_fields`. Free to use, no account, nothing uploaded.',
  spec: {
    hook: 'WC_Shipping_Method + woocommerce_shipping_methods',
    outputs: 'A snippet, a `functions.php` block, or a standalone plugin file',
    requires: 'WooCommerce 2.6 or newer (shipping zones), PHP 7.4+',
  },

  whyTitle: 'Why the shipping method generator beats copying a WC_Shipping_Method skeleton',
  whyIntro:
    'The skeletons floating around the web are usually a decade old: they define the class at file scope so it fatals on any site where WooCommerce is inactive, they put settings in `form_fields` where a zone-based method needs `instance_form_fields`, and they call `get_option()` in a constructor that has not run `init_settings()` yet — which returns the default, silently, forever. This generator writes the modern shape and explains the ordering rules in the Reference tab.',
  features: [
    {
      title: 'Declared inside woocommerce_shipping_init',
      body: 'The class definition sits in a function hooked to `woocommerce_shipping_init` and guarded with `class_exists()`. WooCommerce fires that hook only once its own `WC_Shipping_Method` base class is loaded, so the file can never fatal on a site with WooCommerce deactivated.',
    },
    {
      title: 'init() before get_option(), always',
      body: 'The constructor calls `init()`, which runs `init_form_fields()` and then `init_settings()` before reading a single `get_option()`. That order is what makes saved settings actually appear on `$this->title` and `$this->cost` — read them before `init_settings()` and you silently get the defaults.',
    },
    {
      title: 'Zone-aware settings',
      body: "The method declares `array( 'shipping-zones', 'instance-settings' )` in `$this->supports` and puts its fields in `instance_form_fields`, so each zone that adds the method keeps its own cost and title rather than sharing one global value.",
    },
    {
      title: 'Extra settings fields you define',
      body: 'Add as many text, number, checkbox or select fields as the method needs. Each becomes a real entry in `instance_form_fields` with a title, type, default and optional `desc_tip` description, and is read back into a property inside `init()`.',
    },
    {
      title: 'A tax status you choose deliberately',
      body: "Taxable emits `'taxes' => ''` so WooCommerce calculates tax on the rate; non-taxable emits `'taxes' => false`. The choice is visible in the generated `calculate_shipping()` rather than left to a default nobody remembers.",
    },
    {
      title: 'Checks for the mistakes that cost real time',
      body: 'A missing method id or title is an error, because the id becomes part of the rate id stored on every order. Duplicate extra-field keys are an error, a select with no choices is an error with a one-click fix, and a non-numeric default cost is a warning.',
    },
  ],

  howTitle: 'How does the Shipping Method Generator work?',
  howIntro:
    'Four steps. Identify the method, set its default cost and tax treatment, add any extra settings, then export.',
  steps: [
    {
      title: 'Identify the method',
      body: 'Set the method id, the title shown when adding it to a zone, and the description under it. Set the function prefix and text domain; the class name is derived from these and shown as you type.',
    },
    {
      title: 'Set the cost and tax status',
      body: 'Give the method a default cost — the store owner can change it per zone — and choose whether the rate is taxable or not. This is what `calculate_shipping()` passes to `add_rate()`.',
    },
    {
      title: 'Add extra settings fields',
      body: 'Optional. Add any further per-zone settings the method needs: a handling fee, a free-over threshold, a courier picker. Each gets a key, label, type, default and description.',
    },
    {
      title: 'Clear the checks, then export',
      body: 'Resolve anything flagged, then copy the snippet or download it as a `functions.php` block or a plugin file. Remember the method still has to be added to a zone under WooCommerce → Settings → Shipping.',
    },
  ],
  example: {
    title: 'Worked example — a flat extra cost, taxable, per zone',
    intro:
      'The class body as the tool writes it. `init_form_fields()` is omitted here for length; everything else is verbatim.',
    code: `class Acme_Flat_Extra_Shipping_Method extends WC_Shipping_Method {

\tpublic function __construct( $instance_id = 0 ) {
\t\t$this->id                 = 'acme_flat_extra';
\t\t$this->instance_id        = absint( $instance_id );
\t\t$this->method_title       = __( 'Flat Rate Extra', 'acme' );
\t\t$this->method_description = __( 'A flat additional cost added at checkout.', 'acme' );
\t\t$this->supports           = array( 'shipping-zones', 'instance-settings' );

\t\t$this->init();
\t}

\tpublic function init() {
\t\t$this->init_form_fields();
\t\t$this->init_settings();

\t\t$this->title = $this->get_option( 'title' );
\t\t$this->cost  = $this->get_option( 'cost' );

\t\tadd_action( 'woocommerce_update_options_shipping_' . $this->id, array( $this, 'process_admin_options' ) );
\t}

\tpublic function calculate_shipping( $package = array() ) {
\t\t$rate = array(
\t\t\t'id'      => $this->get_rate_id(),
\t\t\t'label'   => $this->title,
\t\t\t'cost'    => $this->cost,
\t\t\t'package' => $package,
\t\t\t'taxes'   => '', // Let WooCommerce calculate tax on this rate.
\t\t);

\t\t$this->add_rate( $rate );
\t}
}`,
    note:
      'The generator also emits a `woocommerce_shipping_methods` filter that maps `acme_flat_extra` to the class name. Registering the method does not place it anywhere — it becomes available to add to a zone, and until someone adds it, no shopper will ever see the rate.',
  },
  refLinks: [
    {
      href: 'https://developer.woocommerce.com/docs/features/shipping/shipping-method-api/',
      title: 'Shipping Method API — WooCommerce developer docs',
      description: 'The official guide to extending WC_Shipping_Method, including zones, instances and rate calculation.',
    },
    {
      href: 'https://woocommerce.github.io/code-reference/classes/WC-Shipping-Method.html',
      title: 'WC_Shipping_Method in the code reference',
      description: 'Every property and method on the base class, including add_rate(), get_rate_id() and process_admin_options().',
    },
    {
      href: 'https://woocommerce.github.io/code-reference/classes/WC-Shipping-Rate.html',
      title: 'WC_Shipping_Rate in the code reference',
      description: 'The object add_rate() builds from your array, and the shape of its taxes and meta data.',
    },
    {
      href: 'https://developer.woocommerce.com/docs/extensions/settings-and-config/settings-api/',
      title: 'WooCommerce Settings API',
      description: 'How init_form_fields(), init_settings() and get_option() fit together on a settings-backed class.',
    },
    {
      href: 'https://woocommerce.github.io/code-reference/classes/WC-Settings-API.html',
      title: 'WC_Settings_API in the code reference',
      description: 'The parent of every shipping method and gateway settings screen, with the full field-type list.',
    },
    {
      href: 'https://woocommerce.github.io/code-reference/hooks/hooks.html',
      title: 'WooCommerce hook reference',
      description: 'woocommerce_shipping_init, woocommerce_shipping_methods and the package filters around rate calculation.',
    },
  ],

  faqTitle: 'WooCommerce custom shipping methods — frequently asked questions',
  faqIntro: 'The questions that come up when building a shipping method rather than configuring one.',
  faqs: [
    {
      question: 'Why does my shipping method not appear at checkout?',
      answer:
        'Registering the class only makes the method available; it does not place it. Go to WooCommerce → Settings → Shipping, open the relevant zone and add the method there. If it is added and still not shown, check that `calculate_shipping()` actually calls `add_rate()` on that package — a method that adds no rate is simply not offered.',
    },
    {
      question: 'Why does get_option() return the default instead of my saved setting?',
      answer:
        'Because it ran before `init_settings()`. `init_settings()` is what loads the saved values out of the database into the object, so any `$this->get_option()` call has to come after it. The generated `init()` runs `init_form_fields()` then `init_settings()` then the reads, in that order, for exactly this reason.',
    },
    {
      question: 'What is the difference between id and instance_id?',
      answer:
        '`id` identifies the method type and is shared by every zone that uses it — it is what you register in the `woocommerce_shipping_methods` filter. `instance_id` identifies one specific placement of that method in one specific zone. Settings are stored per instance, so `get_option()` returns the values for that zone, and `get_rate_id()` combines both into the rate id stored on the order.',
    },
    {
      question: 'Should I use form_fields or instance_form_fields?',
      answer:
        'Use `instance_form_fields` for anything zone-based, which is the normal case and what this generator emits. `form_fields` is for settings that apply globally to the method regardless of zone; a method that declares `shipping-zones` in `$this->supports` and puts its cost in `form_fields` will appear to ignore per-zone configuration.',
    },
    {
      question: 'Can one shipping method offer several rates?',
      answer:
        'Yes. `calculate_shipping()` may call `$this->add_rate()` more than once, and each call becomes a separate option in the shopper’s list. Give each rate a distinct id — usually `$this->get_rate_id()` with a suffix — otherwise later rates overwrite earlier ones.',
    },
    {
      question: 'How do I make a shipping rate free above a certain cart total?',
      answer:
        "Read the package inside `calculate_shipping()`: `$package['contents_cost']` is the cart subtotal for that package. Compare it with your threshold and either skip the `add_rate()` call or add the rate with a cost of zero. Because it is your own class, the condition can be as specific as you need — destination, weight, shipping class or a per-zone setting you added.",
    },
  ],

  related: [
    { id: 'wc-cart-fee', note: 'Add a surcharge that only applies when this shipping method is the chosen one.' },
    { id: 'wc-payment-gateway', note: 'The same settings-backed class pattern, on the payments side of checkout.' },
    { id: 'wc-order-query', note: 'Find the orders that used this method by querying on its rate id.' },
    { id: 'wc-checkout-fields', note: 'Collect the extra delivery details a custom method needs from the shopper.' },
    { id: 'settings-page', note: 'The WordPress Settings API equivalent, for options that belong outside the WooCommerce settings screens.' },
    { id: 'plugin-header', note: 'Ship the method as a plugin, which is the only sensible home for a class this size.' },
  ],
};
