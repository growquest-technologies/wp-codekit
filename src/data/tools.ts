export type ToolCategory = 'content' | 'admin' | 'query' | 'design' | 'core' | 'woocommerce';

export interface Tool {
  id: string;
  name: string;
  cat: ToolCategory;
  fn: string;
  desc: string;
  preview: boolean;
  keywords: string[];
}

export interface Category {
  id: ToolCategory;
  label: string;
  blurb: string;
}

export const CATS: Category[] = [
  { id: 'content', label: 'Content', blurb: 'Post types, taxonomies, fields, shortcodes' },
  { id: 'admin', label: 'Admin', blurb: 'Settings pages, widgets, menus, toolbars' },
  { id: 'query', label: 'Query', blurb: 'WP_Query and every companion query class' },
  { id: 'design', label: 'Design', blurb: 'Sidebars, menus, theme support, theme.json' },
  { id: 'core', label: 'Core', blurb: 'Hooks, config, scripts, cron, REST routes' },
  { id: 'woocommerce', label: 'WooCommerce', blurb: 'Products, checkout, orders, shipping, payments' },
];

export const CAT_MAP: Record<string, Category> = Object.fromEntries(CATS.map((c) => [c.id, c]));

// [id, name, cat, fn, desc, preview, keywords]
const RAW_TOOLS: [string, string, ToolCategory, string, string, boolean, string[]][] = [
  ['readme', 'Readme Studio', 'core', 'readme.txt', 'Drag-and-drop editor for the plugin directory readme file, with a live listing preview.', true, ['readme', 'plugin directory', 'wordpress.org', 'changelog', 'markdown']],
  ['post-type', 'Post Type', 'content', 'register_post_type()', 'Custom post types with labels, supports, rewrite rules and REST exposure.', true, ['cpt', 'custom post type', 'recipe', 'portfolio']],
  ['taxonomy', 'Taxonomy', 'content', 'register_taxonomy()', 'Hierarchical or flat taxonomies wired to any post type.', true, ['category', 'tag', 'term', 'cpt']],
  ['shortcode', 'Shortcode', 'content', 'add_shortcode()', 'Shortcodes with typed attributes, defaults and enclosing content.', true, ['sc', 'attributes', 'embed']],
  ['meta-box', 'Meta Box', 'content', 'add_meta_box()', 'Editor meta boxes with fields, nonces and sanitised save handlers.', true, ['custom field', 'postmeta', 'editor panel']],
  ['post-meta', 'Post Meta', 'content', 'register_post_meta()', 'Register typed post meta with REST support and auth callbacks.', true, ['custom field', 'meta key', 'rest']],
  ['term-meta', 'Term Meta', 'content', 'register_term_meta()', 'Extra fields on taxonomy terms, including the add and edit forms.', true, ['taxonomy field', 'term']],
  ['post-status', 'Post Status', 'content', 'register_post_status()', 'Custom statuses that show up correctly in the posts list and editor.', true, ['draft', 'pending', 'workflow']],
  ['block-pattern', 'Block Pattern', 'content', 'register_block_pattern()', 'Register reusable block patterns and pattern categories.', true, ['gutenberg', 'pattern', 'blocks']],
  ['settings-page', 'Settings Page', 'admin', 'add_menu_page()', 'Admin pages with tabs, sections and the Settings API already wired up.', true, ['options', 'admin menu', 'settings api']],
  ['dashboard-widget', 'Dashboard Widget', 'admin', 'wp_add_dashboard_widget()', 'Dashboard widgets with capability checks and configuration callbacks.', true, ['dashboard', 'admin home']],
  ['admin-notice', 'Admin Notice', 'admin', 'admin_notices', 'Dismissible notices scoped to screens, roles and transients.', true, ['warning', 'error', 'dismissible']],
  ['toolbar', 'Toolbar Node', 'admin', 'WP_Admin_Bar::add_node()', 'Admin bar menus and nested nodes with capability gating.', true, ['admin bar', 'wp_admin_bar']],
  ['list-table', 'List Table', 'admin', 'WP_List_Table', 'Sortable, searchable admin tables with bulk actions.', true, ['table', 'columns', 'bulk action']],
  ['quicktags', 'Quicktags', 'admin', 'QTags.addButton()', 'Buttons for the classic editor text tab.', true, ['classic editor', 'text tab']],
  ['user-contact', 'User Contact Methods', 'admin', 'user_contact_methods', 'Extra contact fields on the user profile screen.', true, ['profile', 'user meta']],
  ['user-role', 'Role & Capability', 'admin', 'add_role()', 'Custom roles and capability maps, with a migration routine.', true, ['permissions', 'capabilities', 'editor role']],
  ['wp-query', 'WP_Query', 'query', 'new WP_Query()', 'Every argument the loop accepts, with the generated loop included.', true, ['loop', 'posts', 'pagination']],
  ['tax-query', 'WP_Tax_Query', 'query', 'tax_query', 'Nested taxonomy clauses with the right relation operators.', true, ['taxonomy', 'terms', 'relation']],
  ['meta-query', 'WP_Meta_Query', 'query', 'meta_query', 'Meta comparisons with correct types and casting.', true, ['custom field', 'compare', 'numeric']],
  ['date-query', 'WP_Date_Query', 'query', 'date_query', 'Date ranges, relative windows and column targeting.', true, ['before', 'after', 'inclusive']],
  ['user-query', 'WP_User_Query', 'query', 'new WP_User_Query()', 'Query users by role, meta, capability and search columns.', true, ['users', 'role', 'author']],
  ['term-query', 'WP_Term_Query', 'query', 'new WP_Term_Query()', 'Fetch terms with hide_empty, ordering and meta clauses.', true, ['terms', 'taxonomy']],
  ['comment-query', 'WP_Comment_Query', 'query', 'new WP_Comment_Query()', 'Comment queries by status, type, post and hierarchy.', true, ['comments', 'moderation']],
  ['sidebar', 'Sidebar', 'design', 'register_sidebar()', 'Widget areas with correct before/after markup for your theme.', true, ['widget area', 'footer', 'theme']],
  ['nav-menu', 'Nav Menu', 'design', 'register_nav_menus()', 'Menu locations plus the wp_nav_menu() call to output them.', true, ['navigation', 'menu location']],
  ['theme-support', 'Theme Support', 'design', 'add_theme_support()', 'Feature flags for thumbnails, HTML5, editor styles and more.', true, ['features', 'post thumbnails']],
  ['widget', 'Widget Class', 'design', 'WP_Widget', 'A full widget class with form, update and widget methods.', true, ['sidebar', 'legacy widget']],
  ['theme-json', 'theme.json', 'design', 'theme.json', 'Block theme settings and style layers as valid JSON.', true, ['block theme', 'palette', 'typography']],
  ['default-headers', 'Default Theme Headers', 'design', 'register_default_headers()', 'Header image options bundled with your theme.', true, ['custom header', 'banner']],
  ['child-theme', 'Child Theme', 'design', 'Template: parent-slug', 'Search wordpress.org for the parent theme and get a complete child theme — style.css, functions.php, theme.json — as a ready .zip.', true, ['child theme', 'parent theme', 'style.css', 'template header', 'wordpress.org']],
  ['hooks', 'Hooks', 'core', 'add_action() / add_filter()', 'Correctly signed callbacks with priority and accepted args.', true, ['action', 'filter', 'priority']],
  ['wp-config', 'wp-config.php', 'core', 'define()', 'Environment-aware config with salts, debug flags and memory limits.', true, ['debug', 'salts', 'constants']],
  ['enqueue', 'Scripts & Styles', 'core', 'wp_enqueue_script()', 'Register and enqueue assets with deps, versions and conditionals.', true, ['enqueue', 'css', 'js', 'assets']],
  ['cron', 'Cron Event', 'core', 'wp_schedule_event()', 'Scheduled events with custom intervals and clean deactivation.', true, ['wp-cron', 'schedule', 'recurring']],
  ['rest-route', 'REST Route', 'core', 'register_rest_route()', 'Namespaced endpoints with args schema and permission callbacks.', true, ['api', 'endpoint', 'json']],
  ['activation', 'Activation Hooks', 'core', 'register_activation_hook()', 'Activation, deactivation and uninstall routines that clean up after themselves.', true, ['install', 'uninstall', 'flush rules']],
  ['plugin-header', 'Plugin Header', 'core', 'Plugin Name:', 'The file header WordPress reads, plus a starter bootstrap class.', true, ['boilerplate', 'plugin file', 'scaffold']],
  ['oembed', 'oEmbed Provider', 'core', 'wp_oembed_add_provider()', 'Register providers so bare URLs auto-embed.', true, ['embed', 'video', 'provider']],
  ['wc-product-fields', 'Product Fields', 'woocommerce', 'woocommerce_process_product_meta', 'Custom fields in the Product Data metabox, saved with a nonce and exposed to REST on request.', true, ['product data', 'metabox', 'custom field', 'wc_clean']],
  ['wc-checkout-fields', 'Checkout Fields', 'woocommerce', 'woocommerce_register_additional_checkout_field()', 'Extra checkout fields for classic checkout or the Blocks Checkout API.', true, ['checkout', 'billing', 'shipping field', 'blocks checkout']],
  ['wc-cart-fee', 'Cart Fee & Discount', 'woocommerce', 'WC_Cart::add_fee()', 'Conditional fees or discounts added at cart calculation, with the admin-context guard.', true, ['surcharge', 'discount', 'cart total', 'fee']],
  ['wc-order-status', 'Custom Order Status', 'woocommerce', 'register_post_status()', 'A new wc- order status wired into the admin dropdown, bulk actions and status list.', true, ['order status', 'workflow', 'wc_order_statuses']],
  ['wc-shipping-method', 'Shipping Method', 'woocommerce', 'WC_Shipping_Method', 'A shipping method class with settings fields and rate calculation, registered safely.', true, ['shipping', 'rates', 'calculate_shipping']],
  ['wc-payment-gateway', 'Payment Gateway', 'woocommerce', 'WC_Payment_Gateway', 'An offline or redirect-style payment gateway class with settings and process_payment().', true, ['gateway', 'checkout', 'process_payment', 'offline payment']],
  ['wc-account-endpoint', 'My Account Endpoint', 'woocommerce', 'add_rewrite_endpoint()', 'A new My Account tab with its menu entry, content callback and query var.', true, ['my account', 'endpoint', 'account tab']],
  ['wc-order-query', 'Order Query', 'woocommerce', 'wc_get_orders()', 'The HPOS-safe way to query orders by status, customer, date and meta.', true, ['orders', 'hpos', 'wc_order_query']],
  ['wc-product-tabs', 'Product Tab', 'woocommerce', 'woocommerce_product_tabs', 'Add or remove tabs on the single product page, with priority control.', true, ['product tabs', 'description tab', 'reviews tab']],
  ['wc-email', 'WooCommerce Email', 'woocommerce', 'WC_Email', 'A transactional email class plus its HTML template, registered into the email settings.', true, ['transactional email', 'order email', 'wc_get_template_html']],
];

