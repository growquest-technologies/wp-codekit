import type { ToolContent } from '../toolContentTypes';

export const termMetaContent: ToolContent = {
  aboutTitle: 'Term Meta Generator Online',
  aboutLead:
    'Add real fields to taxonomy terms — an accent colour on a category, a tagline on a genre, an archive layout on a region — and get the whole implementation: `register_term_meta()` with a type and sanitiser per field, the add-term form, the edit-term form, a nonce-checked save handler wired to both `created_{taxonomy}` and `edited_{taxonomy}`, and an optional column in the terms table.',
  aboutSupport:
    'A Preview tab renders the edit-term screen as WordPress will draw it, table row markup and all, so you can check labels and field order before pasting anything. Free, no account, nothing uploaded.',
  spec: {
    hook: 'register_term_meta(), plus the {taxonomy}_add_form_fields and {taxonomy}_edit_form_fields hooks',
    outputs: 'A snippet, a `functions.php` block, or a standalone plugin file',
    requires: 'WordPress 4.9.8 or newer, PHP 7.4+',
  },

  whyTitle: 'Why the term meta generator beats hand-wiring the taxonomy form hooks',
  whyIntro:
    'Term fields need four hooks, not one, and every one of them is named after your taxonomy: the add form, the edit form, and the save handler on both `created_` and `edited_`. Wire only the edit form and a value set at creation time is lost. Wire only the add form and it can never be changed. This generator emits the matched set and flags either half being missing.',
  features: [
    {
      title: 'Both forms, or the Checks tab objects',
      body: 'A missing edit-term form is an error, because values set when a term is created could never be corrected. A missing add-term form is a warning, because the term has to be saved and reopened before the fields appear. One Add both forms fix resolves either.',
    },
    {
      title: 'Hook names built from your taxonomy',
      body: 'Set the taxonomy to `genre` and the code hooks `genre_add_form_fields`, `genre_edit_form_fields`, `created_genre` and `edited_genre`. Set it to `category` and you get the core-specific `created_category` and `edited_category` names instead.',
    },
    {
      title: 'The right markup for each of the two screens',
      body: 'The add-term screen wants `div.form-field` wrappers; the edit-term screen wants `tr` rows with a `th` label cell. They are genuinely different templates, and the generator writes each one correctly rather than reusing the wrong markup on both.',
    },
    {
      title: 'Eight field types, each with its own sanitiser',
      body: 'Text, textarea, number, checkbox, select, hex colour, URL and attachment ID. Each maps to a sanitiser (`sanitize_hex_color`, `esc_url_raw`, `absint`, `rest_sanitize_boolean` and so on) and to a REST type, and selects save through an `in_array()` whitelist of the exact choices you entered.',
    },
    {
      title: 'A save handler that runs on create and edit',
      body: "One function, hooked twice, opening with a nonce verification and a `current_user_can( 'manage_categories' )` check. Empty values call `delete_term_meta()` rather than storing a blank row.",
    },
    {
      title: 'An honest note about the image field',
      body: 'The attachment-ID field is a number input, not a media picker, and the Checks tab says so — a real picker needs `wp.media` and an enqueued script. The generator tells you what it is not doing instead of pretending.',
    },
  ],

  howTitle: 'How does the term meta generator work?',
  howIntro:
    'Name the taxonomy, list the fields, choose where they appear, then export.',
  steps: [
    {
      title: 'Set the scope',
      body: 'Enter the taxonomy the fields belong to and the prefix for the meta keys. Term meta keys are shared across every taxonomy on the site, so the prefix is not decoration — the Checks tab warns when it is missing.',
    },
    {
      title: 'Add the fields',
      body: 'Each field takes a key, a label, a type, an optional description shown under the input, whether it appears in REST, and a `value:Label` choice list for selects. Drag to reorder.',
    },
    {
      title: 'Choose where they appear',
      body: 'Toggle the add-term form, the edit-term form, and a column in the terms list table. The column shows the first field, using the `manage_edit-{taxonomy}_columns` and `manage_{taxonomy}_custom_column` filter pair.',
    },
    {
      title: 'Check the preview, then export',
      body: 'Compare the Preview tab with what you expect on the edit screen, clear the Checks tab, then copy the snippet or download it as a plugin file.',
    },
  ],
  example: {
    title: 'Worked example — an accent colour on category terms',
    intro:
      'One hex-colour field on the `category` taxonomy, exposed to REST. This is the registration block from the Snippet output, verbatim; the two form callbacks and the save handler follow it in the same file.',
    code: `/**
 * Register the term meta keys.
 */
function acme_register_meta() {
\tregister_term_meta(
\t\t'category',
\t\t'acme_accent',
\t\tarray(
\t\t\t'type'              => 'string',
\t\t\t'single'            => true,
\t\t\t'show_in_rest'      => true,
\t\t\t'sanitize_callback' => 'sanitize_hex_color',
\t\t\t'description'       => __( 'Used for the archive header.', 'acme' ),
\t\t\t'auth_callback'     => static function () {
\t\t\t\treturn current_user_can( 'manage_categories' );
\t\t\t},
\t\t)
\t);
}
add_action( 'init', 'acme_register_meta' );`,
    note:
      '`sanitize_hex_color()` returns null for anything that is not a valid hex colour, which REST reports as an invalid value rather than silently blanking the field. That is the behaviour you want, and it is why the save handler tests for null as well as an empty string.',
  },
  refLinks: [
    {
      href: 'https://developer.wordpress.org/reference/functions/register_term_meta/',
      title: 'register_term_meta() — WordPress developer reference',
      description: 'The registration wrapper, and what passing an empty taxonomy string does.',
    },
    {
      href: 'https://developer.wordpress.org/reference/hooks/taxonomy_add_form_fields/',
      title: '{$taxonomy}_add_form_fields — WordPress developer reference',
      description: 'The hook that prints fields on the add-term screen, and the arguments it passes.',
    },
    {
      href: 'https://developer.wordpress.org/reference/hooks/taxonomy_edit_form_fields/',
      title: '{$taxonomy}_edit_form_fields — WordPress developer reference',
      description: 'The edit-term equivalent, which receives the WP_Term object.',
    },
    {
      href: 'https://developer.wordpress.org/reference/hooks/created_taxonomy/',
      title: 'created_{$taxonomy} — WordPress developer reference',
      description: 'One half of the save pair, fired when a new term is inserted.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/get_term_meta/',
      title: 'get_term_meta() — WordPress developer reference',
      description: 'Reading the stored values back in a template or an archive header.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/update_term_meta/',
      title: 'update_term_meta() — WordPress developer reference',
      description: 'The write side used by the generated save handler.',
    },
  ],

  faqTitle: 'Term meta — frequently asked questions',
  faqIntro: 'The questions that come up when a taxonomy needs to carry more than a name and a description.',
  faqs: [
    {
      question: 'Which hooks do I need to add a custom field to a taxonomy term?',
      answer:
        'Four, all named after the taxonomy. `{$taxonomy}_add_form_fields` prints the field on the add-term screen, `{$taxonomy}_edit_form_fields` prints it on the edit screen, and `created_{$taxonomy}` plus `edited_{$taxonomy}` both call the save handler. Register the key with `register_term_meta()` on `init` as well, so it is typed and sanitised.',
    },
    {
      question: 'Why is my term field not saving when I create a new term?',
      answer:
        'Almost always because only `edited_{$taxonomy}` is hooked. Creating a term fires `created_{$taxonomy}`, not `edited_`, so a handler attached to just the edit hook never runs on the first save. The generated code hooks both to the same function.',
    },
    {
      question: 'Why does my term field render as a plain row with no styling?',
      answer:
        'The add-term and edit-term screens use different markup. The add screen expects a `div` with the `form-field` class; the edit screen is a table and expects a `tr` with a `th` label cell and a `td` for the input. Reusing one template on both screens is what produces the misaligned result.',
    },
    {
      question: 'How do I show term meta in the block editor or over the REST API?',
      answer:
        'Register the key with `show_in_rest => true` and make sure the taxonomy itself has `show_in_rest` on, otherwise there is no `/wp/v2/{taxonomy}` route for the value to appear in. The generator flags a field set that exposes nothing to REST, because it usually means the block editor cannot see any of it.',
    },
    {
      question: 'Can I add a media picker for a term image?',
      answer:
        'Not with PHP alone. The media modal is `wp.media`, so it needs `wp_enqueue_media()` plus a small script that opens the frame and writes the chosen attachment ID into a hidden input. The generator emits the number input that stores the ID and says plainly that the picker is the part you still have to build.',
    },
    {
      question: 'Do I need a nonce on a term form?',
      answer:
        'Yes. `created_` and `edited_` fire on any request that reaches the term-edit endpoint, so the handler needs `wp_nonce_field()` in the form and `wp_verify_nonce()` in the save, plus a capability check — `manage_categories` for the built-in taxonomies. Both are always written into the generated save handler.',
    },
  ],

  related: [
    { id: 'taxonomy', note: 'Register the taxonomy these fields hang off, with the right hierarchy and REST settings.' },
    { id: 'post-meta', note: 'The same typed-registration pattern for posts rather than terms.' },
    { id: 'meta-box', note: 'An editor panel when the value belongs on the post instead of the term.' },
    { id: 'post-type', note: 'Create the post type the taxonomy is attached to.' },
    { id: 'term-query', note: 'Fetch terms filtered or ordered by the meta keys you just registered.' },
    { id: 'tax-query', note: 'Query posts by those terms once the fields are in place.' },
  ],
};
