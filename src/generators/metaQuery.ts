import { escPhp, withCredit, type ValidationIssue } from '../lib/codegen';

export type OutputMode = 'query' | 'args' | 'pre';

export interface MetaClause {
  key: string;
  compare: string;
  value: string;
  type: string;
}

export interface MetaQuery {
  postType: string;
  perPage: string;
  orderby: string;
  order: 'DESC' | 'ASC';
  orderKey: string;
  relation: 'AND' | 'OR';
  noFoundRows: boolean;
  clauses: MetaClause[];
}

export const COMPARES: [string, string][] = [
  ['=', '= equals'], ['!=', '!= not equal'],
  ['>', '> greater'], ['>=', '>= or equal'], ['<', '< less'], ['<=', '<= or equal'],
  ['LIKE', 'LIKE contains'], ['NOT LIKE', 'NOT LIKE'],
  ['IN', 'IN — any of'], ['NOT IN', 'NOT IN'],
  ['BETWEEN', 'BETWEEN — two values'], ['NOT BETWEEN', 'NOT BETWEEN'],
  ['EXISTS', 'EXISTS'], ['NOT EXISTS', 'NOT EXISTS'],
];
export const TYPES: [string, string][] = [
  ['CHAR', 'CHAR — text'], ['NUMERIC', 'NUMERIC — integer'], ['DECIMAL(10,2)', 'DECIMAL — money'],
  ['DATE', 'DATE — Y-m-d'], ['DATETIME', 'DATETIME'], ['TIME', 'TIME'], ['BINARY', 'BINARY — exact case'],
];
export const NUMERIC_COMPARES = ['>', '>=', '<', '<=', 'BETWEEN', 'NOT BETWEEN'];
export const LIST_COMPARES = ['IN', 'NOT IN', 'BETWEEN', 'NOT BETWEEN'];
export const NO_VALUE = ['EXISTS', 'NOT EXISTS'];

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

function valueList(str: string): string[] {
  return String(str || '').split(',').map((v) => v.trim()).filter((v) => v !== '');
}

function isNum(v: string): boolean {
  return /^-?\d+(\.\d+)?$/.test(v);
}

function valueLiteral(c: MetaClause): string {
  const vals = valueList(c.value);
  const numericType = c.type === 'NUMERIC' || c.type.indexOf('DECIMAL') === 0;
  const lit = (v: string) => (numericType && isNum(v) ? v : "'" + escPhp(v) + "'");
  if (LIST_COMPARES.indexOf(c.compare) >= 0 || vals.length > 1) return 'array( ' + vals.map(lit).join(', ') + ' )';
  return vals.length ? lit(vals[0]) : "''";
}

export function buildMetaQuery(mq: MetaQuery): string | null {
  const clauses = (mq.clauses || []).map((c) => {
    const pairs: [string, string][] = [['key', "'" + escPhp(String(c.key || '').trim()) + "'"]];
    if (NO_VALUE.indexOf(c.compare) === -1) pairs.push(['value', valueLiteral(c)]);
    if (c.compare !== '=') pairs.push(['compare', "'" + c.compare + "'"]);
    if (c.type !== 'CHAR') pairs.push(['type', "'" + c.type + "'"]);
    return 'array(\n' + indent(aligned(pairs), 1) + '\n),';
  });
  if (!clauses.length) return null;
  let inner = '';
  if (clauses.length > 1) inner += "'relation' => '" + mq.relation + "',\n";
  inner += clauses.join('\n');
  return 'array(\n' + indent(inner, 1) + '\n)';
}

export function buildArgs(mq: MetaQuery): string {
  const pairs: [string, string][] = [['post_type', "'" + escPhp(slugify(mq.postType) || 'post') + "'"]];
  const per = parseInt(mq.perPage, 10);
  pairs.push(['posts_per_page', isNaN(per) ? '12' : String(per)]);
  if (mq.orderby !== 'date') pairs.push(['orderby', "'" + mq.orderby + "'"]);
  if (mq.order !== 'DESC') pairs.push(['order', "'" + mq.order + "'"]);
  if (mq.orderby === 'meta_value' || mq.orderby === 'meta_value_num') pairs.push(['meta_key', "'" + escPhp(String(mq.orderKey || '').trim()) + "'"]);
  if (mq.noFoundRows) pairs.push(['no_found_rows', 'true']);
  const meta = buildMetaQuery(mq);
  if (meta) pairs.push(['meta_query', meta]);
  return 'array(\n' + indent(aligned(pairs), 1) + '\n)';
}

