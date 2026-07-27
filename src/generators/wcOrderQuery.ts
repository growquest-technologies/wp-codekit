import { escPhp, withCredit, type ValidationIssue } from '../lib/codegen';

export type OutputMode = 'query' | 'paginated' | 'args';

export interface OrderMetaClause {
  key: string;
  compare: string;
  value: string;
}

export interface OrderQuery {
  statuses: string[];
  customer: string;
  dateField: 'date_created' | 'date_modified' | 'date_completed' | 'date_paid';
  dateAfter: string;
  dateBefore: string;
  meta: OrderMetaClause[];
  metaRelation: 'AND' | 'OR';
  limit: string;
  orderby: string;
  order: 'ASC' | 'DESC';
  returnType: 'objects' | 'ids';
}

export const STATUSES: [string, string][] = [
  ['wc-pending', 'Pending payment'],
  ['wc-processing', 'Processing'],
  ['wc-on-hold', 'On hold'],
  ['wc-completed', 'Completed'],
  ['wc-cancelled', 'Cancelled'],
  ['wc-refunded', 'Refunded'],
  ['wc-failed', 'Failed'],
  ['wc-checkout-draft', 'Draft (Block Checkout)'],
];

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

function isDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(s || '').trim());
}

export function buildArgs(oq: OrderQuery, extra?: [string, string][]): string {
  const pairs: [string, string][] = [];
  const statuses = oq.statuses || [];
  if (statuses.length === 1) pairs.push(['status', "'" + statuses[0] + "'"]);
  else if (statuses.length > 1) pairs.push(['status', 'array( ' + statuses.map((s) => "'" + s + "'").join(', ') + ' )']);

  const customers = valueList(oq.customer).filter((c) => /^\d+$/.test(c));
  if (customers.length === 1) pairs.push(['customer', customers[0]]);
  else if (customers.length > 1) pairs.push(['customer', 'array( ' + customers.join(', ') + ' )']);

  const after = isDate(oq.dateAfter) ? oq.dateAfter.trim() : '';
  const before = isDate(oq.dateBefore) ? oq.dateBefore.trim() : '';
  if (after && before) pairs.push([oq.dateField, "'" + after + '...' + before + "'"]);
  else if (after) pairs.push([oq.dateField, "'>" + after + "'"]);
  else if (before) pairs.push([oq.dateField, "'<" + before + "'"]);

  const metas = (oq.meta || []).filter((m) => String(m.key || '').trim());
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
    pairs.push(['meta_query', 'array(\n' + indent("'relation' => '" + (oq.metaRelation || 'AND') + "',\n" + clauses.join('\n'), 1) + '\n)']);
  }

  const limit = parseInt(oq.limit, 10);
  pairs.push(['limit', isNaN(limit) ? '20' : String(limit)]);
  pairs.push(['orderby', "'" + oq.orderby + "'"]);
  if (oq.order !== 'DESC') pairs.push(['order', "'" + oq.order + "'"]);
  if (oq.returnType !== 'objects') pairs.push(['return', "'" + oq.returnType + "'"]);
  if (extra) pairs.push(...extra);
  return 'array(\n' + indent(aligned(pairs), 1) + '\n)';
}

export function buildCode(oq: OrderQuery, mode: OutputMode): string {
  if (mode === 'args') return withCredit('$args = ' + buildArgs(oq) + ';\n');

  if (mode === 'paginated') {
    const args = buildArgs(oq, [['paginate', 'true']]);
    let out = '$args    = ' + args + ';\n$results = wc_get_orders( $args );\n\n';
    out += '$orders       = $results->orders;\n$total_orders = $results->total;\n$max_pages    = $results->max_num_pages;\n';
    return withCredit(out);
  }

  const args = buildArgs(oq);
  let out = '$args   = ' + args + ';\n$orders = wc_get_orders( $args );\n\n';
  if (oq.returnType === 'ids') {
    out += 'foreach ( $orders as $order_id ) {\n\t// $order_id is a plain integer — call wc_get_order( $order_id ) if you need the object.\n\techo esc_html( $order_id ) . "\\n";\n}\n';
  } else {
    out += 'foreach ( $orders as $order ) {\n\tprintf(\n\t\t\'<li>#%1$s — %2$s — %3$s</li>\',\n\t\tesc_html( $order->get_order_number() ),\n\t\tesc_html( wc_get_order_status_name( $order->get_status() ) ),\n\t\twp_kses_post( wc_price( $order->get_total() ) )\n\t);\n}\n';
  }
  return withCredit(out);
}

