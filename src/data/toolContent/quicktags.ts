import type { ToolContent } from '../toolContentTypes';

export const quicktagsContent: ToolContent = {
  aboutTitle: 'Quicktags Generator Online',
  aboutLead:
    'Add buttons to the Text tab of the classic editor with `QTags.addButton()`. This generator writes all eight arguments in the right order — id, display label, opening tag, closing tag, access key, tooltip, priority and editor instance — and wraps them in the PHP that loads them safely, either printed in the admin footer behind a `wp_script_is( \'quicktags\' )` check or enqueued as a real file with `quicktags` as a dependency.',
  aboutSupport:
    'The Text tab toolbar is drawn live above the form, with your buttons in priority order alongside the core ones you kept, so you can see where a new button lands before pasting anything. Output as a snippet, a `functions.php` block, a plugin file, or a standalone `quicktags.js`. Free, no account, nothing uploaded.',
  spec: {
    hook: 'QTags.addButton()',
    outputs: 'A snippet, a `functions.php` block, a plugin file, or a standalone `quicktags.js`',
    requires: 'WordPress 3.3 or newer, the classic editor, PHP 7.4+',
  },

  whyTitle: 'Why the Quicktags Generator beats hand-writing QTags.addButton()',
  whyIntro:
    '`QTags.addButton()` takes eight positional arguments with no names, and the two most useful of them — access key and priority — sit behind arguments you probably want to leave empty. Get the id wrong and you replace a core button instead of adding one. Get the loading wrong and `QTags is not defined` appears in the console on every screen that never rendered an editor. This generator handles the ordering, the ids and the loading.',
  features: [
    {
      title: 'Three button behaviours',
      body: 'Wrap the selection in an opening and closing tag, insert a one-shot string, or prompt for a value and substitute it into a template with `%s`. The prompt type is emitted as a real callback that calls `window.prompt()` and then `QTags.insertContent()`, with an early return when the user cancels.',
    },
    {
      title: 'Trailing arguments only when needed',
      body: 'The generator works out the last argument you actually set and stops there, so a simple wrap button is a single readable line instead of eight positional arguments padded with empty strings. Add a tooltip or a priority and the call expands to match.',
    },
    {
      title: 'Access keys checked against core',
      body: 'Core has already claimed b, i, a, q, d, s, m, u, o, l, c and t. Reuse one and the checker names the core button you are shadowing; assign the same key twice in your own set and that is an error. Multi-character keys are caught with a one-click trim.',
    },
    {
      title: 'Core ids protected',
      body: 'Registering a button with a core id such as `strong` or `link` replaces core\'s own button rather than adding one. The generator prefixes your ids automatically and flags any that would still collide, with a one-click fix.',
    },
    {
      title: 'Core buttons pruned through the right filter',
      body: 'Removing buttons is not done in JavaScript — it is the `quicktags_settings` filter rewriting the `buttons` string. The generator emits that filter with the kept ids in core order, optionally scoped to a single editor instance, and warns you if you remove the close button and strand authors mid-tag.',
    },
    {
      title: 'Loading that cannot fire too early',
      body: 'The inline build prints in `admin_print_footer_scripts` behind a `wp_script_is( \'quicktags\' )` check and an inner `typeof QTags === \'undefined\'` guard. The file build enqueues on `post.php`, `post-new.php` and `comment.php` only, with `quicktags` as a script dependency so QTags always exists first.',
    },
  ],

  howTitle: 'How does the Quicktags Generator work?',
  howIntro:
    'Four steps: decide how the buttons load, define them, prune anything core adds that you do not want, then export.',
  steps: [
    {
      title: 'Choose how the buttons load',
      body: 'Inline in the admin footer, or enqueued as `js/quicktags.js` with `quicktags` as a dependency. Optionally limit both to specific post types, and scope the buttons to a single editor instance id such as `content`.',
    },
    {
      title: 'Add your buttons',
      body: 'Start from a preset — lead paragraph, shortcode, callout, prompt — or add your own. Each button takes a label, an id, a behaviour, the tag or template to insert, an optional single-character access key, a tooltip and a priority. Core uses 10 to 200 in tens, so 205 puts you after everything.',
    },
    {
      title: 'Prune the core buttons',
      body: 'Untick any of core\'s thirteen buttons and the generator adds a `quicktags_settings` filter that rewrites the button list. The preview strip updates so you can see the toolbar the author will get.',
    },
    {
      title: 'Check and export',
      body: 'Clear the flagged issues — mismatched open and close tags, duplicate ids or access keys, a prompt template with no `%s` — then copy the PHP, or switch to the JavaScript tab for the standalone `quicktags.js`.',
    },
  ],
  example: {
    title: 'Worked example — two wrap buttons printed in the admin footer',
    intro:
      'The inline delivery mode. `wp_script_is()` keeps the script off every admin screen that never rendered an editor; the inner guard covers the case where the editor loaded without quicktags.',
    code: `/**
 * Print the Text tab buttons in the admin footer.
 *
 * wp_script_is() keeps this off every screen that never rendered an editor.
 */
function acme_quicktags_buttons() {
\tif ( ! wp_script_is( 'quicktags' ) ) {
\t\treturn;
\t}

\t?>
\t<script>
\t( function () {
\t\tif ( typeof QTags === 'undefined' ) {
\t\t\treturn;
\t\t}

\t\tQTags.addButton( 'acme_lead', 'lead', '<p class="lead">', '</p>' );

\t\tQTags.addButton( 'acme_cta', 'cta', '[cta]', '[/cta]' );
\t} )();
\t</script>
\t<?php
}
add_action( 'admin_print_footer_scripts', 'acme_quicktags_buttons' );`,
    note:
      'Add a tooltip and a priority and the call expands to the full positional form: id, display, opening tag, closing tag, access key, title, priority, instance. Switch to the file delivery mode and the same JavaScript is emitted as `js/quicktags.js`, enqueued with `array( \'quicktags\' )` as its dependency.',
  },
  refLinks: [
    {
      href: 'https://developer.wordpress.org/reference/hooks/quicktags_settings/',
      title: 'quicktags_settings — WordPress developer reference',
      description: 'The filter that controls which core buttons appear, per editor instance.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/wp_editor/',
      title: 'wp_editor() — WordPress developer reference',
      description: 'How the classic editor is rendered, including the quicktags argument that turns the Text tab on.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/wp_enqueue_script/',
      title: 'wp_enqueue_script() — WordPress developer reference',
      description: 'The dependency array that guarantees your file runs after the quicktags script.',
    },
    {
      href: 'https://developer.wordpress.org/reference/hooks/admin_print_footer_scripts/',
      title: 'admin_print_footer_scripts — WordPress developer reference',
      description: 'Where the inline build prints, late enough that QTags already exists.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/wp_script_is/',
      title: 'wp_script_is() — WordPress developer reference',
      description: 'The check that keeps the button script off screens with no editor on them.',
    },
    {
      href: 'https://developer.wordpress.org/block-editor/',
      title: 'Block Editor Handbook',
      description: 'What to use instead when your authors are on the block editor, where quicktags do not exist.',
    },
  ],

  faqTitle: 'Quicktags and the Text tab — frequently asked questions',
  faqIntro: 'The questions that come up when adding buttons to the classic editor.',
  faqs: [
    {
      question: 'Do quicktags work in the block editor?',
      answer:
        'No. Quicktags belong to the classic editor\'s Text tab. They still appear anywhere `wp_editor()` renders in classic mode — comment editing, many plugin screens, and the Classic block\'s own text view — but authors working in the block editor never see them. Check which editor your site actually uses before building buttons for it.',
    },
    {
      question: 'Why do I get "QTags is not defined"?',
      answer:
        'Your script ran before the quicktags script loaded, or on a screen where no editor was rendered at all. Fix it by enqueueing your file with `array( \'quicktags\' )` as its dependency, or by printing inline in `admin_print_footer_scripts` behind a `wp_script_is( \'quicktags\' )` check. A `typeof QTags === \'undefined\'` guard inside the IIFE covers the rest.',
    },
    {
      question: 'How do I remove buttons from the Text tab?',
      answer:
        'Filter `quicktags_settings` and set `$settings[\'buttons\']` to a comma-separated list of the ids you want to keep — core reads that string rather than a removal list. The callback also receives the editor id, so you can prune a single instance and leave the others alone.',
    },
    {
      question: 'What do the eight arguments of QTags.addButton() mean?',
      answer:
        'In order: id (becomes `qt_{editor}_{id}` in the DOM), display label, opening tag or a callback function, closing tag, single-character access key fired with alt+shift, title attribute for the tooltip, priority, and the editor instance id. Pass an empty string for the instance and the button appears in every editor on the page.',
    },
    {
      question: 'How do I add a shortcode button to the editor?',
      answer:
        'Use a wrap button with the opening shortcode as the third argument and the closing shortcode as the fourth, for example `[cta]` and `[/cta]`. The button then toggles: it wraps the current selection, and clicking again after the opening tag closes it. For a self-closing shortcode use an insert button and leave the closing argument empty.',
    },
    {
      question: 'How do I prompt the user for a value before inserting?',
      answer:
        'Pass a function as the third argument instead of a string. Inside it call `window.prompt()`, return early if the user cancels, then insert with `QTags.insertContent()`. This generator writes that pattern from a template containing `%s`, substituting the answer at every occurrence — which is what a footnote reference needs, since the number appears in both the anchor and the label.',
    },
  ],

  related: [
    { id: 'settings-page', note: 'Give the buttons a settings screen if editors should configure them.' },
    { id: 'toolbar', note: 'The other small editor-adjacent thing worth adding: a shortcut in the admin bar.' },
    { id: 'admin-notice', note: 'Warn on the post screen when a required plugin for a button is missing.' },
    { id: 'list-table', note: 'The other classic-admin build most sites need beside a custom editor tweak.' },
    { id: 'shortcode', note: 'Write the shortcode your quicktag button inserts, with typed attributes.' },
    { id: 'enqueue', note: 'Register and version the js/quicktags.js file the file delivery mode expects.' },
  ],
};
