import { alignBlock, escPhp, slugify, withCredit, type ValidationIssue } from '../lib/codegen';

export type OutputMode = 'loop' | 'pre_get_posts' | 'shortcode';

export interface TaxClause {
  taxonomy: string;
  field: 'slug' | 'term_id' | 'name' | 'term_taxonomy_id';
  operator: 'IN' | 'NOT IN' | 'AND' | 'EXISTS' | 'NOT EXISTS';
  terms: string;
  includeChildren: boolean;
}

export interface MetaClause {
  key: string;
  compare: string;
  type: 'CHAR' | 'NUMERIC' | 'DECIMAL' | 'DATE' | 'DATETIME' | 'BINARY';
  value: string;
}

export interface WPQuery {
  postTypes: string[];
  customTypes: string[];
  statuses: string[];
  perPage: string;
  offset: string;
  paged: boolean;
  ignoreSticky: boolean;
  orderby: string;
  order: 'DESC' | 'ASC';
  orderbyMetaKey: string;
  search: string;
  authors: string;
  include: string;
  exclude: string;
  postParent: string;
  dateAfter: string;
  dateBefore: string;
  taxClauses: TaxClause[];
  metaClauses: MetaClause[];
  taxRelation: 'AND' | 'OR';
  metaRelation: 'AND' | 'OR';
  fields: '' | 'ids' | 'id=>parent';
  noFoundRows: boolean;
  updateMetaCache: boolean;
  updateTermCache: boolean;
  suppressFilters: boolean;
  varName: string;
  fnPrefix: string;
  shortcodeTag: string;
}

export const BUILTIN_TYPES = ['post', 'page', 'any', 'attachment'];
export const STATUSES = ['publish', 'draft', 'pending', 'private', 'future', 'any'];
export const ORDERBY: [string, string][] = [
  ['date', 'date — published date'], ['ID', 'ID'], ['title', 'title'], ['name', 'name — post slug'],
  ['modified', 'modified'], ['rand', 'rand — random'], ['comment_count', 'comment_count'],
  ['menu_order', 'menu_order'], ['relevance', 'relevance — search only'], ['meta_value', 'meta_value — text'],
  ['meta_value_num', 'meta_value_num — numeric'], ['post__in', 'post__in — keep given order'],
];
export const COMPARES = ['=', '!=', '>', '>=', '<', '<=', 'LIKE', 'NOT LIKE', 'IN', 'NOT IN', 'BETWEEN', 'NOT BETWEEN', 'EXISTS', 'NOT EXISTS'];
export const NO_VALUE_COMPARES = ['EXISTS', 'NOT EXISTS'];
export const NUMERIC_COMPARES = ['>', '>=', '<', '<=', 'BETWEEN', 'NOT BETWEEN'];

function csv(s: string): string[] {
  return String(s || '').split(',').map((x) => x.trim()).filter(Boolean);
}

function phpList(items: string[], numeric?: boolean): string {
  return 'array( ' + items.map((i) => (numeric ? i : "'" + escPhp(i) + "'")).join(', ') + ' )';
}

function isIntList(s: string): boolean {
  return csv(s).every((x) => /^\d+$/.test(x));
}

export function effectiveTypes(q: WPQuery): string[] {
  return q.postTypes.concat(q.customTypes);
}

export function freshProject(): WPQuery {
  return {
    postTypes: ['post'], customTypes: [], statuses: ['publish'],
    perPage: '10', offset: '', paged: true, ignoreSticky: false,
    orderby: 'date', order: 'DESC', orderbyMetaKey: '',
    search: '', authors: '', include: '', exclude: '', postParent: '',
    dateAfter: '', dateBefore: '',
    taxClauses: [], metaClauses: [], taxRelation: 'AND', metaRelation: 'AND',
    fields: '', noFoundRows: false, updateMetaCache: true, updateTermCache: true, suppressFilters: false,
    varName: 'query', fnPrefix: 'mytheme', shortcodeTag: 'recent_posts',
  };
}

