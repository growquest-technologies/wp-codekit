import { escPhp, withCredit, type ValidationIssue } from '../lib/codegen';

export type OutputMode = 'offline' | 'redirect';

export interface PaymentGateway {
  prefix: string;
  textDomain: string;
  gatewayId: string;
  title: string;
  methodTitle: string;
  methodDescription: string;
  checkoutDescription: string;
  showInstructions: boolean;
  instructions: string;
  testMode: boolean;
}

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
  gatewayId: string;
  className: string;
}

export function derive(pg: PaymentGateway): Derived {
  const pre = fnSlug(pg.prefix) || 'acme';
  const gatewayId = pre + '_' + (fnSlug(pg.gatewayId) || 'gateway');
  return {
    pre,
    td: dashSlug(pg.textDomain) || pre.replace(/_/g, '-'),
    gatewayId,
    className: (pascal(pg.prefix) || 'Acme') + '_' + (pascal(pg.gatewayId) || 'Gateway') + '_Gateway',
  };
}

export function buildCode(pg: PaymentGateway, mode: OutputMode): string {
  const d = derive(pg);
  const pre = d.pre;
  const td = d.td;
  const t = (s: string) => "__( '" + escPhp(s) + "', '" + td + "' )";

  const formFieldPairs: string[] = [];
  formFieldPairs.push("'enabled' => array(\n" + indent(aligned([
    ['title', t('Enable/Disable')],
    ['type', "'checkbox'"],
    ['label', t('Enable this payment method')],
    ['default', "'no'"],
  ]), 1) + '\n),');
  formFieldPairs.push("'title' => array(\n" + indent(aligned([
    ['title', t('Title')],
    ['type', "'text'"],
    ['description', t('Shown to the customer during checkout.')],
    ['default', t(pg.title || 'Pay by ' + (mode === 'offline' ? 'bank transfer' : 'card'))],
    ['desc_tip', 'true'],
  ]), 1) + '\n),');
  formFieldPairs.push("'description' => array(\n" + indent(aligned([
    ['title', t('Description')],
    ['type', "'textarea'"],
    ['default', t(pg.checkoutDescription || 'Pay securely using this method.')],
  ]), 1) + '\n),');
  if (mode === 'offline' && pg.showInstructions) {
    formFieldPairs.push("'instructions' => array(\n" + indent(aligned([
      ['title', t('Instructions')],
      ['type', "'textarea'"],
      ['description', t('Shown on the order-received page and in the order emails.')],
      ['default', t(pg.instructions || '')],
      ['desc_tip', 'true'],
    ]), 1) + '\n),');
  }
  if (mode === 'redirect') {
    formFieldPairs.push("'testmode' => array(\n" + indent(aligned([
      ['title', t('Test mode')],
      ['type', "'checkbox'"],
      ['label', t('Use the sandbox endpoint')],
      ['default', pg.testMode ? "'yes'" : "'no'"],
    ]), 1) + '\n),');
    formFieldPairs.push("'api_key' => array(\n" + indent(aligned([
      ['title', t('API key')],
      ['type', "'password'"],
      ['description', t('From your payment processor dashboard.')],
      ['default', "''"],
      ['desc_tip', 'true'],
    ]), 1) + '\n),');
  }

  const formFields = formFieldPairs.join('\n\n');

  const constructorExtras: string[] = [];
  if (mode === 'offline' && pg.showInstructions) {
    constructorExtras.push("$this->instructions = $this->get_option( 'instructions' );");
    constructorExtras.push("add_action( 'woocommerce_thankyou_' . $this->id, array( $this, 'thankyou_page' ) );");
    constructorExtras.push("add_action( 'woocommerce_email_before_order_table', array( $this, 'email_instructions' ), 10, 3 );");
  }
  if (mode === 'redirect') {
    constructorExtras.push("$this->testmode = 'yes' === $this->get_option( 'testmode' );");
    constructorExtras.push("$this->api_key  = $this->get_option( 'api_key' );");
    constructorExtras.push("add_action( 'woocommerce_api_' . strtolower( get_class( $this ) ), array( $this, 'webhook_handler' ) );");
  }

  const classBody =
    '\tpublic function __construct() {\n' +
    "\t\t$this->id                 = '" + d.gatewayId + "';\n" +
    "\t\t$this->icon               = '';\n" +
    '\t\t$this->has_fields         = false;\n' +
    "\t\t$this->method_title       = " + t(pg.methodTitle || 'Acme Gateway') + ';\n' +
    "\t\t$this->method_description = " + t(pg.methodDescription || 'Accepts payment through Acme.') + ';\n' +
    "\t\t$this->supports           = array( 'products' );\n\n" +
    '\t\t$this->init_form_fields();\n' +
    '\t\t$this->init_settings();\n\n' +
    "\t\t$this->title       = $this->get_option( 'title' );\n" +
    "\t\t$this->description = $this->get_option( 'description' );\n" +
    "\t\t$this->enabled     = $this->get_option( 'enabled' );\n" +
    (constructorExtras.length ? '\t\t' + constructorExtras.join('\n\t\t') + '\n' : '') +
    '\n' +
    "\t\tadd_action( 'woocommerce_update_options_payment_gateways_' . $this->id, array( $this, 'process_admin_options' ) );\n" +
    '\t}\n\n' +
    '\t/**\n\t * The settings fields, keyed by option name.\n\t */\n' +
    '\tpublic function init_form_fields() {\n' +
    '\t\t$this->form_fields = array(\n' + indent(formFields, 2) + '\n\t\t);\n' +
    '\t}\n\n' +
    '\t/**\n\t * Handle the order once the customer confirms payment.\n\t *\n\t * @param int $order_id Order ID.\n\t * @return array\n\t */\n' +
    '\tpublic function process_payment( $order_id ) {\n' +
    '\t\t$order = wc_get_order( $order_id );\n\n' +
    (mode === 'offline'
      ? "\t\t$order->update_status( 'on-hold', " + t('Awaiting manual payment confirmation.') + ' );\n\n' +
        '\t\twc_reduce_stock_levels( $order_id );\n' +
        '\t\tWC()->cart->empty_cart();\n\n' +
        '\t\treturn array(\n' +
        "\t\t\t'result'   => 'success',\n" +
        "\t\t\t'redirect' => $this->get_return_url( $order ),\n" +
        '\t\t);\n'
      : '\t\t// Build the URL your processor needs — swap in the real endpoint and params.\n' +
        '\t\t$redirect_url = add_query_arg(\n' +
        '\t\t\tarray(\n' +
        "\t\t\t\t'amount'     => $order->get_total(),\n" +
        "\t\t\t\t'currency'   => $order->get_currency(),\n" +
        "\t\t\t\t'order_id'   => $order->get_id(),\n" +
        "\t\t\t\t'return_url' => $this->get_return_url( $order ),\n" +
        '\t\t\t),\n' +
        "\t\t\t$this->testmode ? 'https://sandbox.processor.example.com/pay' : 'https://processor.example.com/pay'\n" +
        '\t\t);\n\n' +
        '\t\treturn array(\n' +
        "\t\t\t'result'   => 'success',\n" +
        "\t\t\t'redirect' => $redirect_url,\n" +
        '\t\t);\n') +
    '\t}';

  const extraMethods: string[] = [];
  if (mode === 'offline' && pg.showInstructions) {
    extraMethods.push(
      '\t/**\n\t * Print the instructions on the order-received page.\n\t */\n' +
      '\tpublic function thankyou_page() {\n' +
      '\t\tif ( $this->instructions ) {\n' +
      '\t\t\techo wp_kses_post( wpautop( wptexturize( $this->instructions ) ) );\n' +
      '\t\t}\n' +
      '\t}\n\n' +
      '\t/**\n\t * Print the instructions in the order emails, while the order is on-hold.\n\t *\n\t * @param WC_Order $order         The order.\n\t * @param bool     $sent_to_admin Whether this copy goes to the store admin.\n\t * @param bool     $plain_text    Whether the email is plain text.\n\t */\n' +
      '\tpublic function email_instructions( $order, $sent_to_admin, $plain_text = false ) {\n' +
      "\t\tif ( $this->instructions && ! $sent_to_admin && '" + d.gatewayId + "' === $order->get_payment_method() && $order->has_status( 'on-hold' ) ) {\n" +
      '\t\t\techo wp_kses_post( wpautop( wptexturize( $this->instructions ) ) ) . PHP_EOL;\n' +
      '\t\t}\n' +
      '\t}'
    );
  }
  if (mode === 'redirect') {
    extraMethods.push(
      '\t/**\n\t * The processor calls this URL to confirm payment. Verify the payload\n\t * against the processor\'s signature before trusting it.\n\t */\n' +
      '\tpublic function webhook_handler() {\n' +
      "\t\t$order_id = isset( $_GET['order_id'] ) ? absint( $_GET['order_id'] ) : 0;\n" +
      '\t\t$order    = wc_get_order( $order_id );\n\n' +
      '\t\tif ( ! $order ) {\n' +
      '\t\t\tstatus_header( 400 );\n' +
      '\t\t\texit;\n' +
      '\t\t}\n\n' +
      '\t\t// TODO: verify the request came from your processor before this line.\n\n' +
      '\t\t$order->payment_complete();\n\n' +
      "\t\tstatus_header( 200 );\n" +
      '\t\texit;\n' +
      '\t}'
    );
  }

  let out = '<?php\n/**\n * Plugin Name:       ' + (pg.methodTitle || 'Acme Gateway') + '\n * Description:       Registers the ' + d.gatewayId + ' payment gateway.\n * Version:           1.0.0\n * Requires PHP:      7.4\n * Requires Plugins:  woocommerce\n * Text Domain:       ' + td + "\n */\n\ndefined( 'ABSPATH' ) || exit;\n\n";

  out += '/**\n * Declare the class once WooCommerce\'s own gateway base class exists.\n */\nfunction ' + pre + '_gateway_init() {\n\tif ( class_exists( \'' + d.className + '\' ) ) {\n\t\treturn;\n\t}\n\n\tclass ' + d.className + ' extends WC_Payment_Gateway {\n\n' + classBody + (extraMethods.length ? '\n\n' + extraMethods.join('\n\n') : '') + '\n\t}\n}\n' + "add_action( 'plugins_loaded', '" + pre + "_gateway_init' );\n\n";

  out += '/**\n * Register it so it appears under WooCommerce → Settings → Payments.\n *\n * @param array $gateways Existing gateways.\n * @return array\n */\nfunction ' + pre + '_add_gateway( $gateways ) {\n\t$gateways[] = \'' + d.className + "';\n\n\treturn $gateways;\n}\n" + "add_filter( 'woocommerce_payment_gateways', '" + pre + "_add_gateway' );\n";

  return withCredit(out);
}

