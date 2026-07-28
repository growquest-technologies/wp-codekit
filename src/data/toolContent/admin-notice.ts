import type { ToolContent } from '../toolContentTypes';

export const adminNoticeContent: ToolContent = {
  aboutTitle: 'Admin Notice Generator Online',
  aboutLead:
    'Generate a WordPress admin notice that behaves: the right `notice notice-success|info|warning|error` class, a capability check, a `get_current_screen()` guard so it only appears where it should, and — when you make it dismissible — the AJAX handler and nonce that make the dismissal actually stick. Notices are printed with `printf()` and `esc_html__()`, so every string is escaped and translatable.',
  aboutSupport:
    'The notice redraws live in the admin-styled preview as you change the type, the lead-in, the message and the button, and the Reference tab lists what each core notice class looks like and when to use it. Snippet, `functions.php` block or plugin file, procedural or class. Free, private, nothing leaves the browser.',
  spec: {
    hook: 'admin_notices',
    outputs: 'A snippet, a `functions.php` block, or a standalone plugin file — procedural or class style',
    requires: 'WordPress 4.2 or newer for `is-dismissible`, PHP 7.4+',
  },

  whyTitle: 'Why the WordPress admin notice generator beats a two-line echo',
  whyIntro:
    'An admin notice is three lines of code and four ways to annoy people. Without a capability check every role that can reach `wp-admin` sees it. Without a screen check it appears on all of them, forever. And `is-dismissible` is client-side only — core hides the div, then the notice returns on the next page load, which reads as broken. This generator writes the guards and the persistence together.',
  features: [
    {
      title: 'Four ways to remember a dismissal',
      body: 'Not at all, per user forever in user meta, per user for a set number of days via a transient, or site-wide in an option. Each mode explains its trade-off inline — the site-wide option is flagged as a warning, because whoever clicks the X first closes it for everyone, including people who never saw it.',
    },
    {
      title: 'The AJAX round trip written for you',
      body: 'Choose any persistence mode with dismissible on and you get three blocks: the notice, a footer script that listens for a click on `.notice-dismiss` inside your own `data-notice` attribute and posts to `ajaxurl`, and a `wp_ajax_` handler with `check_ajax_referer()` and a logged-in check before it writes.',
    },
    {
      title: 'Screen scoping, not a blanket notice',
      body: 'Pick the screens the notice belongs on and the generated code compares `get_current_screen()->id` against your list. Leave it empty and the checker warns you: a notice on every admin page is the fastest way to make a client stop reading your notices.',
    },
    {
      title: 'The dismiss script prints only where the notice does',
      body: 'The same capability, screen and persistence guards are repeated at the top of the `admin_footer` callback, so the inline script is never printed on screens where the notice would not have appeared.',
    },
    {
      title: 'Tone checked against the message',
      body: 'Mark a notice as an error and the checker looks for words like fail, missing, expired or invalid in the text. An error notice for something that is not an error trains people to ignore the red ones, so it suggests warning or info instead.',
    },
    {
      title: 'HTML caught before it prints as text',
      body: 'Message strings go through `esc_html__()`, so tags typed into the message would render literally. The checker spots that and points you at the bold lead-in and the action button fields, which are separate placeholders in the same `printf()`.',
    },
  ],

  howTitle: 'How does the Admin Notice Generator work?',
  howIntro:
    'Four steps: write the notice, decide who sees it and where, decide whether it comes back, then export.',
  steps: [
    {
      title: 'Write the notice',
      body: 'Choose success, info, warning or error, then set the bold lead-in, the message, and optionally an action button with its label and admin target. The preview shows the finished notice in admin styling as you type.',
    },
    {
      title: 'Scope it',
      body: 'Pick the capability and tick the screens it should appear on — Dashboard, Plugins, the posts list, the post editor, Settings, Themes or Media. Both become real guard clauses at the top of the callback.',
    },
    {
      title: 'Decide what happens on dismiss',
      body: 'Turn dismissible on, then choose whether the dismissal is forgotten on reload, remembered per user forever, snoozed for a number of days, or stored once for the whole site. The note under the field spells out exactly what gets written where.',
    },
    {
      title: 'Clear the checks and export',
      body: 'Fix anything flagged — a dismissible notice with no persistence, a button with no target, no capability — then copy the snippet or download it as a plugin or `functions.php` block.',
    },
  ],
  example: {
    title: 'Worked example — a setup nudge on the Dashboard and Plugins screens',
    intro:
      'An amber notice with a bold lead-in and a primary button, restricted to administrators and to two screens. This is the complete generated output.',
    code: `/**
 * Print the notice.
 */
function acme_notice() {
\tif ( ! current_user_can( 'manage_options' ) ) {
\t\treturn;
\t}

\t$screen = get_current_screen();

\tif ( ! $screen || ! in_array( $screen->id, array( 'dashboard', 'plugins' ), true ) ) {
\t\treturn;
\t}

\tprintf(
\t\t'<div class="notice notice-warning" data-notice="acme_setup"><p><strong>%1$s</strong> %2$s</p><p><a href="%4$s" class="button button-primary">%3$s</a></p></div>',
\t\tesc_html__( 'Acme Toolkit:', 'acme' ),
\t\tesc_html__( 'add your API key to finish setting up.', 'acme' ),
\t\tesc_html__( 'Open settings', 'acme' ),
\t\tesc_url( admin_url( 'options-general.php?page=acme-toolkit' ) )
\t);
}
add_action( 'admin_notices', 'acme_notice' );`,
    note:
      'Turn dismissible on with per-user persistence and two more blocks appear: an `admin_footer` script that posts the dismissal to `ajaxurl`, and a `wp_ajax_acme_dismiss_notice` handler that runs `check_ajax_referer()` before writing `acme_setup_dismissed` to user meta.',
  },
  refLinks: [
    {
      href: 'https://developer.wordpress.org/reference/hooks/admin_notices/',
      title: 'admin_notices — WordPress developer reference',
      description: 'The action every admin notice is printed on, and where in the page it lands.',
    },
    {
      href: 'https://developer.wordpress.org/reference/hooks/all_admin_notices/',
      title: 'all_admin_notices — WordPress developer reference',
      description: 'The catch-all that also fires on the network admin, useful when admin_notices is not enough.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/get_current_screen/',
      title: 'get_current_screen() — WordPress developer reference',
      description: 'The WP_Screen object whose id this generator compares against your chosen screens.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/check_ajax_referer/',
      title: 'check_ajax_referer() — WordPress developer reference',
      description: 'The nonce check that guards the dismissal handler before it writes anything.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/add_settings_error/',
      title: 'add_settings_error() — WordPress developer reference',
      description: 'The Settings API route to a notice, when the message belongs to a form submission.',
    },
    {
      href: 'https://developer.wordpress.org/apis/security/nonces/',
      title: 'Nonces — WordPress developer resources',
      description: 'Why the dismiss request needs a nonce, and how the generated check_ajax_referer() call uses it.',
    },
  ],

  faqTitle: 'WordPress admin notices — frequently asked questions',
  faqIntro: 'The questions developers actually hit when adding notices to the WordPress admin.',
  faqs: [
    {
      question: 'Why does my dismissible admin notice come back after a page reload?',
      answer:
        'Because `is-dismissible` is presentation only. Core adds the X button and removes the div from the DOM, but nothing is recorded anywhere. To make a dismissal stick you have to store it yourself — user meta, a per-user transient, or a site option — and check that value before printing the notice. This generator writes both halves plus the AJAX call between them.',
    },
    {
      question: 'How do I show an admin notice only on my own plugin page?',
      answer:
        'Call `get_current_screen()` inside your `admin_notices` callback and return early unless `$screen->id` matches. For a page added with `add_menu_page()` the screen id is the hook suffix that call returned, typically `toplevel_page_your-slug`. Checking `$_GET[\'page\']` also works but breaks the moment the page moves under a different parent.',
    },
    {
      question: 'What are the WordPress admin notice classes?',
      answer:
        'Core styles `notice notice-success` (green), `notice notice-info` (blue), `notice notice-warning` (amber) and `notice notice-error` (red). Add `is-dismissible` for the X button and `notice-alt` for the flat variant core uses inside plugin table rows. The outer element should be a div with a paragraph inside — core\'s CSS assumes that structure.',
    },
    {
      question: 'Why is my admin notice not showing at all?',
      answer:
        'Three usual causes: the callback is hooked too late — `admin_notices` fires early in the page, so anything registered on `admin_footer` misses it; you are on the network admin, which uses `network_admin_notices`; or a capability or screen guard is returning first. On the user profile screen core also runs `user_admin_notices` rather than `admin_notices`.',
    },
    {
      question: 'How do I show a notice after a redirect?',
      answer:
        'Notices do not survive a redirect, because the callback runs on the request that produced the page. Either add a query argument to the redirect target and check for it in your `admin_notices` callback, or use the Settings API route: `add_settings_error()` plus `settings_errors()`, which stores the message in a transient across the redirect.',
    },
    {
      question: 'Can I add a button to an admin notice?',
      answer:
        'Yes — core\'s `.button` and `.button-primary` classes work inside a notice. Keep it to one action and put it in its own paragraph so it does not sit inline with the text. If the button triggers a change rather than just navigating, it needs a nonce on the URL and a capability check at the other end.',
    },
  ],

  related: [
    { id: 'settings-page', note: 'Build the settings screen your notice sends people to.' },
    { id: 'dashboard-widget', note: 'A calmer place for a recurring message than a notice on every screen.' },
    { id: 'toolbar', note: 'A persistent shortcut in the admin bar, for things a notice should not nag about.' },
    { id: 'user-role', note: 'Define the role whose capability decides who sees the notice.' },
    { id: 'list-table', note: 'Notices sit above list tables — pair them with bulk-action results.' },
    { id: 'activation', note: 'Set the transient on activation that a first-run welcome notice reads.' },
  ],
};