export function buildArgs(q: WPQuery): [string, string][] {
  const args: [string, string][] = [];
  const types = effectiveTypes(q);
  if (types.length === 1) args.push(['post_type', "'" + escPhp(types[0]) + "'"]);
  else if (types.length > 1) args.push(['post_type', phpList(types)]);
  if (q.statuses.length === 1) args.push(['post_status', "'" + escPhp(q.statuses[0]) + "'"]);
  else if (q.statuses.length > 1) args.push(['post_status', phpList(q.statuses)]);
  args.push(['posts_per_page', String(parseInt(q.perPage, 10) || (q.perPage === '-1' ? -1 : 10))]);
  if (q.offset && parseInt(q.offset, 10)) args.push(['offset', String(parseInt(q.offset, 10))]);
  if (q.paged) args.push(['paged', "get_query_var( 'paged' ) ? absint( get_query_var( 'paged' ) ) : 1"]);
  args.push(['orderby', "'" + q.orderby + "'"]);
  args.push(['order', "'" + q.order + "'"]);
  if ((q.orderby === 'meta_value' || q.orderby === 'meta_value_num') && q.orderbyMetaKey) args.push(['meta_key', "'" + escPhp(q.orderbyMetaKey) + "'"]);
  if (q.search) args.push(['s', "'" + escPhp(q.search) + "'"]);
  if (csv(q.authors).length) args.push(['author__in', phpList(csv(q.authors), isIntList(q.authors))]);
  if (csv(q.include).length) args.push(['post__in', phpList(csv(q.include), isIntList(q.include))]);
  if (csv(q.exclude).length) args.push(['post__not_in', phpList(csv(q.exclude), isIntList(q.exclude))]);
  if (q.postParent !== '') args.push(['post_parent', String(parseInt(q.postParent, 10) || 0)]);
  if (q.ignoreSticky) args.push(['ignore_sticky_posts', 'true']);

  const taxes = q.taxClauses.filter((c) => c.taxonomy);
  if (taxes.length) {
    const rows: string[] = [];
    if (taxes.length > 1) rows.push("'relation' => '" + q.taxRelation + "',");
    taxes.forEach((c) => {
      const inner: string[] = ["'taxonomy' => '" + escPhp(c.taxonomy) + "'", "'field' => '" + c.field + "'"];
      if (NO_VALUE_COMPARES.indexOf(c.operator) === -1) {
        const terms = csv(c.terms);
        inner.push("'terms' => " + (terms.length === 1 ? (c.field === 'term_id' || c.field === 'term_taxonomy_id' ? terms[0] : "'" + escPhp(terms[0]) + "'") : phpList(terms, c.field === 'term_id' || c.field === 'term_taxonomy_id')));
      }
      if (c.operator !== 'IN') inner.push("'operator' => '" + c.operator + "'");
      if (c.includeChildren === false) inner.push("'include_children' => false");
      rows.push('array(');
      inner.forEach((i) => rows.push('\t' + i + ','));
      rows.push('),');
    });
    args.push(['tax_query', 'array(\n' + rows.map((r) => '\t\t\t' + r).join('\n') + '\n\t\t)']);
  }

  const metas = q.metaClauses.filter((c) => c.key);
  if (metas.length) {
    const rows: string[] = [];
    if (metas.length > 1) rows.push("'relation' => '" + q.metaRelation + "',");
    metas.forEach((c) => {
      const inner: string[] = ["'key' => '" + escPhp(c.key) + "'"];
      if (NO_VALUE_COMPARES.indexOf(c.compare) === -1) {
        const vals = csv(c.value);
        const numeric = c.type === 'NUMERIC' || c.type === 'DECIMAL';
        if (c.compare === 'IN' || c.compare === 'NOT IN' || c.compare === 'BETWEEN' || c.compare === 'NOT BETWEEN') inner.push("'value' => " + phpList(vals, numeric && vals.every((v) => /^-?\d+(\.\d+)?$/.test(v))));
        else inner.push("'value' => " + (numeric && /^-?\d+(\.\d+)?$/.test(c.value) ? c.value : "'" + escPhp(c.value) + "'"));
      }
      inner.push("'compare' => '" + c.compare + "'");
      if (c.type !== 'CHAR') inner.push("'type' => '" + c.type + "'");
      rows.push('array(');
      inner.forEach((i) => rows.push('\t' + i + ','));
      rows.push('),');
    });
    args.push(['meta_query', 'array(\n' + rows.map((r) => '\t\t\t' + r).join('\n') + '\n\t\t)']);
  }

  if (q.dateAfter || q.dateBefore) {
    const rows: string[] = ['array('];
    if (q.dateAfter) rows.push("\t'after'     => '" + escPhp(q.dateAfter) + "',");
    if (q.dateBefore) rows.push("\t'before'    => '" + escPhp(q.dateBefore) + "',");
    rows.push("\t'inclusive' => true,");
    rows.push('),');
    args.push(['date_query', 'array(\n' + rows.map((r) => '\t\t\t' + r).join('\n') + '\n\t\t)']);
  }

  if (q.fields) args.push(['fields', "'" + q.fields + "'"]);
  if (q.noFoundRows) args.push(['no_found_rows', 'true']);
  if (!q.updateMetaCache) args.push(['update_post_meta_cache', 'false']);
  if (!q.updateTermCache) args.push(['update_post_term_cache', 'false']);
  if (q.suppressFilters) args.push(['suppress_filters', 'true']);
  return args;
}

