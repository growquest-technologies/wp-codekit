import type { ToolContent } from '../toolContentTypes';

export const childThemeContent: ToolContent = {
  aboutTitle: 'WordPress Child Theme Generator Online',
  aboutLead:
    'Search the live wordpress.org theme directory for your parent, and this WordPress child theme generator writes the whole folder for you — `style.css` with a `Template:` header copied character for character from the parent directory, a `functions.php` that enqueues the parent stylesheet as a dependency, an optional `theme.json`, `rtl.css` and a generated `screenshot.png` — packed into a `.zip` you can upload at Appearance › Themes › Add New.',
  aboutSupport:
    'The Preview tab shows the Themes grid the way it will look once the zip is installed, including the "parent theme is missing" notice you get when the `Template` value does not match a real folder. Everything runs in the browser: the only network call is the read-only theme search against api.wordpress.org, and nothing you type is uploaded or stored anywhere.',
  spec: {
    hook: 'Template: parent-slug',
    outputs: 'A ready-to-install `.zip` — `style.css`, `functions.php`, `theme.json`, `rtl.css`, `screenshot.png`',
    requires: 'WordPress 6.0 or newer, PHP 7.4+ (both configurable in the header)',
  },

  whyTitle: 'Why the child theme generator beats copying a style.css off a blog post',
  whyIntro:
    'A child theme is four lines of header and one enqueue, which is exactly why so many of them are broken. The `Template` value is matched against the parent directory name byte for byte and it is case sensitive — Divi, Extra, Avada, Impreza, Total and Newspaper all ship a capitalised folder, and getting that wrong lands the theme under Broken Themes with a "parent theme is missing" notice. This tool takes the folder name from the source of truth instead of from your memory.',
  features: [
    {
      title: 'The parent slug comes from the directory, not your typing',
      body: 'Search is live against the wordpress.org theme API, so the `Template` value is the real folder name. A bundled list of 24 premium parents covers the themes that are not on wordpress.org, including the capitalised ones and `dt-the7`, whose folder is nothing like its name.',
    },
    {
      title: 'Case sensitivity flagged both ways',
      body: 'A capital letter in the parent folder raises a warning with a one-click "Make it lowercase" fix — unless you picked a theme known to ship capitalised, in which case it downgrades to a note telling you to leave it exactly as it is.',
    },
    {
      title: 'Three honest enqueue strategies, no @import',
      body: 'Load the parent `style.css` then the child as a dependency, or declare the parent\'s existing handle as the dependency so nothing loads twice, or skip the enqueue entirely for block themes and for frameworks like Genesis that have no front-end CSS. `@import` is never emitted.',
    },
    {
      title: 'Checks that catch the silent failures',
      body: 'Child folder equal to the parent, a space in the `Template` value, a text domain that does not match the folder, a version that `version_compare()` cannot read, and switching `functions.php` off while an enqueue is still selected — that last one ships an unstyled site and is an error, not a warning.',
    },
    {
      title: 'The Customiser reset, solved on activation',
      body: '`theme_mods` are stored per stylesheet, so a fresh child starts with an empty Customiser. An optional `after_switch_theme` callback copies the parent\'s mods across once, deliberately dropping `nav_menu_locations` because WordPress already remaps those.',
    },
    {
      title: 'A real zip, written in the browser',
      body: 'Files are packed with a stored-entry ZIP writer and the `screenshot.png` is drawn on a canvas at 1200 × 900, so the Themes grid shows a card instead of the grey placeholder. Nothing is uploaded to build it.',
    },
  ],

  howTitle: 'How does the child theme generator work?',
  howIntro:
    'Four steps. The only value that has to be exactly right is the parent folder name, and the search picks that for you.',
  steps: [
    {
      title: 'Find the parent',
      body: 'Search wordpress.org, filter the bundled premium list, or type the folder name in by hand. Picking a result fills in the parent name, the folder and whether it is a block theme.',
    },
    {
      title: 'Name the child',
      body: 'The folder defaults to `parent-slug-child` and the text domain follows it. Set the version, author, author URI and description — empty header rows are simply left out of `style.css`.',
    },
    {
      title: 'Choose how the parent stylesheet loads',
      body: 'Stack both stylesheets, depend on the parent\'s own handle (you supply the handle from its `wp_enqueue_style()` call), or emit no enqueue at all for a theme.json-driven block parent.',
    },
    {
      title: 'Pick the files, then download the zip',
      body: 'Toggle `functions.php`, the translation loader, the Customiser copy, an `after_setup_theme` stub at priority 11, `theme.json`, `rtl.css` and the screenshot. Clear the Checks tab, then download.',
    },
  ],
  example: {
    title: 'Worked example — style.css for a child of Astra',
    intro:
      'The whole of `style.css` as it lands in the zip. `Template: astra` is the only line that makes this a child theme rather than a standalone one.',
    code: `/*
Theme Name:         Astra Child
Description:        Child theme for Astra.
Template:           astra
Version:            1.0.0
Requires at least:  6.0
Requires PHP:       7.4
License:            GNU General Public License v2 or later
License URI:        https://www.gnu.org/licenses/gpl-2.0.html
Text Domain:        astra-child
*/

/* -----------------------------------------------------------------
   Your styles go below. This file loads after astra/style.css,
   so a selector of equal specificity already wins — !important is
   almost never the answer.
   ----------------------------------------------------------------- */`,
    note:
      'The matching `functions.php` enqueues `get_template_directory_uri() . \'/style.css\'` under the handle `astra-style`, then enqueues `get_stylesheet_uri()` with `array( \'astra-style\' )` as its dependency, so WordPress prints them in that order whatever else registers in between.',
  },
  refLinks: [
    {
      href: 'https://developer.wordpress.org/themes/advanced-topics/child-themes/',
      title: 'Child Themes — Theme Handbook',
      description: 'The official reference for the Template header, the required files and how overriding works.',
    },
    {
      href: 'https://developer.wordpress.org/themes/core-concepts/main-stylesheet/',
      title: 'Main stylesheet (style.css) — Theme Handbook',
      description: 'Every header field WordPress reads out of style.css, and which ones are required.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/wp_enqueue_style/',
      title: 'wp_enqueue_style() — WordPress developer reference',
      description: 'The dependency array that guarantees the parent stylesheet prints before the child.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/get_stylesheet_directory/',
      title: 'get_stylesheet_directory() — WordPress developer reference',
      description: 'Child paths versus parent paths, and why get_template_directory() is the one that points at the parent.',
    },
    {
      href: 'https://developer.wordpress.org/reference/hooks/after_switch_theme/',
      title: 'after_switch_theme — WordPress developer reference',
      description: 'The activation hook the Customiser-copy snippet runs on, once per switch.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/load_child_theme_textdomain/',
      title: 'load_child_theme_textdomain() — WordPress developer reference',
      description: 'How a child theme registers its own translations without disturbing the parent\'s.',
    },
  ],

  faqTitle: 'WordPress child themes — frequently asked questions',
  faqIntro: 'The questions that come up most often when a child theme does not behave the way the tutorial promised.',
  faqs: [
    {
      question: 'Why does WordPress say "the parent theme is missing" when the parent is clearly installed?',
      answer:
        'The `Template:` value in the child\'s `style.css` is matched against the parent\'s directory name in `wp-content/themes`, character for character, and it is case sensitive on Linux hosting. `Template: Divi` and `Template: divi` are two different themes to WordPress. Divi, Extra, Avada, Impreza, Total and Newspaper genuinely ship capitalised folders, and The7\'s folder is `dt-the7`. Check the folder over SFTP and copy the name exactly — it is the parent\'s directory, never its display name.',
    },
    {
      question: 'Should I use @import to load the parent stylesheet?',
      answer:
        'No. `@import url("../parent/style.css")` still works, but the browser cannot discover the parent stylesheet until it has downloaded and parsed the child one, so the two never fetch in parallel. Enqueue instead: register the parent stylesheet with a handle, then enqueue `get_stylesheet_uri()` with that handle in its dependency array. You get the same cascade order without the serial round trip.',
    },
    {
      question: 'Does a child theme\'s functions.php replace the parent\'s?',
      answer:
        'No — both files run, and the child\'s runs first. `functions.php` is the one file that is never replaced; every other template file works the opposite way, where a copy in the child folder replaces the parent\'s entirely. Because the child loads first you cannot simply redefine a parent function unless the parent wrapped it in `function_exists()`. To change parent behaviour, `remove_action()` its callback from a later hook, or hook your own callback at a higher priority number.',
    },
    {
      question: 'Why did my Customiser settings disappear after activating the child theme?',
      answer:
        'Nothing was lost. `theme_mods` are stored in an option keyed by stylesheet — `theme_mods_astra` versus `theme_mods_astra-child` — so a newly activated child starts from an empty set. Widgets behave the same way. Menu locations are the exception: WordPress tries to remap those on switch. Copying the parent\'s mods across once on `after_switch_theme` restores the rest, which is what this generator\'s optional activation snippet does.',
    },
    {
      question: 'Do I need a theme.json in the child theme?',
      answer:
        'Only if you are changing something the parent set there. WordPress merges the child\'s `theme.json` over the parent\'s rather than replacing it, so you declare just the keys you are overriding — a colour, a font size, one padding value — and everything else is inherited. For a block theme parent this is usually all a child theme needs, and no stylesheet enqueue is required at all.',
    },
    {
      question: 'Do I have to keep the parent theme installed and updated?',
      answer:
        'Yes. The child only supplies the files it overrides; every template, function and asset it does not define comes from the parent at runtime. Deleting the parent breaks the site. Keep the parent installed and updated — that is the whole point of the arrangement, since your changes live in the child and survive every parent update.',
    },
  ],

  related: [
    { id: 'theme-support', note: 'The after_setup_theme callback your child runs at priority 11 to add or remove parent features.' },
    { id: 'theme-json', note: 'Build the child theme.json properly — it is merged over the parent, so only declare what changes.' },
    { id: 'sidebar', note: 'Register the child theme\'s own widget areas; the parent\'s are not inherited automatically.' },
    { id: 'nav-menu', note: 'Menu locations the child registers, and the wp_nav_menu() call for its template files.' },
    { id: 'enqueue', note: 'Beyond style.css — scripts, editor styles and conditional assets from the child theme.' },
    { id: 'hooks', note: 'The remove_action() and priority work that changing parent behaviour actually requires.' },
  ],
};
