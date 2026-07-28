import type { ToolContent } from '../toolContentTypes';

export const commentQueryContent: ToolContent = {
  aboutTitle: 'WP_Comment_Query Generator Online',
  aboutLead:
    'Build a `WP_Comment_Query` argument array — status, type, the post or post type it is attached to, user or author email, a parent filter, threading, ordering, `number` and `fields` — and get back the class with a linked comment list, a `get_comments()` call feeding `wp_list_comments()`, or just the args.',
  aboutSupport:
    'A Reference tab restates the query in plain English, lists what each comment status means, and explains how threading changes the shape of the result. Free, no sign-up, and every calculation happens in your browser.',
  spec: {
    hook: 'new WP_Comment_Query()',
    outputs: 'The class with a comment list, a `get_comments()` call for `wp_list_comments()`, or a bare args array',
    requires: 'WordPress 4.4+ for `hierarchical`, 4.6+ for `no_found_rows`, PHP 7.4+',
  },

  whyTitle: 'Why the WP_Comment_Query builder beats a hand-written recent-comments loop',
  whyIntro:
    'Two defaults decide whether a "recent comments" widget is useful or embarrassing. `wp_comments` holds pingbacks and trackbacks alongside real comments, so a query with no `type` filter eventually publishes link spam from a scraper site. And `status => all` means every status, spam included — not "all public". The generator flags both, plus the threading and counting traps behind them.',
  features: [
    {
      title: 'Pingbacks kept out of your comment list',
      body: 'A query with no `type` filter raises a warning naming the consequence — pingbacks and trackbacks appear beside real comments — with a one-click "Only comments" fix. This is the single most common reason a front-end list shows link spam.',
    },
    {
      title: 'status "all" is not "all public"',
      body: '`all` includes held, spam and trashed rows. On a front-end template that publishes spam, so it is flagged with an "Only approved" fix, and querying `spam` deliberately gets a reminder that it belongs on the admin side.',
    },
    {
      title: 'The missing limit is called out',
      body: '`WP_Comment_Query` has no default limit, so a query without `number` returns every comment row on a busy site. That is a warning with a "Limit to 10" fix, and asking for more than a hundred full comment objects gets a memory note.',
    },
    {
      title: 'Threading changes what number counts',
      body: 'With `hierarchical` set, `number` limits top-level comments and children come along for the ride — ten threads can be a hundred rows. Combining `hierarchical` with `parent` is an error, because one asks for a single level and the other builds the tree.',
    },
    {
      title: 'Counts that stay correct',
      body: '`count => true` returns a single integer. Pairing it with `number` is a warning, since the limit caps the rows counted and makes the total wrong, and pairing it with `fields => ids` is flagged because the fields argument is ignored entirely.',
    },
    {
      title: 'Input validated before it silently matches nothing',
      body: 'A malformed `author_email`, a non-numeric `user_id` and a non-numeric `post_id` are each errors. Ordering by `comment_date` gets a nudge toward `comment_date_gmt`, which sorts consistently across a timezone change, with a one-click fix.',
    },
  ],

  howTitle: 'How does the comment query generator work?',
  howIntro:
    'Filter by status and type first, then scope it to a post or an author, then decide how the rows come back.',
  steps: [
    {
      title: 'Set the status and type',
      body: 'Choose `approve`, `hold`, `spam`, `trash` or `all`, then restrict to `comment`, `pingback`, `trackback` or leave it open to any type.',
    },
    {
      title: 'Scope the query',
      body: 'Narrow to a single `post_id`, to a whole `post_type`, to a `user_id` or `author_email`, or to replies under one `parent`. Add a search term if you need it.',
    },
    {
      title: 'Choose the order and shape',
      body: 'Set `orderby` and direction, cap it with `number`, pick full objects or `ids`, decide whether the result is threaded or flat, and toggle `count`, the comment meta cache and `no_found_rows`.',
    },
    {
      title: 'Clear the checks, then export',
      body: 'Apply the one-click fixes, then take the class with its linked list, the `get_comments()` version that feeds `wp_list_comments()`, or the args array alone.',
    },
  ],
  example: {
    title: 'Worked example — the ten most recent approved comments, no pingbacks',
    intro:
      'A sidebar list. `type => comment` keeps trackbacks and pingbacks out, and ordering on `comment_date_gmt` rather than `comment_date` keeps the sequence stable if the site timezone ever changes.',
    code: `$query = new WP_Comment_Query();

$comments = $query->query( array(
\t'status'  => 'approve',
\t'type'    => 'comment',
\t'number'  => 10,
\t'orderby' => 'comment_date_gmt',
) );

if ( $comments ) {
\techo '<ul class="recent-comments">';

\tforeach ( $comments as $comment ) {
\t\tprintf(
\t\t\t'<li><a href="%1$s">%2$s</a> on %3$s<p>%4$s</p></li>',
\t\t\tesc_url( get_comment_link( $comment ) ),
\t\t\tesc_html( get_comment_author( $comment ) ),
\t\t\tesc_html( get_the_title( $comment->comment_post_ID ) ),
\t\t\tesc_html( wp_trim_words( $comment->comment_content, 20 ) )
\t\t);
\t}

\techo '</ul>';
} else {
\tesc_html_e( 'No comments yet.', 'mytheme' );
}`,
    note:
      'This list is deliberately flat. Switch `hierarchical` on and the same arguments produce a tree instead, at which point `number` starts counting threads rather than comments — the generator warns about that swap when you make it.',
  },
  refLinks: [
    {
      href: 'https://developer.wordpress.org/reference/classes/wp_comment_query/',
      title: 'WP_Comment_Query — WordPress developer reference',
      description: 'The class, its query() method and the properties it exposes after running.',
    },
    {
      href: 'https://developer.wordpress.org/reference/classes/wp_comment_query/__construct/',
      title: 'WP_Comment_Query::__construct() — every accepted argument',
      description: 'status, type, post_id, parent, hierarchical, number, fields, count and the rest with defaults.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/get_comments/',
      title: 'get_comments() — WordPress developer reference',
      description: 'The wrapper the second output mode emits, sharing the same arguments.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/wp_list_comments/',
      title: 'wp_list_comments() — WordPress developer reference',
      description: 'Rendering a fetched comment list with theme markup and avatars.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/get_comment_link/',
      title: 'get_comment_link() — WordPress developer reference',
      description: 'Building the anchored permalink each generated list item points at.',
    },
    {
      href: 'https://developer.wordpress.org/reference/hooks/pre_get_comments/',
      title: 'pre_get_comments — action reference',
      description: 'Adjust a comment query globally before it runs, including in the admin.',
    },
  ],

  faqTitle: 'WP_Comment_Query — frequently asked questions',
  faqIntro: 'The questions behind most recent-comments bugs.',
  faqs: [
    {
      question: 'How do I exclude pingbacks and trackbacks from a comment query?',
      answer:
        "Pass `'type' => 'comment'`. Pingbacks and trackbacks are stored in `wp_comments` as ordinary rows with a different `comment_type`, so a query that omits the argument returns all three kinds. `type__not_in => array( 'pingback', 'trackback' )` is the equivalent if you also have custom comment types to keep.",
    },
    {
      question: 'What does status => all include?',
      answer:
        'Every status in the table: approved, held for moderation, spam and trashed. It is not a synonym for "everything a visitor may see". On a public template that means spam gets published, so use `approve` on the front end and reserve `all` for admin-side tooling.',
    },
    {
      question: 'Why does number not limit my threaded comment list?',
      answer:
        'With `hierarchical` set to `threaded` or `flat`, `number` applies to top-level comments only; each one then carries its children. Ten threads with five replies each is fifty-five rows. If you need a hard cap on rows, set `hierarchical` to false and build the list flat.',
    },
    {
      question: 'How do I count comments without fetching them?',
      answer:
        "Set `'count' => true` and the query returns an integer instead of an array. Leave `number` unset, because a limit caps the rows counted and produces a wrong total, and note that `fields` is ignored alongside `count`. For per-status totals on a whole site, `wp_count_comments()` is the purpose-built function.",
    },
    {
      question: 'Can I query comments on a specific custom post type?',
      answer:
        "Yes — pass `'post_type' => 'your-cpt'` and the query joins against `wp_posts` to filter. The post type must have been registered with `comments` in its `supports` array, or there will be nothing to find. `post_id` filters to a single post and takes a numeric ID only.",
    },
    {
      question: 'Should I order by comment_date or comment_date_gmt?',
      answer:
        '`comment_date_gmt` for anything you sort or compare. `comment_date` is stored in the site timezone, so changing that setting reorders historical comments relative to each other; the GMT column is a fixed instant and stays consistent. Use `comment_date` only when you are displaying a local time to a reader.',
    },
  ],

  related: [
    { id: 'wp-query', note: 'Fetch the posts these comments hang off, with the same performance flags explained.' },
    { id: 'user-query', note: 'Find the accounts behind logged-in comments, matched by role or capability.' },
    { id: 'date-query', note: 'The same date clause shape, applied to comment_date_gmt for a rolling window.' },
    { id: 'term-query', note: 'The other core query class with a fields and count argument that behave the same way.' },
    { id: 'post-type', note: 'Register the post type with comments support, or a comment query on it finds nothing.' },
    { id: 'hooks', note: 'Wire the generated list into a template or widget with a correctly signed callback.' },
  ],
};
