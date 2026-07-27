import { escPhp, withCredit, type ValidationIssue } from '../lib/codegen';

export type Recipient = 'customer' | 'admin';
export type Trigger = 'status' | 'custom';

export interface WcEmail {
  prefix: string;
  textDomain: string;
  emailId: string;
  title: string;
  description: string;
  heading: string;
  subject: string;
  recipient: Recipient;
  trigger: Trigger;
  triggerStatus: string;
  customHook: string;
  introText: string;
}

export const ORDER_STATUSES: [string, string][] = [
  ['pending', 'Pending payment'],
  ['processing', 'Processing'],
  ['on-hold', 'On hold'],
  ['completed', 'Completed'],
  ['cancelled', 'Cancelled'],
  ['refunded', 'Refunded'],
  ['failed', 'Failed'],
];

function fnSlug(s: string): string {
  return String(s || '').toLowerCase().trim().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
}
function dashSlug(s: string): string {
  return String(s || '').toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
}
function pascal(s: string): string {
  return String(s || '').split(/[^A-Za-z0-9]+/).filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('_');
}
function indent(text: string, depth: number): string {
  const p = new Array(depth + 1).join('\t');
  return text.split('\n').map((l) => (l ? p + l : '')).join('\n');
}
function padTo(s: string, w: number): string {
  return s + new Array(Math.max(0, w - s.length) + 1).join(' ');
}
function aligned(pairs: [string, string][]): string {
  const w = pairs.reduce((m, p) => Math.max(m, p[0].length), 0);
  return pairs.map((p) => padTo("'" + p[0] + "'", w + 2) + ' => ' + p[1] + ',').join('\n');
}

export interface Derived {
  pre: string;
  td: string;
  emailId: string;
  className: string;
  triggerHook: string;
}

export function derive(e: WcEmail): Derived {
  const pre = fnSlug(e.prefix) || 'acme';
  const emailId = pre + '_' + (fnSlug(e.emailId) || 'custom_email');
  return {
    pre,
    td: dashSlug(e.textDomain) || pre.replace(/_/g, '-'),
    emailId,
    className: (pascal(e.prefix) || 'Acme') + '_' + (pascal(e.emailId) || 'Custom_Email') + '_Email',
    triggerHook: e.trigger === 'status' ? 'woocommerce_order_status_' + (e.triggerStatus || 'processing') : fnSlug(e.customHook) || pre + '_send_email',
  };
}

