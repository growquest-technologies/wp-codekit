import { escPhp, withCredit, type ValidationIssue } from '../lib/codegen';

export type OutputMode = 'query' | 'args' | 'pre';

export interface TaxClause {
  taxonomy: string;
  field: 'term_id' | 'slug' | 'name' | 'term_taxonomy_id';
  operator: 'IN' | 'NOT IN' | 'AND' | 'EXISTS' | 'NOT EXISTS';
  terms: string;
  includeChildren: boolean;
}

export interface TaxQuery {
  postType: string;
  perPage: string;
  orderby: string;
  fields: 'all' | 'ids';
  relation: 'AND' | 'OR';
  noFoundRows: boolean;
  skipMetaCache: boolean;
  clauses: TaxClause[];
}

export const FIELDS: [string, string][] = [
  ['term_id', 'term_id — numbers'],
  ['slug', 'slug — url names'],
  ['name', 'name — display names'],
  ['term_taxonomy_id', 'term_taxonomy_id'],
];
export const OPERATORS: [string, string][] = [
  ['IN', 'IN — any of'],
  ['NOT IN', 'NOT IN — none of'],
  ['AND', 'AND — all of'],
  ['EXISTS', 'EXISTS'],
  ['NOT EXISTS', 'NOT EXISTS'],
];
export const HIERARCHICAL = ['category', 'product_cat'];

/** This tool's source slugifies with dashes (not underscores like the shared helper). */
function slugify(s: string): string {
  return String(s || '').toLowerCase().trim().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
}

function indent(text: string, depth: number): string {
  const p = new Array(depth + 1).join('\t');
  return text.split('\n').map((l) => (l ? p + l : '')).join('\n');
}

function padTo(s: string, w: number): string {
  return s + new Array(Math.max(0, w - s.length) + 1).join(' ');
}

function aligned(pairs: [string, string][]): string {
  const w = pairs.reduce((m, p) => Math.max(m, p[0].length), 0);
  return pairs.map((p) => padTo("'" + p[0] + "'", w + 2) + ' => ' + p[1] + ',').join('\n');
}

function termList(str: string): string[] {
  return String(str || '').split(',').map((t) => t.trim()).filter(Boolean);
}

function termLiteral(terms: string[], field: string): string {
  const numeric = field === 'term_id' || field === 'term_taxonomy_id';
  const items = terms.map((t) => (numeric && /^\d+$/.test(t) ? t : "'" + escPhp(t) + "'"));
  if (items.length === 1) return items[0];
  return 'array( ' + items.join(', ') + ' )';
}

export function needsTerms(op: string): boolean {
  return op !== 'EXISTS' && op !== 'NOT EXISTS';
}

export function buildTaxQuery(tq: TaxQuery): string | null {
  const clauses = (tq.clauses || []).map((c) => {
    const pairs: [string, string][] = [['taxonomy', "'" + escPhp(slugify(c.taxonomy) || 'category') + "'"], ['field', "'" + c.field + "'"]];
    if (needsTerms(c.operator)) pairs.push(['terms', termLiteral(termList(c.terms), c.field)]);
    if (c.operator !== 'IN') pairs.push(['operator', "'" + c.operator + "'"]);
    if (!c.includeChildren) pairs.push(['include_children', 'false']);
    return 'array(\n' + indent(aligned(pairs), 1) + '\n),';
  });
  if (!clauses.length) return null;
  let inner = '';
  if (clauses.length > 1) inner += "'relation' => '" + tq.relation + "',\n";
  inner += clauses.join('\n');
  return 'array(\n' + indent(inner, 1) + '\n)';
}

export function buildArgs(tq: TaxQuery): string {
  const pairs: [string, string][] = [['post_type', "'" + escPhp(slugify(tq.postType) || 'post') + "'"]];
  const per = parseInt(tq.perPage, 10);
  pairs.push(['posts_per_page', isNaN(per) ? '10' : String(per)]);
  if (tq.orderby !== 'date') pairs.push(['orderby', "'" + tq.orderby + "'"]);
  if (tq.fields === 'ids') pairs.push(['fields', "'ids'"]);
  if (tq.noFoundRows) pairs.push(['no_found_rows', 'true']);
  if (tq.skipMetaCache) pairs.push(['update_post_meta_cache', 'false']);
  const tax = buildTaxQuery(tq);
  if (tax) pairs.push(['tax_query', tax]);
  return 'array(\n' + indent(aligned(pairs), 1) + '\n)';
}

