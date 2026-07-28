import type { ToolContent } from '../toolContentTypes';

export const settingsPageContent: ToolContent = {
  aboutTitle: 'Settings Page Generator Online',
  aboutLead:
    'This WordPress settings page generator writes the whole admin screen for you: the `add_menu_page()` or `add_submenu_page()` call, the `register_setting()` / `add_settings_section()` / `add_settings_field()` trio that has to line up exactly, a real sanitise callback, and the render functions that print every field type with the right escaping. Nine field types are supported — text, textarea, number, checkbox, select, radio, email, URL and colour.',
  aboutSupport:
    'The Preview tab redraws the actual admin screen as you type, tabs and all, so you can see where a section lands before you paste anything into a site. Output as a bare snippet, a `functions.php` block or a standalone plugin file, in procedural functions or a single final class. Free, no account, and nothing you type leaves the browser.',
  spec: {
    hook: 'add_menu_page() / register_setting()',
    outputs: 'A snippet, a `functions.php` block, or a standalone plugin file — procedural or class style',
    requires: 'WordPress 4.7 or newer (for the `register_setting()` args array), PHP 7.4+',
  },

  whyTitle: 'Why this WordPress Settings API generator beats a hand-written options page',
  whyIntro:
    'The Settings API is not hard, it is fiddly. Four separate calls have to agree on the same option group, the same page slug and the same section id, and when one of them disagrees the page renders with no fields and no error message. Add the fact that a top-level menu never prints "Settings saved." on its own, and most hand-written options screens ship half-broken. This generator wires the pieces together and then audits the result.',
  features: [
    {
      title: 'The four calls actually agree',
      body: '`register_setting()`, `add_settings_section()`, `add_settings_field()`, `settings_fields()` and `do_settings_sections()` are all emitted from one derived slug, so the group, page and section ids can never drift apart.',
    },
    {
      title: 'A sanitise callback that names every key',
      body: 'Array storage gets a generated `sanitize_options()` that starts from the defaults and copies across only the keys you declared — checkboxes through `! empty()`, selects and radios checked against their own choice list with `in_array()`, colours through `sanitize_hex_color()`. Anything not listed never reaches the database.',
    },
    {
      title: 'The saved notice that top-level pages forget',
      body: 'Submenu pages under Settings print "Settings saved." for free; a top-level menu does not. Leave `settings_errors()` off on a top-level page and the generator raises a warning with a one-click fix, because a save that looks like it did nothing is the most-reported bug on custom options screens.',
    },
    {
      title: 'One option row or many, with the cost stated',
      body: 'Store every field in a single array option (one row, one `register_setting()`, one sanitiser) or one option per field with a core sanitise callback each. Pick the second with more than three fields and the checker points out you have just added that many autoloaded rows to `wp_options`.',
    },
    {
      title: 'Assets scoped to your screen only',
      body: 'Turn on screen-scoped assets and the generator keeps the hook suffix `add_menu_page()` returned — in a class property, or a static in a small helper function for the procedural build — and compares it inside `admin_enqueue_scripts` so your CSS never loads on someone else\'s page.',
    },
    {
      title: 'Fifteen checks before you paste',
      body: 'Uppercase or spaced menu slugs, a `read` capability on a settings screen, duplicate field keys, fields pointing at a deleted section, select fields with no choices, an unprefixed option name, tabs with only one section, a text domain that does not match the slug. Most come with a one-click fix.',
    },
  ],

  howTitle: 'How does the Settings Page Generator work?',
  howIntro:
    'Four steps. Describe the menu entry, decide where the values live, add sections and fields, then clear the checks and export.',
  steps: [
    {
      title: 'Describe the page',
      body: 'Page title, menu title, menu slug, and whether this is a top-level menu or a submenu under Settings, Tools, Appearance, Users or a parent file of your own. Pick the capability and, for a top-level menu, a Dashicon and a menu position — the generator explains what each position band lands next to.',
    },
    {
      title: 'Choose storage and naming',
      body: 'Set the function prefix, text domain, option name and option group, then choose one array option or one option per field. Procedural functions or a single final class — the same code either way, just wrapped differently.',
    },
    {
      title: 'Add sections and fields',
      body: 'Create the sections that group the screen, then add fields and assign each one to a section. Every field carries a type, default, placeholder, description and — for selects and radios — a comma-separated `value:Label` choice list.',
    },
    {
      title: 'Clear the checks and export',
      body: 'Work through the Checks tab, apply the one-click fixes, then optionally add tabs, a reset-to-defaults button, REST exposure with a generated object schema, and the `uninstall.php` snippet that deletes the option. Copy the snippet or download the `.php` file.',
    },
  ],
  example: {
    title: 'Worked example — a top-level Acme Toolkit menu at position 80',
    intro:
      'The menu registration exactly as the generator emits it. `add_menu_page()` returns a hook suffix, which the screen-scoped assets option captures for you.',
    code: `/**
 * Add the page to the admin menu.
 */
function acme_add_settings_page() {
\tadd_menu_page(
\t\t__( 'Acme Toolkit Settings', 'acme-toolkit' ),
\t\t__( 'Acme Toolkit', 'acme-toolkit' ),
\t\t'manage_options',
\t\t'acme-toolkit',
\t\t'acme_render_settings_page',
\t\t'dashicons-admin-generic',
\t\t80
\t);
}
add_action( 'admin_menu', 'acme_add_settings_page' );`,
    note:
      'The rest of the generated file is the part people get wrong: `acme_register_settings()` on `admin_init` calls `register_setting( \'acme_toolkit_group\', \'acme_toolkit_options\', array( \'sanitize_callback\' => \'acme_sanitize_options\', … ) )`, then `add_settings_section()` and `add_settings_field()` against the same `acme-toolkit` page slug. Miss the `sanitize_callback` and WordPress stores whatever was posted, unfiltered.',
  },
  refLinks: [
    {
      href: 'https://developer.wordpress.org/plugins/settings/settings-api/',
      title: 'Settings API — Plugin Handbook',
      description: 'The official overview of how registration, sections, fields and the options form fit together.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/add_menu_page/',
      title: 'add_menu_page() — WordPress developer reference',
      description: 'Every argument of the top-level menu call, including the icon and position this tool writes.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/add_submenu_page/',
      title: 'add_submenu_page() — WordPress developer reference',
      description: 'The submenu variant, used whenever you pick a parent file instead of a top-level menu.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/register_setting/',
      title: 'register_setting() — WordPress developer reference',
      description: 'The args array this generator fills in: type, sanitize_callback, default and show_in_rest.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/add_settings_field/',
      title: 'add_settings_field() — WordPress developer reference',
      description: 'How a field binds to a page slug and a section id, and what the $args array reaches your callback as.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/settings_errors/',
      title: 'settings_errors() — WordPress developer reference',
      description: 'The call a top-level settings page must make itself to show the "Settings saved." notice.',
    },
  ],

  faqTitle: 'WordPress settings pages — frequently asked questions',
  faqIntro: 'The questions that come up most often when building an options screen with the Settings API.',
  faqs: [
    {
      question: 'Why does my settings page say "Options page not found" when I save?',
      answer:
        'The option group passed to `settings_fields()` in the form does not match the first argument of `register_setting()`. `options.php` looks up the group by name and rejects anything it does not recognise. Both values come from one field in this generator, so they cannot drift; if you are debugging existing code, compare the two strings character by character.',
    },
    {
      question: 'Why do my fields not appear on the page at all?',
      answer:
        'The page slug in `do_settings_sections()` must match the fourth argument of `add_settings_section()` and `add_settings_field()` exactly. It is a free-form string, not the menu slug, and WordPress prints nothing rather than warning you when it does not match. Turning tabs on changes that slug to `{slug}-{section}`, which is another common way to lose the fields.',
    },
    {
      question: 'Why does my top-level settings page not show "Settings saved."?',
      answer:
        'Core only prints that notice automatically on pages under Settings. On a top-level menu you have to call `settings_errors()` yourself inside the render callback, and the redirect back adds `settings-updated=true` to the URL. The generator emits the call and flags a warning if you switch it off on a top-level page.',
    },
    {
      question: 'Should I use one option for everything or one option per field?',
      answer:
        'One array option is usually right: a single row in `wp_options`, one `register_setting()` call, one sanitise callback, one row to delete on uninstall. One option per field is easier to read with `get_option()` from elsewhere, but every one of them is autoloaded on every page load of the site, front end included. Above three or four fields the array wins.',
    },
    {
      question: 'Do I need a sanitize_callback if I am already escaping on output?',
      answer:
        'Yes. Without `sanitize_callback` WordPress writes the posted value to the database as it arrived. Escaping on output protects that one template, not the next plugin that reads the option, the REST response, or an export. The generated sanitiser also rebuilds the array from your declared keys, so a crafted POST cannot inject extra ones.',
    },
    {
      question: 'What menu position should I use for add_menu_page()?',
      answer:
        'Positions 80 to 100 sit below the content menus and around Settings, which is where plugin screens are conventionally expected. Below 5 puts you above Posts, and 5 to 25 drops you between the core content menus. Positions are not reserved, so two plugins using the same integer will fight — WordPress resolves it by nudging one of them, which is why the same number can behave differently on two sites.',
    },
  ],

  related: [
    { id: 'user-role', note: 'Create the role whose capability your settings page checks with current_user_can().' },
    { id: 'list-table', note: 'Add a sortable, searchable admin table to the page this generator registers.' },
    { id: 'admin-notice', note: 'Show a setup nudge that links straight to the settings screen you just built.' },
    { id: 'toolbar', note: 'Put a toolbar shortcut on every screen that jumps to your settings page.' },
    { id: 'dashboard-widget', note: 'Surface the same saved options on the dashboard, with a Configure form.' },
    { id: 'rest-route', note: 'Expose the saved option over a namespaced endpoint with its own permission callback.' },
  ],
};
