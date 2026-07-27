import { escPhp, withCredit, type ValidationIssue } from '../lib/codegen';

export type OutputMode = 'query' | 'args' | 'pre';
export type DateMode = 'range' | 'relative' | 'parts' | 'none';
export type DateColumn = 'post_date' | 'post_date_gmt' | 'post_modified' | 'post_modified_gmt';

export interface DateQuery {
  mode: DateMode;
  column: DateColumn;
  after: string;
  before: string;
  inclusive: boolean;
  relativeCount: string;
  relativeUnit: 'hours' | 'days' | 'weeks' | 'months' | 'years';
  year: string;
  month: string;
  day: string;
  hour: string;
  dayofweek: string;
  postType: string;
  postStatus: 'publish' | 'future' | 'draft' | 'any';
  perPage: string;
  orderAsc: boolean;
  noFoundRows: boolean;
}

export const COLUMNS: [DateColumn, string][] = [
  ['post_date', 'post_date — site time'],
  ['post_date_gmt', 'post_date_gmt — UTC'],
  ['post_modified', 'post_modified'],
  ['post_modified_gmt', 'post_modified_gmt'],
];
export const MODES: [DateMode, string][] = [['range', 'Between two dates'], ['relative', 'A rolling window'], ['parts', 'Calendar parts'], ['none', 'No date filter']];

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

export function isYmd(v: string): boolean {
  return /^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}(:\d{2})?)?$/.test(String(v || '').trim());
}

export function numList(str: string): string[] {
  return String(str || '').split(',').map((v) => v.trim()).filter(Boolean);
}

function numLiteral(str: string): string | null {
  const items = numList(str);
  if (!items.length) return null;
  const mapped = items.map((v) => (/^\d+$/.test(v) ? v : "'" + escPhp(v) + "'"));
  return items.length === 1 ? mapped[0] : 'array( ' + mapped.join(', ') + ' )';
}

export function buildDateQuery(dq: DateQuery): string | null {
  if (dq.mode === 'none') return null;
  const pairs: [string, string][] = [];
  if (dq.column !== 'post_date') pairs.push(['column', "'" + dq.column + "'"]);
  if (dq.mode === 'range') {
    if (String(dq.after || '').trim()) pairs.push(['after', "'" + escPhp(String(dq.after).trim()) + "'"]);
    if (String(dq.before || '').trim()) pairs.push(['before', "'" + escPhp(String(dq.before).trim()) + "'"]);
    if (!pairs.length) return null;
    pairs.push(['inclusive', dq.inclusive ? 'true' : 'false']);
  } else if (dq.mode === 'relative') {
    const n = parseInt(dq.relativeCount, 10) || 30;
    pairs.push(['after', "'-" + n + ' ' + dq.relativeUnit + "'"]);
    pairs.push(['inclusive', dq.inclusive ? 'true' : 'false']);
  } else {
    const year = numLiteral(dq.year), month = numLiteral(dq.month), day = numLiteral(dq.day), hour = numLiteral(dq.hour), dayofweek = numLiteral(dq.dayofweek);
    if (year) pairs.push(['year', year]);
    if (month) pairs.push(['month', month]);
    if (day) pairs.push(['day', day]);
    if (dayofweek) pairs.push(['dayofweek', dayofweek]);
    if (hour) pairs.push(['hour', hour]);
    if (!pairs.length) return null;
  }
  return 'array(\n' + indent('array(\n' + indent(aligned(pairs), 1) + '\n),', 1) + '\n)';
}

export function buildArgs(dq: DateQuery): string {
  const pairs: [string, string][] = [['post_type', "'" + escPhp(slugify(dq.postType) || 'post') + "'"], ['post_status', "'" + dq.postStatus + "'"]];
  const per = parseInt(dq.perPage, 10);
  pairs.push(['posts_per_page', isNaN(per) ? '10' : String(per)]);
  if (dq.orderAsc) pairs.push(['order', "'ASC'"]);
  if (dq.noFoundRows) pairs.push(['no_found_rows', 'true']);
  const date = buildDateQuery(dq);
  if (date) pairs.push(['date_query', date]);
  return 'array(\n' + indent(aligned(pairs), 1) + '\n)';
}

