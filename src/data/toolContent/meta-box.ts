import type { ToolContent } from '../toolContentTypes';

export const metaBoxContent: ToolContent = {
  aboutTitle: 'Meta Box Generator Online',
  aboutLead:
    'A WordPress meta box generator that writes all three halves of the job: the `add_meta_box()` registration, the render callback that prints escaped, labelled inputs, and a `save_post` handler with a nonce check, an autosave guard, a capability check and a post type check. Optionally it also emits the matching `register_post_meta()` calls so the values reach the REST API and the block editor.',
  aboutSupport:
    'A Preview tab renders the panel roughly as it will look in the editor sidebar, so you can see the field order and labels before pasting anything. Procedural functions or a single class — your choice. Free, no account, nothing uploaded.',
  spec: {
    hook: 'add_meta_box() on add_meta_boxes, plus save_post',
    outputs: 'A snippet, a `functions.php` block, or a standalone plugin file',
    requires: 'WordPress 5.0 or newer, PHP 7.4+',
  },

  whyTitle: 'Why the meta box generator beats a copied add_meta_box() tutorial',
  whyIntro:
    'The registration is the easy part. What sinks hand-written meta boxes is the save handler: `save_post` fires for autosaves, for every revision, for quick edits and for other post types, and it fires whether or not the request came from your form. Miss one guard and the field silently empties itself thirty seconds after the author types into it. This generator treats those four guards as errors, not as optional extras.',
  features: [
    {
      title: 'Four save guards, each an error if missing',
      body: "The nonce check, the autosave and revision guard, `current_user_can( 'edit_post', $post_id )` and the post type check are all reported in the Checks tab with a one-click fix. The autosave guard tests `wp_is_post_autosave()`, `wp_is_post_revision()` and the `DOING_AUTOSAVE` constant, because they do not all catch the same request.",
    },
    {
      title: 'A sanitiser and a REST type per field',
      body: 'Text uses `sanitize_text_field()`, textarea `sanitize_textarea_field()`, number `absint()`, checkbox `rest_sanitize_boolean()`, select `sanitize_key()`, URL `esc_url_raw()`, email `sanitize_email()` — and each maps to the right JSON Schema type when the `register_post_meta()` output is on.',
    },
    {
      title: 'Selects saved against their own whitelist',
      body: 'A select field is written as an `in_array()` check against the exact choices you entered, so a forged request cannot store a value the dropdown never offered. A select with no choices is an error with an Add two choices fix.',
    },
    {
      title: 'Empty values deleted, not stored',
      body: 'Every text-like field is saved with `update_post_meta()` when it has a value and `delete_post_meta()` when it does not, so an emptied field leaves no orphan row behind for `get_post_meta()` to return.',
    },
    {
      title: 'Protected keys handled deliberately',
      body: 'Meta keys are prefixed, and a prefix starting with an underscore keeps the values out of the Custom Fields panel. Leave the underscore off and the generator says so — with an Add the underscore fix — rather than letting you discover it on a client site.',
    },
    {
      title: 'Procedural or a class, same guards',
      body: 'Switch the code style and the identical logic is emitted either as prefixed functions with their own `add_action()` calls, or as a `final class` with a `hooks()` method and `array( $this, ... )` callbacks. Nothing is dropped in the translation.',
    },
  ],

  howTitle: 'How does the meta box generator work?',
  howIntro:
    'Describe the panel, list the fields, choose which guards to write, then export.',
  steps: [
    {
      title: 'Describe the box',
      body: 'Set the title shown in the panel header, the box id used by user screen preferences and `remove_meta_box()`, the context (normal, side or advanced) and the priority, plus the function prefix, text domain and meta key prefix.',
    },
    {
      title: 'Choose the post types',
      body: 'Pick from `post`, `page`, `product` and `event`, or type any custom post type slug. The list feeds both the `add_meta_box()` screen argument and the `get_post_type()` check in the save handler.',
    },
    {
      title: 'Add the fields',
      body: 'Each field gets a key, a label, a type, an optional description shown under the input, and a comma-separated choice list for selects using `value:Label` pairs. Drag to reorder; the render and save code follow the order.',
    },
    {
      title: 'Confirm the save handler, then export',
      body: 'Leave all four guards on, decide whether to emit `register_post_meta()`, clear the Checks tab, then copy the snippet or download it as a plugin file.',
    },
  ],
  example: {
    title: 'Worked example — the save handler for a one-field ISBN box',
    intro:
      'A Book details box on the `book` post type with a single text field. This is the `save_post` handler exactly as it is generated; the `add_meta_box()` call and the render function sit above it in the same file.',
    code: `/**
 * Save the fields.
 *
 * @param int $post_id Post being saved.
 */
function acme_save( $post_id ) {
\tif ( ! isset( $_POST['acme_meta_nonce'] ) || ! wp_verify_nonce( sanitize_key( $_POST['acme_meta_nonce'] ), 'acme_save_meta' ) ) {
\t\treturn;
\t}

\tif ( wp_is_post_autosave( $post_id ) || wp_is_post_revision( $post_id ) || ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) ) {
\t\treturn;
\t}

\tif ( ! current_user_can( 'edit_post', $post_id ) ) {
\t\treturn;
\t}

\tif ( ! in_array( get_post_type( $post_id ), array( 'book' ), true ) ) {
\t\treturn;
\t}

\tif ( isset( $_POST['acme_isbn'] ) ) {
\t\t$value = sanitize_text_field( wp_unslash( $_POST['acme_isbn'] ) );

\t\tif ( '' === $value ) {
\t\t\tdelete_post_meta( $post_id, '_acme_isbn' );
\t\t} else {
\t\t\tupdate_post_meta( $post_id, '_acme_isbn', $value );
\t\t}
\t}
}
add_action( 'save_post', 'acme_save' );`,
    note:
      'The order of the guards matters. The nonce proves the request came from your form; the capability check proves this user may edit this post. Neither substitutes for the other, and both run before anything is written.',
  },
  refLinks: [
    {
      href: 'https://developer.wordpress.org/reference/functions/add_meta_box/',
      title: 'add_meta_box() — WordPress developer reference',
      description: 'The full signature: id, title, callback, screen, context, priority and callback args.',
    },
    {
      href: 'https://developer.wordpress.org/plugins/metadata/custom-meta-boxes/',
      title: 'Custom meta boxes — Plugin Handbook',
      description: 'The official pattern for registering, rendering and saving a meta box.',
    },
    {
      href: 'https://developer.wordpress.org/reference/hooks/save_post/',
      title: 'save_post — WordPress developer reference',
      description: 'When the hook fires, and why autosaves and revisions reach your handler too.',
    },
    {
      href: 'https://developer.wordpress.org/plugins/security/nonces/',
      title: 'Nonces — Plugin Handbook',
      description: 'What a nonce does and does not prove, and how to verify one correctly.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/update_post_meta/',
      title: 'update_post_meta() — WordPress developer reference',
      description: 'How values are stored, and what a leading underscore on the key changes.',
    },
    {
      href: 'https://developer.wordpress.org/block-editor/how-to-guides/metabox/',
      title: 'Meta boxes in the block editor — Block Editor Handbook',
      description: 'How classic meta boxes behave under Gutenberg and what the modern alternative looks like.',
    },
  ],

  faqTitle: 'Meta boxes — frequently asked questions',
  faqIntro: 'The questions that follow every first meta box, usually in this order.',
  faqs: [
    {
      question: 'Why do my meta box values disappear when the editor autosaves?',
      answer:
        'Because `save_post` fires for the autosave too, and the autosave request does not include your form fields. Without a guard the handler reads nothing, sanitises to an empty string, and deletes the value. Test `wp_is_post_autosave()`, `wp_is_post_revision()` and the `DOING_AUTOSAVE` constant and return early — the generator writes all three and treats a missing guard as an error.',
    },
    {
      question: 'Do I really need a nonce if I already check user capabilities?',
      answer:
        'Yes, they answer different questions. The nonce proves the request came from your form rather than from a crafted link on another site; the capability check proves that this particular user is allowed to edit this particular post. A handler with only one of the two is exploitable in one of the two ways.',
    },
    {
      question: 'Do meta boxes still work in the block editor?',
      answer:
        'Yes. Boxes registered with `add_meta_box()` render in a compatibility area below the content, and the save handler runs as normal. They cannot appear in the block editor sidebar though. If you need that, register the value with `register_post_meta()` and build a small sidebar plugin against it — the generator can emit the registration calls for you.',
    },
    {
      question: 'Why do my custom fields not appear in the Custom Fields panel?',
      answer:
        'Because the key starts with an underscore. WordPress treats an underscore-prefixed meta key as protected and hides it from that panel and from `get_post_custom()` output for display. That is usually what you want for values a box owns, and it is the generator default; drop the underscore if editors should be able to change the raw value by hand.',
    },
    {
      question: 'What is the difference between the normal, side and advanced context?',
      answer:
        '`normal` places the box under the editor, `side` puts it in the right-hand column beside Publish, and `advanced` puts it below the normal boxes. On pages in particular, a `normal` box sits far enough down the screen that clients scroll straight past it, which is why one or two fields usually belong in `side`.',
    },
    {
      question: 'How do I remove a meta box added by a plugin or by core?',
      answer:
        'Call `remove_meta_box( $id, $screen, $context )` on the `add_meta_boxes` hook at a late priority. That is why the box id matters: it is the handle for removal, and it is also the key WordPress stores when a user hides the panel from Screen Options.',
    },
  ],

  related: [
    { id: 'post-meta', note: 'Register the same keys with types and REST exposure so blocks and the API can read them.' },
    { id: 'post-type', note: 'Create the post type this box is attached to, with the right supports array.' },
    { id: 'term-meta', note: 'The same idea for taxonomy terms, on the add and edit term forms.' },
    { id: 'post-status', note: 'Add the workflow status that the fields in this box feed into.' },
    { id: 'meta-query', note: 'Query posts by the meta keys this box writes, with the correct compare and type.' },
    { id: 'list-table', note: 'Surface those field values as sortable columns in the admin list.' },
  ],
};
