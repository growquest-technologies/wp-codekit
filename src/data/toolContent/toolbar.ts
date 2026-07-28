import type { ToolContent } from '../toolContentTypes';

export const toolbarContent: ToolContent = {
  aboutTitle: 'Toolbar Node Generator Online',
  aboutLead:
    'Build a WordPress admin bar menu with `WP_Admin_Bar::add_node()` — a parent node plus as many children as you need — and copy out the finished `admin_bar_menu` callback. Every node gets a real `id`, `title`, `parent`, `href` and `meta` array, hrefs are wrapped in `esc_url( admin_url() )` or left as an absolute URL, and anything pointing at `admin-post.php` is wrapped in `wp_nonce_url()`.',
  aboutSupport:
    'The toolbar preview draws your node and its dropdown in the real admin bar styling, so you can see how the title reads at 32 pixels high before you paste anything. The Reference tab documents every argument `add_node()` accepts. Snippet, `functions.php` block or plugin file. Free, no account, nothing uploaded.',
  spec: {
    hook: 'admin_bar_menu',
    outputs: 'A snippet, a `functions.php` block, or a standalone plugin file',
    requires: 'WordPress 3.1 or newer, PHP 7.4+',
  },

  whyTitle: 'Why the WordPress admin bar menu generator beats a copied add_node() call',
  whyIntro:
    'Toolbar node ids are global across every plugin on the site, not namespaced per plugin, so an unprefixed id quietly replaces someone else\'s menu. The `title` argument is printed as raw HTML, so anything dynamic in it is an XSS hole waiting to happen. And a child pointing at `admin-post.php` with no nonce means any site that links to that URL can trigger the action on behalf of your logged-in administrators. This generator handles all three.',
  features: [
    {
      title: 'Nonced action links',
      body: 'Any child whose href starts with `admin-post.php` can be wrapped in `wp_nonce_url()` with a derived action name. Leave it off and the checker raises an error, because a bare `admin-post.php` link in the toolbar is a CSRF hole your admins click for you.',
    },
    {
      title: 'Href handling that matches what you typed',
      body: 'An absolute `https://` URL is passed through `esc_url()`, an existing `home_url()` or `admin_url()` expression is left alone, and anything else is wrapped as `esc_url( admin_url( … ) )`. You never have to remember which form the toolbar wants.',
    },
    {
      title: 'Front end, admin, or both',
      body: 'Scope the node with a real `is_admin()` guard rather than hoping. The parent node also gets a `meta` array with a title attribute, which is what produces the hover tooltip core\'s own nodes have.',
    },
    {
      title: 'A count bubble wired to a filter',
      body: 'Turn the count on and the generator emits the `awaiting-mod` / `pending-count` markup core uses for the comment bubble, fed by a `{prefix}_toolbar_count` filter that defaults to zero — so the bubble stays hidden until you hook something real to it.',
    },
    {
      title: 'Core nodes removed with remove_node()',
      body: 'Clear the WordPress logo, the comment bubble, the + New menu, the updates counter, Customise or the front-end search with a second callback at priority 999. Removing the updates counter is flagged as a warning: it hides security updates from the people who apply them.',
    },
    {
      title: 'Child ids validated against the parent',
      body: 'Duplicate child ids, a child sharing its parent\'s id, an empty href, and the contradiction of nesting under `new-content` while also removing `new-content` are all caught before you paste. Ids are checked as HTML ids, since that is what they become.',
    },
  ],

  howTitle: 'How does the Toolbar Node Generator work?',
  howIntro:
    'Four steps: define the parent node, add its children, clear anything core puts there that you do not want, then export.',
  steps: [
    {
      title: 'Define the parent node',
      body: 'Title, node id, href and where it attaches — top level, under the site name, under Howdy, inside + New, or on the right-hand side. Set the capability and the `admin_bar_menu` priority, which decides where your node sits among core\'s.',
    },
    {
      title: 'Add child nodes',
      body: 'Each child gets a title, an id, an href and a nonce toggle. They render as the dropdown under your parent, and the preview shows exactly how the list will look.',
    },
    {
      title: 'Remove core nodes',
      body: 'Optionally strip the WordPress logo, comments, + New, updates, Customise or search. These become `remove_node()` calls in a separate callback at priority 999, so they run after every plugin has finished adding.',
    },
    {
      title: 'Check and export',
      body: 'Work through the flagged issues — unprefixed ids, missing nonces, a title too long for the bar — then copy the snippet or download it as a plugin or a `functions.php` block.',
    },
  ],
  example: {
    title: 'Worked example — an Acme menu with a nonced Clear cache action',
    intro:
      'The `admin_bar_menu` callback receives the `WP_Admin_Bar` instance by reference. The parent node is added first; children reference it by id.',
    code: `function acme_toolbar_node( $wp_admin_bar ) {
\tif ( ! current_user_can( 'edit_others_posts' ) ) {
\t\treturn;
\t}

\t$wp_admin_bar->add_node(
\t\tarray(
\t\t\t'id'    => 'acme-tools',
\t\t\t'title' => __( 'Acme', 'acme' ),
\t\t\t'href'  => esc_url( admin_url( 'options-general.php?page=acme-toolkit' ) ),
\t\t\t'meta'  => array(
\t\t\t\t'title' => __( 'Acme shortcuts', 'acme' ),
\t\t\t),
\t\t)
\t);

\t$wp_admin_bar->add_node(
\t\tarray(
\t\t\t'id'     => 'acme-clear-cache',
\t\t\t'parent' => 'acme-tools',
\t\t\t'title'  => __( 'Clear cache', 'acme' ),
\t\t\t'href'   => wp_nonce_url( admin_url( 'admin-post.php?action=acme_clear_cache' ), 'acme_acme-clear-cache' ),
\t\t)
\t);
}
add_action( 'admin_bar_menu', 'acme_toolbar_node', 80 );`,
    note:
      'The node ids become `wp-admin-bar-acme-tools` and `wp-admin-bar-acme-clear-cache` in the markup, which is what you target from CSS. Removals are emitted as a second callback at priority 999 so they run after every other plugin has added its own nodes.',
  },
  refLinks: [
    {
      href: 'https://developer.wordpress.org/reference/classes/wp_admin_bar/add_node/',
      title: 'WP_Admin_Bar::add_node() — WordPress developer reference',
      description: 'Every key the node array accepts: id, title, parent, href, group and meta.',
    },
    {
      href: 'https://developer.wordpress.org/reference/hooks/admin_bar_menu/',
      title: 'admin_bar_menu — WordPress developer reference',
      description: 'The action that passes the WP_Admin_Bar instance, and the priorities core uses for its own nodes.',
    },
    {
      href: 'https://developer.wordpress.org/reference/classes/wp_admin_bar/remove_node/',
      title: 'WP_Admin_Bar::remove_node() — WordPress developer reference',
      description: 'How core nodes are removed, and why a late priority matters.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/wp_nonce_url/',
      title: 'wp_nonce_url() — WordPress developer reference',
      description: 'The wrapper this generator puts around any admin-post.php action link.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/show_admin_bar/',
      title: 'show_admin_bar() — WordPress developer reference',
      description: 'How to hide the toolbar entirely, and why your node may not be rendering on the front end.',
    },
    {
      href: 'https://developer.wordpress.org/reference/classes/wp_admin_bar/',
      title: 'WP_Admin_Bar — WordPress developer reference',
      description: 'The full class, including get_node() and add_group() for anything this generator does not cover.',
    },
  ],

  faqTitle: 'The WordPress toolbar — frequently asked questions',
  faqIntro: 'Common questions about adding, nesting and removing admin bar nodes.',
  faqs: [
    {
      question: 'How do I add a custom link to the WordPress admin bar?',
      answer:
        'Hook a callback to `admin_bar_menu`, accept the `$wp_admin_bar` object it passes, and call `$wp_admin_bar->add_node( array( \'id\' => \'…\', \'title\' => \'…\', \'href\' => \'…\' ) )`. Use a priority of around 80 so your node lands after core\'s own items rather than beside the WordPress logo.',
    },
    {
      question: 'How do I add a dropdown submenu to a toolbar node?',
      answer:
        'There is no separate submenu function. Add the parent node first, then add each child with its `parent` key set to the parent\'s id. Core builds the dropdown from that relationship. A node with children and no href becomes a menu that only opens on hover.',
    },
    {
      question: 'Why does my toolbar node not appear on the front end?',
      answer:
        'Three usual reasons: the toolbar itself is hidden for that user, either by their profile setting or a `show_admin_bar` filter; your callback returns early on an `is_admin()` check; or the capability guard fails, since front-end visitors are often logged out entirely. `admin_bar_menu` fires in both contexts, so the guard is almost always the cause.',
    },
    {
      question: 'How do I remove items from the WordPress toolbar?',
      answer:
        'Call `$wp_admin_bar->remove_node( $id )` on `admin_bar_menu` at a late priority — 999 is conventional — so it runs after everything has been added. Core ids include `wp-logo`, `comments`, `new-content`, `updates`, `customize` and `search`. Removing a parent removes its children with it.',
    },
    {
      question: 'Can I put an icon or a count bubble in a toolbar title?',
      answer:
        'Yes. The `title` argument is printed as HTML, not escaped, so you can include a Dashicon span or core\'s `awaiting-mod` / `pending-count` bubble markup. That also means anything dynamic inside the title must be escaped by you — an unescaped variable in a toolbar title is an XSS hole on every admin page.',
    },
    {
      question: 'How do I make a toolbar item trigger an action rather than just navigate?',
      answer:
        'Point the href at `admin-post.php?action=your_action` and wrap it in `wp_nonce_url()`, then handle it on `admin_post_your_action` with `check_admin_referer()` and a capability check before doing anything. Without the nonce, any page that links to that URL can fire the action for any logged-in administrator who visits it.',
    },
  ],

  related: [
    { id: 'settings-page', note: 'Build the settings screen your toolbar shortcut points at.' },
    { id: 'admin-notice', note: 'For a one-off message; the toolbar is for things people need on every screen.' },
    { id: 'dashboard-widget', note: 'The same shortcuts, in a box on the dashboard instead of the bar.' },
    { id: 'user-role', note: 'Create the role whose capability gates the node.' },
    { id: 'list-table', note: 'A natural destination for a toolbar link into a custom admin screen.' },
    { id: 'hooks', note: 'Get the priority and accepted argument count right on any callback, including admin_bar_menu.' },
  ],
};
