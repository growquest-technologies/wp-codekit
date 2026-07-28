import type { ToolContent } from '../toolContentTypes';

export const userContactContent: ToolContent = {
  aboutTitle: 'User Contact Methods Generator Online',
  aboutLead:
    'Add Mastodon, LinkedIn, GitHub, a direct line or a press email to the Contact Info table on the WordPress user profile screen, and drop the legacy AIM, Yahoo IM and Jabber rows while you are there. The contact-methods filter takes a `key => label` array, and each key you add becomes a user meta key verbatim — so the generator prefixes them for you, then writes the optional validation, REST registration and front-end output helpers alongside.',
  aboutSupport:
    'The profile-screen preview redraws the Contact Info table as you add fields, with sample values in the type you chose, so you can see the labels and column widths before pasting. Output as a snippet, a `functions.php` block, a plugin file, or a single static class. Free, no account, and nothing you enter leaves the browser.',
  spec: {
    hook: 'user_contactmethods',
    outputs: 'A snippet, a `functions.php` block, a plugin file, or a static class',
    requires: 'WordPress 4.6 or newer for the `register_meta()` args array, PHP 7.4+',
  },

  whyTitle: 'Why this user profile fields generator beats a bare array_merge',
  whyIntro:
    'Adding a contact method is one filter and three lines. What that leaves you with is an unprefixed meta key shared with every other plugin that picked the same word, a URL field that happily stores the word "facebook" with no scheme, a value that never appears in `/wp/v2/users`, and no way to print it on the front end without writing `get_user_meta()` by hand every time. This generator writes the filter and the four things that have to go with it.',
  features: [
    {
      title: 'Keys prefixed because they are meta keys',
      body: 'Whatever you use as an array key is written straight into `usermeta` as-is. The generator prefixes every key with your namespace and flags the reserved names core already owns on the user object — `url`, `description`, `nickname`, `first_name`, `display_name` and the rest — with a one-click fix.',
    },
    {
      title: 'Validation that runs before the write',
      body: 'Core sanitises contact methods with `sanitize_text_field()` and nothing more, so the only chance to reject a value is `user_profile_update_errors`. The generated check runs `wp_http_validate_url()` on URL fields, `is_email()` on email fields, and an empty check on anything you marked required, adding a real `WP_Error` per failure.',
    },
    {
      title: 'REST registration, per field',
      body: 'Tick REST on a field and you get a `register_meta( \'user\', … )` call with `show_in_rest`, the right `sanitize_callback` for the type, and an `auth_callback` gated on `edit_users`. Without it the value exists in `usermeta` but never appears in `/wp/v2/users`, which is where block themes and headless front ends read authors from.',
    },
    {
      title: 'Output helpers you would otherwise rewrite',
      body: 'Choose a single-value getter that defaults to the current post author and escapes with `esc_url()` or `esc_html()` depending on the value, or a full list helper that builds an escaped `<ul>` of links with `rel="me nofollow"` and skips anything not filled in.',
    },
    {
      title: 'Legacy core rows removed correctly',
      body: 'AIM, Yahoo IM and Jabber are `unset()` from the array — that works. The Website field is not: it lives on the `wp_users` table, not in contact methods, so unsetting `url` here does nothing. The checker calls that out as an error rather than letting you ship a line that has no effect.',
    },
    {
      title: 'Privacy checked, not assumed',
      body: 'Exposing a phone number or an email address over REST is flagged, because `/wp/v2/users` is readable by anyone who can list users on most sites. Required fields are flagged too: they also block administrators editing other users and the add-new-user screen.',
    },
  ],

  howTitle: 'How does the User Contact Methods Generator work?',
  howIntro:
    'Four steps: add the fields, decide what ships with them, clear the legacy rows, then export.',
  steps: [
    {
      title: 'Add your fields',
      body: 'Start from a preset — Mastodon, LinkedIn, GitHub, a direct line, a press email — or add your own. Each field takes a label, a meta key, a type (URL, handle, email, phone or plain text), a required flag and a REST flag.',
    },
    {
      title: 'Decide what ships alongside',
      body: 'Turn on profile validation, and choose whether to emit no output helper, a single-value getter, or a full escaped list of author contact links ready to print in a template.',
    },
    {
      title: 'Clear the legacy core methods',
      body: 'Tick AIM, Yahoo IM and Jabber to unset them from the array. They only still appear on installs old enough to carry them, but the rows are the first thing a client asks about.',
    },
    {
      title: 'Check and export',
      body: 'Fix anything flagged — an unprefixed key, a reserved name, a URL field with validation off — then copy the snippet or download it as a plugin file or a static class.',
    },
  ],
  example: {
    title: 'Worked example — two fields added, three legacy rows removed',
    intro:
      'The filter callback the generator writes. Note that the keys carry the prefix: they become the `usermeta` keys, and there is no namespacing anywhere else.',
    code: `/**
 * Add the fields this site needs to the Contact Info table.
 *
 * @param array        $methods Method key => label.
 * @param WP_User|null $user    The user being edited, null on the list screen.
 * @return array
 */
function acme_user_contact_methods( $methods, $user ) {
\tunset( $methods['aim'] );
\tunset( $methods['yim'] );
\tunset( $methods['jabber'] );

\t$methods = array_merge(
\t\t$methods,
\t\tarray(
\t\t\t'acme_mastodon' => __( 'Mastodon', 'acme' ),
\t\t\t'acme_github'   => __( 'GitHub', 'acme' ),
\t\t)
\t);

\treturn $methods;
}
add_filter( 'user_contactmethods', 'acme_user_contact_methods', 10, 2 );`,
    note:
      'The filter name is `user_contactmethods` — one word, no underscore between contact and methods. It is applied inside `wp_get_user_contact_methods()` and passes the `WP_User` object as a second argument, which is null on the users list screen. Turn REST on for a field and a matching `register_meta( \'user\', \'acme_mastodon\', … )` call is appended on `init`.',
  },
  refLinks: [
    {
      href: 'https://developer.wordpress.org/reference/hooks/user_contactmethods/',
      title: 'user_contactmethods — WordPress developer reference',
      description: 'The filter that controls the Contact Info table, with its $methods and $user arguments.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/wp_get_user_contact_methods/',
      title: 'wp_get_user_contact_methods() — WordPress developer reference',
      description: 'The core function that applies the filter, and the legacy methods it still ships.',
    },
    {
      href: 'https://developer.wordpress.org/reference/hooks/user_profile_update_errors/',
      title: 'user_profile_update_errors — WordPress developer reference',
      description: 'The action where a profile value can be rejected, before core writes it to usermeta.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/register_meta/',
      title: 'register_meta() — WordPress developer reference',
      description: 'Registering user meta with show_in_rest, a sanitize callback and an auth callback.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/get_the_author_meta/',
      title: 'get_the_author_meta() — WordPress developer reference',
      description: 'How to read a contact method inside the loop when printing author links.',
    },
    {
      href: 'https://developer.wordpress.org/rest-api/reference/users/',
      title: 'Users — REST API Handbook',
      description: 'What /wp/v2/users returns, and who can read it — worth checking before exposing a field.',
    },
  ],

  faqTitle: 'User contact methods — frequently asked questions',
  faqIntro: 'What developers ask when adding fields to the WordPress user profile screen.',
  faqs: [
    {
      question: 'Where are WordPress contact methods stored?',
      answer:
        'In the `wp_usermeta` table, under exactly the key you used in the filter array. There is no namespacing and no separate table, so `twitter` as a key is the literal meta key every other plugin that picked `twitter` will also write to. Prefix the key, always.',
    },
    {
      question: 'How do I remove AIM, Yahoo IM and Jabber from the user profile?',
      answer:
        'Filter the contact methods array and `unset()` those keys — `aim`, `yim` and `jabber`. Core only registers them on installs whose `initial_db_version` predates WordPress 3.6, so on a newer site they may not be there at all, but the `unset()` is harmless either way.',
    },
    {
      question: 'Why can I not remove the Website field this way?',
      answer:
        'The Website field is not a contact method. It is the `user_url` column on the `wp_users` table and is rendered separately by the profile screen, so unsetting `url` from the contact methods array does nothing at all. Removing it means hiding it on the profile form itself, not filtering this array.',
    },
    {
      question: 'How do I display an author\'s contact link on the front end?',
      answer:
        'Inside the loop, `get_the_author_meta( \'acme_mastodon\' )` returns the raw stored value; outside it, `get_user_meta( $user_id, \'acme_mastodon\', true )`. Escape on output — `esc_url()` for a URL, `esc_html()` for a handle — because core stored whatever was typed. The generator can emit a helper that does both plus the empty check.',
    },
    {
      question: 'Why does my custom contact field not appear in the REST API?',
      answer:
        'Adding a contact method only affects the profile screen. To expose the value you have to register the meta key separately with `register_meta( \'user\', $key, array( \'show_in_rest\' => true, \'single\' => true, … ) )` on `init`, including an `auth_callback` if it should be writable. Without that, `/wp/v2/users` never mentions it.',
    },
    {
      question: 'Can I make a contact method required?',
      answer:
        'Not through the filter — it only supplies labels. Enforce it on `user_profile_update_errors`, adding a `WP_Error` when the field is empty. Be aware that this blocks every profile save, including an administrator editing someone else and the add-new-user screen, which is a common way to lock yourself out of user management.',
    },
  ],

  related: [
    { id: 'user-role', note: 'The role side of user management — capabilities rather than profile fields.' },
    { id: 'settings-page', note: 'A site-wide options screen, when the value belongs to the site rather than a person.' },
    { id: 'list-table', note: 'Build an admin table that lists users by the fields you just added.' },
    { id: 'admin-notice', note: 'Prompt authors to fill in a new profile field, dismissible per user.' },
    { id: 'post-meta', note: 'The same registration pattern for posts: typed meta with REST and an auth callback.' },
    { id: 'user-query', note: 'Query users by the meta keys these contact fields create.' },
  ],
};