export function buildCode(q: WPQuery, mode: OutputMode): string {
  const v = '$' + (slugify(q.varName) || 'query');
  const args = alignBlock(buildArgs(q), '\t');
  const idsOnly = q.fields === 'ids' || q.fields === 'id=>parent';
  let loop = '';
  if (idsOnly) {
    loop = 'foreach ( ' + v + '->posts as $post_id ) {\n\t// ' + (q.fields === 'ids' ? 'Post ID' : 'ID => parent') + ' available as $post_id.\n}\n';
  } else {
    loop = 'if ( ' + v + "->have_posts() ) {\n\techo '<ul class=\"" + (slugify(q.fnPrefix) || 'mytheme') + "-list\">';\n\twhile ( " + v + '->have_posts() ) {\n\t\t' + v + "->the_post();\n\t\tprintf(\n\t\t\t'<li><a href=\"%s\">%s</a></li>',\n\t\t\tesc_url( get_permalink() ),\n\t\t\tesc_html( get_the_title() )\n\t\t);\n\t}\n\techo '</ul>';\n\twp_reset_postdata();\n} else {\n\techo '<p>' . esc_html__( 'Nothing found.', 'textdomain' ) . '</p>';\n}\n";
  }

  if (mode === 'pre_get_posts') {
    const fn = (slugify(q.fnPrefix) || 'mytheme') + '_adjust_main_query';
    const sets = buildArgs(q).filter((p) => p[0] !== 'paged').map((p) => "\t$query->set( '" + p[0] + "', " + p[1].replace(/\n\t\t\t/g, '\n\t\t').replace(/\n\t\t\)/, '\n\t)') + ' );').join('\n');
    return withCredit("/**\n * Adjust the main query instead of running a second one.\n */\nfunction " + fn + "( $query ) {\n\tif ( is_admin() || ! $query->is_main_query() ) {\n\t\treturn;\n\t}\n\n" + sets + "\n}\nadd_action( 'pre_get_posts', '" + fn + "' );\n");
  }

  if (mode === 'shortcode') {
    const tag = slugify(q.shortcodeTag) || 'recent_posts';
    const fn = (slugify(q.fnPrefix) || 'mytheme') + '_' + tag + '_shortcode';
    return withCredit("/**\n * [" + tag + "] — renders the query below.\n */\nfunction " + fn + "() {\n\t$args = array(\n" + args.replace(/^\t/gm, '\t\t') + '\n\t);\n\n\t' + v + ' = new WP_Query( $args );\n\n\tob_start();\n' + loop.replace(/^/gm, '\t') + "\n\treturn ob_get_clean();\n}\nadd_shortcode( '" + tag + "', '" + fn + "' );\n");
  }

  return withCredit('$args = array(\n' + args + '\n);\n\n' + v + ' = new WP_Query( $args );\n\n' + loop);
}