export function validate(oq: OrderQuery): ValidationIssue[] {
  const out: ValidationIssue[] = [];
  const add = (severity: ValidationIssue['severity'], message: string, fix?: string, fixLabel?: string) => out.push({ severity, message, fix, fixLabel });
  const statuses = oq.statuses || [];
  const metas = (oq.meta || []).filter((m) => String(m.key || '').trim());

  if (!statuses.length) add('recommendation', 'No status filter — every non-trashed order status is included, drafts and failed orders too.');
  const limit = parseInt(oq.limit, 10);
  if (isNaN(oq.limit ? limit : NaN) && oq.limit.trim() !== '-1') add('warning', 'No limit set. wc_get_orders() defaults to 20, but say so explicitly rather than relying on the default.', 'setTwenty', 'Limit to 20');
  else if (limit === -1) add('warning', 'limit -1 returns every matching order in one call. Fine for a handful, expensive for a busy store.', 'setTwenty', 'Limit to 20');

  if (String(oq.customer || '').trim() && !valueList(oq.customer).every((c) => /^\d+$/.test(c))) add('error', 'customer expects one or more numeric user ids, not names or emails.');

  if (oq.dateAfter && !isDate(oq.dateAfter)) add('error', '"After" is not a yyyy-mm-dd date, so it will be silently ignored.');
  if (oq.dateBefore && !isDate(oq.dateBefore)) add('error', '"Before" is not a yyyy-mm-dd date, so it will be silently ignored.');

  metas.forEach((m, i) => {
    const label = 'Meta clause ' + (i + 1);
    const vals = valueList(m.value);
    if (m.compare !== 'EXISTS' && m.compare !== 'NOT EXISTS' && !vals.length) add('error', label + ' has no value.');
    if ((m.compare === 'EXISTS' || m.compare === 'NOT EXISTS') && vals.length) add('warning', label + ' uses ' + m.compare + ', which ignores the value.');
  });
  if (metas.length > 1) add('recommendation', metas.length + ' meta clauses on orders — under the High-Performance Order Storage tables this is translated through WC_Order_Query, and deeply nested relations have historically had gaps compared with WP_Query\'s meta_query. Test against your store\'s actual order count.');
  if (oq.orderby === 'meta_value' && !metas.length) add('error', 'Ordering by meta_value needs a meta clause, and there is no meta clause to take the key from.');

  if (statuses.includes('wc-checkout-draft') && statuses.length > 1) add('recommendation', 'wc-checkout-draft orders are unfinished Block Checkout sessions, not real orders — mixing them into a results list usually needs a visual "draft" flag, or should be filtered out entirely.');
  return out;
}

export function freshProject(): OrderQuery {
  return {
    statuses: ['wc-processing', 'wc-completed'],
    customer: '',
    dateField: 'date_created',
    dateAfter: '',
    dateBefore: '',
    meta: [],
    metaRelation: 'AND',
    limit: '20',
    orderby: 'date',
    order: 'DESC',
    returnType: 'objects',
  };
}

export function applyFix(oq: OrderQuery, kind: string): OrderQuery {
  const p: OrderQuery = JSON.parse(JSON.stringify(oq));
  if (kind === 'setTwenty') p.limit = '20';
  return p;
}

export function plainEnglish(oq: OrderQuery): string {
  const statuses = oq.statuses || [];
  const metas = (oq.meta || []).filter((m) => String(m.key || '').trim());
  const bits: string[] = [];
  if (statuses.length) bits.push('are ' + statuses.map((s) => s.replace(/^wc-/, '')).join(' or '));
  if (String(oq.customer || '').trim()) bits.push('belong to customer ' + valueList(oq.customer).join(', '));
  if (oq.dateAfter || oq.dateBefore) bits.push(oq.dateField.replace(/_/g, ' ') + (oq.dateAfter && oq.dateBefore ? ' between ' + oq.dateAfter + ' and ' + oq.dateBefore : oq.dateAfter ? ' after ' + oq.dateAfter : ' before ' + oq.dateBefore));
  metas.forEach((m) => bits.push(String(m.key).trim() + ' ' + m.compare + ' ' + (valueList(m.value).join(', ') || '—')));
  const limit = parseInt(oq.limit, 10);
  return 'Find orders that ' + (bits.length ? bits.join(', and ') : 'match nothing in particular') + '. ' + (limit === -1 ? 'No limit' : 'At most ' + (isNaN(limit) ? 20 : limit)) + ', ordered by ' + oq.orderby + ' ' + oq.order + (oq.returnType === 'ids' ? ', returning order ids only' : ', as full WC_Order objects') + '.';
}

export const OUTPUT_HINTS: Record<OutputMode, string> = {
  query: 'A foreach loop over the results, ready to print.',
  paginated: 'paginate => true — the shape an admin order list needs (total, max_num_pages).',
  args: 'Just the args array.',
};

export function fileNameFor(): string {
  return 'order-query.php';
}

export interface RefArg {
  name: string;
  type: string;
  description: string;
}

export const REF_ARGS: RefArg[] = [
  { name: 'status', type: 'string|array', description: "One or more order statuses, wc- prefixed (matches the raw column value in both the legacy posts table and the HPOS orders table). 'any' is also accepted." },
  { name: 'customer', type: 'int|array', description: 'One or more customer user ids. Guest orders (no account) are not matched by this — filter by billing_email meta instead.' },
  { name: 'date_created / date_modified / date_completed / date_paid', type: 'string', description: "A single date filters on or after it with '>', on or before with '<', or a range with 'start...end' — all yyyy-mm-dd." },
  { name: 'limit / paginate', type: 'int|bool', description: 'limit is the page size, -1 for unlimited. paginate => true swaps the return value for an object carrying total and max_num_pages.' },
  { name: 'orderby / order', type: 'string', description: "date (the default), ID, or a meta key when paired with meta_query. order is ASC or DESC." },
  { name: 'return', type: "'objects'|'ids'", description: "objects hydrates full WC_Order instances. ids returns plain integers — pair with wc_get_order() only for the rows you actually render." },
  { name: 'meta_key / meta_value / meta_query', type: 'mixed', description: 'Same shape as WP_Query\'s meta_query. Translated through WC_Order_Query under HPOS.' },
];
