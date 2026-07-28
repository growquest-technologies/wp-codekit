import type { ToolContent } from '../toolContentTypes';

export const postMetaContent: ToolContent = {
  aboutTitle: 'Post Meta Generator Online',
  aboutLead:
    'Register typed, documented, REST-visible custom fields with `register_post_meta()` instead of scattering bare `get_post_meta()` calls through your templates. Declare each key once — its type, whether it is single, its default, its sanitiser and who may write it — and this generator produces the registration, a shared `auth_callback`, optional typed accessor functions, and the `uninstall.php` cleanup most plugins never get round to.',
  aboutSupport:
    'A Reference tab lists every argument `register_post_meta()` accepts with a plain-English note on what it changes, so you can check a decision without leaving the page. Free, no account, and nothing leaves the browser.',
  spec: {
    hook: 'register_post_meta() on init',
    outputs: 'A snippet, a `functions.php` block, or a standalone plugin file',
    requires: 'WordPress 4.9.8 or newer (5.5+ for the `default` argument), PHP 7.4+',
  },

  whyTitle: 'Why registering post meta beats calling update_post_meta() and hoping',
  whyIntro:
    'Unregistered meta has no type, no sanitiser, no default and no REST presence. It works until a block needs to read it, until an integer arrives as the string "12", or until an empty key returns an empty string where your template expected zero. Registration fixes all four at once — and gets the `auth_callback` right, which is the part that decides who can write your fields over the API.',
  features: [
    {
      title: 'One auth_callback, written explicitly',
      body: 'A single named callback is emitted and referenced by every key, checking `edit_post` for the specific post, `edit_posts` site-wide, or `manage_options`. That matters: leave `auth_callback` out entirely and WordPress falls back to `__return_true` for a normal key and `__return_false` for an underscore-prefixed one, which is rarely what anyone intended.',
    },
    {
      title: 'Sanitiser chosen from the declared type',
      body: 'string gets `sanitize_text_field`, integer `absint`, number `floatval`, boolean `rest_sanitize_boolean`, and array gets a generated closure that maps `sanitize_text_field` across the values. The sanitiser runs on every save, including writes that come in over REST.',
    },
    {
      title: 'REST schemas stubbed for arrays and objects',
      body: 'A scalar key is exposed with `show_in_rest => true`. An array or object key gets the array form with a `schema` block already in place, because the REST API rejects writes to a structured key that has no schema. The Checks tab reminds you to fill the item or property types in.',
    },
    {
      title: 'The single-versus-REST trap flagged',
      body: 'A key exposed to REST without `single => true` returns an array of every stored row through the API, which block code almost never expects. That is a warning with a Make it single fix.',
    },
    {
      title: 'Defaults validated against their type',
      body: 'An integer key with a non-numeric default is an error. A boolean with a default of anything other than 1, 0, true or false is a warning. Bad defaults are silent at runtime and painful to trace.',
    },
    {
      title: 'Accessors and uninstall cleanup',
      body: 'Optional helper functions wrap each key so templates stop passing string literals to `get_post_meta()`, and an `uninstall.php` block with the matching `delete_post_meta_by_key()` calls is generated so the postmeta table is left clean when the plugin is deleted.',
    },
  ],

  howTitle: 'How does the register_post_meta generator work?',
  howIntro:
    'Scope the keys, declare them, pick who may write them, then export.',
  steps: [
    {
      title: 'Set the scope',
      body: 'Choose the post type the keys belong to and the prefix applied to each key. Meta keys are global across the site, so an unprefixed key will eventually meet a plugin using the same name — the Checks tab says so.',
    },
    {
      title: 'Declare each key',
      body: 'Add a key name, a type from string, integer, number, boolean, array or object, whether it is single, a default value, a description, and whether it appears in REST. The description becomes the field description in the REST schema, which is the only documentation an API consumer ever sees.',
    },
    {
      title: 'Choose the authorisation level',
      body: 'Pick `edit_post` for a per-post check, `edit_posts` for a site-wide one, or `manage_options` for admin-only settings-style meta. The generator warns that `edit_posts` lets any contributor write these keys on a post they do not own, through the API.',
    },
    {
      title: 'Add the extras, then export',
      body: 'Turn on helper accessors and the uninstall cleanup, work through the Checks tab, then copy the snippet or download it as a plugin file.',
    },
  ],
  example: {
    title: 'Worked example — a single integer reading-time key on posts',
    intro:
      'One key, prefixed, typed as an integer, exposed to REST with a per-post auth check. This is the Snippet output verbatim.',
    code: `/**
 * Who may read and write these keys through the API.
 *
 * @param bool   $allowed Whether the user can act.
 * @param string $meta_key The key.
 * @param int    $post_id  The post.
 * @return bool
 */
function acme_meta_auth( $allowed, $meta_key, $post_id ) {
\treturn current_user_can( 'edit_post', $post_id );
}

/**
 * Register the meta keys.
 */
function acme_register_meta() {
\tregister_post_meta(
\t\t'post',
\t\t'acme_reading_time',
\t\tarray(
\t\t\t'type'              => 'integer',
\t\t\t'single'            => true,
\t\t\t'description'       => __( 'Estimated reading time in minutes.', 'acme' ),
\t\t\t'default'           => 0,
\t\t\t'sanitize_callback' => 'absint',
\t\t\t'auth_callback'     => 'acme_meta_auth',
\t\t\t'show_in_rest'      => true,
\t\t)
\t);
}
add_action( 'init', 'acme_register_meta' );`,
    note:
      'Registration has to happen on `init`, before the REST API builds its routes. Add more keys and each one becomes another `register_post_meta()` call inside the same function, all sharing the one `auth_callback`.',
  },
  refLinks: [
    {
      href: 'https://developer.wordpress.org/reference/functions/register_post_meta/',
      title: 'register_post_meta() — WordPress developer reference',
      description: 'The wrapper this generator writes, including what an empty post type argument means.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/register_meta/',
      title: 'register_meta() — WordPress developer reference',
      description: 'The underlying function, with the full argument list and the auth_callback defaults.',
    },
    {
      href: 'https://developer.wordpress.org/plugins/metadata/managing-post-metadata/',
      title: 'Managing post metadata — Plugin Handbook',
      description: 'How post meta is stored, read and deleted, and what single changes about the return value.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/get_post_meta/',
      title: 'get_post_meta() — WordPress developer reference',
      description: 'The read side, and when a registered default is returned instead of an empty string.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/is_protected_meta/',
      title: 'is_protected_meta() — WordPress developer reference',
      description: 'Why an underscore-prefixed key is hidden, and how that interacts with the auth callback.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/delete_post_meta_by_key/',
      title: 'delete_post_meta_by_key() — WordPress developer reference',
      description: 'The call used in the generated uninstall.php to remove every row for a key.',
    },
  ],

  faqTitle: 'Registered post meta — frequently asked questions',
  faqIntro: 'What developers ask once meta needs to reach the block editor or the REST API.',
  faqs: [
    {
      question: 'What does register_post_meta() do that update_post_meta() does not?',
      answer:
        'It describes the key rather than storing a value. Registration attaches a type, a sanitiser that runs on every write, a default, a REST schema and an authorisation callback. `update_post_meta()` still does the writing; registration is what makes the key visible to the REST API and safe to write from anywhere.',
    },
    {
      question: 'Why is my custom field missing from the REST API response?',
      answer:
        'Three usual causes. The key was never registered with `show_in_rest`. The post type itself has `show_in_rest => false`, in which case there is no route at all. Or the key is registered for a different post type — `register_post_meta()` scopes to the type you pass, and an empty string registers it for every type instead.',
    },
    {
      question: 'Why does the REST API reject writes to my array meta key?',
      answer:
        'Because a non-scalar key needs an explicit schema. Pass `show_in_rest` as an array containing a `schema` key that declares `type => array` and an `items` definition (or `type => object` with `properties`). Without it the REST controller has nothing to validate against and refuses the write. The generator stubs the correct shape for you.',
    },
    {
      question: 'Do I have to prefix meta keys?',
      answer:
        'They are global, so yes in practice. Every plugin and theme on the site writes into the same postmeta table, and a generic key like `subtitle` or `featured` will eventually be claimed by something else. A short project prefix costs nothing; the generator warns when the prefix is missing.',
    },
    {
      question: 'What is the auth_callback for and what happens if I leave it out?',
      answer:
        'It decides who may read and write the key through the REST API and the meta API. Leave it out and WordPress fills in `__return_true` for an ordinary key or `__return_false` for a protected, underscore-prefixed one. Neither default is a considered decision, which is why this generator always writes an explicit callback.',
    },
    {
      question: 'Does the default value apply to posts that already exist?',
      answer:
        'Yes, in the sense that reads return it. The `default` argument, added in WordPress 5.5, is returned by `get_post_meta()` whenever no row exists for that post — including for posts created before the key was registered. It does not write anything to the database; the row still only appears when a value is saved.',
    },
  ],

  related: [
    { id: 'meta-box', note: 'Build the editor panel that writes these keys, with a nonce and a guarded save handler.' },
    { id: 'post-type', note: 'Register the post type the keys are scoped to, with show_in_rest turned on.' },
    { id: 'term-meta', note: 'The same registration pattern for taxonomy terms rather than posts.' },
    { id: 'taxonomy', note: 'When a value is really a shared term rather than a field on each post.' },
    { id: 'meta-query', note: 'Query posts by these keys with the correct compare operator and cast type.' },
    { id: 'rest-route', note: 'A custom endpoint for the cases a registered meta field cannot cover.' },
  ],
};
