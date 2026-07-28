import type { ToolContent } from '../toolContentTypes';

export const sidebarContent: ToolContent = {
  aboutTitle: 'Sidebar & Widget Area Generator Online',
  aboutLead:
    'Register the widget areas your theme needs and get the `register_sidebar()` calls, the wrapper markup and the matching `dynamic_sidebar()` template code together. Every area is emitted with real `before_widget`, `after_widget`, `before_title` and `after_title` values, so widgets land inside the markup your CSS already targets instead of core\'s bare defaults.',
  aboutSupport:
    'A rendered sample widget updates as you edit the wrapper, so you can see exactly what a Recent Posts widget will output before you paste anything. Free to use, no account, and nothing you type leaves the browser.',
  spec: {
    hook: 'register_sidebar() on widgets_init',
    outputs: 'A snippet, a `functions.php` block, or a standalone plugin file, plus the template call',
    requires: 'WordPress 2.2 or newer, PHP 7.4+',
  },

  whyTitle: 'Why the register_sidebar generator beats copying a widget area from another theme',
  whyIntro:
    'The `register_sidebar()` array looks trivial until an unclosed `</aside>` leaks out of every widget on the page, or `%1$s` goes missing from `before_widget` and suddenly no widget has an id or a `widget_*` class for your CSS and your JavaScript to match. Those failures are invisible in the admin and obvious in the browser. This generator checks the markup as you write it.',
  features: [
    {
      title: 'Unbalanced wrapper markup is caught, not shipped',
      body: 'The tool parses `before_widget` against `after_widget` and `before_title` against `after_title`, names every tag that is opened and never closed, and offers a one-click fix that appends the right closing tags in the right order.',
    },
    {
      title: 'The %1$s and %2$s placeholders are enforced',
      body: '`before_widget` is checked for both placeholders, because core `sprintf()`s the widget id and the `widget_*` class into them. Lose either and theme CSS and most widget JavaScript quietly stop matching. One click restores the wrapper.',
    },
    {
      title: 'Ids that survive sanitize_title()',
      body: 'Core runs your id through `sanitize_title()`, so an id with capitals or spaces is stored differently from the one you call in `dynamic_sidebar()`. Unsafe ids are errors with the corrected value shown, and duplicate ids are flagged because the second registration overwrites the first.',
    },
    {
      title: 'Heading levels judged, not ignored',
      body: 'A `before_title` with no heading tag is a warning — screen readers navigate a sidebar by its widget titles. `h1` is flagged as belonging to the content, and `h4`–`h6` as skipping levels on most templates.',
    },
    {
      title: 'The template call, with the guard',
      body: 'The Template tab writes the `is_active_sidebar()` guard, the wrapper div, optional editor-facing fallback content for the empty case, and the `get_sidebar()` note. Without the guard an empty area still prints its wrapper, which shows up as an unexplained gap.',
    },
    {
      title: 'Three code shapes, one set of markup',
      body: 'Emit an array plus a `foreach` with shared defaults, one `register_sidebar()` call per area, or a small final class hooked to `widgets_init` — and override the markup per area when one of them genuinely differs.',
    },
  ],

  howTitle: 'How does the Sidebar Generator work?',
  howIntro:
    'Four steps, and the sample widget re-renders after every keystroke so you never have to guess at the output markup.',
  steps: [
    {
      title: 'Add the widget areas',
      body: 'Start from a preset — a single sidebar, three footer columns, sidebar plus footer, or a shop bundle — then edit the id, name and description of each. The description is the one line the Widgets screen shows the site owner.',
    },
    {
      title: 'Choose the wrapper markup',
      body: 'Pick a preset (classic aside, section, card, minimal div) or write the four values yourself. Keep one shared set for every area, or unshare it and override an individual area.',
    },
    {
      title: 'Set the naming and shape',
      body: 'Choose the function prefix and text domain, then the code shape: array plus loop, one call per area, or a class. Turn the `is_active_sidebar()` guard, the fallback block and the `get_sidebar()` note on or off.',
    },
    {
      title: 'Clear the checks, then export',
      body: 'Fix the flagged markup and id problems, then copy the registration and the template call, or download as a snippet, a `functions.php` block or a plugin file.',
    },
  ],
  example: {
    title: 'Worked example — a sidebar and one footer column with shared markup',
    intro:
      'Two areas that share one wrapper, emitted as an array plus a loop so the markup is written once. This is exactly what the Snippet tab produces.',
    code: `/**
 * Register the theme’s widget areas.
 */
function mytheme_widget_areas() {
\t$defaults = array(
\t\t'before_widget' => '<aside id="%1$s" class="widget %2$s">',
\t\t'after_widget'  => '</aside>',
\t\t'before_title'  => '<h2 class="widget-title">',
\t\t'after_title'   => '</h2>',
\t);

\t$areas = array(
\t\tarray(
\t\t\t'id'          => 'sidebar-1',
\t\t\t'name'        => __( 'Sidebar', 'mytheme' ),
\t\t\t'description' => __( 'The main sidebar on posts and pages.', 'mytheme' ),
\t\t),
\t\tarray(
\t\t\t'id'          => 'footer-1',
\t\t\t'name'        => __( 'Footer 1', 'mytheme' ),
\t\t\t'description' => __( 'First footer column.', 'mytheme' ),
\t\t),
\t);

\tforeach ( $areas as $area ) {
\t\tregister_sidebar( array_merge( $defaults, $area ) );
\t}
}
add_action( 'widgets_init', 'mytheme_widget_areas' );`,
    note:
      'The Template tab pairs this with `is_active_sidebar( \'sidebar-1\' )` wrapped around `dynamic_sidebar( \'sidebar-1\' )`, so an area with nothing in it prints nothing at all rather than an empty wrapper.',
  },
  refLinks: [
    {
      href: 'https://developer.wordpress.org/reference/functions/register_sidebar/',
      title: 'register_sidebar() — WordPress developer reference',
      description: 'Every argument the function accepts, including the four markup values and the id.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/dynamic_sidebar/',
      title: 'dynamic_sidebar() — WordPress developer reference',
      description: 'The template-side call, and why the index you pass must match the registered id.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/is_active_sidebar/',
      title: 'is_active_sidebar() — WordPress developer reference',
      description: 'The guard that stops an empty widget area printing its wrapper markup.',
    },
    {
      href: 'https://developer.wordpress.org/reference/hooks/widgets_init/',
      title: 'widgets_init — WordPress developer reference',
      description: 'The hook widget areas and widget classes must both be registered on.',
    },
    {
      href: 'https://developer.wordpress.org/themes/functionality/sidebars/',
      title: 'Sidebars — Theme Handbook',
      description: 'How widget areas fit into a theme, including multiple areas and template parts.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/sanitize_title/',
      title: 'sanitize_title() — WordPress developer reference',
      description: 'What core does to the id you supply, and why an unsafe id stops matching your template call.',
    },
  ],

  faqTitle: 'Widget areas — frequently asked questions',
  faqIntro: 'The questions people actually ask when a registered sidebar does not behave.',
  faqs: [
    {
      question: 'Why is my registered sidebar not showing under Appearance › Widgets?',
      answer:
        'Almost always because `register_sidebar()` never ran. It has to be called from a callback hooked to `widgets_init` — calling it directly at the top of `functions.php` is too early. Check that the file is actually loaded (a child theme\'s `functions.php` is, an unreferenced include is not), and that no fatal error earlier in the file stopped execution before the hook was added.',
    },
    {
      question: 'My widgets appear in the admin but nothing shows on the front end. Why?',
      answer:
        'The id you registered and the id you passed to `dynamic_sidebar()` do not match. Core runs the registered id through `sanitize_title()`, so `Footer 1` is stored as `footer-1`. If you omit the `id` argument entirely, WordPress numbers the areas `sidebar-1`, `sidebar-2` and so on in registration order, which changes the moment you add an area above an existing one. Always set an explicit lowercase, dash-separated id.',
    },
    {
      question: 'What do %1$s and %2$s mean in before_widget?',
      answer:
        'Core passes `before_widget` through `sprintf()` with two arguments: `%1$s` becomes the widget\'s unique HTML id and `%2$s` becomes its class name, such as `widget_recent_entries`. Dropping either placeholder means every widget renders without an id or without the class most themes and widget scripts select on. Keep them both, as in `<aside id="%1$s" class="widget %2$s">`.',
    },
    {
      question: 'How do I stop an empty widget area leaving a gap in the layout?',
      answer:
        'Wrap the output in `is_active_sidebar( \'your-id\' )`. Without it the template still prints the wrapper `<div>` even when no widget is assigned, and the padding or grid column it carries shows up as unexplained whitespace. The guard also gives you an `else` branch for fallback content.',
    },
    {
      question: 'Can I change a sidebar id later without losing the assigned widgets?',
      answer:
        'No. Widget assignments are stored in the `sidebars_widgets` option keyed by sidebar id, so renaming the id orphans everything the site owner had placed in it — the widgets move to the Inactive Widgets list. Decide on ids before release, and if you must rename one, migrate the option value in an update routine.',
    },
    {
      question: 'Do classic widget areas still work with the block editor?',
      answer:
        'Yes. Since WordPress 5.8 the Widgets screen is block-based, but registered widget areas are still the containers those blocks are placed into, and classic widgets render through the Legacy Widget block. `register_sidebar()`, `dynamic_sidebar()` and `is_active_sidebar()` are unchanged. Block themes are the exception: they use template parts and the site editor rather than widget areas.',
    },
  ],

  related: [
    { id: 'widget', note: 'Build the WP_Widget class that gets dropped into the area you just registered.' },
    { id: 'nav-menu', note: 'The other half of theme registration — menu locations and their wp_nav_menu() call.' },
    { id: 'theme-support', note: 'Turn on customize-selective-refresh-widgets so widgets update live in the Customiser.' },
    { id: 'child-theme', note: 'Widget areas registered in a child theme need their own registration — the parent\'s are not inherited.' },
    { id: 'theme-json', note: 'For a block theme, template parts and theme.json replace widget areas entirely.' },
    { id: 'hooks', note: 'Get the widgets_init callback signature and priority right in the first place.' },
  ],
};
