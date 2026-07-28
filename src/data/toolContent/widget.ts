import type { ToolContent } from '../toolContentTypes';

export const widgetContent: ToolContent = {
  aboutTitle: 'WordPress Custom Widget Generator Online',
  aboutLead:
    'Describe the settings your widget needs and get the whole `WP_Widget` subclass — `__construct()`, `defaults()`, `widget()`, `form()` and `update()` — with per-field sanitisation, escaped output and the `register_widget()` call already hooked to `widgets_init`. This is the WordPress widget class boilerplate written out properly rather than a stub with four empty methods.',
  aboutSupport:
    'A live mock of the Appearance › Widgets panel shows the admin form your field list produces, so you can see the labels, the select options and the checkbox before you paste anything. Free, no account, and nothing you type leaves the browser.',
  spec: {
    hook: 'WP_Widget, registered on widgets_init',
    outputs: 'A snippet, a `functions.php` block, or a standalone plugin file',
    requires: 'WordPress 2.8 or newer, PHP 7.4+',
  },

  whyTitle: 'Why the widget class generator beats a copied WP_Widget skeleton',
  whyIntro:
    'The skeletons you find online stop at method signatures. Everything that matters is in the bodies: `get_field_id()` and `get_field_name()` so core can namespace each input per instance, a different sanitiser for every field type in `update()`, `wp_parse_args()` against real defaults so a new field does not throw notices on an existing instance, and printing all four of `before_widget`, `after_widget`, `before_title` and `after_title`. This generator writes those bodies from your field list.',
  features: [
    {
      title: 'Six field types, each with the right sanitiser',
      body: 'Text uses `sanitize_text_field()`, textarea `wp_kses_post()`, number `absint()`, URL `esc_url_raw()`, select `sanitize_key()` against a whitelist of your own choices, and checkbox `! empty()`. Nothing falls through to an unsanitised assignment.',
    },
    {
      title: 'Admin markup that core can namespace',
      body: 'Every input is printed through `printf()` with `esc_attr( $this->get_field_id( … ) )` and `esc_attr( $this->get_field_name( … ) )`, which is what keeps two instances of the same widget from overwriting each other\'s values.',
    },
    {
      title: 'Four ready-made widget() bodies',
      body: 'Recent posts (a `get_posts()` call with `no_found_rows`, driven by your number field, printed as an escaped list), rich text (through `wpautop()` and `wp_kses_post()`), a custom list with a `get_items()` stub you fill in, or an empty body between the sidebar wrappers.',
    },
    {
      title: 'The id_base warning you want before release, not after',
      body: 'The `id_base` keys every saved instance in `wp_options`. Changing it later orphans every widget a site owner has already placed, so an unsafe value is flagged with the corrected form shown, and duplicate field ids are errors for the same reason.',
    },
    {
      title: 'Checks tied to the body you picked',
      body: 'A recent-posts body with no number field means the count is hard-coded at five. A rich-text body with no textarea has nothing to render. A select with no choices always falls back to its default. Each is flagged with a one-click fix that adds the missing field.',
    },
    {
      title: 'An optional shortcode wrapper',
      body: 'The same output as a shortcode for pages that are not sidebars, using `ob_start()` around `widget()` with sensible wrapper markup — with the honest note that it uses the passed attributes rather than any saved instance.',
    },
  ],

  howTitle: 'How does the Widget Class Generator work?',
  howIntro:
    'Four steps, and the admin preview redraws after each one so the form you are describing is visible the whole time.',
  steps: [
    {
      title: 'Name the widget',
      body: 'Set the picker name, the description under it, the `id_base`, the PHP class name and the text domain. The class name is checked against the Capitalised_With_Underscores convention.',
    },
    {
      title: 'Choose what it renders',
      body: 'Recent posts, rich text, a custom list or an empty stub. The choice decides what goes into `widget()` and which fields the Checks tab then expects you to have.',
    },
    {
      title: 'Add the settings fields',
      body: 'Give each field an id, a label, a type and a default; selects take their choices as a `value:Label` list. Reorder by dragging — the order here is the order in the admin form.',
    },
    {
      title: 'Clear the checks, then export',
      body: 'Resolve the flagged ids and missing fields, optionally turn on the shortcode wrapper, then copy the class or download it as a snippet, a `functions.php` block or a plugin file.',
    },
  ],
  example: {
    title: 'Worked example — the head of a Recent Case Studies widget',
    intro:
      'The class opening and the registration, exactly as generated. `defaults()`, `widget()`, `form()` and `update()` follow in the full output — one branch per field in each.',
    code: `/**
 * Recent Case Studies.
 */
class Acme_Case_Studies_Widget extends WP_Widget {

\t/**
\t * Register the widget with its id base and picker labels.
\t */
\tpublic function __construct() {
\t\tparent::__construct(
\t\t\t'acme_case_studies',
\t\t\t__( 'Recent Case Studies', 'acme' ),
\t\t\tarray(
\t\t\t\t'description' => __( 'Lists the newest case studies with links.', 'acme' ),
\t\t\t\t'classname'   => 'acme-case-studies',
\t\t\t)
\t\t);
\t}
}

/**
 * Register the widget.
 */
function acme_case_studies_register() {
\tregister_widget( 'Acme_Case_Studies_Widget' );
}
add_action( 'widgets_init', 'acme_case_studies_register' );`,
    note:
      'For the same four fields, `update()` comes out as `sanitize_text_field()` on the title, `absint()` on the count, a `sanitize_key()` whitelist check on the select and `! empty()` on the checkbox — each falling back to that field\'s declared default.',
  },
  refLinks: [
    {
      href: 'https://developer.wordpress.org/reference/classes/wp_widget/',
      title: 'WP_Widget — WordPress developer reference',
      description: 'The base class, its constructor arguments and every method you can override.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/register_widget/',
      title: 'register_widget() — WordPress developer reference',
      description: 'The registration call, and why it belongs on widgets_init.',
    },
    {
      href: 'https://developer.wordpress.org/themes/functionality/widgets/',
      title: 'Widgets — Theme Handbook',
      description: 'How widgets, widget areas and the Widgets screen relate to each other.',
    },
    {
      href: 'https://developer.wordpress.org/block-editor/how-to-guides/widgets/legacy-widget-block/',
      title: 'About the Legacy Widget block — Block Editor Handbook',
      description: 'How a WP_Widget subclass renders in the block-based Widgets screen, and show_instance_in_rest.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/sanitize_text_field/',
      title: 'sanitize_text_field() — WordPress developer reference',
      description: 'What the default text sanitiser strips, and when a different one is the right choice.',
    },
    {
      href: 'https://developer.wordpress.org/reference/hooks/widgets_init/',
      title: 'widgets_init — WordPress developer reference',
      description: 'The hook both widget classes and widget areas must be registered on.',
    },
  ],

  faqTitle: 'Custom widgets — frequently asked questions',
  faqIntro: 'The questions that come up when a WP_Widget subclass does not behave the way the handbook implies.',
  faqs: [
    {
      question: 'Why does my custom widget not appear in the widget picker?',
      answer:
        '`register_widget()` has to run inside a callback hooked to `widgets_init`, and the class must already be defined when it runs. If the class lives in a separate file, require it before the hook fires. A fatal error anywhere earlier in `functions.php` will also stop the registration silently, so check the PHP error log before assuming the widget code is wrong.',
    },
    {
      question: 'Why do two copies of my widget share the same settings?',
      answer:
        'The form is printing hard-coded `id` and `name` attributes instead of `$this->get_field_id( \'key\' )` and `$this->get_field_name( \'key\' )`. Those methods namespace each input with the instance number, which is the only thing that keeps two placements of the same widget separate. Without them both instances post to the same field name and the last one saved wins.',
    },
    {
      question: 'Should I still build WP_Widget widgets, or a block?',
      answer:
        'Both still work. Since WordPress 5.8 the Widgets screen is block-based and a `WP_Widget` subclass renders inside a Legacy Widget block — nothing has been removed. For a classic theme with real widget areas, a widget class is still the pragmatic choice and takes far less tooling. For a block theme, where the site editor and template parts replace widget areas entirely, write a block instead.',
    },
    {
      question: 'Why does my widget show a "no preview available" message in the block editor?',
      answer:
        'The Legacy Widget block can only render a live preview when the widget\'s instance data is exposed to the REST API. Pass `\'show_instance_in_rest\' => true` in the options array of your `parent::__construct()` call. It is opt-in because core cannot know whether your instance array is safe to expose; only enable it if the saved settings contain nothing sensitive.',
    },
    {
      question: 'Where does the widget title heading markup come from?',
      answer:
        'From the sidebar, not the widget. `$args[\'before_title\']` and `$args[\'after_title\']` are whatever the theme passed to `register_sidebar()`, which is why a widget should echo them around the title rather than printing its own `<h2>`. Run the title through `apply_filters( \'widget_title\', … )` as well, so plugins that translate or modify widget titles keep working.',
    },
    {
      question: 'Do I need to sanitise in update() if I escape in widget()?',
      answer:
        'Yes, both. `update()` decides what is written to the database and is the only place the raw submitted value is seen, so unsanitised input is stored permanently. Escaping in `widget()` protects the specific context you are printing into — `esc_html()` for text, `esc_url()` for a link, `esc_attr()` for an attribute. Sanitise on input, escape on output; neither replaces the other.',
    },
  ],

  related: [
    { id: 'sidebar', note: 'Register the widget area this class will be dropped into, with matching wrapper markup.' },
    { id: 'theme-support', note: 'customize-selective-refresh-widgets so the widget updates live in the Customiser.' },
    { id: 'theme-json', note: 'For a block theme, template parts replace widget areas — start here instead.' },
    { id: 'child-theme', note: 'A safe home for a widget class that belongs to the site rather than the parent theme.' },
    { id: 'shortcode', note: 'The same output outside a sidebar, with typed attributes and defaults.' },
    { id: 'dashboard-widget', note: 'The admin-side equivalent, with capability checks and a configuration callback.' },
  ],
};