export function buildCode(mq: MetaQuery, mode: OutputMode): string {
  const args = buildArgs(mq);
  let out = '';
  if (mode === 'args') return withCredit(out + '$args = ' + args + ';\n');
  if (mode === 'pre') {
    const meta = buildMetaQuery(mq);
    return withCredit(out + '/**\n * Filter the main query by meta.\n *\n * @param WP_Query $query The query, by reference.\n */\nfunction mytheme_filter_meta( $query ) {\n\tif ( is_admin() || ! $query->is_main_query() ) {\n\t\treturn;\n\t}\n\n\t$query->set(\n\t\t\'meta_query\',\n' + indent(meta || 'array()', 2) + '\n\t);\n}\nadd_action( \'pre_get_posts\', \'mytheme_filter_meta\' );\n');
  }
  out += '$args = ' + args + ';\n\n$query = new WP_Query( $args );\n\nif ( $query->have_posts() ) {\n\techo \'<ul>\';\n\n\twhile ( $query->have_posts() ) {\n\t\t$query->the_post();\n\t\tprintf(\n\t\t\t\'<li><a href="%1$s">%2$s</a> %3$s</li>\',\n\t\t\tesc_url( get_permalink() ),\n\t\t\tesc_html( get_the_title() ),\n\t\t\tesc_html( get_post_meta( get_the_ID(), \'' + escPhp(String((mq.clauses[0] && mq.clauses[0].key) || 'price').trim()) + '\', true ) )\n\t\t);\n\t}\n\n\techo \'</ul>\';\n\twp_reset_postdata();\n} else {\n\tesc_html_e( \'Nothing matched.\', \'mytheme\' );\n}\n';
  return withCredit(out);
}

export function validate(mq: MetaQuery): ValidationIssue[] {
  const out: ValidationIssue[] = [];
  const add = (severity: ValidationIssue['severity'], message: string, fix?: string, fixLabel?: string) => out.push({ severity, message, fix, fixLabel });
  const clauses = mq.clauses || [];
  if (!clauses.length) add('warning', 'No clauses, so nothing is filtered by meta.');
  clauses.forEach((c, i) => {
    const label = 'Clause ' + (i + 1);
    const vals = valueList(c.value);
    const numericType = c.type === 'NUMERIC' || c.type.indexOf('DECIMAL') === 0;
    if (!String(c.key || '').trim()) add('error', label + ' has no meta key. WP_Meta_Query needs one unless the clause only exists to order results.');
    if (NO_VALUE.indexOf(c.compare) === -1 && !vals.length) add('error', label + ' has no value, so the comparison matches nothing.');
    if (NO_VALUE.indexOf(c.compare) >= 0 && vals.length) add('warning', label + ' uses ' + c.compare + ', which ignores the value. Only the key is checked.');
    if ((c.compare === 'BETWEEN' || c.compare === 'NOT BETWEEN') && vals.length !== 2) add('error', label + ' uses ' + c.compare + ' with ' + vals.length + ' value' + (vals.length === 1 ? '' : 's') + '. It needs exactly two, comma separated.');
    if (NUMERIC_COMPARES.indexOf(c.compare) >= 0 && !numericType && c.type !== 'DATE' && c.type !== 'DATETIME' && c.type !== 'TIME') {
      add('error', label + ' compares with ' + c.compare + ' but the type is ' + c.type + ', so MySQL compares text: "9" comes out greater than "10".', 'castNumeric', 'Cast to NUMERIC');
    }
    if (numericType && vals.length && !vals.every(isNum)) add('warning', label + ' is cast to ' + c.type + ' but "' + vals.filter((v) => !isNum(v))[0] + '" is not a number — it will cast to 0.');
    if ((c.type === 'DATE' || c.type === 'DATETIME') && vals.length && !vals.every((v) => /^\d{4}-\d{2}-\d{2}/.test(v))) add('error', label + ' casts to ' + c.type + ', which needs values shaped Y-m-d. Anything else casts to NULL and matches nothing.');
    if ((c.compare === 'LIKE' || c.compare === 'NOT LIKE') && vals.length) add('recommendation', label + ' uses ' + c.compare + '. WordPress wraps the value in % wildcards for you, so a leading wildcard means MySQL cannot use an index — it scans every row with that key.');
    if (c.compare === '=' && vals.length > 1) add('warning', label + ' has ' + vals.length + ' values with a plain = comparison. Use IN if you mean any of them.', 'compareIn', 'Use IN');
    if (c.type === 'BINARY') add('recommendation', label + ' uses BINARY, which makes the comparison case sensitive. Rarely what you want unless you are matching a hash or a token.');
  });
  if (clauses.length > 1 && mq.relation === 'AND') add('recommendation', clauses.length + ' AND clauses means ' + clauses.length + ' JOINs against wp_postmeta. Two is normal, four is a query worth timing.');
  if (clauses.length === 1 && mq.relation === 'OR') add('recommendation', 'relation is ignored with a single clause.');
  if ((mq.orderby === 'meta_value' || mq.orderby === 'meta_value_num') && !String(mq.orderKey || '').trim()) add('error', 'Ordering by ' + mq.orderby + ' needs a meta_key. Without it WordPress has nothing to sort on and falls back to the post date.');
  if (mq.orderby === 'meta_value') {
    const key = String(mq.orderKey || '').trim();
    const clause = clauses.filter((c) => String(c.key || '').trim() === key)[0];
    if (clause && (clause.type === 'NUMERIC' || clause.type.indexOf('DECIMAL') === 0)) add('warning', 'You cast "' + key + '" to a number for filtering but sort it as text. Use meta_value_num so 10 comes after 9.', 'orderNum', 'Sort numerically');
  }
  if (mq.orderby === 'meta_value_num' && String(mq.orderKey || '').trim()) {
    add('recommendation', 'Posts with no "' + String(mq.orderKey).trim() + '" value are excluded entirely when you order by a meta key — the JOIN drops them.');
  }
  const per = parseInt(mq.perPage, 10);
  if (per === -1) add('warning', 'posts_per_page of -1 with a meta query is the classic slow page. Cap it.', 'setHundred', 'Cap at 100');
  if (!mq.noFoundRows && per > 0 && per <= 5) add('recommendation', 'For a short list that is not paginated, no_found_rows skips the COUNT query.', 'addNoFoundRows', 'Set no_found_rows');
  return out;
}

