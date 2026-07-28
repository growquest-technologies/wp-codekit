import type { Tool } from './tools';
import type { FaqItem } from './toolContentTypes';

/**
 * The post-click support questions every generator page should answer.
 *
 * Competitor research found these are effectively unanswered across the whole
 * category — GenerateWP, WPTurbo, Meta Box and the rest all publish
 * encyclopaedia-style FAQs ("What is a custom post type?") that the searcher
 * already knows the answer to, and none of them answer the questions someone
 * actually has *after* clicking Generate: where do I paste this, why isn't it
 * showing up, can I ship it to a client.
 *
 * These are interpolated per tool rather than byte-identical, both because the
 * correct answer genuinely differs by tool and because 49 pages carrying the
 * same three paragraphs verbatim is a duplicate-content signal.
 */

/** Tools whose registered thing is URL-routed, so permalinks must be flushed. */
const REWRITE_TOOLS = new Set([
  'post-type', 'taxonomy', 'post-status', 'wc-account-endpoint', 'wc-order-status', 'rest-route',
]);

/** Tools that output something other than a PHP snippet you paste into a file. */
const NON_SNIPPET: Record<string, string> = {
  readme: 'Readme Studio produces a `readme.txt`, not PHP. Put it in the root of your plugin folder, next to the main plugin file, and commit it to the `trunk/` directory of your wordpress.org SVN repo. The version in `trunk/readme.txt` is what the plugin directory reads.',
  'child-theme': 'The Child Theme generator hands you a complete `.zip`. Upload it at Appearance → Themes → Add New → Upload Theme, then activate it. There is nothing to paste — but keep the parent theme installed, because a child theme with a missing parent shows up under Broken Themes and cannot be activated.',
  'theme-json': '`theme.json` goes in the root of your theme folder, not in `functions.php`. If you are editing a child theme, your `theme.json` is merged over the parent\'s — you only need to declare the keys you are changing.',
  'wp-config': 'These are constants for `wp-config.php`, and they must sit **above** the line that reads `/* That\'s all, stop editing! */` — anything after it is ignored. Never paste them into `functions.php`.',
};

export function afterYouCopyFaqs(tool: Tool): FaqItem[] {
  const items: FaqItem[] = [];

  items.push({
    question: `Where do I paste the code from the ${tool.name} generator?`,
    answer:
      NON_SNIPPET[tool.id] ??
      "You have three good options and one bad one. Best is a small site-specific plugin — the generator can output one for you, and it keeps working when you change theme. A code-snippets plugin is fine too. A child theme's `functions.php` works but ties the code to that theme. Never edit the parent theme: the next update overwrites it and your code is gone.",
  });

  if (REWRITE_TOOLS.has(tool.id)) {
    items.push({
      question: `Why isn't my new ${tool.name.toLowerCase()} showing up, or why do I get a 404?`,
      answer:
        'Almost always stale rewrite rules. WordPress caches the URL routing table, so anything that adds URLs is invisible until that cache is rebuilt. Go to Settings → Permalinks and press Save Changes — you do not need to alter anything, just saving the page flushes the rules. Never call `flush_rewrite_rules()` on every page load; it is an expensive write and belongs in an activation hook.',
    });
  }

  items.push({
    question: 'Can I use the generated code in client work or a commercial plugin?',
    answer:
      'Yes. The output is ordinary WordPress API calls that you configured — there is no licence attached to it and no attribution required. Use it in client sites, commercial plugins and themes, or products you sell. The generated file carries a short credit comment you are free to delete.',
  });

  return items;
}