export function buildCode(dq: DateQuery, mode: OutputMode): string {
  const args = buildArgs(dq);
  let out = '';
  if (mode === 'args') return withCredit(out + '$args = ' + args + ';\n');
  if (mode === 'pre') {
    const date = buildDateQuery(dq);
    return withCredit(out + '/**\n * Limit the main query to a date range.\n *\n * @param WP_Query $query The query, by reference.\n */\nfunction mytheme_filter_dates( $query ) {\n\tif ( is_admin() || ! $query->is_main_query() ) {\n\t\treturn;\n\t}\n\n\t$query->set(\n\t\t\'date_query\',\n' + indent(date || 'array()', 2) + '\n\t);\n}\nadd_action( \'pre_get_posts\', \'mytheme_filter_dates\' );\n');
  }
  out += '$args = ' + args + ';\n\n$query = new WP_Query( $args );\n\nif ( $query->have_posts() ) {\n\techo \'<ul>\';\n\n\twhile ( $query->have_posts() ) {\n\t\t$query->the_post();\n\t\tprintf(\n\t\t\t\'<li><a href="%1$s">%2$s</a> <time datetime="%3$s">%4$s</time></li>\',\n\t\t\tesc_url( get_permalink() ),\n\t\t\tesc_html( get_the_title() ),\n\t\t\tesc_attr( get_the_date( \'c\' ) ),\n\t\t\tesc_html( get_the_date() )\n\t\t);\n\t}\n\n\techo \'</ul>\';\n\twp_reset_postdata();\n} else {\n\tesc_html_e( \'Nothing in that range.\', \'mytheme\' );\n}\n';
  return withCredit(out);
}

export function validate(dq: DateQuery): ValidationIssue[] {
  const out: ValidationIssue[] = [];
  const add = (severity: ValidationIssue['severity'], message: string, fix?: string, fixLabel?: string) => out.push({ severity, message, fix, fixLabel });
  if (dq.mode === 'none') add('warning', 'No date filter at all — this is a plain query.');
  if (dq.mode === 'range') {
    const a = String(dq.after || '').trim(), b = String(dq.before || '').trim();
    if (!a && !b) add('error', 'A range needs at least one boundary. Both empty means no filter.');
    if (a && b && isYmd(a) && isYmd(b) && a > b) add('error', 'after (' + a + ') is later than before (' + b + '), so nothing can match.', 'swapDates', 'Swap them');
    ([['after', a], ['before', b]] as [string, string][]).forEach((pair) => {
      const v = pair[1];
      if (!v) return;
      if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(v)) add('error', pair[0] + ' is "' + v + '". WP_Date_Query wants Y-m-d or a strtotime phrase — d-m-Y is read as something else entirely.');
      else if (!isYmd(v) && !/^[-+]?\d+\s+(hour|day|week|month|year)s?$/i.test(v) && !/^(today|yesterday|now|last|next|first|this)/i.test(v)) add('warning', pair[0] + ' is "' + v + '", which is neither Y-m-d nor an obvious strtotime phrase. Anything strtotime cannot parse is silently ignored.');
    });
    if (!dq.inclusive && (isYmd(a) || isYmd(b))) add('warning', 'inclusive is false, so a boundary date is excluded: before 2026-06-30 stops at midnight and nothing from the 30th matches.', 'setInclusive', 'Include the boundary');
  }
  if (dq.mode === 'relative') {
    const n = parseInt(dq.relativeCount, 10);
    if (!n) add('error', 'Set how many ' + dq.relativeUnit + ' the window covers.');
    else if (dq.relativeUnit === 'hours' && n > 48) add('recommendation', n + ' hours is easier to read as ' + Math.round(n / 24) + ' days.');
    add('recommendation', 'A rolling window is evaluated at query time, so its result changes on every page load. Cache it or the query will never hit the object cache.');
  }
  if (dq.mode === 'parts') {
    const y = numList(dq.year), mo = numList(dq.month), d = numList(dq.day), h = numList(dq.hour), dw = numList(dq.dayofweek);
    if (!y.length && !mo.length && !d.length && !h.length && !dw.length) add('error', 'Set at least one calendar part, or nothing is filtered.');
    mo.forEach((v) => { if (!/^\d+$/.test(v) || +v < 1 || +v > 12) add('error', 'month "' + v + '" is out of range. Months are 1 to 12.'); });
    d.forEach((v) => { if (!/^\d+$/.test(v) || +v < 1 || +v > 31) add('error', 'day "' + v + '" is out of range. Days are 1 to 31.'); });
    h.forEach((v) => { if (!/^\d+$/.test(v) || +v < 0 || +v > 23) add('error', 'hour "' + v + '" is out of range. Hours are 0 to 23.'); });
    dw.forEach((v) => { if (!/^\d+$/.test(v) || +v < 1 || +v > 7) add('error', 'dayofweek "' + v + '" is out of range: 1 is Sunday through 7 is Saturday. Use dayofweek_iso if you want Monday to be 1.'); });
    if (d.length && !mo.length) add('recommendation', 'A day with no month matches that day in every month — the 1st of January, February, March and so on. Deliberate?');
  }
  if (dq.column === 'post_date' && dq.mode === 'range') add('recommendation', 'You are comparing against post_date, the site\'s local time. If these dates came from an API or a CSV in UTC, use post_date_gmt instead.', 'useGmt', 'Compare UTC');
  if (dq.postStatus === 'publish' && dq.mode === 'range' && String(dq.after || '').indexOf('+') === 0) add('warning', 'A future-facing range with post_status publish returns nothing: scheduled posts have the future status.', 'statusFuture', 'Query future posts');
  if (dq.postStatus === 'any') add('recommendation', 'post_status any includes drafts, pending and private. Fine in the admin, usually wrong on the front end.');
  const per = parseInt(dq.perPage, 10);
  if (per === -1) add('warning', 'posts_per_page of -1 over a wide date range can load years of posts into memory.', 'setHundred', 'Cap at 100');
  if (dq.column === 'post_modified' || dq.column === 'post_modified_gmt') add('recommendation', 'Filtering on post_modified finds recently touched posts — including ones edited for a typo. Rarely what "recent" means to a reader.');
  return out;
}