export function validate(pg: PaymentGateway): ValidationIssue[] {
  const out: ValidationIssue[] = [];
  const add = (severity: ValidationIssue['severity'], message: string, fix?: string, fixLabel?: string) => out.push({ severity, message, fix, fixLabel });

  if (!pg.gatewayId.trim()) add('error', 'No gateway id — it becomes the payment_method value stored on every order.');
  if (!pg.title.trim()) add('error', 'No title. This is what the customer sees at checkout, next to the radio button.');
  if (!pg.methodTitle.trim()) add('error', 'No method title. This is what you see in WooCommerce → Settings → Payments.');
  if (pg.showInstructions && !pg.instructions.trim()) add('warning', 'Instructions are on but empty — the thank-you page and email hooks print nothing.');

  add('recommendation', 'process_payment() always returns the exact result/redirect shape shown here — building the redirect URL by hand, without get_return_url(), is the most common reason a "successful" payment leaves the customer stranded.');
  return out;
}

export function freshProject(): PaymentGateway {
  return {
    prefix: 'acme',
    textDomain: 'acme',
    gatewayId: 'gateway',
    title: 'Pay by bank transfer',
    methodTitle: 'Acme Bank Transfer',
    methodDescription: 'Accepts manual bank transfers, confirmed by the store owner.',
    checkoutDescription: 'Make your payment directly into our bank account. Your order will ship once funds have cleared.',
    showInstructions: true,
    instructions: 'Our bank details are: Acme Ltd, Sort code 00-00-00, Account 00000000. Use your order number as the payment reference.',
    testMode: true,
  };
}

