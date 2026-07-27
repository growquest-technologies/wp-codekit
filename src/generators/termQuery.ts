import { escPhp, withCredit, type ValidationIssue } from '../lib/codegen';

export type OutputMode = 'query' | 'dropdown' | 'args';

export interface TermMetaClause {
  key: string;
  compare: string;
  value: string;
}

export interface TermQuery {
  taxonomy: string;
  parent: string;
  childOf: string;
  search: string;
  searchSlug: boolean;
  include: string;
  exclude: string;
  excludeTree: boolean;
  orderby: string;
  order: 'ASC' | 'DESC';
  number: string;
  fields: 'all' | 'ids' | 'names' | 'slugs' | 'id=>name' | 'count';
  hideEmpty: boolean;
  padCounts: boolean;
  updateCache: boolean;
  meta: TermMetaClause[];
}

export const ORDERBYS: [string, string][] = [
  ['name', 'name'], ['slug', 'slug'], ['count', 'count'], ['term_order', 'term_order'],
  ['term_id', 'term_id'], ['include', 'include — your order'], ['meta_value_num', 'meta_value_num'], ['none', 'none'],
];
export const COMPARES: [string, string][] = [['=', '='], ['!=', '!='], ['>=', '>='], ['<=', '<='], ['LIKE', 'LIKE'], ['EXISTS', 'EXISTS'], ['NOT EXISTS', 'NOT EXISTS']];
export const HIERARCHICAL = ['category', 'product_cat'];

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

export function idList(str: string): string[] {
  return String(str || '').split(',').map((v) => v.trim()).filter(Boolean);
}

export function valueList(str: string): string[] {
  return String(str || '').split(',').map((v) => v.trim()).filter((v) => v !== '');
}

export function buildArgs(tq: TermQuery): string {
  const pairs: [string, string][] = [['taxonomy', "'" + escPhp(slugify(tq.taxonomy) || 'category') + "'"], ['hide_empty', tq.hideEmpty ? 'true' : 'false']];
  if (String(tq.parent || '').trim() !== '') pairs.push(['parent', String(parseInt(tq.parent, 10) || 0)]);
  if (String(tq.childOf || '').trim() !== '') pairs.push(['child_of', String(parseInt(tq.childOf, 10) || 0)]);
  if (String(tq.search || '').trim()) pairs.push([tq.searchSlug ? 'slug' : 'search', "'" + escPhp(String(tq.search).trim()) + "'"]);
  const inc = idList(tq.include), exc = idList(tq.exclude);
  if (inc.length) pairs.push(['include', 'array( ' + inc.join(', ') + ' )']);
  if (exc.length) pairs.push([tq.excludeTree ? 'exclude_tree' : 'exclude', 'array( ' + exc.join(', ') + ' )']);
  const metas = (tq.meta || []).filter((m) => String(m.key || '').trim());
  if (metas.length) {
    const clauses = metas.map((m) => {
      const p: [string, string][] = [['key', "'" + escPhp(String(m.key).trim()) + "'"]];
      if (m.compare !== 'EXISTS' && m.compare !== 'NOT EXISTS') p.push(['value', "'" + escPhp(valueList(m.value)[0] || '') + "'"]);
      if (m.compare !== '=') p.push(['compare', "'" + m.compare + "'"]);
      return 'array(\n' + indent(aligned(p), 1) + '\n),';
    });
    pairs.push(['meta_query', 'array(\n' + indent(clauses.join('\n'), 1) + '\n)']);
  }
  if (tq.orderby === 'meta_value_num' && metas.length) pairs.push(['meta_key', "'" + escPhp(String(metas[0].key).trim()) + "'"]);
  pairs.push(['orderby', "'" + tq.orderby + "'"]);
  if (tq.order !== 'ASC') pairs.push(['order', "'" + tq.order + "'"]);
  const num = parseInt(tq.number, 10);
  if (num) pairs.push(['number', String(num)]);
  if (tq.fields !== 'all') pairs.push(['fields', "'" + tq.fields + "'"]);
  if (tq.padCounts) pairs.push(['pad_counts', 'true']);
  if (!tq.updateCache) pairs.push(['update_term_meta_cache', 'false']);
  return 'array(\n' + indent(aligned(pairs), 1) + '\n)';
}