export function freshProject(): DateQuery {
  return {
    mode: 'range', column: 'post_date',
    after: '2026-01-01', before: '2026-06-30', inclusive: true,
    relativeCount: '30', relativeUnit: 'days',
    year: '', month: '', day: '', hour: '', dayofweek: '',
    postType: 'post', postStatus: 'publish', perPage: '10', orderAsc: false, noFoundRows: false,
  };
}

export function applyFix(dq: DateQuery, kind: string): DateQuery {
  const p: DateQuery = JSON.parse(JSON.stringify(dq));
  if (kind === 'swapDates') { const a = p.after; p.after = p.before; p.before = a; }
  if (kind === 'setInclusive') p.inclusive = true;
  if (kind === 'useGmt') p.column = 'post_date_gmt';
  if (kind === 'statusFuture') p.postStatus = 'future';
  if (kind === 'setHundred') p.perPage = '100';
  return p;
}

export function partsPhrase(dq: DateQuery): string {
  const bits: string[] = [];
  if (numList(dq.year).length) bits.push('year ' + numList(dq.year).join(' or '));
  if (numList(dq.month).length) bits.push('month ' + numList(dq.month).join(' or '));
  if (numList(dq.day).length) bits.push('day ' + numList(dq.day).join(' or '));
  if (numList(dq.dayofweek).length) bits.push('weekday ' + numList(dq.dayofweek).join(' or '));
  if (numList(dq.hour).length) bits.push('hour ' + numList(dq.hour).join(' or '));
  return bits.length ? bits.join(', ') : 'no parts set';
}

export function plainEnglish(dq: DateQuery): string {
  const type = slugify(dq.postType) || 'post';
  const col = dq.column === 'post_date' ? 'published' : dq.column === 'post_date_gmt' ? 'published (UTC)' : 'last modified';
  if (dq.mode === 'none') return 'Find ' + type + ' entries with no date filter.';
  if (dq.mode === 'relative') return 'Find ' + type + ' entries ' + col + ' in the last ' + (parseInt(dq.relativeCount, 10) || 30) + ' ' + dq.relativeUnit + '.';
  if (dq.mode === 'parts') return 'Find ' + type + ' entries where the ' + col + ' date matches ' + partsPhrase(dq) + '.';
  const a = String(dq.after || '').trim(), b = String(dq.before || '').trim();
  if (a && b) return 'Find ' + type + ' entries ' + col + ' between ' + a + ' and ' + b + ', ' + (dq.inclusive ? 'both days included' : 'both boundary days excluded') + '.';
  if (a) return 'Find ' + type + ' entries ' + col + ' after ' + a + '.';
  if (b) return 'Find ' + type + ' entries ' + col + ' before ' + b + '.';
  return 'Find ' + type + ' entries — no boundary set, so no filter is applied.';
}

export const OUTPUT_HINTS: Record<OutputMode, string> = {
  query: 'A secondary query with a loop that prints a real time element.',
  args: 'Just the args, for get_posts() or your own WP_Query.',
  pre: 'Filters the main query instead of running a second one.',
};

export function fileNameFor(dq: DateQuery): string {
  return (slugify(dq.postType) || 'post') + '-date-query.php';
}

export interface RefArg {
  name: string;
  type: string;
  description: string;
}

export const REF_ARGS: RefArg[] = [
  { name: 'after / before', type: 'string|array', description: 'A Y-m-d string, a strtotime phrase, or an array of year, month and day parts. Anything unparseable is dropped without warning.' },
  { name: 'inclusive', type: 'bool', description: 'Whether the boundary dates count. False means before 2026-06-30 stops at midnight on the 30th.' },
  { name: 'column', type: 'string', description: 'Which wp_posts column to compare: post_date, post_date_gmt, post_modified or post_modified_gmt.' },
  { name: 'year / month / day / hour', type: 'int|array', description: 'Calendar parts. Great for "every December" or "weekday mornings"; useless for a continuous range.' },
  { name: 'dayofweek', type: 'int|array', description: '1 is Sunday through 7 is Saturday. dayofweek_iso runs Monday to Sunday instead — mixing them up shifts everything by a day.' },
  { name: 'compare', type: 'string', description: 'Applies to part comparisons: =, >, >=, <, <=, IN, BETWEEN.' },
];

export const REF_COLUMNS = padTo('post_date', 20) + 'local time, what the editor typed\n' + padTo('post_date_gmt', 20) + 'UTC — use this for API data\n' + padTo('post_modified', 20) + 'last edit, local\n' + padTo('post_modified_gmt', 20) + 'last edit, UTC';