export function validate(q: WPQuery): ValidationIssue[] {
  const out: ValidationIssue[] = [];
  const add = (severity: ValidationIssue['severity'], message: string, fix?: string, fixLabel?: string) => out.push({ severity, message, fix, fixLabel });
  const per = parseInt(q.perPage, 10);
  if (!effectiveTypes(q).length) add('warning', 'No post type set — WordPress falls back to "post" only.');
  if (effectiveTypes(q).indexOf('any') !== -1 && effectiveTypes(q).length > 1) add('warning', '"any" already covers every public type; listing others alongside it has no effect.');
  if (q.perPage === '-1') add('warning', 'posts_per_page = -1 loads every matching row into memory. Set a real ceiling unless you know the table is small.', 'cap100', 'Set 100');
  else if (isNaN(per)) add('error', 'Posts per page must be a number (or -1 for unlimited).');
  else if (per > 100) add('recommendation', per + ' posts per page is a heavy page render — consider pagination instead.');
  if (q.orderby === 'rand') add('warning', 'orderby "rand" cannot use the query cache and gets slower as the table grows.');
  if ((q.orderby === 'meta_value' || q.orderby === 'meta_value_num') && !q.orderbyMetaKey) add('error', 'Ordering by meta value needs a meta key.');
  if (q.orderby === 'meta_value' && q.orderbyMetaKey) add('recommendation', 'meta_value sorts as text — "10" lands before "9". Use meta_value_num for numbers.');
  if (q.orderby === 'relevance' && !q.search) add('warning', 'orderby "relevance" only means something with a search term.');
  if (q.orderby === 'post__in' && !csv(q.include).length) add('warning', 'orderby "post__in" needs post__in to be set.');
  if (csv(q.include).length && q.orderby !== 'post__in') add('recommendation', 'With post__in set, orderby "post__in" preserves the order you listed.');
  if (q.paged && q.noFoundRows) add('error', 'Pagination needs the found-rows count — no_found_rows must be off when paged is on.', 'unsetNoFoundRows', 'Turn off no_found_rows');
  if (!q.paged && !q.noFoundRows && !q.offset) add('recommendation', 'Not paginating? no_found_rows skips a SQL_CALC_FOUND_ROWS pass on every request.', 'setNoFoundRows', 'Turn on no_found_rows');
  if (q.offset && q.paged) add('warning', 'offset breaks WordPress pagination — the two should not be combined.');
  q.metaClauses.forEach((c, i) => {
    if (!c.key) add('error', 'Meta clause ' + (i + 1) + ' has no key.');
    if (NUMERIC_COMPARES.indexOf(c.compare) !== -1 && c.type === 'CHAR') add('warning', 'Meta clause ' + (i + 1) + ' compares with ' + c.compare + ' but casts to CHAR — "9" > "10" as text. Switch the type to NUMERIC.');
    if ((c.compare === 'LIKE' || c.compare === 'NOT LIKE') && c.value && c.value.length < 3) add('recommendation', 'Short LIKE values scan the whole postmeta table.');
  });
  if (q.metaClauses.filter((c) => c.key).length > 2) add('recommendation', 'Three or more meta clauses means three or more JOINs. Consider a taxonomy for filterable values.');
  q.taxClauses.forEach((c, i) => {
    if (!c.taxonomy) add('error', 'Taxonomy clause ' + (i + 1) + ' has no taxonomy.');
    else if (!csv(c.terms).length && NO_VALUE_COMPARES.indexOf(c.operator) === -1) add('error', 'Taxonomy clause ' + (i + 1) + ' has no terms.');
    if (c.field === 'name') add('recommendation', 'Taxonomy clause ' + (i + 1) + ' matches on "name" — slug or term_id is safer, names are not unique.');
  });
  if (q.suppressFilters) add('warning', 'suppress_filters skips every plugin filter on the query. Only get_posts() sets it by default; leave it off in a WP_Query.');
  if (q.search && q.suppressFilters) add('warning', 'Search relies on filters that suppress_filters removes.');
  if (!q.updateMetaCache && q.fields === '') add('recommendation', 'Meta cache is off — every get_post_meta() in the loop becomes its own query.');
  if (q.fields === 'ids' && (!q.updateMetaCache || !q.updateTermCache)) add('recommendation', 'fields=ids already skips the object caches; the cache flags are redundant here.');
  return out;
}

export function applyFix(q: WPQuery, kind: string): WPQuery {
  const p: WPQuery = JSON.parse(JSON.stringify(q));
  if (kind === 'cap100') p.perPage = '100';
  if (kind === 'unsetNoFoundRows') p.noFoundRows = false;
  if (kind === 'setNoFoundRows') p.noFoundRows = true;
  return p;
}

export interface CostProfile {
  pct: number;
  label: string;
  color: string;
  note: string;
}

