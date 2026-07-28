import type { ToolContent } from '../toolContentTypes';

export const blockPatternContent: ToolContent = {
  aboutTitle: 'Block Pattern Generator Online',
  aboutLead:
    'Paste block markup copied straight out of the editor and this block pattern generator turns it into something registrable: a `/patterns` file with the correct header comment, a `register_block_pattern()` call, or a complete plugin. It validates the markup as it goes, so an unbalanced `wp:group` or a malformed attribute JSON object is caught here rather than as a block-recovery error in the editor.',
  aboutSupport:
    'Four starter layouts — hero, three columns, cover and pull quote — give you valid markup to work from if you are not copying an existing design. A Reference tab documents every property the pattern registry accepts. Free, no account, and nothing you paste leaves the browser.',
  spec: {
    hook: 'register_block_pattern() / a theme `patterns/` file',
    outputs: 'A `patterns/*.php` file, a register call, or a standalone plugin file',
    requires: 'WordPress 5.5+ for `register_block_pattern()`, 6.0+ for the `patterns` directory, PHP 7.4+',
  },

  whyTitle: 'Why the block pattern generator beats writing the header comment by hand',
  whyIntro:
    'Block markup is parsed, not rendered loosely. The HTML comments are the structure: every `<!-- wp:x -->` needs its `<!-- /wp:x -->`, the JSON in the opening comment has to parse, and the inner HTML has to match what the block itself would produce. Get one wrong and the editor shows a recovery notice instead of your layout. This generator counts the tags, parses the JSON and checks the header before you ever paste the file into a theme.',
  features: [
    {
      title: 'Block markup validated, not just wrapped',
      body: 'Opening and closing block comments are counted per block name, self-closing tags are accounted for, and every attribute JSON object is run through a parser. An unbalanced `wp:columns` or an invalid attribute blob is reported as an error with the offending fragment quoted.',
    },
    {
      title: 'Two output shapes for two ways of shipping',
      body: 'A `/patterns` file with the `Title`, `Slug`, `Categories`, `Block Types`, `Description`, `Viewport Width` and `Inserter` header lines, auto-registered by WordPress 6.0 and later; or the `register_block_pattern()` call for a plugin or a classic theme.',
    },
    {
      title: 'Namespaced slugs enforced',
      body: 'A slug with no namespace is an error, because `hero-cta` will eventually meet another `hero-cta`. The Use fix rewrites it to `namespace/name` derived from your text domain, lowercased and dashed on both sides of the slash.',
    },
    {
      title: 'Custom categories registered for you',
      body: 'Type a category slug that does not exist and the snippet output adds a `register_block_pattern_category()` call above the pattern. A pattern assigned to an unregistered category is silently ungrouped in the inserter, and the header comment in a `/patterns` file cannot create one — the Checks tab says so.',
    },
    {
      title: 'The portability traps checked',
      body: 'Hard-coded `wp-content/uploads` URLs, `http://localhost` references and image blocks carrying a numeric attachment id are all flagged, because each one points at something that exists only on the machine the pattern was built on.',
    },
    {
      title: 'A heredoc so the markup stays readable',
      body: 'Block markup is full of quotes. The heredoc option writes the content as a nowdoc rather than escaping every apostrophe into a single-quoted string, and the generator recommends it as soon as it sees an apostrophe in your markup.',
    },
  ],

  howTitle: 'How does the block pattern generator work?',
  howIntro:
    'Build the layout in the editor, copy it, paste it here, then export the shape you need.',
  steps: [
    {
      title: 'Describe the pattern',
      body: 'Set the inserter title, a `namespace/slug`, the viewport width the inserter previews at, the text domain, and a description — that description is what a screen reader announces, so it should say what the layout contains.',
    },
    {
      title: 'Categorise it',
      body: 'Pick from the core categories (featured, banner, call to action, text, gallery, columns, posts, services, testimonials, footer, header) or type your own slug, which gets registered alongside the pattern. Optionally list the block types it can replace, such as `core/post-content`.',
    },
    {
      title: 'Paste the block markup',
      body: 'Select your blocks in the editor, copy, and paste into the markup field — or start from one of the four built-in starters. The block count and any structural errors update as you type.',
    },
    {
      title: 'Pick an output, then export',
      body: 'Choose the `/patterns` file for a block theme, the register call for a plugin or classic theme, or the full plugin file. Clear the Checks tab, then copy or download.',
    },
  ],
  example: {
    title: 'Worked example — a pull quote as a theme patterns file',
    intro:
      'Slug `mytheme/pull-quote`, two categories, a 1280px preview width. Saved as `patterns/pull-quote.php` in a theme, WordPress 6.0 and later registers this automatically with no PHP call at all.',
    code: `<?php
/**
 * Title: Client pull quote
 * Slug: mytheme/pull-quote
 * Categories: text, testimonials
 * Description: A centred quote with a citation line.
 * Viewport Width: 1280
 */
?>
<!-- wp:quote {"align":"center"} -->
<blockquote class="wp-block-quote has-text-align-center">
<!-- wp:paragraph -->
<p>They shipped in a week what our last agency scoped in a quarter.</p>
<!-- /wp:paragraph -->
<cite>A client, somewhere</cite>
</blockquote>
<!-- /wp:quote -->`,
    note:
      'The header comment is the registration. Strings in a `patterns` file are translated by WordPress using the theme text domain, which is why there are no `__()` calls here — switch to the register-call output and the generator wraps the title, description and keywords for you.',
  },
  refLinks: [
    {
      href: 'https://developer.wordpress.org/reference/functions/register_block_pattern/',
      title: 'register_block_pattern() — WordPress developer reference',
      description: 'The registration function, introduced in WordPress 5.5, and the properties it accepts.',
    },
    {
      href: 'https://developer.wordpress.org/themes/patterns/',
      title: 'Patterns — Theme Handbook',
      description: 'How the patterns directory works and what each header field controls.',
    },
    {
      href: 'https://developer.wordpress.org/themes/patterns/registering-patterns/',
      title: 'Registering patterns — Theme Handbook',
      description: 'The difference between a patterns file, a PHP registration and a theme.json reference.',
    },
    {
      href: 'https://developer.wordpress.org/block-editor/reference-guides/block-api/block-patterns/',
      title: 'Block patterns — Block Editor Handbook',
      description: 'The full property list, including blockTypes, viewportWidth and inserter.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/register_block_pattern_category/',
      title: 'register_block_pattern_category() — WordPress developer reference',
      description: 'Registering the custom category before assigning a pattern to it.',
    },
    {
      href: 'https://developer.wordpress.org/block-editor/reference-guides/core-blocks/',
      title: 'Core blocks reference — Block Editor Handbook',
      description: 'The attributes each core block accepts, for checking the JSON in your markup by hand.',
    },
  ],

  faqTitle: 'Block patterns — frequently asked questions',
  faqIntro: 'The questions that come up when patterns move from the editor into a theme or plugin.',
  faqs: [
    {
      question: 'Why is my block pattern not showing up in the inserter?',
      answer:
        'Check three things. The pattern must be registered on `init` or later, since the registry does not exist before that. The slug must include a namespace. And if `inserter` is set to false the pattern is deliberately hidden, remaining available only through `blockTypes`. A pattern assigned to a category that was never registered still appears, but ungrouped at the bottom.',
    },
    {
      question: 'What is the difference between a patterns file and register_block_pattern()?',
      answer:
        'A PHP file in a theme `patterns` directory carries a header comment and is auto-registered by WordPress 6.0 and later, with strings translated using the theme text domain. `register_block_pattern()` is the explicit call, available since 5.5, and is what a plugin or an older theme needs. The file form cannot register a pattern category, so a custom category still needs the PHP call.',
    },
    {
      question: 'How do I get the block markup for a pattern?',
      answer:
        'Build the layout in the editor, select the blocks, and copy them — the clipboard holds the serialised block markup, comments and all. Alternatively use the Code editor view (Options, then Code editor) and copy the section you want. Hand-writing block comments is possible but easy to get subtly wrong.',
    },
    {
      question: 'Why does my pattern show a block recovery error?',
      answer:
        'The markup does not match what the block would have produced. The usual causes are an unclosed block comment, invalid JSON in the opening comment, or inner HTML edited by hand so the class names no longer match the attributes. This generator counts opening against closing comments per block name and parses every attribute object, so all three are caught before you paste.',
    },
    {
      question: 'Why do the images in my pattern break on other sites?',
      answer:
        'Because the markup carries an absolute URL from your own uploads directory, or an image block with a numeric `id` attribute that points at a different attachment elsewhere. Ship images inside the theme and reference them with a theme-relative path, or remove the id and let editors pick their own. Both cases are flagged in the Checks tab.',
    },
    {
      question: 'What does viewportWidth do?',
      answer:
        'It sets the width the inserter renders the preview at, then scales that preview down to fit. Without it the pattern is previewed at the editor width, which makes a full-width layout look cramped and misleading. 1280 suits most desktop layouts; a value under 600 previews the pattern as if on a phone.',
    },
  ],

  related: [
    { id: 'shortcode', note: 'The pre-block way to ship a reusable snippet, still useful for dynamic output.' },
    { id: 'post-type', note: 'The post type whose new-page flow a core/post-content pattern can start from.' },
    { id: 'theme-json', note: 'Define the spacing, colour and typography presets your pattern markup references.' },
    { id: 'child-theme', note: 'A complete child theme with the patterns directory this file belongs in.' },
    { id: 'theme-support', note: 'Feature flags a pattern relies on, such as editor styles and wide alignment.' },
    { id: 'plugin-header', note: 'Wrap the pattern registration in a proper, updatable plugin file.' },
  ],
};
