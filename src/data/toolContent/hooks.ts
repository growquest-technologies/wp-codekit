import type { ToolContent } from '../toolContentTypes';

export const hooksContent: ToolContent = {
  aboutTitle: 'WordPress Hooks Generator Online',
  aboutLead:
    'Pick a hook, get a callback that actually fits it. This WordPress hooks generator writes the `add_action()` or `add_filter()` call together with a correctly signed function: the right parameter count, the right priority, and — for filters — the `return` line that stops a missing value from blanking your content.',
  aboutSupport:
    'Around thirty core hooks are built in with their real signatures, so typing `save_post` or `pre_get_posts` fills in the parameters and the accepted-args count for you, and the Reference tab shows the matching `remove_action()` / `remove_filter()` call. Free, no account, and everything is generated in your browser.',
  spec: {
    hook: 'add_action() / add_filter()',
    outputs: 'A snippet, a `functions.php` block, or a standalone plugin file',
    requires: 'Any supported WordPress version; PHP 7.4+ for the generated syntax',
  },

  whyTitle: 'Why the WordPress hooks generator beats copying a callback from memory',
  whyIntro:
    'Hook mistakes are quiet. A typo in the hook name never fires and never errors. An action hooked as a filter returns nothing and wipes the value. Asking for four arguments from a hook that passes two throws an `ArgumentCountError` on PHP 8, but only on the page where that hook runs. This generator checks all three before you paste anything.',
  features: [
    {
      title: 'A built-in signature reference',
      body: 'Around thirty core hooks — `init`, `save_post`, `pre_get_posts`, `the_content`, `upload_mimes`, `cron_schedules` and more — ship with their real parameter lists. Type or click one and the kind, the parameters and the accepted-args count fill themselves in.',
    },
    {
      title: 'Action or filter, checked against core',
      body: 'Hooking `the_content` as an action, or `init` as a filter, is flagged as an error with a one-click switch. Unknown hook names are flagged too, because a misspelled hook fails silently forever.',
    },
    {
      title: 'Argument counts that PHP 8 will accept',
      body: 'Ask for more parameters than the hook passes and you get an error, not a surprise: `ArgumentCountError` at runtime. One click clamps the count back to what core actually sends.',
    },
    {
      title: 'The return line written for you',
      body: 'Filters get `return $value;` appended automatically, and echoing inside a filter body raises a warning — printing from a filter dumps output wherever that filter happens to run, including in feeds and admin lists.',
    },
    {
      title: 'Guards for the hooks that need them',
      body: '`save_post` without an autosave or revision check, `pre_get_posts` without `is_admin()` and `is_main_query()`, `the_content` without `is_singular()`, `wp_get_current_user()` on `init` — each is caught, and the `pre_get_posts` guard can be inserted for you.',
    },
    {
      title: 'Three callback styles, plus the way back out',
      body: 'Named function, anonymous closure or class method. Choose the closure and the generator reminds you it can never be unhooked; choose a named function and the Reference tab gives you the exact `remove_action()` / `remove_filter()` call with the matching priority.',
    },
  ],

  howTitle: 'How does the Hooks Generator work?',
  howIntro:
    'Four steps from a hook name to a snippet you can paste. Nothing is uploaded; the code is built in the page as you type.',
  steps: [
    {
      title: 'Name the hook',
      body: 'Type it or pick one of the suggestion chips. A recognised core hook fills in whether it is an action or a filter, its parameters and how many of them your callback receives.',
    },
    {
      title: 'Shape the callback',
      body: 'Set the function name, the priority and the accepted argument count, then choose a named function, a closure or a class method. Parameter names, types and descriptions are all editable and feed the generated docblock.',
    },
    {
      title: 'Write the body',
      body: 'Put your logic in the body box. Optionally add the commented `remove_` call, or an `is_admin()` early return so the callback only runs on the front end.',
    },
    {
      title: 'Clear the checks and export',
      body: 'Work through the Checks tab, then switch between snippet, `functions.php` and plugin-file output and copy or download the result.',
    },
  ],
  example: {
    title: 'Worked example — appending a signature to single posts',
    intro:
      'A `the_content` filter at the default priority, taking one argument. Note the guard clause and the generated return line: this is the whole snippet output, unedited.',
    code: `/**
 * Filter the_content.
 *
 * @param string $content Post content.
 *
 * @return string Filtered value.
 */
function mytheme_append_signature( $content ) {
\tif ( ! is_singular( 'post' ) || ! in_the_loop() || ! is_main_query() ) {
\t\treturn $content;
\t}

\t$content .= '<p class="signature">Thanks for reading.</p>';

\treturn $content;
}
add_filter( 'the_content', 'mytheme_append_signature' );`,
    note:
      'Priority 10 and a single argument are the defaults, so neither is printed. Change either one and the generator adds them to the `add_filter()` call in the correct order — priority first, accepted args second.',
  },
  refLinks: [
    {
      href: 'https://developer.wordpress.org/reference/functions/add_action/',
      title: 'add_action() — WordPress developer reference',
      description: 'The hook, callback, priority and accepted-args arguments, and how they interact.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/add_filter/',
      title: 'add_filter() — WordPress developer reference',
      description: 'The filter equivalent, including why the callback must always return a value.',
    },
    {
      href: 'https://developer.wordpress.org/plugins/hooks/',
      title: 'Hooks — Plugin Handbook',
      description: 'The official explanation of actions, filters and the order they fire in.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/remove_action/',
      title: 'remove_action() — WordPress developer reference',
      description: 'Unhooking a callback, and why the priority must match the one used to add it.',
    },
    {
      href: 'https://developer.wordpress.org/reference/hooks/pre_get_posts/',
      title: 'pre_get_posts — hook reference',
      description: 'The main-query hook that runs for every query, admin included — the reason it needs a guard.',
    },
    {
      href: 'https://developer.wordpress.org/reference/functions/apply_filters/',
      title: 'apply_filters() — WordPress developer reference',
      description: 'How a filter is fired, which is what your callback signature has to match.',
    },
  ],

  faqTitle: 'WordPress hooks — frequently asked questions',
  faqIntro: 'The questions that come up most often when hooking into WordPress core, themes and plugins.',
  faqs: [
    {
      question: 'What is the difference between an action and a filter in WordPress?',
      answer:
        'An action runs at a point in the request and returns nothing — you use it to do something, like registering a post type on `init`. A filter is handed a value and must return one, so it modifies data on its way past. Using `add_action()` on a filter means the value is discarded, which usually shows up as an empty title or empty content.',
    },
    {
      question: 'Why is my add_action() callback not firing?',
      answer:
        'Three causes cover almost every case. The hook name is misspelled, and WordPress never warns about a hook nothing fires. The `add_action()` call runs after the hook has already fired, so registering on `init` from inside a `wp_footer` callback does nothing. Or the callback name does not match the function name exactly, including its namespace or class prefix.',
    },
    {
      question: 'What does the priority number in add_action() do?',
      answer:
        'It sets the order callbacks run on the same hook: lower runs earlier, and 10 is the default. Callbacks with the same priority run in the order they were added. Needing a priority above 100 to win usually means another plugin is hooking the same thing late, and finding out which one is more durable than escalating the number.',
    },
    {
      question: 'Why do I get "Too few arguments" or ArgumentCountError from my hook?',
      answer:
        'The fourth argument of `add_action()` / `add_filter()` is how many parameters WordPress passes to your callback, and it defaults to 1. If your function signature declares three parameters but you did not raise that number, PHP 8 throws an `ArgumentCountError`. Asking for more than the hook actually provides fails the same way, so the number must match both your signature and the hook.',
    },
    {
      question: 'Can I remove a hook added by a plugin or theme?',
      answer:
        'Yes, if it was added as a named function or a static method: call `remove_action()` / `remove_filter()` with the identical hook name, callback and priority, from a point later than where it was added but before the hook fires. Anonymous closures cannot be removed at all — there is no handle to reference — which is the main reason to avoid them in distributed code.',
    },
    {
      question: 'Where should I put my hook code — functions.php or a plugin?',
      answer:
        'A child theme\'s `functions.php` is fine for presentation logic that belongs to that theme. Anything the site should keep after a redesign — post types, cron events, REST routes — belongs in a small plugin or an mu-plugin, because switching themes silently disables `functions.php` code. The generator offers all three output shapes for that reason.',
    },
  ],

  related: [
    { id: 'cron', note: 'Your callback needs to run on a schedule rather than on a page load.' },
    { id: 'rest-route', note: 'Everything on rest_api_init, with the args schema and permission callback written for you.' },
    { id: 'enqueue', note: 'The correct hook per context: front end, admin, block editor or login screen.' },
    { id: 'activation', note: 'The lifecycle hooks that fire once, which add_action cannot express.' },
    { id: 'plugin-header', note: 'Somewhere permanent to keep the callbacks, instead of the active theme.' },
    { id: 'wp-query', note: 'Build the query first, then hook it onto pre_get_posts with the right guards.' },
  ],
};
