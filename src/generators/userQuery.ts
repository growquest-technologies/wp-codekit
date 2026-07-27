import { escPhp, withCredit, type ValidationIssue } from '../lib/codegen';

export type OutputMode = 'query' | 'get_users' | 'args';
export type RoleMode = 'role__in' | 'role' | 'role__not_in';

export interface UserMetaClause {
  key: string;
  compare: string;
  value: string;
}

export interface UserQuery {
  roles: string[];
  roleMode: RoleMode;
  capability: string;
  search: string;
  searchColumn: string;
  meta: UserMetaClause[];
  metaRelation: 'AND' | 'OR';
  number: string;
  fields: 'all' | 'ID' | 'ids' | 'display_name' | 'user_email';
  orderby: string;
  order: 'ASC' | 'DESC';
  countTotal: boolean;
  hasPublished: boolean;
}

export const ROLES = ['administrator', 'editor', 'author', 'contributor', 'subscriber', 'customer', 'shop_manager'];
export const COMPARES: [string, string][] = [['=', '='], ['!=', '!='], ['>=', '>='], ['<=', '<='], ['LIKE', 'LIKE'], ['IN', 'IN'], ['EXISTS', 'EXISTS'], ['NOT EXISTS', 'NOT EXISTS']];

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

export function buildArgs(uq: UserQuery): string {
  const pairs: [string, string][] = [];
  const roles = uq.roles || [];
  if (roles.length) {
    if (uq.roleMode === 'role') pairs.push(['role', roles.length === 1 ? "'" + roles[0] + "'" : 'array( ' + roles.map((r) => "'" + r + "'").join(', ') + ' )']);
    else pairs.push([uq.roleMode, 'array( ' + roles.map((r) => "'" + r + "'").join(', ') + ' )']);
  }
  if (String(uq.capability || '').trim()) pairs.push(['capability', "'" + escPhp(String(uq.capability).trim()) + "'"]);
  if (String(uq.search || '').trim()) {
    pairs.push(['search', "'" + escPhp(String(uq.search).trim()) + "'"]);
    if (uq.searchColumn) pairs.push(['search_columns', "array( '" + uq.searchColumn + "' )"]);
  }
  const metas = (uq.meta || []).filter((m) => String(m.key || '').trim());
  if (metas.length === 1) {
    const m = metas[0];
    pairs.push(['meta_key', "'" + escPhp(String(m.key).trim()) + "'"]);
    if (m.compare !== 'EXISTS' && m.compare !== 'NOT EXISTS') {
      const vals = valueList(m.value);
      pairs.push(['meta_value', vals.length > 1 || m.compare === 'IN' ? 'array( ' + vals.map((v) => "'" + escPhp(v) + "'").join(', ') + ' )' : "'" + escPhp(vals[0] || '') + "'"]);
    }
    if (m.compare !== '=') pairs.push(['meta_compare', "'" + m.compare + "'"]);
  } else if (metas.length > 1) {
    const clauses = metas.map((m) => {
      const p: [string, string][] = [['key', "'" + escPhp(String(m.key).trim()) + "'"]];
      if (m.compare !== 'EXISTS' && m.compare !== 'NOT EXISTS') {
        const vals = valueList(m.value);
        p.push(['value', vals.length > 1 || m.compare === 'IN' ? 'array( ' + vals.map((v) => "'" + escPhp(v) + "'").join(', ') + ' )' : "'" + escPhp(vals[0] || '') + "'"]);
      }
      if (m.compare !== '=') p.push(['compare', "'" + m.compare + "'"]);
      return 'array(\n' + indent(aligned(p), 1) + '\n),';
    });
    pairs.push(['meta_query', 'array(\n' + indent("'relation' => '" + (uq.metaRelation || 'AND') + "',\n" + clauses.join('\n'), 1) + '\n)']);
  }
  const num = parseInt(uq.number, 10);
  pairs.push(['number', isNaN(num) ? '20' : String(num)]);
  if (uq.fields !== 'all') pairs.push(['fields', "'" + uq.fields + "'"]);
  pairs.push(['orderby', "'" + uq.orderby + "'"]);
  if (uq.order !== 'ASC') pairs.push(['order', "'" + uq.order + "'"]);
  if (uq.orderby === 'meta_value' || uq.orderby === 'meta_value_num') {
    const first = metas[0];
    pairs.push(['meta_key', "'" + escPhp(first ? String(first.key).trim() : '') + "'"]);
  }
  if (!uq.countTotal) pairs.push(['count_total', 'false']);
  if (uq.hasPublished) pairs.push(['has_published_posts', 'true']);
  return 'array(\n' + indent(aligned(pairs), 1) + '\n)';
}

