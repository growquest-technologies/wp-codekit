import type { ToolContent } from '../toolContentTypes';

export const userQueryContent: ToolContent = {
  aboutTitle: 'WP_User_Query Generator Online',
  aboutLead:
    'Build a wp_user_query from a form: roles with the correct `role`, `role__in` or `role__not_in` argument, a `capability` filter, a wildcard `search` scoped to one column, user meta clauses, and the `fields`, `number` and `count_total` settings that decide how much memory the result takes. Out comes the class with `get_results()`, a `get_users()` one-liner, or just the args array.',
  aboutSupport:
    'A Reference tab restates the filter in plain English, documents every argument with its type, and shows the `get_total()` pagination pattern. Free, no account, and nothing you enter is sent anywhere.',
  spec: {
    hook: 'new WP_User_Query( $args )',
    outputs: 'The class with its results loop, a `get_users()` call, or a bare args array',
    requires: 'WordPress 4.4+ for `role__in` and `role__not_in`, 5.9+ for `capability`, PHP 7.4+',
  },

  whyTitle: 'Why the WP_User_Query builder beats a copied args array',
  whyIntro:
    'Two defaults in this class surprise almost everyone. `number` defaults to -1, so a query with no limit returns every account on the site. And `role` is an inclusive list — passing two roles asks for users who hold both at once, which on most sites is nobody. The generator turns both into visible checks rather than a mystery empty result.',
  features: [
    {
      title: 'role versus role__in caught as an error',
      body: 'Listing more than one role while the mode is `role` is an error stating the consequence — a user must hold all of them at once — with a one-click switch to `role__in`, which is what "any of these" actually means.',
    },
    {
      title: 'The missing limit is flagged',
      body: '`WP_User_Query` has no default page size; leaving `number` unset or at -1 returns every matching row. Both raise a warning with a "Limit to 20" fix, which is the difference between a fast query and a memory exhaustion on a membership site.',
    },
    {
      title: 'Search wildcards made explicit',
      body: 'A `search` term without `*` is an exact column match, which is rarely what people expect. The generator says so and offers to wrap the term — `*@example.com` — while a bare `*` on its own is an error, because it scans the entire users table.',
    },
    {
      title: 'count_total priced honestly',
      body: '`count_total` is on by default and costs a second COUNT query. For a fixed-size list whose total is never displayed, the generator offers to turn it off; when you keep it, the output includes the `get_total()` call and a translated count string.',
    },
    {
      title: 'fields kept proportionate to the job',
      body: '`fields => all` hydrates a full `WP_User` object per row and loads its meta. Asking for more than a hundred of those gets a tip to switch to `ids`, `display_name` or `user_email`, with a one-click fix — and the generated loop changes shape to match the flat values you get back.',
    },
    {
      title: 'Role internals left to core',
      body: 'A meta clause that targets `wp_capabilities` directly is flagged, because the role arguments already do that properly — including the per-site table prefix on multisite, which a hand-written clause gets wrong on every subsite.',
    },
  ],

  howTitle: 'How does the user query generator work?',
  howIntro:
    'Say who you want, add any profile-field conditions, then decide how much of each user you actually need back.',
  steps: [
    {
      title: 'Choose who',
      body: 'Tick the roles — administrator, editor, author, contributor, subscriber, customer, shop_manager — and pick whether they are matched with `role__in`, `role` or `role__not_in`. Add a `capability` instead when what you mean is "anyone who can do X".',
    },
    {
      title: 'Narrow it further',
      body: 'Add a search term and optionally restrict it to one column, and add meta clauses for profile fields. One clause emits the `meta_key` / `meta_value` / `meta_compare` shorthand; two or more emit a full `meta_query` with a relation.',
    },
    {
      title: 'Shape the result',
      body: 'Set `number`, choose `fields`, pick the `orderby` and direction, and decide whether you need `count_total` and `has_published_posts`.',
    },
    {
      title: 'Clear the checks, then export',
      body: 'Apply the suggested fixes, then take the `WP_User_Query` class with its loop, the equivalent `get_users()` call, or the args array on its own.',
    },
  ],
  example: {
    title: 'Worked example — an author list of editors and authors who have actually published',
    intro:
      'Anyone in either role, ordered by display name, capped at twenty. `has_published_posts` drops accounts that have never written anything, and `count_total` is off because nothing on the page shows a total.',
    code: `$args = array(
\t'role__in'            => array( 'author', 'editor' ),
\t'number'              => 20,
\t'orderby'             => 'display_name',
\t'count_total'         => false,
\t'has_published_posts' => true,
);

$query = new WP_User_Query( $args );

if ( ! empty( $query->get_results() ) ) {
\techo '<ul>';

\tforeach ( $query->get_results() as $user ) {
\t\tprintf(
\t\t\t'<li><a href="%1$s">%2$s</a></li>',
\t\t\tesc_url( get_author_posts_url( $user->ID ) ),
\t\t\tesc_html( $user->display_name )
\t\t);
\t}

\techo '</ul>';
} else {
\tesc_html_e( 'No users matched.', 'mytheme' );
}`,
    note:
      'Turn `count_total` back on and the generator adds `$query->get_total()` above the loop plus a properly pluralised, translated count below it — which is the only reason to pay for that second query.',
  },
  refLinks: [
    {
      href: 'https://developer.wordpress.org/reference/classes/wp_user_query/',
      title: 'WP_User_Query — WordPress developer reference',
      description: 'The class, its properties and the methods that return results and totals.',
    },
    {
      href: 'https://developer.wordpress.org/reference/classes/wp_user_query/prepare_query/',
      title: 'WP_User_Query::prepare_query() — every accepted argument',
      description: 'The full argument list, including role, capability, search_columns, fields and their defaults.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/get_users/',
      title: 'get_users() — WordPress developer reference',
      description: 'The wrapper the second output mode emits, and what it returns.',
    },
    {
      href: 'https://developer.wordpress.org/reference/classes/wp_user_query/get_total/',
      title: 'WP_User_Query::get_total() — developer reference',
      description: 'The total row count that count_total pays for, used to build a pager.',
    },
    {
      href: 'https://developer.wordpress.org/plugins/users/roles-and-capabilities/',
      title: 'Roles and Capabilities — Plugin Handbook',
      description: 'What the role and capability arguments are matching against, and how the two relate.',
    },
    {
      href: 'https://developer.wordpress.org/reference/hooks/pre_get_users/',
      title: 'pre_get_users — action reference',
      description: 'Adjust a user query globally, including the admin user list, before it runs.',
    },
  ],

  faqTitle: 'WP_User_Query — frequently asked questions',
  faqIntro: 'What developers ask when a user list comes back empty, or far larger than expected.',
  faqs: [
    {
      question: 'What is the difference between role, role__in and role__not_in?',
      answer:
        '`role` is an inclusive list: a user must hold every role you pass, which is why `role => array( "editor", "author" )` usually returns nobody. `role__in` matches users holding at least one of the listed roles, which is what people almost always mean. `role__not_in` excludes anyone holding any of them. `role__in` and `role__not_in` were added in WordPress 4.4.',
    },
    {
      question: 'How do I query users by capability instead of role?',
      answer:
        'Use the `capability`, `capability__in` or `capability__not_in` arguments, added in WordPress 5.9. They resolve to every role that grants the capability, plus users who have it assigned directly. The caveat in core is explicit: they cannot see capabilities that only exist through a `map_meta_cap` filter and were never written to the database, so a purely virtual capability will not match.',
    },
    {
      question: 'Why does my user query return every user on the site?',
      answer:
        'Because `number` defaults to -1, meaning no limit. Unlike `WP_Query`, there is no built-in page size, so a query with only a role filter returns every matching account and builds a `WP_User` object for each. Always set `number`, and pair it with `paged` or `offset` if you need more than the first page.',
    },
    {
      question: 'How do I search users by part of an email address?',
      answer:
        'Wrap the term in asterisks: `search => "*@example.com"`. Without a `*` the comparison is an exact match on the column. Leading, trailing or both are supported, and a leading wildcard prevents MySQL from using the index. Restrict `search_columns` to `user_email` so the query does not also scan login, nicename, URL and display name.',
    },
    {
      question: 'How do I paginate a WP_User_Query?',
      answer:
        'Keep `count_total` on, set `number` to your page size and `paged` to the page you want, then read `$query->get_total()` for the total and divide to get the page count. `count_total` runs a second COUNT query, so turn it off on any list that shows no total — for a fixed "top ten authors" block that number is never displayed and never worth the query.',
    },
    {
      question: 'Should I use get_users() or WP_User_Query?',
      answer:
        '`get_users()` is a thin wrapper that instantiates the class, calls it and returns the results array. Use it when you just need the rows. Use the class directly when you need the total for pagination, or want to inspect the built SQL — the wrapper gives you no access to `get_total()`.',
    },
  ],

  related: [
    { id: 'wp-query', note: 'The post-side equivalent, when you need what the users wrote rather than the users.' },
    { id: 'meta-query', note: 'The same clause syntax against postmeta, with the casts explained clause by clause.' },
    { id: 'comment-query', note: 'Find what a user has commented on, matched by user_id rather than role.' },
    { id: 'term-query', note: 'Query terms with the same fields and number arguments, on the taxonomy side.' },
    { id: 'user-role', note: 'Create the custom role or capability this query filters on, with a migration routine.' },
    { id: 'user-contact', note: 'Add the profile fields whose values these user meta clauses read.' },
  ],
};