export function buildCode(e: WcEmail): string {
  const d = derive(e);
  const pre = d.pre;
  const td = d.td;
  const t = (s: string) => "__( '" + escPhp(s) + "', '" + td + "' )";
  const isCustomer = e.recipient === 'customer';

  const formFieldPairs: string[] = [];
  formFieldPairs.push("'enabled' => array(\n" + indent(aligned([
    ['title', t('Enable/Disable')],
    ['type', "'checkbox'"],
    ['label', t('Enable this email notification')],
    ['default', "'yes'"],
  ]), 1) + '\n),');
  formFieldPairs.push("'subject' => array(\n" + indent(aligned([
    ['title', t('Subject')],
    ['type', "'text'"],
    ['default', "''"],
    ['placeholder', t(e.subject || 'Your order')],
    ['desc_tip', 'true'],
  ]), 1) + '\n),');
  formFieldPairs.push("'heading' => array(\n" + indent(aligned([
    ['title', t('Email heading')],
    ['type', "'text'"],
    ['default', "''"],
    ['placeholder', t(e.heading || 'Order update')],
    ['desc_tip', 'true'],
  ]), 1) + '\n),');
  if (!isCustomer) {
    formFieldPairs.push("'recipient' => array(\n" + indent(aligned([
      ['title', t('Recipient(s)')],
      ['type', "'text'"],
      ['description', t('Comma-separated. Leave blank to send to the site admin email.')],
      ['default', "''"],
      ['desc_tip', 'true'],
    ]), 1) + '\n),');
  }
  const formFields = formFieldPairs.join('\n\n');

  const constructorBody =
    "\t\t$this->id             = '" + d.emailId + "';\n" +
    "\t\t$this->customer_email = " + (isCustomer ? 'true' : 'false') + ';\n' +
    "\t\t$this->title          = " + t(e.title || 'Custom notice') + ';\n' +
    "\t\t$this->description    = " + t(e.description || 'Sent when the trigger below fires.') + ';\n' +
    "\t\t$this->heading        = " + t(e.heading || 'Order update') + ';\n' +
    "\t\t$this->subject        = " + t(e.subject || 'Your order') + ';\n\n' +
    "\t\t$this->template_html  = 'emails/" + d.emailId.replace(/_/g, '-') + ".php';\n" +
    "\t\t$this->template_plain = 'emails/plain/" + d.emailId.replace(/_/g, '-') + ".php';\n" +
    "\t\t$this->template_base  = plugin_dir_path( __FILE__ ) . 'templates/';\n\n" +
    (e.trigger === 'status'
      ? "\t\tadd_action( '" + d.triggerHook + "', array( $this, 'trigger' ), 10, 2 );\n\n"
      : "\t\t// Fire this yourself: do_action( '" + d.triggerHook + "', $order_id );\n\t\tadd_action( '" + d.triggerHook + "', array( $this, 'trigger' ), 10, 2 );\n\n") +
    '\t\tparent::__construct();\n\n' +
    (isCustomer ? '' : "\t\t// Admin emails need an explicit recipient — customer emails read it off the order.\n\t\t$this->recipient = $this->get_option( 'recipient', get_option( 'admin_email' ) );\n");

  const triggerBody =
    '\t\t$this->setup_locale();\n\n' +
    "\t\tif ( $order_id && ! is_a( $order, 'WC_Order' ) ) {\n\t\t\t$order = wc_get_order( $order_id );\n\t\t}\n\n" +
    "\t\tif ( is_a( $order, 'WC_Order' ) ) {\n\t\t\t$this->object    = $order;\n" +
    (isCustomer ? '\t\t\t$this->recipient = $this->object->get_billing_email();\n' : '') +
    '\t\t}\n\n' +
    "\t\tif ( ! $this->is_enabled() || ! $this->get_recipient() ) {\n\t\t\t$this->restore_locale();\n\t\t\treturn;\n\t\t}\n\n" +
    '\t\t$this->send( $this->get_recipient(), $this->get_subject(), $this->get_content(), $this->get_headers(), $this->get_attachments() );\n\n' +
    '\t\t$this->restore_locale();';

  const contentArgs = (plain: boolean) => 'array(\n' + indent(aligned([
    ['order', '$this->object'],
    ['email_heading', '$this->get_heading()'],
    ['sent_to_admin', isCustomer ? 'false' : 'true'],
    ['plain_text', plain ? 'true' : 'false'],
    ['email', '$this'],
  ]), 1) + '\n)';

  const classBody =
    '\tpublic function __construct() {\n' + constructorBody + '\t}\n\n' +
    '\t/**\n\t * The settings fields, keyed by option name.\n\t */\n' +
    '\tpublic function init_form_fields() {\n\t\t$this->form_fields = array(\n' + indent(formFields, 2) + '\n\t\t);\n\t}\n\n' +
    '\t/**\n\t * Fires on ' + d.triggerHook + '. Sends the email if it is enabled and there is a recipient.\n\t *\n\t * @param int      $order_id Order ID.\n\t * @param WC_Order $order    Order object, when core already has it loaded.\n\t */\n' +
    '\tpublic function trigger( $order_id, $order = false ) {\n' + triggerBody + '\n\t}\n\n' +
    '\t/**\n\t * The HTML version, rendered through the plugin\'s own template file.\n\t */\n' +
    '\tpublic function get_content_html() {\n\t\treturn wc_get_template_html(\n\t\t\t$this->template_html,\n\t\t\t' + indent(contentArgs(false), 2).trim() + ",\n\t\t\t'',\n\t\t\t$this->template_base\n\t\t);\n\t}\n\n" +
    '\t/**\n\t * The plain-text version.\n\t */\n' +
    '\tpublic function get_content_plain() {\n\t\treturn wc_get_template_html(\n\t\t\t$this->template_plain,\n\t\t\t' + indent(contentArgs(true), 2).trim() + ",\n\t\t\t'',\n\t\t\t$this->template_base\n\t\t);\n\t}";

  let out = '<?php\n/**\n * Plugin Name:       ' + (e.title || 'Custom notice') + ' email\n * Description:       Registers the ' + d.emailId + ' transactional email.\n * Version:           1.0.0\n * Requires PHP:      7.4\n * Requires Plugins:  woocommerce\n * Text Domain:       ' + td + "\n */\n\ndefined( 'ABSPATH' ) || exit;\n\n";

  out += '/**\n * Declare the class once WooCommerce\'s own email base class exists.\n */\nfunction ' + pre + '_email_init() {\n\tif ( class_exists( \'' + d.className + '\' ) ) {\n\t\treturn;\n\t}\n\n\tclass ' + d.className + ' extends WC_Email {\n\n' + classBody + '\n\t}\n}\n' + "add_action( 'plugins_loaded', '" + pre + "_email_init' );\n\n";

  out += '/**\n * Register it so it appears under WooCommerce → Settings → Emails.\n *\n * @param array $emails Existing email classes, keyed by class name.\n * @return array\n */\nfunction ' + pre + '_add_email_class( $emails ) {\n\t$emails[\'' + d.className + "'] = new " + d.className + "();\n\n\treturn $emails;\n}\n" + "add_filter( 'woocommerce_email_classes', '" + pre + "_add_email_class' );\n";

  return withCredit(out);
}