export function buildCode(uq: UserQuery, mode: OutputMode): string {
  const args = buildArgs(uq);
  let out = '';
  if (mode === 'args') return withCredit(out + '$args = ' + args + ';\n');
  if (mode === 'get_users') {
    out += '$users = get_users( ' + indent(args, 0) + ' );\n\nforeach ( $users as $user ) {\n';
    out += uq.fields === 'all' ? '\tprintf(\n\t\t\'<li>%1$s &lt;%2$s&gt;</li>\',\n\t\tesc_html( $user->display_name ),\n\t\tesc_html( $user->user_email )\n\t);\n' : '\t// $user is a single ' + uq.fields + ' value.\n';
    out += '}\n';
    return withCredit(out);
  }
  out += '$args = ' + args + ';\n\n$query = new WP_User_Query( $args );\n\n';
  if (uq.countTotal) out += '$total = $query->get_total();\n\n';
  out += 'if ( ! empty( $query->get_results() ) ) {\n\techo \'<ul>\';\n\n\tforeach ( $query->get_results() as $user ) {\n';
  out += uq.fields === 'all'
    ? '\t\tprintf(\n\t\t\t\'<li><a href="%1$s">%2$s</a></li>\',\n\t\t\tesc_url( get_author_posts_url( $user->ID ) ),\n\t\t\tesc_html( $user->display_name )\n\t\t);\n'
    : '\t\t// Each $user is a single ' + uq.fields + ' value, not an object.\n\t\techo \'<li>\' . esc_html( $user ) . \'</li>\';\n';
  out += '\t}\n\n\techo \'</ul>\';\n';
  if (uq.countTotal) out += '\n\tprintf(\n\t\t\'<p>%s</p>\',\n\t\tesc_html( sprintf( _n( \'%s user\', \'%s users\', $total, \'mytheme\' ), number_format_i18n( $total ) ) )\n\t);\n';
  out += '} else {\n\tesc_html_e( \'No users matched.\', \'mytheme\' );\n}\n';
  return withCredit(out);
}

export function validate(uq: UserQuery): ValidationIssue[] {
  const out: ValidationIssue[] = [];
  const add = (severity: ValidationIssue['severity'], message: string, fix?: string, fixLabel?: string) => out.push({ severity, message, fix, fixLabel });
  const roles = uq.roles || [];
  const metas = (uq.meta || []).filter((m) => String(m.key || '').trim());
  if (!roles.length && !String(uq.capability || '').trim() && !String(uq.search || '').trim() && !metas.length) add('warning', 'No filter at all — this returns every user on the site, capped by number.');
  if (roles.length > 1 && uq.roleMode === 'role') add('error', 'role with ' + roles.length + ' values requires a user to hold all of them at once. Almost nobody does. role__in is what "any of these" means.', 'roleIn', 'Use role__in');
  if (String(uq.capability || '').trim() && roles.length) add('recommendation', 'You are filtering by role and by capability. The capability check already covers every role that has it — one of these is probably redundant.');
  if (String(uq.capability || '').trim() && /^[A-Z_]+$/.test(String(uq.capability).trim())) add('warning', 'Capabilities are lowercase with underscores — "' + uq.capability + '" will match nothing.');
  const num = parseInt(uq.number, 10);
  if (isNaN(num)) add('warning', 'No number set. WP_User_Query defaults to unlimited, which on a membership site means every row.', 'setTwenty', 'Limit to 20');
  else if (num === -1) add('warning', 'number -1 returns every matching user. Fine for 50 accounts, fatal for 50,000.', 'setTwenty', 'Limit to 20');
  if (uq.fields === 'all' && num > 100) add('recommendation', 'Hydrating ' + num + ' full WP_User objects also loads their meta. If you only need names or ids, say so in fields.', 'fieldsIds', 'Fetch ids only');
  if (String(uq.search || '').trim() && String(uq.search).indexOf('*') === -1) add('recommendation', 'search without a * is an exact match. Wrap it — *@example.com — to match anything containing it.', 'addWildcard', 'Add wildcards');
  if (String(uq.search || '').trim() === '*' || String(uq.search || '').trim() === '**') add('error', 'A bare wildcard search matches everything and scans the whole table.');
  if (uq.searchColumn && !String(uq.search || '').trim()) add('warning', 'A search column is set but there is nothing to search for.');
  metas.forEach((m, i) => {
    const label = 'Meta clause ' + (i + 1);
    const vals = valueList(m.value);
    if (m.compare !== 'EXISTS' && m.compare !== 'NOT EXISTS' && !vals.length) add('error', label + ' has no value.');
    if ((m.compare === 'EXISTS' || m.compare === 'NOT EXISTS') && vals.length) add('warning', label + ' uses ' + m.compare + ', which ignores the value.');
    if (m.compare === 'LIKE') add('recommendation', label + ' uses LIKE on user meta. wp_usermeta is indexed on meta_key only, so this scans every row with that key.');
    if (/^wp_capabilities$/.test(String(m.key).trim())) add('warning', label + ' queries wp_capabilities directly. The role arguments do this properly, including the per-site prefix on multisite.');
  });
  if (metas.length > 1) add('recommendation', metas.length + ' meta clauses means ' + metas.length + ' JOINs against wp_usermeta.');
  if ((uq.orderby === 'meta_value' || uq.orderby === 'meta_value_num') && !metas.length) add('error', 'Ordering by ' + uq.orderby + ' needs a meta key, and there is no meta clause to take one from.');
  if (uq.orderby === 'post_count') add('recommendation', 'orderby post_count adds a subquery per user. Cache the result if this runs on a public page.');
  if (uq.countTotal && num > 0 && num <= 20) add('recommendation', 'count_total runs a second COUNT query. For a fixed-size list that number is often never shown.', 'noCount', 'Turn it off');
  if (uq.hasPublished) add('recommendation', 'has_published_posts is the honest way to build an author list — it skips accounts that have never written anything.');
  return out;
}