export function buildCode(tq: TermQuery, mode: OutputMode): string {
  const args = buildArgs(tq);
  let out = '';
  if (mode === 'args') return withCredit(out + '$args = ' + args + ';\n');
  if (mode === 'dropdown') {
    return withCredit(out + '$terms = get_terms( ' + indent(args, 0) + ' );\n\nif ( ! is_wp_error( $terms ) && $terms ) {\n\techo \'<select name="' + escPhp(slugify(tq.taxonomy) || 'category') + '">\';\n\techo \'<option value="">\' . esc_html__( \'All\', \'mytheme\' ) . \'</option>\';\n\n\tforeach ( $terms as $term ) {\n\t\tprintf(\n\t\t\t\'<option value="%1$s">%2$s (%3$s)</option>\',\n\t\t\tesc_attr( $term->slug ),\n\t\t\tesc_html( $term->name ),\n\t\t\tesc_html( number_format_i18n( $term->count ) )\n\t\t);\n\t}\n\n\techo \'</select>\';\n}\n');
  }
  out += '$query = new WP_Term_Query( ' + indent(args, 0) + ' );\n\n$terms = $query->get_terms();\n\n';
  if (tq.fields === 'count') {
    out += 'printf(\n\t\'<p>%s</p>\',\n\tesc_html( number_format_i18n( (int) $terms ) )\n);\n';
  } else if (tq.fields === 'all') {
    out += 'if ( $terms ) {\n\techo \'<ul>\';\n\n\tforeach ( $terms as $term ) {\n\t\tprintf(\n\t\t\t\'<li><a href="%1$s">%2$s</a> <span>%3$s</span></li>\',\n\t\t\tesc_url( get_term_link( $term ) ),\n\t\t\tesc_html( $term->name ),\n\t\t\tesc_html( number_format_i18n( $term->count ) )\n\t\t);\n\t}\n\n\techo \'</ul>\';\n}\n';
  } else {
    out += 'foreach ( $terms as $term ) {\n\t// Each $term is a single ' + tq.fields + ' value.\n\techo \'<li>\' . esc_html( $term ) . \'</li>\';\n}\n';
  }
  return withCredit(out);
}

export function validate(tq: TermQuery): ValidationIssue[] {
  const out: ValidationIssue[] = [];
  const add = (severity: ValidationIssue['severity'], message: string, fix?: string, fixLabel?: string) => out.push({ severity, message, fix, fixLabel });
  const tax = slugify(tq.taxonomy);
  const inc = idList(tq.include), exc = idList(tq.exclude);
  const metas = (tq.meta || []).filter((m) => String(m.key || '').trim());
  if (!tax) add('error', 'A taxonomy is required, or WP_Term_Query returns terms from every taxonomy at once.');
  if (inc.some((v) => !/^\d+$/.test(v))) add('error', 'include takes term IDs. "' + inc.filter((v) => !/^\d+$/.test(v))[0] + '" is not one — use the slug argument for slugs.');
  if (exc.some((v) => !/^\d+$/.test(v))) add('error', 'exclude takes term IDs, not slugs.');
  if (inc.length && exc.length) add('warning', 'include and exclude together: exclude is ignored whenever include is set.', 'dropExclude', 'Drop exclude');
  if (inc.length && String(tq.parent || '').trim() !== '') add('warning', 'include and parent both set. include wins and the parent filter does nothing.');
  if (tq.hideEmpty && HIERARCHICAL.indexOf(tax) >= 0 && !tq.padCounts) add('warning', 'hide_empty on a hierarchical taxonomy drops parents whose posts all live in child terms — a menu that loses its top level. pad_counts fixes it.', 'addPad', 'Add pad_counts');
  if (tq.padCounts && !tq.hideEmpty) add('recommendation', 'pad_counts rolls child counts into the parent. Useful for display even with hide_empty off, but it costs an extra pass over the tree.');
  if (String(tq.childOf || '').trim() !== '' && String(tq.parent || '').trim() !== '') add('warning', 'child_of and parent do different things: parent is direct children only, child_of is the whole subtree. Setting both is usually a mistake.', 'dropParent', 'Keep child_of');
  if (String(tq.childOf || '').trim() !== '' && HIERARCHICAL.indexOf(tax) === -1 && tax) add('error', 'child_of only works on a hierarchical taxonomy. On "' + tax + '" it will return nothing.');
  if (tq.orderby === 'include' && !inc.length) add('error', 'orderby include needs an include list to order by.');
  if (tq.orderby === 'meta_value_num' && !metas.length) add('error', 'Ordering by meta_value_num needs a term meta clause to take the key from.');
  if (tq.orderby === 'term_order') add('recommendation', 'term_order is only meaningful for taxonomies that maintain it — mostly WooCommerce attributes. Elsewhere it silently falls back.');
  if (tq.orderby === 'count' && tq.order === 'ASC') add('recommendation', 'Ordering by count ascending puts the emptiest terms first. Usually you want DESC.', 'orderDesc', 'Sort DESC');
  if (tq.fields === 'count' && parseInt(tq.number, 10)) add('warning', 'fields count returns a single number; number limits the rows counted, which makes that number wrong.', 'clearNumber', 'Clear number');
  if (tq.fields === 'count' && tq.orderby !== 'none') add('recommendation', 'Ordering is pointless when you are only asking for a count — orderby none skips the sort.');
  metas.forEach((m, i) => {
    const label = 'Meta clause ' + (i + 1);
    if (m.compare !== 'EXISTS' && m.compare !== 'NOT EXISTS' && !valueList(m.value).length) add('error', label + ' has no value.');
    if (valueList(m.value).length > 1) add('warning', label + ' has several values but this builder emits a single-value clause. Use IN in a hand-written meta_query if you need a list.');
  });
  if (!tq.updateCache && metas.length) add('warning', 'You are filtering on term meta but skipping the term meta cache, so every get_term_meta() call in your loop hits the database again.', 'addCache', 'Keep the cache');
  const num = parseInt(tq.number, 10);
  if (!num && tq.fields === 'all' && !tq.hideEmpty) add('recommendation', 'No number and hide_empty false returns every term in the taxonomy. On a site with thousands of tags that is a heavy page.');
  if (num > 0 && tq.orderby === 'none') add('recommendation', 'A limit with no ordering returns an arbitrary slice — whichever rows MySQL hands back first.');
  return out;
}