export function costProfile(q: WPQuery): CostProfile {
  let cost = 1;
  if (q.perPage === '-1') cost += 3;
  else if ((parseInt(q.perPage, 10) || 10) > 50) cost += 1;
  cost += q.metaClauses.filter((c) => c.key).length;
  cost += q.taxClauses.filter((c) => c.taxonomy).length * 0.5;
  if (q.orderby === 'rand') cost += 2;
  if (q.search) cost += 1;
  if (q.noFoundRows) cost -= 0.5;
  if (q.fields === 'ids') cost -= 0.5;
  const pct = Math.max(8, Math.min(100, Math.round((cost / 8) * 100)));
  const label = cost <= 2 ? 'Light' : cost <= 4 ? 'Moderate' : cost <= 6 ? 'Heavy' : 'Very heavy';
  const color = cost <= 2 ? '#1F7A4C' : cost <= 4 ? '#3B6FB0' : cost <= 6 ? '#B45309' : '#B91C1C';
  const notes: Record<string, string> = {
    Light: 'Indexed columns only. Safe to run on every page load.',
    Moderate: 'A JOIN or two. Fine for a template, cache it if it runs site-wide.',
    Heavy: 'Several JOINs or an unbounded result set — measure it with Query Monitor.',
    'Very heavy': 'This will show up in your slow query log. Cache the result or denormalise the filter into a taxonomy.',
  };
  return { pct, label, color, note: notes[label] };
}

export interface SummaryRow {
  key: string;
  value: string;
}

export function summarySentence(q: WPQuery): string {
  const types = effectiveTypes(q);
  const typeLabel = types.length ? (types.length === 1 ? types[0] : types.slice(0, -1).join(', ') + ' and ' + types[types.length - 1]) : 'post';
  const taxes = q.taxClauses.filter((c) => c.taxonomy);
  const metas = q.metaClauses.filter((c) => c.key);
  return 'Returns ' + (q.perPage === '-1' ? 'every' : 'up to ' + (parseInt(q.perPage, 10) || 10)) + ' ' + typeLabel + ' item' + (q.perPage === '1' ? '' : 's') +
    (q.statuses.length ? ' with status ' + q.statuses.join(' or ') : '') +
    (taxes.length ? ', filtered by ' + taxes.map((c) => c.taxonomy).join(' ' + q.taxRelation.toLowerCase() + ' ') : '') +
    (metas.length ? ', matching meta ' + metas.map((c) => c.key).join(' ' + q.metaRelation.toLowerCase() + ' ') : '') +
    (q.search ? ', searching for "' + q.search + '"' : '') +
    ', ordered by ' + q.orderby + ' ' + q.order.toLowerCase() + (q.paged ? ', paginated.' : '.');
}

export function summaryRows(q: WPQuery): SummaryRow[] {
  const types = effectiveTypes(q);
  const taxes = q.taxClauses.filter((c) => c.taxonomy);
  const metas = q.metaClauses.filter((c) => c.key);
  return [
    { key: 'post_type', value: types.length ? types.join(', ') : 'post (default)' },
    { key: 'post_status', value: q.statuses.length ? q.statuses.join(', ') : 'publish (default)' },
    { key: 'per page', value: q.perPage === '-1' ? 'unlimited' : String(parseInt(q.perPage, 10) || 10) + (q.paged ? ' · paginated' : '') },
    { key: 'orderby', value: q.orderby + ' ' + q.order + ((q.orderby === 'meta_value' || q.orderby === 'meta_value_num') && q.orderbyMetaKey ? ' (' + q.orderbyMetaKey + ')' : '') },
    { key: 'tax_query', value: taxes.length ? taxes.map((c) => c.taxonomy + ' ' + c.operator + ' ' + (csv(c.terms).join('/') || '—')).join('  ·  ') : 'none' },
    { key: 'meta_query', value: metas.length ? metas.map((c) => c.key + ' ' + c.compare + ' ' + (c.value || '—')).join('  ·  ') : 'none' },
    { key: 'date_query', value: (q.dateAfter || q.dateBefore) ? [q.dateAfter ? 'after ' + q.dateAfter : '', q.dateBefore ? 'before ' + q.dateBefore : ''].filter(Boolean).join(', ') : 'none' },
    { key: 'caches', value: [q.noFoundRows ? 'no_found_rows' : '', !q.updateMetaCache ? 'meta cache off' : '', !q.updateTermCache ? 'term cache off' : ''].filter(Boolean).join(', ') || 'defaults' },
  ];
}

export const OUTPUT_HINTS: Record<OutputMode, string> = {
  loop: 'A secondary query — the usual choice inside a template or shortcode.',
  pre_get_posts: 'Modifies the main query instead of running a second one. Faster, and archives keep working.',
  shortcode: 'The same query wrapped in a shortcode with output buffering.',
};

export function fileNameFor(q: WPQuery, mode: OutputMode): string {
  if (mode === 'shortcode') return (slugify(q.shortcodeTag) || 'shortcode').replace(/_/g, '-') + '.php';
  if (mode === 'pre_get_posts') return 'pre-get-posts.php';
  return 'wp-query.php';
}