export function buildCode(tq: TaxQuery, mode: OutputMode): string {
  const args = buildArgs(tq);
  let out = '';
  if (mode === 'args') {
    out += '$args = ' + args + ';\n';
    return withCredit(out);
  }
  if (mode === 'pre') {
    const tax = buildTaxQuery(tq);
    out += '/**\n * Narrow the main query by taxonomy.\n *\n * @param WP_Query $query The query, by reference.\n */\nfunction mytheme_filter_archive( $query ) {\n\tif ( is_admin() || ! $query->is_main_query() ) {\n\t\treturn;\n\t}\n\n\tif ( ! $query->is_post_type_archive( \'' + escPhp(slugify(tq.postType) || 'post') + '\' ) ) {\n\t\treturn;\n\t}\n\n\t$query->set(\n\t\t\'tax_query\',\n' + indent(tax || 'array()', 2) + '\n\t);\n}\nadd_action( \'pre_get_posts\', \'mytheme_filter_archive\' );\n';
    return withCredit(out);
  }
  out += '$args = ' + args + ';\n\n$query = new WP_Query( $args );\n\n';
  if (tq.fields === 'ids') {
    out += 'foreach ( $query->posts as $post_id ) {\n\t// Work with the ID directly — no post objects were hydrated.\n}\n';
  } else {
    out += 'if ( $query->have_posts() ) {\n\techo \'<ul>\';\n\n\twhile ( $query->have_posts() ) {\n\t\t$query->the_post();\n\t\tprintf(\n\t\t\t\'<li><a href="%1$s">%2$s</a></li>\',\n\t\t\tesc_url( get_permalink() ),\n\t\t\tesc_html( get_the_title() )\n\t\t);\n\t}\n\n\techo \'</ul>\';\n\twp_reset_postdata();\n} else {\n\tesc_html_e( \'Nothing found.\', \'mytheme\' );\n}\n';
  }
  return withCredit(out);
}

export function validate(tq: TaxQuery): ValidationIssue[] {
  const out: ValidationIssue[] = [];
  const add = (severity: ValidationIssue['severity'], message: string, fix?: string, fixLabel?: string) => out.push({ severity, message, fix, fixLabel });
  const clauses = tq.clauses || [];
  if (!clauses.length) add('warning', 'No clauses, so this is just a plain query — nothing is filtered by taxonomy.');
  clauses.forEach((c, i) => {
    const label = 'Clause ' + (i + 1);
    const terms = termList(c.terms);
    if (!String(c.taxonomy || '').trim()) add('error', label + ' has no taxonomy. WP_Tax_Query silently drops a clause it cannot resolve.');
    if (needsTerms(c.operator) && !terms.length) add('error', label + ' has no terms, so the clause is dropped and the query returns everything.');
    if (!needsTerms(c.operator) && terms.length) add('warning', label + ' uses ' + c.operator + ', which ignores the terms you listed. Only the taxonomy matters.');
    const numericField = c.field === 'term_id' || c.field === 'term_taxonomy_id';
    const allNumeric = terms.length > 0 && terms.every((t) => /^\d+$/.test(t));
    if (numericField && terms.length && !allNumeric) add('error', label + ' asks to match on ' + c.field + ' but "' + terms.filter((t) => !/^\d+$/.test(t))[0] + '" is not a number. Switch the field to slug.', 'fieldToSlug', 'Match on slug');
    if (!numericField && allNumeric && c.field === 'slug') add('warning', label + ' matches on slug but every term you listed is numeric. If those are IDs, term_id is what you want.', 'fieldToId', 'Match on term_id');
    if (c.operator === 'AND' && terms.length === 1) add('recommendation', label + ' uses AND with a single term, which behaves identically to IN and reads as though something is missing.');
    if (c.includeChildren && HIERARCHICAL.indexOf(slugify(c.taxonomy)) === -1) add('recommendation', label + ' sets include_children on "' + (c.taxonomy || 'a taxonomy') + '". It only does something for hierarchical taxonomies — harmless, but noise on tags.');
    if (!c.includeChildren && HIERARCHICAL.indexOf(slugify(c.taxonomy)) >= 0) add('recommendation', label + ' turns off include_children on a hierarchical taxonomy, so posts in child categories will not match. Deliberate, or a surprise later?');
    if (c.operator === 'NOT IN' && c.includeChildren) add('recommendation', label + ' excludes a hierarchical term and its children together. Usually right — worth knowing it is happening.');
  });
  if (clauses.length > 1 && tq.relation === 'AND') add('recommendation', clauses.length + ' clauses with AND means ' + clauses.length + ' JOINs and every condition must match. Check that a post can actually satisfy all of them.');
  if (clauses.length === 1 && tq.relation === 'OR') add('recommendation', 'relation is ignored with a single clause.');
  if (clauses.length > 3) add('warning', clauses.length + ' clauses is a lot of JOINs against wp_term_relationships. On a large site, measure it before shipping.');
  const per = parseInt(tq.perPage, 10);
  if (per === -1) add('warning', 'posts_per_page of -1 loads every matching row into memory. Fine with ten posts, fatal with ten thousand.', 'setHundred', 'Cap at 100');
  if (!tq.noFoundRows && tq.fields === 'ids') add('recommendation', 'You are only fetching IDs but WordPress is still counting total rows for pagination. no_found_rows saves that second query.', 'addNoFoundRows', 'Set no_found_rows');
  if (tq.orderby === 'rand') add('recommendation', 'ORDER BY RAND() cannot use an index and gets slower as the table grows. Cache the result or shuffle in PHP.');
  if (clauses.length === 1 && needsTerms(clauses[0] && clauses[0].operator) && slugify(clauses[0] && clauses[0].taxonomy) === 'category' && clauses[0].field === 'term_id') add('recommendation', 'A single category clause on term_id is what category__in does in one line.');
  return out;
}