export function buildTemplate(e: WcEmail): string {
  const d = derive(e);
  const td = d.td;
  const greeting = e.introText.trim() || 'Here is an update on your order.';

  return "<?php\n/**\n * " + (e.title || 'Custom notice') + " email — HTML version.\n *\n * @var WC_Order $order\n * @var bool      $sent_to_admin\n * @var bool      $plain_text\n * @var WC_Email  $email\n */\n\ndefined( 'ABSPATH' ) || exit;\n\ndo_action( 'woocommerce_email_header', $email_heading, $email );\n?>\n\n<p>" +
    "<?php printf( esc_html__( 'Hi %s,', '" + td + "' ), esc_html( $order->get_billing_first_name() ) ); ?>" +
    "</p>\n<p><?php esc_html_e( '" + escPhp(greeting) + "', '" + td + "' ); ?></p>\n\n" +
    "<?php\ndo_action( 'woocommerce_email_order_details', $order, $sent_to_admin, $plain_text, $email );\ndo_action( 'woocommerce_email_order_meta', $order, $sent_to_admin, $plain_text, $email );\ndo_action( 'woocommerce_email_customer_details', $order, $sent_to_admin, $plain_text, $email );\n\ndo_action( 'woocommerce_email_footer', $email );\n";
}

export function validate(e: WcEmail): ValidationIssue[] {
  const d = derive(e);
  const out: ValidationIssue[] = [];
  const add = (severity: ValidationIssue['severity'], message: string, fix?: string, fixLabel?: string) => out.push({ severity, message, fix, fixLabel });

  if (!e.emailId.trim()) add('error', 'No email id — nothing to register.');
  if (!e.title.trim()) add('error', 'No title. Shown in WooCommerce → Settings → Emails.');
  if (!e.subject.trim()) add('warning', 'No default subject. WooCommerce falls back to a generic one until a site owner sets it.');
  if (e.trigger === 'status' && !e.triggerStatus.trim()) add('error', 'No order status selected to trigger on.');
  if (e.trigger === 'custom' && !e.customHook.trim()) add('error', 'No custom hook name — nothing will ever call trigger().');
  if (e.recipient === 'customer' && e.trigger === 'status' && ['pending', 'failed'].includes(e.triggerStatus)) add('recommendation', `A customer email on "${e.triggerStatus}" fires before payment is confirmed — make sure that is really the moment you want to email them.`);
  add('recommendation', `The trigger hook is ${d.triggerHook}${e.trigger === 'status' ? ' — WooCommerce fires this itself on every order status change, no extra code needed.' : ' — something in your own code must call do_action() on it, or trigger() never runs.'}`);
  return out;
}

export function freshProject(): WcEmail {
  return {
    prefix: 'acme',
    textDomain: 'acme',
    emailId: 'loyalty_earned',
    title: 'Loyalty points earned',
    description: 'Sent to the customer once their order is marked complete, showing the points they earned.',
    heading: 'You earned loyalty points!',
    subject: 'You earned points on order #{order_number}',
    recipient: 'customer',
    trigger: 'status',
    triggerStatus: 'completed',
    customHook: '',
    introText: 'You just earned loyalty points on your recent order — thanks for shopping with us.',
  };
}

export function applyFix(e: WcEmail, _kind: string): WcEmail {
  void _kind;
  return JSON.parse(JSON.stringify(e));
}