export function applyFix(pg: PaymentGateway, _kind: string): PaymentGateway {
  void _kind;
  return JSON.parse(JSON.stringify(pg));
}

export interface RefArg {
  name: string;
  description: string;
}

export const REF_ARGS: RefArg[] = [
  { name: 'process_payment( $order_id )', description: "Must return array( 'result' => 'success'|'failure', 'redirect' => $url ). Build the redirect through $this->get_return_url( $order ) — it applies the woocommerce_get_return_url filter and honours multisite and force-SSL settings that a hand-built URL will not." },
  { name: 'update_status() vs payment_complete()', description: "update_status( 'on-hold', ... ) is for payment not yet confirmed — the offline pattern. payment_complete() is reserved for a gateway that has actually verified the money arrived; it also fires the woocommerce_payment_complete hook other plugins listen for." },
  { name: 'wc_reduce_stock_levels( $order_id )', description: 'The current, non-deprecated way to reduce stock from a gateway. The older $order->reduce_order_stock() method risks double-reducing stock alongside WooCommerce\'s own order-status-transition handling.' },
  { name: "woocommerce_api_{class} (redirect mode)", description: "WooCommerce dispatches this action — named after the gateway's own class, lowercased — whenever a request hits ?wc-api=YourClassName. It is the standard webhook/IPN entry point for a payment gateway, registered once in the constructor." },
];
