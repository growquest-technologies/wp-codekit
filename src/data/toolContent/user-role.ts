import type { ToolContent } from '../toolContentTypes';

export const userRoleContent: ToolContent = {
  aboutTitle: 'Role & Capability Generator Online',
  aboutLead:
    'A WordPress custom user role generator that writes `add_role()` properly — with the migration routine everyone forgets. Start from nothing or clone subscriber, contributor, author or editor, tick the capabilities you want from a grouped list of core caps, add your own custom capabilities, and grant them to existing roles at the same time. The generated file registers on activation and re-applies the map whenever you bump the version.',
  aboutSupport:
    'The Matrix tab lines your role up against contributor, author and editor so you can see exactly which capabilities you have added or withheld compared with the core role it sits between. Output as a plugin file with a `register_activation_hook()`, or as a `functions.php` block. Free, no account, nothing uploaded.',
  spec: {
    hook: 'add_role() / WP_Role::add_cap()',
    outputs: 'A plugin file with an activation hook, or a `functions.php` block',
    requires: 'WordPress 3.0 or newer, PHP 7.4+',
  },

  whyTitle: 'Why an add_role() capabilities generator beats a snippet you paste once',
  whyIntro:
    '`add_role()` writes the role into the `wp_user_roles` option once and then returns null and does nothing on every later call. That is the single most common bug in WordPress role code: the snippet works on your machine, you add a capability three weeks later, and nothing changes on any site that already ran it — because the role already exists. Fixing it means a version-checked migration that walks the map through `WP_Role::add_cap()`, and that is what this generator writes by default.',
  features: [
    {
      title: 'The migration, not just the add_role() call',
      body: 'The generated installer checks `get_role()` first: no role means `add_role()`, an existing role means a `foreach` over the map calling `$role->add_cap( $cap, (bool) $grant )`. A stored version number in an option decides whether the whole thing runs, so bumping the version is all it takes to roll a capability change out to a live site.',
    },
    {
      title: 'Capability combinations that actually work',
      body: 'The checker catches the pairs that leave the admin half-broken: `edit_others_posts` without `edit_posts`, `publish_posts` with nothing to publish, a role that can write posts but cannot `upload_files`, and any role with no `read` capability at all — which bounces the user straight out of `wp-admin`.',
    },
    {
      title: 'Dangerous capabilities called out by name',
      body: '`manage_options` is administrator-level in everything but name. `edit_users` and `promote_users` let the role promote itself to administrator. `edit_plugins` is arbitrary code execution from the admin. `unfiltered_html` allows script tags in post content. Each is flagged with the specific consequence, and most with a one-click removal.',
    },
    {
      title: 'Custom capabilities granted where they are needed',
      body: 'Add your own caps for a custom post type and grant them to administrator, editor, author or shop_manager in the same routine. Administrators do not inherit custom capabilities automatically — forget that and not even an admin can manage the content, which the checker warns about.',
    },
    {
      title: 'Meta capabilities rejected',
      body: 'Storing `edit_post`, `delete_post` or `read_post` in a role does nothing: they are meta capabilities that core maps per object at check time. The generator treats them as an error and points you at `current_user_can( \'edit_post\', $post_id )` instead.',
    },
    {
      title: 'Removal that does not strand users',
      body: 'The optional cleanup routine finds everyone holding the role with `get_users()`, calls `remove_role()` on each `WP_User`, gives them a fallback role if that left them with none, then removes the role itself and deletes the version option — and the file reminds you to call it from `uninstall.php`, never on deactivation.',
    },
  ],

  howTitle: 'How does the Role & Capability Generator work?',
  howIntro:
    'Four steps: name the role, pick its capabilities, decide who else needs them, then set the version and export.',
  steps: [
    {
      title: 'Name the role',
      body: 'A display name for the Users screen and a slug for the database, plus the function prefix and text domain. Choose what to base it on: nothing, or a copy of subscriber, contributor, author or editor as a starting map. Core role slugs are rejected outright — reusing one would rewrite the capabilities of every existing user with that role.',
    },
    {
      title: 'Pick the capabilities',
      body: 'Work through the four groups — reading and dashboard, posts, pages and media, site management — ticking what the role needs. Each capability carries a one-line description of what it actually unlocks. Add your own comma-separated custom capabilities underneath.',
    },
    {
      title: 'Grant custom caps to existing roles',
      body: 'Tick administrator, editor, author or shop_manager and the installer adds your custom capabilities to those roles too, with the matching removals in the cleanup routine.',
    },
    {
      title: 'Set the version and export',
      body: 'Keep the versioned migration on and bump the number every time the map changes. Turn on the cleanup routine with a fallback role, clear the checks, then download the plugin file or copy the `functions.php` block.',
    },
  ],
  example: {
    title: 'Worked example — a Shop Editor role with a version-checked migration',
    intro:
      'The install and migration pair, exactly as generated. `add_role()` runs only when the role does not exist; otherwise every capability is re-applied through `WP_Role::add_cap()`, which is the only reliable way to change an existing role.',
    code: `function acme_install_roles() {
\t$role = get_role( 'shop_editor' );

\tif ( ! $role ) {
\t\tadd_role(
\t\t\t'shop_editor',
\t\t\t_x( 'Shop Editor', 'user role', 'acme' ),
\t\t\tacme_role_caps()
\t\t);
\t} else {
\t\tforeach ( acme_role_caps() as $cap => $grant ) {
\t\t\t$role->add_cap( $cap, (bool) $grant );
\t\t}
\t}

\tupdate_option( 'acme_roles_version', 1 );
}

/**
 * Re-apply the map whenever the version changes.
 */
function acme_maybe_install_roles() {
\tif ( (int) get_option( 'acme_roles_version', 0 ) === 1 ) {
\t\treturn;
\t}

\tacme_install_roles();
}
add_action( 'admin_init', 'acme_maybe_install_roles' );`,
    note:
      '`acme_role_caps()` sits above this in the file and returns the capability map as `\'cap\' => true` pairs. In plugin mode the installer is also wired to `register_activation_hook( __FILE__, … )`, so a fresh install gets the role immediately and existing sites pick the change up on the next admin request after a version bump.',
  },
  refLinks: [
    {
      href: 'https://developer.wordpress.org/reference/functions/add_role/',
      title: 'add_role() — WordPress developer reference',
      description: 'The function that creates the role, and the note that it returns null when the slug already exists.',
    },
    {
      href: 'https://developer.wordpress.org/reference/classes/wp_role/add_cap/',
      title: 'WP_Role::add_cap() — WordPress developer reference',
      description: 'The only reliable way to change an existing role, one capability at a time.',
    },
    {
      href: 'https://developer.wordpress.org/plugins/users/roles-and-capabilities/',
      title: 'Roles and Capabilities — Plugin Handbook',
      description: 'The official guide to how roles, capabilities and the wp_user_roles option fit together.',
    },
    {
      href: 'https://wordpress.org/documentation/article/roles-and-capabilities/',
      title: 'Roles and Capabilities — WordPress documentation',
      description: 'The complete list of core roles and every capability each of them holds.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/remove_role/',
      title: 'remove_role() — WordPress developer reference',
      description: 'Deleting a role, and why users holding it must be reassigned first.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/current_user_can/',
      title: 'current_user_can() — WordPress developer reference',
      description: 'How capabilities are checked, including the meta capabilities that must not be stored in a role.',
    },
  ],

  faqTitle: 'Roles and capabilities — frequently asked questions',
  faqIntro: 'The questions developers ask when building custom roles for WordPress.',
  faqs: [
    {
      question: 'Why does add_role() not update my capabilities when I change them?',
      answer:
        '`add_role()` is create-only. Roles live in the `wp_user_roles` option, and if the slug is already there the function returns null and changes nothing. Any later change to the capability map has to go through `get_role( $slug )->add_cap()` or `remove_cap()`. The usual pattern is to store a version number in an option and re-run the whole map whenever it does not match.',
    },
    {
      question: 'Where should I call add_role() — on activation or on init?',
      answer:
        'On activation, via `register_activation_hook()`, because the write is permanent and only needs to happen once. Calling it on `init` means a database read on every single request, and on most requests it does nothing anyway. A version-checked routine on `admin_init` covers upgrades without paying that cost on front-end requests.',
    },
    {
      question: 'What is the difference between a role and a capability?',
      answer:
        'A capability is a single permission such as `edit_posts` or `manage_options`. A role is a named bundle of capabilities stored in the `wp_user_roles` option, and a user is assigned roles rather than capabilities. Code should always check capabilities with `current_user_can()`, never the role name — a user can hold several roles, and site owners add capabilities to core roles all the time.',
    },
    {
      question: 'How do I add a capability to an existing role like editor?',
      answer:
        'Get the role object and add to it: `get_role( \'editor\' )->add_cap( \'manage_briefs\' )`. That is a database write, so guard it behind a version check rather than running it on every load. Remember to remove it again on uninstall, or the capability outlives the plugin that used it.',
    },
    {
      question: 'Why do my custom post type capabilities not work for a custom role?',
      answer:
        'Two things are usually missing. The post type has to be registered with `\'capability_type\'` and `\'map_meta_cap\' => true` so core knows to map `edit_post` onto your primitive caps, and the primitive caps themselves have to be granted to the role — including to administrator, which does not inherit custom capabilities automatically.',
    },
    {
      question: 'How do I safely remove a custom role?',
      answer:
        'Reassign first, delete second. Find everyone holding it with `get_users( array( \'role\' => $slug ) )`, call `remove_role()` on each `WP_User`, add a fallback role to anyone left with none, and only then call the global `remove_role( $slug )`. Calling `remove_role()` on its own leaves those users with no role and no access at all.',
    },
  ],

  related: [
    { id: 'user-contact', note: 'The profile-fields side of user management, on the same screen.' },
    { id: 'settings-page', note: 'Gate the settings screen behind the capability you just created.' },
    { id: 'list-table', note: 'Guard a custom admin table and its bulk actions with the same capability.' },
    { id: 'dashboard-widget', note: 'Show the widget only to the role that needs it.' },
    { id: 'post-type', note: 'Register the post type whose custom capabilities this role grants.' },
    { id: 'activation', note: 'Wire the install routine to activation, and the cleanup to uninstall.php.' },
  ],
};
