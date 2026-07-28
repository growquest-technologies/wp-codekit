import type { ToolContent } from '../toolContentTypes';

export const themeSupportContent: ToolContent = {
  aboutTitle: 'add_theme_support() Generator Online',
  aboutLead:
    'Pick the features your theme declares and get one tidy `after_setup_theme` callback containing every `add_theme_support()` call, the text domain loader, `set_post_thumbnail_size()`, your `add_image_size()` registrations and the `image_size_names_choose` filter that puts those sizes in the editor dropdown. Features that take arguments — `html5`, `custom-logo`, `post-formats`, `custom-header`, `custom-background` — are written with sensible argument arrays rather than as bare one-liners.',
  aboutSupport:
    'Presets for a classic theme, a block theme and a bare minimum set get you to a realistic starting point in one click, and the Checks tab tells you which omissions a theme reviewer would actually object to. Free, no account, nothing uploaded.',
  spec: {
    hook: 'add_theme_support() on after_setup_theme',
    outputs: 'A `functions.php` block or a bare snippet',
    requires: 'WordPress 5.9 or newer for appearance-tools, PHP 7.4+',
  },

  whyTitle: 'Why the add_theme_support generator beats pasting feature flags one at a time',
  whyIntro:
    'Most `add_theme_support()` snippets are copied individually and end up scattered across `functions.php`, half of them hooked to the wrong action. The function only works when it runs on `after_setup_theme` — on `init` it is already too late for several features. And the flags interact: image sizes are useless without `post-thumbnails`, `editor-styles` does nothing without an `add_editor_style()` call, and `appearance-tools` makes three other flags redundant. This tool writes them as one coherent setup function and checks the combinations.',
  features: [
    {
      title: 'One setup function, correctly hooked',
      body: 'Everything lands inside a single `prefix_setup()` callback on `after_setup_theme`, starting with `load_theme_textdomain()` against `get_template_directory() . \'/languages\'` — the placement theme reviewers expect.',
    },
    {
      title: 'Arguments written out, not left as TODOs',
      body: '`html5` gets the full array of search form, comment form, comment list, gallery, caption, style and script. `custom-logo` gets height, width and both flex flags. `post-formats`, `custom-header` and `custom-background` come with real starting arrays.',
    },
    {
      title: 'Image sizes checked against core',
      body: 'Registering a size called `thumbnail`, `medium`, `medium_large`, `large` or `full` is an error — it silently changes core behaviour site-wide. Duplicate names, sizes with no dimensions, crop with only one dimension and widths above the 2560px upload cap are all flagged.',
    },
    {
      title: 'Dependencies between features enforced',
      body: 'Image sizes without `post-thumbnails` is an error, and so is `woocommerce` support without it, because product images need it. `set_post_thumbnail_size()` without the feature is a warning, since it does nothing.',
    },
    {
      title: 'Redundancy called out',
      body: '`appearance-tools` already includes line height, spacing and custom units, so listing those flags alongside it is flagged with a one-click "drop the extras". `custom-background` is noted as a pre-block-editor feature most modern themes handle in `theme.json` instead.',
    },
    {
      title: 'The editor dropdown filter you would otherwise forget',
      body: 'Custom sizes registered with `add_image_size()` do not appear in the editor\'s image size dropdown on their own. Add one and the generator writes the `image_size_names_choose` filter with translated labels alongside it.',
    },
  ],

  howTitle: 'How does the Theme Support Generator work?',
  howIntro:
    'Four steps. Start from a preset rather than a blank list — it is far easier to remove a flag than to remember one.',
  steps: [
    {
      title: 'Pick the theme kind',
      body: 'Classic theme, block theme or bare minimum. Each preset selects a realistic set of features; the block preset swaps the widget selective-refresh flag for `appearance-tools`.',
    },
    {
      title: 'Choose the features',
      body: 'Toggle individual flags across three groups — essentials, editor and branding/media. Each one carries a short note about what it actually changes, so you are not selecting on the name alone.',
    },
    {
      title: 'Add image sizes',
      body: 'Set the featured-image size as width, height and crop, then register any additional named sizes. Reorder them by dragging; each becomes an `add_image_size()` call plus a dropdown label.',
    },
    {
      title: 'Set the content width, then export',
      body: 'Give `$GLOBALS[\'content_width\']` a value so oEmbeds have a maximum, clear the Checks tab, then copy the block or download it for `functions.php`.',
    },
  ],
  example: {
    title: 'Worked example — the bare-minimum set with a featured image size',
    intro:
      'Four features and a thumbnail size. Note that `html5` is emitted with its argument array: passing the flag on its own does nothing in practice.',
    code: `/**
 * Declare what this theme supports.
 */
function mytheme_setup() {
\tload_theme_textdomain( 'mytheme', get_template_directory() . '/languages' );

\tadd_theme_support( 'title-tag' );
\tadd_theme_support( 'post-thumbnails' );
\tadd_theme_support( 'automatic-feed-links' );
\tadd_theme_support(
\t\t'html5',
\t\tarray(
\t\t\t'search-form',
\t\t\t'comment-form',
\t\t\t'comment-list',
\t\t\t'gallery',
\t\t\t'caption',
\t\t\t'style',
\t\t\t'script',
\t\t)
\t);

\tset_post_thumbnail_size( 1200, 675, true );
}
add_action( 'after_setup_theme', 'mytheme_setup' );`,
    note:
      'Add a content width and the generator appends a second callback on `after_setup_theme` at priority 0, setting `$GLOBALS[\'content_width\']` through a filter so a child theme can change it.',
  },
  refLinks: [
    {
      href: 'https://developer.wordpress.org/reference/functions/add_theme_support/',
      title: 'add_theme_support() — WordPress developer reference',
      description: 'The full list of features, which ones take arguments, and what each argument means.',
    },
    {
      href: 'https://developer.wordpress.org/reference/hooks/after_setup_theme/',
      title: 'after_setup_theme — WordPress developer reference',
      description: 'The only hook add_theme_support() can reliably be called on.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/add_image_size/',
      title: 'add_image_size() — WordPress developer reference',
      description: 'Registering additional sizes, and how the crop argument changes what is generated.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/set_post_thumbnail_size/',
      title: 'set_post_thumbnail_size() — WordPress developer reference',
      description: 'The default dimensions the_post_thumbnail() uses when no size is named.',
    },
    {
      href: 'https://developer.wordpress.org/themes/functionality/featured-images-post-thumbnails/',
      title: 'Featured Images (Post Thumbnails) — Theme Handbook',
      description: 'How post-thumbnails support, image sizes and template output fit together.',
    },
    {
      href: 'https://developer.wordpress.org/reference/hooks/image_size_names_choose/',
      title: 'image_size_names_choose — WordPress developer reference',
      description: 'The filter that puts your custom sizes into the editor\'s size dropdown.',
    },
  ],

  faqTitle: 'Theme support — frequently asked questions',
  faqIntro: 'The questions developers ask when a declared feature does not appear to do anything.',
  faqs: [
    {
      question: 'Why does add_theme_support() have no effect?',
      answer:
        'It is almost always the hook. `add_theme_support()` must run inside a callback attached to `after_setup_theme`; calling it on `init`, or at the top level of `functions.php`, is either too late or too early depending on the feature. A second common cause is calling it from a child theme at the default priority — the child\'s `functions.php` loads first, so the parent can overwrite what you set. Hook at priority 11 in a child theme.',
    },
    {
      question: 'What is the difference between add_image_size() and set_post_thumbnail_size()?',
      answer:
        '`set_post_thumbnail_size()` sets the dimensions used when you call `the_post_thumbnail()` with no size argument — there is one of these per theme. `add_image_size()` registers an extra named size you can then request by name. Both only generate files for images uploaded after the code is in place; existing images need a regeneration tool to get the new crops.',
    },
    {
      question: 'Do block themes still need add_theme_support()?',
      answer:
        'Much less than classic themes do. A block theme with a `theme.json` gets `align-wide`, `responsive-embeds`, editor styles and the whole appearance-tools set from that file instead, and WordPress opts block themes into several features automatically. What remains worth declaring in PHP is `post-thumbnails`, `title-tag`, `automatic-feed-links`, `html5` and features with no theme.json equivalent such as `custom-logo` and `post-formats`.',
    },
    {
      question: 'Why is my editor stylesheet not loading?',
      answer:
        '`add_theme_support( \'editor-styles\' )` only turns the feature on. You still need `add_editor_style( \'path/to/editor.css\' )` pointing at a file that exists relative to the theme root. The generator writes both lines together for exactly this reason. Note that WordPress rewrites the selectors in that file to scope them to the editor canvas, so a rule written against `body` is scoped, not dropped.',
    },
    {
      question: 'What does content_width actually control?',
      answer:
        'It is a global that tells WordPress the maximum width in pixels that content can occupy, which oEmbed uses to size embedded videos and which some core functions use to constrain large images. Without it an embed has no maximum and can overflow a narrow layout. Set it on `after_setup_theme` at priority 0 so it exists before anything reads it, and expose it through a filter so a child theme can change it.',
    },
    {
      question: 'How many custom image sizes is too many?',
      answer:
        'Every registered size generates another file on every upload, on top of the five core already creates. Four or five custom sizes on a media library of any size becomes a real storage and backup cost, and the generator warns past that point. Prefer reusing one wide size with `srcset` over registering a near-duplicate for each template.',
    },
  ],

  related: [
    { id: 'theme-json', note: 'The block-theme home for most of these settings — appearance tools, palettes and layout.' },
    { id: 'child-theme', note: 'A child theme adds or removes parent features from its own after_setup_theme callback at priority 11.' },
    { id: 'default-headers', note: 'The custom-header feature in full, with the images your theme ships.' },
    { id: 'sidebar', note: 'Widget areas, which pair with customize-selective-refresh-widgets.' },
    { id: 'nav-menu', note: 'Menu locations, registered on the same after_setup_theme hook.' },
    { id: 'enqueue', note: 'The editor stylesheet and front-end assets these feature flags assume exist.' },
  ],
};
