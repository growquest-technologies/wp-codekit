import type { ToolContent } from '../toolContentTypes';

export const navMenuContent: ToolContent = {
  aboutTitle: 'Nav Menu Location Generator Online',
  aboutLead:
    'Register your theme\'s menu locations with `register_nav_menus()` and get the matching `wp_nav_menu()` call in the same pass. Every argument that decides what the markup looks like — `theme_location`, `container`, `items_wrap`, `depth`, `fallback_cb` — is a field here, and the generated template code comes with the `has_nav_menu()` guard and a labelled `<nav>` landmark already in place.',
  aboutSupport:
    'A sample menu renders live from your settings, complete with a current item and a sub-menu, so you can see the exact classes your CSS will have to target before you write any. Free, no account, and nothing you type leaves the browser.',
  spec: {
    hook: 'register_nav_menus() on after_setup_theme',
    outputs: 'A snippet, a `functions.php` block, or a plugin file, plus the `wp_nav_menu()` template call',
    requires: 'WordPress 3.0 or newer, PHP 7.4+',
  },

  whyTitle: 'Why the register_nav_menus generator beats a two-line snippet',
  whyIntro:
    'Registering the location is the easy half. The half that goes wrong is the output call: a missing `%3$s` in `items_wrap` renders a list with no items in it, the default `fallback_cb` of `wp_page_menu` dumps every published page onto a site that has no menu assigned yet, and two unlabelled `<nav>` elements on one page are indistinguishable to a screen reader. This generator writes both halves and audits them together.',
  features: [
    {
      title: 'items_wrap is validated for %3$s',
      body: 'A custom `items_wrap` without `%3$s` produces a `<ul>` containing nothing at all — the most confusing failure in `wp_nav_menu()`. That is an error with a one-click restore of the default. Dropping `%1$s` while a `menu_id` is set is flagged too, because the id then never reaches the markup.',
    },
    {
      title: 'The wp_page_menu fallback is called out',
      body: 'Leaving `fallback_cb` at its default means a site with no menu assigned prints a link to every published page, including the ones nobody meant to publicise. The generator warns and can set it to `false`, or write you a proper fallback that only shows admins a link to the Menus screen.',
    },
    {
      title: 'Location slugs that match theme_location',
      body: 'Slugs are checked for safe lowercase-and-dash form, missing slugs are errors, and duplicate slugs are flagged because the second registration replaces the first. One click derives clean slugs from the location names.',
    },
    {
      title: 'Accessibility built into the template output',
      body: 'The optional wrapper emits a real `<nav>` with a translated `aria-label` from the location name, and the generator recommends it when you turn it off. It also warns when you have both a `container` and your own `<nav>` — two nested elements doing one job.',
    },
    {
      title: 'The has_nav_menu() guard',
      body: 'Without it an unassigned location still prints your nav wrapper and runs the fallback inside it. The guard is on by default, and turning it off raises a warning you can fix in one click.',
    },
    {
      title: 'Depth advice that matches what editors do',
      body: '`depth` 1 silently drops any child item an editor adds in the admin, and `depth` 0 allows unlimited nesting when most themes only style two levels. Both are flagged as notes rather than left for you to discover on a client site.',
    },
  ],

  howTitle: 'How does the Nav Menu Generator work?',
  howIntro:
    'Four steps. The sample menu redraws on every change, so the class names you are about to style are visible the whole time.',
  steps: [
    {
      title: 'Add the menu locations',
      body: 'Start from a preset — primary only, header plus footer, or a full theme set with social and legal links — then edit each slug, display name and the template file it belongs in.',
    },
    {
      title: 'Configure the wp_nav_menu() call',
      body: 'Set `container` (or `false` to write your own markup), `container_class`, `menu_class`, `menu_id`, `depth`, `items_wrap` and the fallback behaviour. Each change is reflected in the sample markup immediately.',
    },
    {
      title: 'Set the naming and shape',
      body: 'Pick the function prefix and text domain, choose procedural or a small class, and decide whether registration runs on `after_setup_theme` or `init`. Toggle the `has_nav_menu()` guard and the labelled `<nav>` wrapper.',
    },
    {
      title: 'Clear the checks, then export',
      body: 'Resolve the flagged slug and markup issues, copy the registration and the template call from their tabs, or download as a snippet, a `functions.php` block or a plugin file.',
    },
  ],
  example: {
    title: 'Worked example — a primary and a footer location',
    intro:
      'Two locations registered on `after_setup_theme`. This is the whole snippet, formatted exactly as it copies out.',
    code: `/**
 * Register the theme’s menu locations.
 */
function mytheme_nav_menus() {
\tregister_nav_menus(
\t\tarray(
\t\t\t'primary' => __( 'Primary Menu', 'mytheme' ),
\t\t\t'footer'  => __( 'Footer Menu', 'mytheme' ),
\t\t)
\t);
}
add_action( 'after_setup_theme', 'mytheme_nav_menus' );`,
    note:
      'The Template tab pairs this with a `has_nav_menu( \'primary\' )` guard around a `<nav aria-label="…">` wrapping `wp_nav_menu()` with `theme_location`, `menu_id`, `menu_class`, `container => false`, `depth => 2` and `fallback_cb => false`.',
  },
  refLinks: [
    {
      href: 'https://developer.wordpress.org/reference/functions/register_nav_menus/',
      title: 'register_nav_menus() — WordPress developer reference',
      description: 'Registering one or more locations, and the singular register_nav_menu() variant.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/wp_nav_menu/',
      title: 'wp_nav_menu() — WordPress developer reference',
      description: 'Every argument the output call accepts, including items_wrap, depth and fallback_cb.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/has_nav_menu/',
      title: 'has_nav_menu() — WordPress developer reference',
      description: 'The guard that tells you whether a menu is actually assigned to a location.',
    },
    {
      href: 'https://developer.wordpress.org/themes/functionality/navigation-menus/',
      title: 'Navigation Menus — Theme Handbook',
      description: 'How locations, menus and template output fit together in a theme.',
    },
    {
      href: 'https://developer.wordpress.org/reference/hooks/after_setup_theme/',
      title: 'after_setup_theme — WordPress developer reference',
      description: 'The hook theme features, including menu locations, belong on.',
    },
    {
      href: 'https://developer.wordpress.org/reference/classes/walker_nav_menu/',
      title: 'Walker_Nav_Menu — WordPress developer reference',
      description: 'The class to subclass when CSS on menu-item-has-children genuinely is not enough.',
    },
  ],

  faqTitle: 'Navigation menus — frequently asked questions',
  faqIntro: 'The questions that come up most often when a theme location or a wp_nav_menu() call does not do what you expected.',
  faqs: [
    {
      question: 'Why does my menu show the wrong items, or every page on the site?',
      answer:
        'Two different causes. If you omitted `theme_location`, `wp_nav_menu()` falls back to the first menu it can find, which is why menus sometimes appear in the wrong place. If a location is registered but nothing has been assigned to it in Appearance › Menus, the default `fallback_cb` of `wp_page_menu` runs and lists every published page. Set `theme_location` explicitly, and set `fallback_cb` to `false` unless you have written a fallback you actually want.',
    },
    {
      question: 'What is the difference between register_nav_menus() and wp_nav_menu()?',
      answer:
        '`register_nav_menus()` declares the slots your theme has, which is what makes the checkboxes appear in Appearance › Menus. `wp_nav_menu()` prints whichever menu the site owner assigned to one of those slots. Registration belongs in `functions.php` on `after_setup_theme`; the output call belongs in the template file. Registering without calling means the location exists but nothing renders.',
    },
    {
      question: 'How do I remove the wrapper div wp_nav_menu() adds?',
      answer:
        'Pass `\'container\' => false`. That drops the `<div class="menu-…">` entirely and leaves you with just the `<ul>`, which is usually cleaner than fighting the default markup with CSS. If you want a semantic landmark instead, write your own `<nav>` around the call and give it an `aria-label` — do not use both, or you end up with two nested elements doing one job.',
    },
    {
      question: 'What do %1$s, %2$s and %3$s mean in items_wrap?',
      answer:
        'They are `sprintf()` placeholders that core fills in: `%1$s` is the `menu_id`, `%2$s` is the `menu_class`, and `%3$s` is the menu items themselves. The default is `<ul id="%1$s" class="%2$s">%3$s</ul>`. Omitting `%3$s` is the classic mistake — the list renders with no items inside it at all, which looks like the menu is empty rather than like a template bug.',
    },
    {
      question: 'Should register_nav_menus() run on after_setup_theme or init?',
      answer:
        'Use `after_setup_theme`. It works on `init` too, but `after_setup_theme` is where theme features belong and it runs earlier, so anything that inspects registered locations sees them in time. The exception is a plugin registering locations for a theme it does not own — `init` is the safer hook there, since the theme may not be loaded when `after_setup_theme` fires for the plugin.',
    },
    {
      question: 'How do I add a class to the current menu item?',
      answer:
        'You do not need to — WordPress already adds `current-menu-item`, `current-menu-ancestor` and `current_page_parent` to the relevant `<li>` elements, and `menu-item-has-children` to any item with a sub-menu. Style those. Reach for a custom `Walker_Nav_Menu` subclass only when you need to change the element structure itself, not just its classes.',
    },
  ],

  related: [
    { id: 'sidebar', note: 'The other half of theme registration — widget areas, with the same before/after markup discipline.' },
    { id: 'theme-support', note: 'Declare html5 support so core prints modern markup alongside your menus.' },
    { id: 'child-theme', note: 'A child theme registers its own locations; the parent\'s assignments are remapped on switch.' },
    { id: 'theme-json', note: 'Block themes use the Navigation block and template parts instead of registered locations.' },
    { id: 'enqueue', note: 'Load the dropdown or mobile-toggle JavaScript your menu markup needs.' },
    { id: 'hooks', note: 'The after_setup_theme callback signature, priority and accepted arguments.' },
  ],
};
