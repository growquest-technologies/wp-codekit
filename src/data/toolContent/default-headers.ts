import type { ToolContent } from '../toolContentTypes';

export const defaultHeadersContent: ToolContent = {
  aboutTitle: 'register_default_headers() Generator Online',
  aboutLead:
    'Bundle header images with your theme and let the site owner pick one from the Customiser. This generator writes the `add_theme_support( \'custom-header\' )` block and the matching `register_default_headers()` array together, with the `%1$s` and `%2$s` URL placeholders core expects, the optional `wp-head-callback` that prints the chosen text colour, and the `header.php` code that renders the result.',
  aboutSupport:
    'The Customiser\'s Suggested list is mocked live from your entries, so you can see the tiles, the descriptions and the crop behaviour your declared dimensions will produce before anything is uploaded. Free, no account, and nothing you enter leaves the browser.',
  spec: {
    hook: 'register_default_headers() on after_setup_theme',
    outputs: 'A `functions.php` block, a child-theme variant at priority 11, or the `header.php` template code',
    requires: 'WordPress 3.4 or newer, PHP 7.4+',
  },

  whyTitle: 'Why the custom header generator beats copying the Twenty-Something example',
  whyIntro:
    'The `url` values in `register_default_headers()` are not plain URLs — core runs each one through `vsprintf()`, where `%1$s` is the parent theme URI and `%2$s` is the child theme URI. Hardcoding `get_template_directory_uri()` works right up until a child theme wants its own headers. Add a `header-text` control with nothing to print the colour, or a `default-text-color` with a `#` in front of it, and you have a Customiser panel that does nothing. This tool writes both blocks and audits the pair.',
  features: [
    {
      title: 'The %1$s and %2$s placeholders written for you',
      body: 'Every `url` and `thumbnail_url` is emitted against the placeholder for the base you chose — parent theme URI or child theme URI — and an absolute `http://` file name is an error with a one-click fix that strips the domain.',
    },
    {
      title: 'Array keys treated as the permanent identifiers they are',
      body: 'Core remembers the user\'s choice by array key, so an unsafe key is an error with the cleaned value shown, a duplicate key is an error because the second entry replaces the first, and a default image pointing at a key that is not registered is a warning.',
    },
    {
      title: 'Crop behaviour predicted from your own numbers',
      body: 'Record each image\'s real dimensions and the generator compares them with the declared `width`/`height` and the flex flags, warning where core will crop, and noting when several images have aspect ratios different enough to make the Customiser preview jump.',
    },
    {
      title: 'The header-text pairing enforced',
      body: '`header-text` on with no `wp-head-callback` means nothing prints the colour the user picks, so the control does nothing at all — a warning with a one-click fix. A `default-text-color` with a leading `#` is an error, since core adds the hash itself and you end up with `##`.',
    },
    {
      title: 'A wp-head-callback that gets the condition right',
      body: 'The generated callback returns early only when the text is shown and left at the default colour. Bailing on the colour alone would skip the rule that visually hides the title, which is the bug in most copied versions of this function.',
    },
    {
      title: 'Thumbnails, because the Customiser will not resize for you',
      body: 'An entry with no `thumbnail_url` makes the Customiser download the full-size image for a 230px tile. Missing thumbnails are flagged, and one click derives `-thumb` file names from the originals.',
    },
  ],

  howTitle: 'How does the Default Theme Headers Generator work?',
  howIntro:
    'Four steps. The Customiser mock updates as you type, so the Suggested list you are describing is visible throughout.',
  steps: [
    {
      title: 'List the bundled headers',
      body: 'Add each image with its array key, file name, thumbnail file name, description and real dimensions. Reorder them by dragging — the order here is the order of the Suggested tiles.',
    },
    {
      title: 'Configure custom-header support',
      body: 'Set the declared width and height, the flex flags, whether uploads and video headers are allowed, and whether the site owner gets the header text controls at all.',
    },
    {
      title: 'Choose the folder and the URL base',
      body: 'Point at the folder your images live in and pick `%1$s` for a parent theme or `%2$s` for a child theme. Mark one entry as the default image.',
    },
    {
      title: 'Clear the checks, then export',
      body: 'Resolve the flagged keys, descriptions and colour values, then take the `functions.php` block, the child-theme variant hooked at priority 11, or the `header.php` output code.',
    },
  ],
  example: {
    title: 'Worked example — one bundled header with the text-colour control',
    intro:
      'Support declaration and the registration array in one setup function. The `%1$s` in each URL is replaced by core with the parent theme URI.',
    code: `/**
 * Custom header support and the images bundled with the theme.
 */
function acme_custom_header_setup() {
\tadd_theme_support(
\t\t'custom-header',
\t\tarray(
\t\t\t'default-image'      => get_template_directory_uri() . '/assets/headers/dunes.jpg',
\t\t\t'width'              => 1920,
\t\t\t'height'             => 480,
\t\t\t'flex-width'         => false,
\t\t\t'flex-height'        => true,
\t\t\t'header-text'        => true,
\t\t\t'default-text-color' => '1c1a15',
\t\t\t'uploads'            => true,
\t\t\t'wp-head-callback'   => 'acme_header_style',
\t\t)
\t);

\tregister_default_headers(
\t\tarray(
\t\t\t'dunes' => array(
\t\t\t\t'url'           => '%1$s/assets/headers/dunes.jpg',
\t\t\t\t'thumbnail_url' => '%1$s/assets/headers/dunes-thumb.jpg',
\t\t\t\t'description'   => __( 'Dunes at dawn', 'acme' ),
\t\t\t),
\t\t)
\t);
}
add_action( 'after_setup_theme', 'acme_custom_header_setup' );`,
    note:
      'Because `wp-head-callback` is set, the generator also writes `acme_header_style()` — the function that prints the chosen colour, or the rule that visually hides the title and tagline when the user turns the header text off.',
  },
  refLinks: [
    {
      href: 'https://developer.wordpress.org/reference/functions/register_default_headers/',
      title: 'register_default_headers() — WordPress developer reference',
      description: 'The array shape, including url, thumbnail_url and description per entry.',
    },
    {
      href: 'https://developer.wordpress.org/themes/functionality/custom-headers/',
      title: 'Custom Headers — Theme Handbook',
      description: 'Every custom-header argument, the template functions, and how the Customiser panel behaves.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/add_theme_support/',
      title: 'add_theme_support() — WordPress developer reference',
      description: 'The custom-header feature and the full argument list this generator writes.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/the_header_image_tag/',
      title: 'the_header_image_tag() — WordPress developer reference',
      description: 'The template call that prints a responsive img tag for the selected header.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/get_header_image/',
      title: 'get_header_image() — WordPress developer reference',
      description: 'The URL of the current header, for when you need to build the markup yourself.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/display_header_text/',
      title: 'display_header_text() — WordPress developer reference',
      description: 'Whether the site owner has chosen to show the title and tagline over the header.',
    },
  ],

  faqTitle: 'Custom header images — frequently asked questions',
  faqIntro: 'The questions that come up when a bundled header does not appear, or does not look right.',
  faqs: [
    {
      question: 'Why do my registered headers not appear in the Customiser?',
      answer:
        'Three usual causes. The theme has to declare `add_theme_support( \'custom-header\' )` before or alongside `register_default_headers()`, both from a callback on `after_setup_theme`. The image files have to exist at the path the `url` resolves to. And each entry needs a distinct array key — a duplicate key silently replaces the earlier entry rather than adding a second one.',
    },
    {
      question: 'What do %1$s and %2$s mean in a header url?',
      answer:
        'Core passes each `url` and `thumbnail_url` through `vsprintf()` with two arguments: `%1$s` is `get_template_directory_uri()`, the parent theme URI, and `%2$s` is `get_stylesheet_directory_uri()`, the child theme URI. Writing `%1$s/assets/headers/dunes.jpg` keeps the path correct whether the theme is used directly or as a parent. Hardcoding a full URL works until a child theme wants its own headers.',
    },
    {
      question: 'What is the difference between flex-width and flex-height?',
      answer:
        'With both `false`, the declared `width` and `height` are enforced: the Customiser forces every uploaded image through a crop step to exactly those dimensions. Turning on `flex-height` lets an image of any height through untouched while the width is still fixed, and `flex-width` does the reverse. With both on, the dimensions are only hints, so your CSS has to cope with whatever the site owner uploads.',
    },
    {
      question: 'Why does my header text colour render as ##1c1a15?',
      answer:
        '`default-text-color` takes a bare hex value with no leading hash — core adds the `#` itself when it prints the value. Passing `#1c1a15` produces `##1c1a15`, which every browser discards. The same applies to the value stored by `get_header_textcolor()`, so template code should print it as `color: #<?php echo esc_attr( get_header_textcolor() ); ?>`.',
    },
    {
      question: 'How do I let users hide the site title over the header image?',
      answer:
        'Set `\'header-text\' => true` and register a `wp-head-callback`. The control appears in the Customiser, and your callback checks `display_header_text()`: when it returns false, print CSS that visually hides `.site-title` and `.site-description` — position them absolutely with `clip-path: inset(50%)` rather than using `display: none`, so the text stays available to screen readers.',
    },
    {
      question: 'Do custom headers work in a block theme?',
      answer:
        'Not in the same way. `custom-header` support and the Customiser panel belong to classic and hybrid themes; a block theme puts its header in a `parts/header.html` template part edited in the site editor, where the image is a Cover or Image block the user edits directly. If your theme is block-based, build the header as a template part rather than registering default headers.',
    },
  ],

  related: [
    { id: 'theme-support', note: 'Every other add_theme_support() flag, in one correctly hooked setup function.' },
    { id: 'child-theme', note: 'Ship replacement headers from a child theme using the %2$s placeholder and priority 11.' },
    { id: 'theme-json', note: 'The block-theme alternative — header parts and styles instead of a Customiser panel.' },
    { id: 'sidebar', note: 'Widget areas that sit alongside the header in the same template.' },
    { id: 'nav-menu', note: 'The menu location that usually shares header.php with the header image.' },
    { id: 'enqueue', note: 'Front-end CSS for the header banner, loaded with correct dependencies and versions.' },
  ],
};