export const TOOLS: Tool[] = RAW_TOOLS.map(([id, name, cat, fn, desc, preview, keywords]) => ({
  id,
  name,
  cat,
  fn,
  desc,
  preview,
  keywords,
}));

/** React Router path for each tool. Every id below has a page under src/pages/generators. */
export const TOOL_ROUTES: Record<string, string> = Object.fromEntries(TOOLS.map((t) => [t.id, `/tools/${t.id}`]));

export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length || !b.length) return Math.max(a.length, b.length);
  // Damerau–Levenshtein: counts an adjacent transposition ("feild"/"field")
  // as one edit, which plain Levenshtein scores as two.
  let prev2: number[] | null = null;
  let prev: number[] = [];
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    const cur: number[] = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (prev2 && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        cur[j] = Math.min(cur[j], prev2[j - 2] + 1);
      }
    }
    prev2 = prev;
    prev = cur;
  }
  return prev[b.length];
}

// Score one query word against a tool. Substring passes search everything;
// the loose passes (subsequence, typo tolerance) only search names, function
// signatures and keywords — never the prose description, which matches anything.
function scoreWord(q: string, tool: Tool): number {
  const name = tool.name.toLowerCase();
  const fn = tool.fn.toLowerCase();
  const desc = tool.desc.toLowerCase();
  const kw = tool.keywords.join(' ');
  if (name === q || fn === q) return 1000;
  if (name.indexOf(q) === 0) return 900;
  if (fn.indexOf(q) === 0) return 860;
  if (name.indexOf(q) > -1) return 780;
  if (fn.indexOf(q) > -1) return 700;
  if (kw.indexOf(q) > -1) return 620;
  if (desc.indexOf(q) > -1) return 460;

  // Subsequence, but only when it lands densely — "crn" may hit "Cron Event",
  // not "Shortcode". Requires >=3 chars and a span under 2.2x the query length.
  if (q.length >= 3) {
    const sub = (hay: string, weight: number) => {
      let i = 0,
        first = -1,
        last = -1;
      for (let c = 0; c < hay.length && i < q.length; c++) {
        if (hay[c] === q[i]) {
          if (first < 0) first = c;
          last = c;
          i++;
        }
      }
      if (i < q.length) return 0;
      const span = last - first + 1;
      if (span > Math.max(q.length * 2.2, q.length + 2)) return 0;
      return Math.max(weight - (span - q.length) * 12, 120);
    };
    const best = Math.max(sub(name, 400), sub(fn, 370), sub(kw, 300));
    if (best) return best;
  }

  // Typo tolerance: one edit for short words, two for longer ones.
  if (q.length >= 4) {
    const budget = q.length >= 7 ? 2 : 1;
    const words = (name + ' ' + fn.replace(/[^a-z0-9_ ]/g, ' ') + ' ' + kw).split(/[\s_()]+/);
    for (const w of words) {
      if (!w || Math.abs(w.length - q.length) > budget) continue;
      if (editDistance(q, w) <= budget) return 340;
    }
  }
  return 0;
}

export function fuzzyScore(needle: string, tool: Tool): number {
  const q = needle.toLowerCase().trim();
  if (!q) return 1;
  const words = q.split(/\s+/).filter(Boolean);
  // Whole-phrase match wins outright.
  const whole = scoreWord(q, tool);
  if (words.length < 2) return whole;
  let total = 0;
  for (const w of words) {
    const sc = scoreWord(w, tool);
    if (!sc) return whole; // every word must land, else fall back to the phrase
    total += sc;
  }
  return Math.max(whole, Math.round(total / words.length) + 60);
}

export function toolsHref(q: string, cat: string): string {
  const p: string[] = [];
  if (q) p.push('q=' + encodeURIComponent(q));
  if (cat && cat !== 'all') p.push('cat=' + cat);
  return '/tools' + (p.length ? '?' + p.join('&') : '');
}