export function freshProject(): TaxQuery {
  return {
    postType: 'post', perPage: '12', orderby: 'date', fields: 'all',
    relation: 'AND', noFoundRows: false, skipMetaCache: false,
    clauses: [
      { taxonomy: 'category', field: 'slug', operator: 'IN', terms: 'guides, tutorials', includeChildren: true },
      { taxonomy: 'post_tag', field: 'slug', operator: 'NOT IN', terms: 'archived', includeChildren: true },
    ],
  };
}

export function applyFix(tq: TaxQuery, kind: string): TaxQuery {
  const p: TaxQuery = JSON.parse(JSON.stringify(tq));
  if (kind === 'fieldToSlug') p.clauses.forEach((c) => { const terms = termList(c.terms); if ((c.field === 'term_id' || c.field === 'term_taxonomy_id') && terms.some((t) => !/^\d+$/.test(t))) c.field = 'slug'; });
  if (kind === 'fieldToId') p.clauses.forEach((c) => { const terms = termList(c.terms); if (c.field === 'slug' && terms.length && terms.every((t) => /^\d+$/.test(t))) c.field = 'term_id'; });
  if (kind === 'setHundred') p.perPage = '100';
  if (kind === 'addNoFoundRows') p.noFoundRows = true;
  return p;
}

export function plainEnglish(tq: TaxQuery): string {
  const clauses = tq.clauses || [];
  const phrase = clauses.map((c) => {
    const terms = termList(c.terms);
    const tax = slugify(c.taxonomy) || 'category';
    if (!needsTerms(c.operator)) return (c.operator === 'EXISTS' ? 'has any ' : 'has no ') + tax + ' term';
    const list = terms.length ? terms.join(', ') : '(no terms)';
    if (c.operator === 'NOT IN') return 'is not in ' + tax + ' ' + list;
    if (c.operator === 'AND') return 'is in every one of ' + tax + ' ' + list;
    return 'is in ' + tax + ' ' + list;
  });
  return clauses.length
    ? 'Find ' + (slugify(tq.postType) || 'post') + ' entries where the post ' + phrase.join(tq.relation === 'AND' ? ', and ' : ', or ') + '. Newest first, ' + (parseInt(tq.perPage, 10) === -1 ? 'with no limit' : (parseInt(tq.perPage, 10) || 10) + ' per page') + '.'
    : 'Find ' + (slugify(tq.postType) || 'post') + ' entries with no taxonomy filter at all.';
}

export const OUTPUT_HINTS: Record<OutputMode, string> = {
  query: 'A secondary query with its own loop and wp_reset_postdata().',
  args: 'Just the args, for get_posts() or your own WP_Query.',
  pre: 'Filters the main query instead of running a second one — the cheaper choice on an archive.',
};

export function fileNameFor(tq: TaxQuery): string {
  return (slugify(tq.postType) || 'post') + '-tax-query.php';
}

export interface RefArg {
  name: string;
  type: string;
  description: string;
}

export const REF_ARGS: RefArg[] = [
  { name: 'taxonomy', type: 'string', description: 'The taxonomy slug — category, post_tag, product_cat or your own. Wrong slug, silently dropped clause.' },
  { name: 'field', type: 'string', description: 'What your terms are: term_id, slug, name or term_taxonomy_id. Mismatching this with your values is the most common tax_query bug.' },
  { name: 'terms', type: 'int|string|array', description: 'One value or a list. Must be the type the field expects.' },
  { name: 'operator', type: 'string', description: 'IN matches any, NOT IN excludes, AND requires every term, EXISTS and NOT EXISTS ignore terms entirely.' },
  { name: 'include_children', type: 'bool', description: 'Hierarchical taxonomies only. Defaults to true, which is why a parent category query returns child posts too.' },
  { name: 'relation', type: 'string', description: 'AND or OR between clauses. Ignored when there is only one.' },
];

export const REF_NESTING = "'tax_query' => array(\n\t'relation' => 'AND',\n\tarray(\n\t\t'taxonomy' => 'category',\n\t\t'field'    => 'slug',\n\t\t'terms'    => 'guides',\n\t),\n\tarray(\n\t\t'relation' => 'OR',\n\t\tarray( /* clause */ ),\n\t\tarray( /* clause */ ),\n\t),\n)";
