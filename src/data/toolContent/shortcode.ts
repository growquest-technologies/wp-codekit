import type { ToolContent } from '../toolContentTypes';

export const shortcodeContent: ToolContent = {
  aboutTitle: 'Shortcode Generator Online',
  aboutLead:
    'Declare the attributes your shortcode takes, paste the HTML it should return, and this WordPress shortcode generator writes the whole `add_shortcode()` registration: a `shortcode_atts()` defaults array, a typed sanitiser per attribute, an escaped `sprintf()` for the markup, and a full docblock. Placeholders in your markup written as `{attribute}` become the `sprintf()` arguments.',
  aboutSupport:
    'A Usage tab shows exactly what an editor types into a post, in both the self-closing and enclosing forms, so you can hand it to a client without writing separate documentation. Free, no account, and every keystroke stays in the browser.',
  spec: {
    hook: 'add_shortcode()',
    outputs: 'A snippet, a `functions.php` block, or a standalone plugin file',
    requires: 'WordPress 2.5 or newer, PHP 7.4+',
  },

  whyTitle: 'Why the shortcode generator beats writing add_shortcode() by hand',
  whyIntro:
    'A shortcode is user input arriving inside post content. The two mistakes that cost the most time are echoing instead of returning — which teleports your markup to the top of the page — and interpolating an attribute straight into HTML without escaping it. This generator writes the return, picks the escaping function from the attribute type, and audits the markup against the tokens you actually declared.',
  features: [
    {
      title: 'A sanitiser chosen per attribute type',
      body: 'Text uses `sanitize_text_field()` then `esc_html()`, numbers and post IDs use `absint()`, URLs `esc_url()`, colours `sanitize_hex_color()`, booleans `filter_var()` with `FILTER_VALIDATE_BOOLEAN`, and a choice list becomes an `in_array()` whitelist that falls back to the first option.',
    },
    {
      title: 'Uppercase attributes caught early',
      body: 'WordPress lowercases attribute keys while parsing the shortcode, so a declared `Columns` can never match what the editor typed. That is raised as an error with a Lowercase attributes fix, alongside checks for duplicate names and choice lists with no choices.',
    },
    {
      title: 'Placeholder auditing in both directions',
      body: 'Markup that references `{caption}` when no such attribute exists is flagged, because it renders as literal text. Attributes declared but never placed in the markup are listed too, so you do not ship dead parameters.',
    },
    {
      title: 'Enclosing mode wired up properly',
      body: "Turn on enclosing content and the signature becomes `( $atts = array(), $content = '' )`, the body runs `wp_kses_post( do_shortcode( $content ) )` so nested shortcodes still work, and the generator warns if you never place `{content}` in the markup.",
    },
    {
      title: 'Core tag collisions refused',
      body: '`gallery`, `caption`, `embed`, `audio`, `video`, `playlist` and the rest of core cannot be registered without overriding WordPress itself. That is an error with a Prefix the tag fix; unprefixed tags get a gentler prefix recommendation.',
    },
    {
      title: 'The two filters people forget',
      body: "Shortcodes do not run inside classic text widgets or excerpts unless you say so. Two toggles append `add_filter( 'widget_text', 'do_shortcode' )` and `add_filter( 'the_excerpt', 'do_shortcode' )` — only when you ask for them.",
    },
  ],

  howTitle: 'How does the shortcode generator work?',
  howIntro:
    'Name the tag, declare what it accepts, write what it returns, then export.',
  steps: [
    {
      title: 'Name the tag',
      body: 'Pick the tag an editor will type between square brackets, plus a function prefix and text domain. Lowercase with underscores is the convention the generator nudges you toward.',
    },
    {
      title: 'Declare the attributes',
      body: 'Add each attribute with a name, a type — text, number, true/false, url, hex colour, choice list or post ID — a default value and a one-line description that lands in the docblock.',
    },
    {
      title: 'Write the output markup',
      body: 'Paste the HTML the shortcode should return and drop `{attribute}` tokens where values belong. Every token is replaced with a `%s` and its escaped expression in the generated `sprintf()`.',
    },
    {
      title: 'Set behaviour, then export',
      body: 'Choose whether the shortcode encloses content and whether it should run in widgets and excerpts, clear the Checks tab, then copy the snippet or download the file.',
    },
  ],
  example: {
    title: 'Worked example — an enclosing [acme_notice] shortcode',
    intro:
      'One choice-list attribute with two options, enclosing content, and a wrapper div. This is the Snippet output exactly as it copies.',
    code: `/**
 * [acme_notice] shortcode.
 *
 * @param array $atts {
 *     Shortcode attributes.
 *
 *     @type string $type Colour of the notice. Default 'info'.
 * }
 * @param string $content Enclosed content.
 * @return string Rendered HTML.
 */
function acme_acme_notice_shortcode( $atts = array(), $content = '' ) {
\t$atts = shortcode_atts(
\t\tarray(
\t\t\t'type' => 'info',
\t\t),
\t\t$atts,
\t\t'acme_notice'
\t);

\t$type = in_array( $atts['type'], array( 'info', 'warning' ), true ) ? $atts['type'] : 'info';

\t$inner = wp_kses_post( do_shortcode( $content ) );

\treturn sprintf(
\t\t'<div class="acme-notice acme-notice--%s">%s</div>',
\t\tesc_attr( $type ),
\t\t$inner
\t);
}
add_shortcode( 'acme_notice', 'acme_acme_notice_shortcode' );`,
    note:
      'Passing the tag as the third argument to `shortcode_atts()` is what makes the `shortcode_atts_acme_notice` filter available, so other plugins can adjust your defaults. An editor writes `[acme_notice type="warning"]Text here[/acme_notice]` — the Usage tab spells that out for you.',
  },
  refLinks: [
    {
      href: 'https://developer.wordpress.org/reference/functions/add_shortcode/',
      title: 'add_shortcode() — WordPress developer reference',
      description: 'The registration function, the callback signature, and the rules for tag names.',
    },
    {
      href: 'https://developer.wordpress.org/plugins/shortcodes/',
      title: 'Shortcodes — Plugin Handbook',
      description: 'The official overview, including why a shortcode must return rather than echo.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/shortcode_atts/',
      title: 'shortcode_atts() — WordPress developer reference',
      description: 'How defaults are merged with user attributes, and what the third argument unlocks.',
    },
    {
      href: 'https://developer.wordpress.org/plugins/shortcodes/enclosing-shortcodes/',
      title: 'Enclosing shortcodes — Plugin Handbook',
      description: 'The two-argument callback form and how $content is handled.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/do_shortcode/',
      title: 'do_shortcode() — WordPress developer reference',
      description: 'Running shortcodes inside enclosed content, widgets and excerpts.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/wp_kses_post/',
      title: 'wp_kses_post() — WordPress developer reference',
      description: 'The filter applied to enclosed content before it is placed in the output.',
    },
  ],

  faqTitle: 'Shortcodes — frequently asked questions',
  faqIntro: 'The problems that send people looking for a shortcode generator in the first place.',
  faqs: [
    {
      question: 'Why does my shortcode output appear at the top of the page?',
      answer:
        'Because the callback echoes instead of returning. `do_shortcode()` replaces the tag with whatever the callback returns; anything echoed is printed immediately, before the content is assembled, so it lands at the top of the page. Buffer with `ob_start()` if you must print, but returning a string is the correct pattern and the only one this generator writes.',
    },
    {
      question: 'Why is my shortcode attribute always empty?',
      answer:
        'Two common causes. WordPress lowercases attribute keys when it parses the tag, so a key declared with capitals never matches — the generator raises this as an error. The other is smart quotes: the visual editor can turn straight quotes into curly ones, and `[tag title=“x”]` does not parse. Retype the attribute in the code view.',
    },
    {
      question: 'How do I make a shortcode that wraps content?',
      answer:
        "Accept a second parameter. An enclosing shortcode callback is `function my_shortcode( $atts = array(), $content = '' )`, and `$content` holds whatever sits between the opening and closing tags. Run it through `do_shortcode()` so nested shortcodes still expand, and through `wp_kses_post()` before output. Turn on enclosing mode and the generator writes all of that.",
    },
    {
      question: 'Why do shortcodes not work in my widget or excerpt?',
      answer:
        "WordPress does not run `do_shortcode()` on those contexts by default. Add `add_filter( 'widget_text', 'do_shortcode' )` for classic text widgets and `add_filter( 'the_excerpt', 'do_shortcode' )` for excerpts. Both are one-toggle options in this generator. Block-based widgets run shortcodes through the Shortcode block instead.",
    },
    {
      question: 'Can I use a dash in a shortcode tag?',
      answer:
        'It works, but underscores are the WordPress convention and avoid confusion with HTML attribute syntax. What you cannot use are spaces, square brackets, angle brackets, ampersands and slashes — those break the parser. The generator flags dashes as a warning and the illegal characters as an error.',
    },
    {
      question: 'Should shortcodes go in the theme or a plugin?',
      answer:
        'A plugin, if the content should survive a redesign. Shortcodes live inside post content, so removing the theme that registered one leaves the raw `[tag]` text visible on the published page. Use the Plugin file output for anything a client will type into posts.',
    },
  ],

  related: [
    { id: 'block-pattern', note: 'The block-editor way to ship reusable layouts, when a shortcode is the older answer.' },
    { id: 'post-type', note: 'Create the post type your shortcode loops over.' },
    { id: 'meta-box', note: 'Store the values the shortcode reads, on the edit screen rather than in attributes.' },
    { id: 'post-meta', note: 'Typed, REST-visible meta the shortcode callback can read with a helper function.' },
    { id: 'enqueue', note: 'Load the CSS and JS the shortcode markup needs, with dependencies and versions.' },
    { id: 'hooks', note: 'Correctly signed add_filter() callbacks for widget_text, the_excerpt and the rest.' },
  ],
};
