import type { ToolContent } from '../toolContentTypes';

export const dateQueryContent: ToolContent = {
  aboutTitle: 'Date Query Generator Online',
  aboutLead:
    'Build the `date_query` argument in three shapes: a range between two dates, a rolling window such as the last 90 days, or calendar parts like "every December" and "weekday mornings". If you have been hunting for wp_query date_query examples that actually explain `inclusive` and the `column` choice, this generator writes them and flags the boundary mistakes as you make them.',
  aboutSupport:
    'A Reference tab restates the filter in plain English, documents each clause key, and lists the four `wp_posts` columns you can compare against with a note on when each is the right one. Free, no sign-up, everything computed in the browser.',
  spec: {
    hook: "'date_query' => array( ... ) — WP_Date_Query",
    outputs: 'A `WP_Query` with its loop, an args array for `get_posts()`, or a `pre_get_posts` callback',
    requires: 'WordPress 3.7 or newer, PHP 7.4+',
  },

  whyTitle: 'Why the date_query builder beats guessing at before and after',
  whyIntro:
    '`WP_Date_Query` is the most forgiving argument in WordPress, and that is the problem. Hand it a date it cannot parse and it drops the condition without a word; leave `inclusive` at its default and your "up to 30 June" report stops at midnight on the 30th, quietly losing a day of data. This generator checks the format, the ordering and the boundary before any of that reaches production.',
  features: [
    {
      title: 'The inclusive boundary is spelled out',
      body: 'With `inclusive` off and a `Y-m-d` boundary set, you get a warning stating exactly what happens — before 2026-06-30 stops at midnight, so nothing from the 30th matches — plus a one-click "Include the boundary" fix.',
    },
    {
      title: 'Unparseable dates are caught, not swallowed',
      body: 'A `d-m-Y` value is an error, because `strtotime()` reads it as something else entirely. Anything that is neither `Y-m-d` nor a recognisable relative phrase is a warning, since `WP_Date_Query` silently ignores what it cannot parse.',
    },
    {
      title: 'Impossible ranges rejected before they run',
      body: 'An `after` later than its `before` is an error with a "Swap them" fix. A range with both boundaries empty is an error too, because it means no filter at all rather than a wide one.',
    },
    {
      title: 'Calendar parts range-checked',
      body: 'Month outside 1-12, day outside 1-31, hour outside 0-23 and dayofweek outside 1-7 are each errors naming the bad value. `dayofweek` gets the note that 1 is Sunday, and that `dayofweek_iso` is the argument you want if Monday should be 1.',
    },
    {
      title: 'Timezone and status traps flagged',
      body: 'Comparing against `post_date` gets a tip to use `post_date_gmt` when the dates came from an API or a CSV in UTC, with a one-click switch. A future-facing range combined with `post_status => publish` warns that scheduled posts carry the `future` status, and offers to change it.',
    },
    {
      title: 'Honest about rolling windows',
      body: 'A relative window is evaluated at query time, so its result changes on every request and never settles in the object cache. The generator says so instead of letting you discover it in a cache-hit-rate graph.',
    },
  ],

  howTitle: 'How does the date query generator work?',
  howIntro:
    'Pick the shape of the filter first — the rest of the form changes to match — then set the column and the query around it.',
  steps: [
    {
      title: 'Choose the shape of the range',
      body: 'Between two dates, a rolling window, calendar parts, or no date filter at all. Only the fields that shape needs are shown.',
    },
    {
      title: 'Fill in the boundaries or the parts',
      body: 'For a range, set `after` and `before` as `Y-m-d` (or a `strtotime` phrase) and decide whether the boundary days count. For a window, set a count and a unit. For parts, fill any of year, month, day, dayofweek and hour, comma separated for several.',
    },
    {
      title: 'Pick the column',
      body: '`post_date` is local site time and is what the editor typed. `post_date_gmt` is UTC and is the right target for anything computed elsewhere. `post_modified` and `post_modified_gmt` find recently edited posts, including ones touched only for a typo.',
    },
    {
      title: 'Set the query, clear the checks, export',
      body: 'Choose the post type, status, page size, sort direction and `no_found_rows`, resolve the flagged issues, then copy the full query, the args array or the `pre_get_posts` callback.',
    },
  ],
  example: {
    title: 'Worked example — posts published in the first half of 2026, both boundary days included',
    intro:
      'A range clause with `inclusive` set to true, so 1 January and 30 June both count. Without it, `before` is treated as midnight at the start of the 30th and the whole of that day drops out.',
    code: `$args = array(
\t'post_type'      => 'post',
\t'post_status'    => 'publish',
\t'posts_per_page' => 10,
\t'date_query'     => array(
\t\tarray(
\t\t\t'after'     => '2026-01-01',
\t\t\t'before'    => '2026-06-30',
\t\t\t'inclusive' => true,
\t\t),
\t),
);`,
    note:
      'Note the double nesting: `date_query` is a list of clauses, so even a single condition is an array inside an array. Passing the inner array directly is the most common reason a date filter appears to do nothing. The `column` key is only emitted when you move off the `post_date` default.',
  },
  refLinks: [
    {
      href: 'https://developer.wordpress.org/reference/classes/wp_date_query/',
      title: 'WP_Date_Query — WordPress developer reference',
      description: 'The class that parses date_query and builds the SQL comparison.',
    },
    {
      href: 'https://developer.wordpress.org/reference/classes/wp_date_query/__construct/',
      title: 'WP_Date_Query::__construct() — clause keys',
      description: 'after, before, inclusive, column, compare and every calendar part, with accepted formats.',
    },
    {
      href: 'https://developer.wordpress.org/reference/classes/wp_query/__construct/',
      title: 'WP_Query::__construct() — every accepted argument',
      description: 'Where date_query sits among the other query variables.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/current_time/',
      title: 'current_time() — WordPress developer reference',
      description: 'Producing a boundary in site time or UTC that matches the column you are comparing.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/wp_timezone/',
      title: 'wp_timezone() — WordPress developer reference',
      description: 'The site timezone object, and why post_date and post_date_gmt can differ by hours.',
    },
    {
      href: 'https://developer.wordpress.org/reference/hooks/pre_get_posts/',
      title: 'pre_get_posts — action reference',
      description: 'Applying the date filter to the main query rather than a second one.',
    },
  ],

  faqTitle: 'date_query — frequently asked questions',
  faqIntro: 'The questions that come up whenever a date filter is off by a day or returns nothing.',
  faqs: [
    {
      question: 'What does inclusive do in a date_query, and why is my last day missing?',
      answer:
        '`inclusive` defaults to false, which means the boundary values are compared with `>` and `<` rather than `>=` and `<=`. Because a bare `Y-m-d` string resolves to midnight at the start of that day, `before => 2026-06-30` with `inclusive` off excludes the whole of 30 June. Set `inclusive => true`, or pass a full `2026-06-30 23:59:59` timestamp.',
    },
    {
      question: 'Can I use relative dates like "-30 days" in a date_query?',
      answer:
        'Yes. `after` and `before` accept anything `strtotime()` understands, so `-30 days`, `last monday` and `first day of this month` all work. The catch is that unparseable input is discarded without an error, so a typo produces a query with no date condition rather than a failure. It is also evaluated per request, so a rolling window never produces a cacheable query.',
    },
    {
      question: 'What is the difference between post_date and post_date_gmt?',
      answer:
        '`post_date` is the publication time in the site timezone, which is what an editor sees in the admin. `post_date_gmt` is the same instant in UTC. If your boundaries came from an API, a CSV export or another system, they are almost certainly UTC and should be compared against `post_date_gmt` — comparing them to `post_date` shifts every result by your site offset, which looks correct in London in winter and wrong everywhere else.',
    },
    {
      question: 'Why does dayofweek return the wrong day?',
      answer:
        'There are two arguments. `dayofweek` runs 1 for Sunday through 7 for Saturday, matching MySQL `DAYOFWEEK()`. `dayofweek_iso` runs 1 for Monday through 7 for Sunday, matching ISO-8601 and `WEEKDAY()`. Using one set of numbers with the other argument shifts everything by a day.',
    },
    {
      question: 'How do I query scheduled or future posts by date?',
      answer:
        "Change the status as well as the range. A scheduled post has `post_status` of `future`, not `publish`, so a forward-looking `after` combined with the default `publish` status returns nothing at all. Set `'post_status' => 'future'`, or pass an array of both when you want published and upcoming items in one list.",
    },
    {
      question: 'Can I use date_query on user or comment queries too?',
      answer:
        'Yes. `WP_User_Query` accepts a `date_query` that is applied to the `user_registered` column, and `WP_Comment_Query` accepts one applied to `comment_date_gmt`. The clause keys are identical — the only thing that changes is which column the class targets by default.',
    },
  ],

  related: [
    { id: 'wp-query', note: 'The full query around the date clause, including ordering and pagination.' },
    { id: 'meta-query', note: 'When the date you care about lives in a custom field, not the post date — cast it to DATE there.' },
    { id: 'tax-query', note: 'Combine a date range with a taxonomy filter in the same set of arguments.' },
    { id: 'comment-query', note: 'The same date clause shape against comment_date_gmt.' },
    { id: 'post-type', note: 'Register the post type whose publication dates you are filtering.' },
    { id: 'post-status', note: 'Custom statuses to include alongside publish and future in a date-bounded query.' },
  ],
};
