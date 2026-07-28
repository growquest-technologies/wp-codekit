import type { ToolContent } from '../toolContentTypes';

export const wcEmailContent: ToolContent = {
  aboutTitle: 'WooCommerce Email Generator Online',
  aboutLead:
    'Build a WooCommerce custom email as a real `WC_Email` subclass — settings fields, a `trigger()` method, `get_content_html()` and `get_content_plain()` — plus the HTML template it renders and the `woocommerce_email_classes` registration that puts it in WooCommerce → Settings → Emails alongside the core notifications.',
  aboutSupport:
    'The Template tab holds the matching `templates/emails/` file, with its own copy button, already calling the `woocommerce_email_header`, `woocommerce_email_order_details` and `woocommerce_email_footer` actions so the email inherits the store’s branding. Free to use, no account, nothing uploaded.',
  spec: {
    hook: 'WC_Email + woocommerce_email_classes',
    outputs: 'A standalone plugin file, plus its HTML email template',
    requires: 'WooCommerce 3.0 or newer, PHP 7.4+',
  },

  whyTitle: 'Why the WooCommerce email generator beats extending WC_Email by hand',
  whyIntro:
    '`WC_Email` gives you a lot for free — the branded wrapper, the settings screen, the placeholder system — but only if four things line up: the class is registered on `woocommerce_email_classes`, `parent::__construct()` runs after your properties are set, the trigger hook actually fires, and `$this->template_base` points at your plugin. Miss the last one and `wc_get_template_html()` looks in the theme and then in WooCommerce’s own templates directory, finds nothing, and sends an empty email. This generator gets all four right.',
  features: [
    {
      title: 'template_base set to your own plugin',
      body: "The constructor sets `$this->template_base` to `plugin_dir_path( __FILE__ ) . 'templates/'`, and both content methods pass it as the fourth argument to `wc_get_template_html()`. Without it WooCommerce resolves the template against the theme and its own directory only, and an email with no template body is the result.",
    },
    {
      title: 'A trigger you choose, wired correctly',
      body: 'Pick an order status and the class hooks `woocommerce_order_status_{status}` with two accepted arguments, which WooCommerce fires itself on every transition. Pick a custom hook and you get the same wiring plus a comment showing the `do_action()` call your own code must make.',
    },
    {
      title: 'Customer and admin recipients handled differently',
      body: "A customer email sets `$this->customer_email = true` and reads the address off the order with `get_billing_email()` inside `trigger()`. An admin email adds a Recipient(s) settings field instead and falls back to `get_option( 'admin_email' )`, because an admin email has no order address to read.",
    },
    {
      title: 'A trigger() that follows core’s own shape',
      body: 'It calls `setup_locale()`, resolves the order from either the id or the object WooCommerce passed, bails through `restore_locale()` when the email is disabled or has no recipient, and only then calls `send()` with the full five arguments.',
    },
    {
      title: 'Both content methods, HTML and plain text',
      body: '`get_content_html()` and `get_content_plain()` are generated as a matching pair, each passing `order`, `email_heading`, `sent_to_admin`, `plain_text` and `email` to the template — the exact variables the WooCommerce email actions expect.',
    },
    {
      title: 'Timing warnings you would otherwise learn the hard way',
      body: 'A customer email triggered on `pending` or `failed` is flagged, because both fire before payment is confirmed. A custom trigger hook is flagged too, with a reminder that nothing will ever call `trigger()` unless your own code fires it.',
    },
  ],

  howTitle: 'How does the WooCommerce Email Generator work?',
  howIntro:
    'Four steps. Name the email, choose who gets it, choose what sends it, then export both files.',
  steps: [
    {
      title: 'Name the email',
      body: 'Set the email id, the title and description shown in WooCommerce → Settings → Emails, and the default heading and subject. Subject and heading support WooCommerce placeholders such as `{order_number}` and `{site_title}`.',
    },
    {
      title: 'Choose the recipient',
      body: 'Customer or admin. Customer reads the billing email off the order; admin adds a Recipient(s) settings field with a comma-separated list and falls back to the site admin address.',
    },
    {
      title: 'Choose the trigger',
      body: 'Either an order status — the email then fires on WooCommerce’s own `woocommerce_order_status_{status}` action with no extra code — or a custom hook name that your plugin fires with `do_action()`.',
    },
    {
      title: 'Export both files',
      body: 'Copy the class from the main tab and the template from the Template tab, and save the template at `templates/emails/your-email-id.php` inside the plugin so `template_base` resolves.',
    },
  ],
  example: {
    title: 'Worked example — the constructor of a customer email on order completion',
    intro:
      'The part that decides whether the email works at all: its id, its templates, its base path and its trigger. Note that `parent::__construct()` comes last.',
    code: `public function __construct() {
\t$this->id             = 'acme_loyalty_earned';
\t$this->customer_email = true;
\t$this->title          = __( 'Loyalty points earned', 'acme' );
\t$this->description    = __( 'Sent when an order is marked complete.', 'acme' );
\t$this->heading        = __( 'You earned loyalty points!', 'acme' );
\t$this->subject        = __( 'You earned points on order #{order_number}', 'acme' );

\t$this->template_html  = 'emails/acme-loyalty-earned.php';
\t$this->template_plain = 'emails/plain/acme-loyalty-earned.php';
\t$this->template_base  = plugin_dir_path( __FILE__ ) . 'templates/';

\tadd_action( 'woocommerce_order_status_completed', array( $this, 'trigger' ), 10, 2 );

\tparent::__construct();
}`,
    note:
      '`parent::__construct()` is what loads the settings, applies the saved subject and heading, and registers the email with the settings screen — so every property it should be able to override has to be set before it runs, not after.',
  },
  refLinks: [
    {
      href: 'https://woocommerce.github.io/code-reference/classes/WC-Email.html',
      title: 'WC_Email in the code reference',
      description: 'Every property and method on the base class, including get_content(), get_headers() and the template properties.',
    },
    {
      href: 'https://woocommerce.github.io/code-reference/classes/WC-Emails.html',
      title: 'WC_Emails in the code reference',
      description: 'The manager class that instantiates every registered email and dispatches the transactional hooks.',
    },
    {
      href: 'https://developer.woocommerce.com/docs/features/email/',
      title: 'Email — WooCommerce developer documentation',
      description: 'How WooCommerce composes, templates and sends transactional email.',
    },
    {
      href: 'https://developer.woocommerce.com/docs/features/email/email-html-best-practices/',
      title: 'Email HTML best practices',
      description: 'What markup survives real mail clients, which matters when writing the generated template.',
    },
    {
      href: 'https://developer.woocommerce.com/docs/theming/theme-development/template-structure/',
      title: 'Template structure and overriding templates',
      description: 'How wc_get_template_html() resolves a path across theme, template_base and WooCommerce core.',
    },
    {
      href: 'https://woocommerce.github.io/code-reference/files/woocommerce-includes-wc-core-functions.html',
      title: 'wc-core-functions.php — WooCommerce code reference',
      description: 'wc_get_template_html() and wc_get_template(), with the $template_path and $default_path arguments explained.',
    },
  ],

  faqTitle: 'WooCommerce custom emails — frequently asked questions',
  faqIntro: 'What developers run into when adding a transactional email of their own.',
  faqs: [
    {
      question: 'Why does my custom WooCommerce email arrive empty?',
      answer:
        'Almost always because `$this->template_base` was never set. `wc_get_template_html()` looks in the active theme’s `woocommerce/` folder, then in the path you pass as the fourth argument, then in WooCommerce’s own templates directory. A plugin template lives in none of those unless you point `template_base` at your plugin folder and pass it through — which is what the generated content methods do.',
    },
    {
      question: 'Why does my custom email not appear under WooCommerce → Settings → Emails?',
      answer:
        'The class has to be added to the array returned by the `woocommerce_email_classes` filter, keyed by class name and holding an instance, not a string. It also has to be defined by the time that filter runs, which is why the generated code declares it inside a `plugins_loaded` callback. If the class is defined but never registered, everything else in it is dead code.',
    },
    {
      question: 'How do I trigger a WooCommerce email on a custom order status?',
      answer:
        'WooCommerce fires `woocommerce_order_status_{status}` for every status transition, including custom ones, so a status of `awaiting-pickup` gives you `woocommerce_order_status_awaiting-pickup`. Hook `trigger()` to it with two accepted arguments — WooCommerce passes the order id and, in most paths, the order object. Choose the custom trigger option in this generator and the same wiring is produced for a hook of your own.',
    },
    {
      question: 'Which placeholders can I use in the subject and heading?',
      answer:
        '`WC_Email` runs the subject and heading through `format_string()`, which replaces `{site_title}`, `{site_address}`, `{order_date}` and `{order_number}` among others, and any additional placeholders you register in `$this->placeholders`. Use those rather than string concatenation, so a store owner editing the subject in the settings screen keeps the dynamic parts working.',
    },
    {
      question: 'Do I need both an HTML and a plain-text template?',
      answer:
        'Yes, if the store might be set to plain text or multipart in WooCommerce → Settings → Emails. `get_content_plain()` is called for those and would return nothing without a plain template, sending an empty message. The generator writes both `template_html` and `template_plain` paths; give the plain file the same content without markup.',
    },
    {
      question: 'How do I test a custom transactional email without placing real orders?',
      answer:
        'WooCommerce has a built-in email preview under WooCommerce → Settings → Emails, which renders your registered email with sample data. Beyond that, calling `WC()->mailer()` to make sure the classes are loaded and then firing your trigger hook manually with a real order id is the quickest end-to-end check. Use a mail-catching tool locally so nothing reaches a real customer.',
    },
  ],

  related: [
    { id: 'wc-order-status', note: 'Create the custom status whose transition hook fires this email.' },
    { id: 'wc-payment-gateway', note: 'Send your own confirmation when a gateway moves an order into its post-payment status.' },
    { id: 'wc-account-endpoint', note: 'Give customers a My Account tab showing the same information the email sends.' },
    { id: 'wc-order-query', note: 'Find the orders that should receive the email in a scheduled batch.' },
    { id: 'cron', note: 'Schedule the event that fires your custom trigger hook on a recurring basis.' },
    { id: 'plugin-header', note: 'The plugin file the email class and its templates directory need to live in.' },
  ],
};