export function freshProject(): TermQuery {
  return {
    taxonomy: 'category', parent: '', childOf: '', search: '', searchSlug: false,
    include: '', exclude: '1', excludeTree: false,
    orderby: 'count', order: 'DESC', number: '10', fields: 'all',
    hideEmpty: true, padCounts: true, updateCache: true,
    meta: [],
  };
}

export function applyFix(tq: TermQuery, kind: string): TermQuery {
  const p: TermQuery = JSON.parse(JSON.stringify(tq));
  if (kind === 'dropExclude') p.exclude = '';
  if (kind === 'addPad') p.padCounts = true;
  if (kind === 'dropParent') p.parent = '';
  if (kind === 'orderDesc') p.order = 'DESC';
  if (kind === 'clearNumber') p.number = '';
  if (kind === 'addCache') p.updateCache = true;
  return p;
}

export function hierarchyNote(tq: TermQuery): string {
  if (String(tq.childOf || '').trim() !== '') return 'child_of ' + tq.childOf + ' returns the whole subtree below that term, at every depth.';
  if (String(tq.parent || '').trim() !== '') return 'parent ' + (parseInt(tq.parent, 10) || 0) + (parseInt(tq.parent, 10) === 0 ? ' returns top-level terms only.' : ' returns that term\'s direct children only.');
  return 'No hierarchy filter — every term at every depth, flat.';
}

export function plainEnglish(tq: TermQuery): string {
  const tax = slugify(tq.taxonomy) || 'category';
  const inc = idList(tq.include), exc = idList(tq.exclude);
  const metas = (tq.meta || []).filter((m) => String(m.key || '').trim());
  const bits: string[] = [];
  if (tq.hideEmpty) bits.push('that have something attached');
  if (String(tq.parent || '').trim() !== '') bits.push(parseInt(tq.parent, 10) === 0 ? 'at the top level' : 'directly under term ' + parseInt(tq.parent, 10));
  if (String(tq.childOf || '').trim() !== '') bits.push('anywhere below term ' + parseInt(tq.childOf, 10));
  if (String(tq.search || '').trim()) bits.push(tq.searchSlug ? 'with the slug ' + String(tq.search).trim() : 'whose name contains "' + String(tq.search).trim() + '"');
  if (inc.length) bits.push('limited to ids ' + inc.join(', '));
  if (exc.length && !inc.length) bits.push('excluding ' + (tq.excludeTree ? 'the subtrees under ' : 'ids ') + exc.join(', '));
  metas.forEach((m) => bits.push('with ' + String(m.key).trim() + ' ' + m.compare + ' ' + (valueList(m.value)[0] || '—')));
  const num = parseInt(tq.number, 10);
  return 'List ' + tax + ' terms ' + (bits.length ? bits.join(', ') : 'with no filter') + '. Ordered by ' + tq.orderby + ' ' + tq.order + (num ? ', at most ' + num : ', all of them') + (tq.fields === 'all' ? '.' : ', returning ' + tq.fields + '.');
}

export const OUTPUT_HINTS: Record<OutputMode, string> = {
  query: 'The class with get_terms(), plus a list that links each term.',
  dropdown: 'get_terms() feeding a select — the shape a filter UI actually needs.',
  args: 'Just the args array.',
};

export function fileNameFor(tq: TermQuery): string {
  return (slugify(tq.taxonomy) || 'term') + '-query.php';
}

export interface RefArg {
  name: string;
  type: string;
  description: string;
}

export const REF_ARGS: RefArg[] = [
  { name: 'taxonomy', type: 'string|array', description: 'One or several taxonomies. Omit it and you get terms from all of them, which is almost never intended.' },
  { name: 'hide_empty', type: 'bool', description: 'Defaults to true. Drops terms with a count of zero — including hierarchical parents whose posts live in children.' },
  { name: 'parent vs child_of', type: 'int', description: 'parent is direct children only. child_of is the entire subtree. Setting both is contradictory.' },
  { name: 'include / exclude / exclude_tree', type: 'array', description: 'Term IDs, never slugs. include silently overrides exclude and parent.' },
  { name: 'number / offset', type: 'int', description: 'number 0 means no limit. With orderby none a limit gives you an arbitrary slice.' },
  { name: 'fields', type: 'string', description: 'all, ids, names, slugs, id=>name, id=>slug or count. count returns a single integer, not a list.' },
  { name: 'pad_counts', type: 'bool', description: 'Adds descendant counts to each parent. The fix for hierarchical menus losing their top level.' },
  { name: 'meta_query', type: 'array', description: 'Term meta clauses, same shape as posts. One JOIN on wp_termmeta per clause.' },
];
