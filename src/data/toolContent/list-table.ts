import type { ToolContent } from '../toolContentTypes';

export const listTableContent: ToolContent = {
  aboutTitle: 'List Table Generator Online',
  aboutLead:
    'A complete `WP_List_Table` example, generated from your columns. You get the subclass — `get_columns()`, `get_sortable_columns()`, `column_cb()`, `get_bulk_actions()`, `process_bulk_action()`, `get_views()`, `no_items()`, `prepare_items()` and a `column_` method per typed column — plus the admin page that instantiates it, adds the per-page screen option and whitelists it through `set-screen-option`. Rows can come from a custom `$wpdb` table, a post type, or a plain PHP array.',
  aboutSupport:
    'The Preview tab renders the finished screen with your columns, sort arrows, status links and bulk-action dropdown against sample rows, so you can judge the layout before writing a line of SQL. Output the class or the admin page. Free, no account, and nothing you enter leaves the browser.',
  spec: {
    hook: 'WP_List_Table',
    outputs: 'The `WP_List_Table` subclass, or the admin page file that renders it',
    requires: 'WordPress 4.3 or newer (for `get_default_primary_column_name()`), PHP 7.4+',
  },

  whyTitle: 'Why this WP_List_Table example beats the one you found on a blog',
  whyIntro:
    '`WP_List_Table` is marked `@access private` in core and is not autoloaded, so the first thing any working example needs is a guarded `require_once` of `wp-admin/includes/class-wp-list-table.php`. After that come the parts people leave out: sorting has to be whitelisted against `get_sortable_columns()` before it reaches SQL, bulk actions need `check_admin_referer( \'bulk-\' . $plural )`, and the search box only works when the table lives inside a form that carries the `page` parameter.',
  features: [
    {
      title: 'The require_once guard, written in',
      body: 'Every generated class file opens with `if ( ! class_exists( \'WP_List_Table\' ) ) { require_once ABSPATH . \'wp-admin/includes/class-wp-list-table.php\'; }`. Without it you get a fatal error the moment your screen loads outside the exact admin context that happened to include the file.',
    },
    {
      title: 'Sorting whitelisted before it touches SQL',
      body: 'The `$wpdb` source reads `$_REQUEST[\'orderby\']` through `sanitize_key()` and then checks it against `array_keys( $this->get_sortable_columns() )`, falling back to your first sortable column. That whitelist is the thing that makes interpolating a column name into the query safe.',
    },
    {
      title: 'Bulk actions with the nonce core expects',
      body: '`process_bulk_action()` calls `check_admin_referer( \'bulk-\' . $this->_args[\'plural\'] )` — the exact nonce action core\'s own bulk form emits — then a `current_user_can()` check, then `array_map( \'absint\', … )` over the submitted ids. A bulk delete behind an unguarded GET is the classic list-table vulnerability.',
    },
    {
      title: 'Typed columns get their own method',
      body: 'A date column renders through `mysql2date( get_option( \'date_format\' ) )`, a number through `number_format_i18n()`, a status as a prefixed badge span. Everything else falls through `column_default()`, which escapes with `esc_html()`.',
    },
    {
      title: 'Row actions on the primary column',
      body: 'The column you mark primary gets the `row_actions()` treatment with nonced links per action, and `get_default_primary_column_name()` is emitted so the mobile toggle has something to expand. Marking two columns primary is caught as an error.',
    },
    {
      title: 'Screen options wired both ways',
      body: 'The admin page output registers `add_screen_option( \'per_page\', … )` on the `load-{hook}` action and adds the `set-screen-option` filter that allows your option name through. Miss the filter and the user\'s choice is silently discarded on every save.',
    },
  ],

  howTitle: 'How does the List Table Generator work?',
  howIntro:
    'Four steps: name the thing you are listing, define the columns, add the actions, then export the class and its page.',
  steps: [
    {
      title: 'Name the table and its source',
      body: 'Set the singular and plural labels — the plural becomes the bulk-action field name and the nonce, so it matters — plus the class name, the function prefix and the capability. Then choose a custom `$wpdb` table, a post type, or a PHP array as the row source.',
    },
    {
      title: 'Define the columns',
      body: 'Add each column with a key, a label and a type: text, number, date, link or status badge. Mark which ones are sortable and which single column is primary. The first sortable column becomes the default sort.',
    },
    {
      title: 'Add row actions, bulk actions and views',
      body: 'Row actions are the hover links under the primary column, bulk actions fill the dropdown above it, views are the status links across the top. All three take a comma-separated `value:Label` list.',
    },
    {
      title: 'Switch output and export',
      body: 'Turn the search box and per-page screen option on, clear the checks, then copy the class from the first tab and the admin page from the second — they are two files and you need both.',
    },
  ],
  example: {
    title: 'Worked example — the admin page that renders the table',
    intro:
      'The second output mode. The table has to be instantiated and `prepare_items()` called before `display()`, and the whole thing must sit inside a form that carries the `page` parameter or search and bulk actions lose their way back.',
    code: `/**
 * The admin page that renders the table.
 */
function acme_render_briefs_page() {
\tif ( ! current_user_can( 'edit_others_posts' ) ) {
\t\treturn;
\t}

\t$table = new Acme_Briefs_Table();
\t$table->prepare_items();
\t?>
\t<div class="wrap">
\t\t<h1><?php echo esc_html( get_admin_page_title() ); ?></h1>
\t\t<form method="get">
\t\t\t<input type="hidden" name="page" value="acme-briefs" />
\t\t\t<?php
\t\t\t$table->views();
\t\t\t$table->search_box( __( 'Search briefs', 'acme' ), 'acme-search' );
\t\t\t$table->display();
\t\t\t?>
\t\t</form>
\t</div>
\t<?php
}`,
    note:
      'The class tab holds `Acme_Briefs_Table extends WP_List_Table` itself, opening with the guarded `require_once ABSPATH . \'wp-admin/includes/class-wp-list-table.php\'` and closing with a `prepare_items()` that sets `$this->_column_headers`, runs the bulk action, fetches, then calls `set_pagination_args()` — in that order, because the parent reads them in that order.',
  },
  refLinks: [
    {
      href: 'https://developer.wordpress.org/reference/classes/wp_list_table/',
      title: 'WP_List_Table — WordPress developer reference',
      description: 'The full class, its properties and every method available to a subclass.',
    },
    {
      href: 'https://developer.wordpress.org/reference/classes/wp_list_table/prepare_items/',
      title: 'WP_List_Table::prepare_items() — WordPress developer reference',
      description: 'The method a subclass must override to fetch rows and set pagination.',
    },
    {
      href: 'https://developer.wordpress.org/reference/classes/wp_list_table/get_bulk_actions/',
      title: 'WP_List_Table::get_bulk_actions() — WordPress developer reference',
      description: 'How the bulk dropdown is built, and what current_action() returns for it.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/add_screen_option/',
      title: 'add_screen_option() — WordPress developer reference',
      description: 'Registering the per-page option, which must happen on the load-{hook} action.',
    },
    {
      href: 'https://developer.wordpress.org/reference/hooks/set-screen-option/',
      title: 'set-screen-option — WordPress developer reference',
      description: 'The filter that has to allow your option name through, or the saved value is discarded.',
    },
    {
      href: 'https://developer.wordpress.org/reference/classes/wpdb/prepare/',
      title: 'wpdb::prepare() — WordPress developer reference',
      description: 'How the generated query binds its values, and why column names cannot be bound the same way.',
    },
  ],

  faqTitle: 'WP_List_Table — frequently asked questions',
  faqIntro: 'What developers hit when building a custom admin table on top of WP_List_Table.',
  faqs: [
    {
      question: 'Why do I get "Class WP_List_Table not found"?',
      answer:
        '`WP_List_Table` lives in `wp-admin/includes/class-wp-list-table.php` and is not loaded on every admin request. Your file has to require it itself: `if ( ! class_exists( \'WP_List_Table\' ) ) { require_once ABSPATH . \'wp-admin/includes/class-wp-list-table.php\'; }`. Guarding with `class_exists()` matters because on some screens core has already loaded it.',
    },
    {
      question: 'Is it safe to use WP_List_Table when core marks it @access private?',
      answer:
        'It is used by thousands of plugins and has been stable for years, but core reserves the right to change it and gives no backwards-compatibility promise. The practical advice is to use it, keep your subclass thin, and re-test the screen after every major WordPress release rather than assuming it still works.',
    },
    {
      question: 'How do I make columns sortable in WP_List_Table?',
      answer:
        'Return them from `get_sortable_columns()` as `\'column_key\' => array( \'orderby_value\', $is_default_sort )`, and set `$this->_column_headers` in `prepare_items()` with the sortable array as its third element. Then read `$_REQUEST[\'orderby\']` in your query — but check it against `array_keys( $this->get_sortable_columns() )` first, because it is user input heading for an ORDER BY clause.',
    },
    {
      question: 'Why is my search box not filtering anything?',
      answer:
        'Two things have to be true. `search_box()` must be called inside a `<form method="get">` that also carries a hidden `page` input, or the submission navigates away from your screen. And `prepare_items()` has to actually read `$_REQUEST[\'s\']` and apply it — core renders the box but never touches your query.',
    },
    {
      question: 'How do I add bulk actions to a WP_List_Table?',
      answer:
        'Return a `value => Label` array from `get_bulk_actions()`, add a `cb` column whose `column_cb()` prints a checkbox named after your plural, then handle it in `process_bulk_action()` before you fetch. Core\'s bulk form nonce is `bulk-{plural}`, so verify with `check_admin_referer( \'bulk-\' . $this->_args[\'plural\'] )` and follow it with a capability check.',
    },
    {
      question: 'Why does the per-page screen option not save?',
      answer:
        'Registering the option with `add_screen_option()` is only half of it. WordPress will not persist a screen option unless a `set-screen-option` filter (or the newer `set_screen_option_{$option}` filter) returns the value for your option name. Without that filter the save is silently dropped and `get_items_per_page()` keeps returning your default.',
    },
  ],

  related: [
    { id: 'settings-page', note: 'The admin page this table lives on, with its menu entry and capability.' },
    { id: 'user-role', note: 'Create the role whose capability guards the table and its bulk actions.' },
    { id: 'admin-notice', note: 'Report the result of a bulk action above the table.' },
    { id: 'toolbar', note: 'A toolbar shortcut straight into the list screen.' },
    { id: 'post-type', note: 'If the data can be posts, core gives you a list table for free — start here.' },
    { id: 'wp-query', note: 'Build the query behind the post-type row source, argument by argument.' },
  ],
};