export function freshProject(): MetaQuery {
  return {
    postType: 'product', perPage: '12', orderby: 'meta_value_num', order: 'ASC', orderKey: 'price',
    relation: 'AND', noFoundRows: false,
    clauses: [
      { key: 'price', compare: '<=', value: '5000', type: 'NUMERIC' },
      { key: 'in_stock', compare: '=', value: '1', type: 'CHAR' },
    ],
  };
}

export function applyFix(mq: MetaQuery, kind: string): MetaQuery {
  const p: MetaQuery = JSON.parse(JSON.stringify(mq));
  if (kind === 'castNumeric') p.clauses.forEach((c) => { if (NUMERIC_COMPARES.indexOf(c.compare) >= 0 && c.type === 'CHAR') c.type = 'NUMERIC'; });
  if (kind === 'compareIn') p.clauses.forEach((c) => { if (c.compare === '=' && valueList(c.value).length > 1) c.compare = 'IN'; });
  if (kind === 'orderNum') p.orderby = 'meta_value_num';
  if (kind === 'setHundred') p.perPage = '100';
  if (kind === 'addNoFoundRows') p.noFoundRows = true;
  return p;
}

const COMPARE_WORDS: Record<string, string> = { '=': 'is', '!=': 'is not', '>': 'is above', '>=': 'is at least', '<': 'is below', '<=': 'is at most', LIKE: 'contains', 'NOT LIKE': 'does not contain', IN: 'is any of', 'NOT IN': 'is none of', BETWEEN: 'is between', 'NOT BETWEEN': 'is outside', EXISTS: 'exists', 'NOT EXISTS': 'is missing' };

export function plainEnglish(mq: MetaQuery): string {
  const clauses = mq.clauses || [];
  const phrase = clauses.map((c) => {
    const key = String(c.key || 'a key').trim();
    if (NO_VALUE.indexOf(c.compare) >= 0) return key + ' ' + COMPARE_WORDS[c.compare];
    return key + ' ' + COMPARE_WORDS[c.compare] + ' ' + (valueList(c.value).join(' and ') || '(nothing)');
  });
  return clauses.length
    ? 'Find ' + (slugify(mq.postType) || 'post') + ' entries where ' + phrase.join(mq.relation === 'AND' ? ', and ' : ', or ') + '. Sorted by ' + (mq.orderby === 'meta_value_num' ? String(mq.orderKey || 'a key').trim() + ' as a number' : mq.orderby === 'meta_value' ? String(mq.orderKey || 'a key').trim() + ' as text' : mq.orderby) + ', ' + (mq.order === 'ASC' ? 'lowest first' : 'highest first') + '.'
    : 'Find ' + (slugify(mq.postType) || 'post') + ' entries with no meta filter.';
}

export const OUTPUT_HINTS: Record<OutputMode, string> = {
  query: 'A secondary query with its own loop and wp_reset_postdata().',
  args: 'Just the args, for get_posts() or your own WP_Query.',
  pre: 'Filters the main query instead of running a second one.',
};

export function fileNameFor(mq: MetaQuery): string {
  return (slugify(mq.postType) || 'post') + '-meta-query.php';
}

export interface RefArg {
  name: string;
  type: string;
  description: string;
}

export const REF_ARGS: RefArg[] = [
  { name: 'key', type: 'string', description: 'The meta key. wp_postmeta is indexed on this column, which is why filtering by key is cheap and filtering by value is not.' },
  { name: 'value', type: 'mixed', description: 'One value, or an array for IN, NOT IN, BETWEEN and NOT BETWEEN. Omit it for EXISTS.' },
  { name: 'compare', type: 'string', description: 'Defaults to =. LIKE gets wildcards added around your value automatically.' },
  { name: 'type', type: 'string', description: 'The cast: CHAR, NUMERIC, DECIMAL(10,2), DATE, DATETIME, TIME or BINARY. This is what makes numeric comparisons behave.' },
  { name: 'relation', type: 'string', description: 'AND or OR between clauses. Ignored with a single clause.' },
];

export const REF_COMPARE = padTo('=  !=', 16) + 'exact match, any type\n' + padTo('>  >=  <  <=', 16) + 'needs a numeric or date type\n' + padTo('LIKE', 16) + 'wildcards added for you\n' + padTo('IN  NOT IN', 16) + 'array of values\n' + padTo('BETWEEN', 16) + 'exactly two values\n' + padTo('EXISTS', 16) + 'key is present — value ignored\n' + padTo('NOT EXISTS', 16) + 'key is absent';