export function freshProject(): UserQuery {
  return {
    roles: ['author', 'editor'], roleMode: 'role__in', capability: '', search: '', searchColumn: '',
    meta: [], metaRelation: 'AND',
    number: '20', fields: 'all', orderby: 'display_name', order: 'ASC',
    countTotal: true, hasPublished: true,
  };
}

export function applyFix(uq: UserQuery, kind: string): UserQuery {
  const p: UserQuery = JSON.parse(JSON.stringify(uq));
  if (kind === 'roleIn') p.roleMode = 'role__in';
  if (kind === 'setTwenty') p.number = '20';
  if (kind === 'fieldsIds') p.fields = 'ids';
  if (kind === 'addWildcard') p.search = '*' + String(p.search).replace(/^\*|\*$/g, '') + '*';
  if (kind === 'noCount') p.countTotal = false;
  return p;
}

export function plainEnglish(uq: UserQuery): string {
  const roles = uq.roles || [];
  const metas = (uq.meta || []).filter((m) => String(m.key || '').trim());
  const bits: string[] = [];
  if (roles.length) bits.push(uq.roleMode === 'role__not_in' ? 'are not ' + roles.join(' or ') : uq.roleMode === 'role' ? 'hold every one of ' + roles.join(' and ') : 'are ' + roles.join(' or '));
  if (String(uq.capability || '').trim()) bits.push('can ' + String(uq.capability).trim());
  if (String(uq.search || '').trim()) bits.push('match "' + String(uq.search).trim() + '"' + (uq.searchColumn ? ' in ' + uq.searchColumn : ''));
  metas.forEach((m) => bits.push(String(m.key).trim() + ' ' + m.compare + ' ' + (valueList(m.value).join(', ') || '—')));
  if (uq.hasPublished) bits.push('have published at least one post');
  const num = parseInt(uq.number, 10);
  return 'Find users who ' + (bits.length ? bits.join(', and ') : 'match nothing in particular') + '. ' + (num === -1 || isNaN(num) ? 'No limit' : 'At most ' + num) + ', ordered by ' + uq.orderby + ' ' + uq.order + (uq.fields === 'all' ? ', as full user objects' : ', returning only ' + uq.fields) + '.';
}

export const OUTPUT_HINTS: Record<OutputMode, string> = {
  query: 'The class, with get_results() and the total when you need pagination.',
  get_users: 'The one-line wrapper. Same arguments, no total.',
  args: 'Just the args array.',
};

export function fileNameFor(): string {
  return 'user-query.php';
}

export interface RefArg {
  name: string;
  type: string;
  description: string;
}

export const REF_ARGS: RefArg[] = [
  { name: 'role / role__in / role__not_in', type: 'string|array', description: 'role requires every listed role at once; role__in matches any; role__not_in excludes. The distinction bites everyone once.' },
  { name: 'capability', type: 'string|array', description: 'Matches users whose roles grant it. Cleaner than listing roles when what you mean is "anyone who can edit".' },
  { name: 'search / search_columns', type: 'string|array', description: 'Wrap the term in * for a wildcard. Limit the columns or WordPress searches login, email, nicename, display name and url.' },
  { name: 'meta_key / meta_value / meta_query', type: 'mixed', description: 'One clause via the shorthand, several via meta_query. Each clause is a JOIN on wp_usermeta.' },
  { name: 'number / offset / paged', type: 'int', description: 'number is the page size — no default limit, so always set it.' },
  { name: 'fields', type: 'string|array', description: 'all returns WP_User objects with meta loaded. ids, display_name or user_email return flat values and far less memory.' },
  { name: 'count_total', type: 'bool', description: 'On by default and costs a COUNT query. Turn it off unless you show a total.' },
  { name: 'blog_id', type: 'int', description: 'Multisite only: whose roles you are asking about. Defaults to the current site.' },
];

export const REF_COUNT = '$query = new WP_User_Query( $args );\n\n$users = $query->get_results();\n$total = $query->get_total();   // needs count_total\n$pages = ceil( $total / 20 );';
