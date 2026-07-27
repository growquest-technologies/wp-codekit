import { escPhp, withCredit, type ValidationIssue } from '../lib/codegen';

export type OutputMode = 'query' | 'get_comments' | 'args';

export interface CommentQuery {
  status: 'approve' | 'hold' | 'spam' | 'trash' | 'all';
  type: 'comment' | 'pingback' | 'trackback' | '';
  postId: string;
  postType: string;
  userId: string;
  authorEmail: string;
  search: string;
  parent: string;
  number: string;
  orderby: string;
  order: 'DESC' | 'ASC';
  fields: 'all' | 'ids';
  hierarchical: 'false' | 'threaded' | 'flat';
  countOnly: boolean;
  updateCache: boolean;
  noFoundRows: boolean;
}

export const STATUSES: [string, string][] = [['approve', 'approve'], ['hold', 'hold'], ['spam', 'spam'], ['trash', 'trash'], ['all', 'all']];
export const TYPES: [string, string][] = [['comment', 'comment'], ['pingback', 'pingback'], ['trackback', 'trackback'], ['', 'any type']];

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

export function buildArgs(cq: CommentQuery): string {
  const pairs: [string, string][] = [['status', "'" + cq.status + "'"]];
  if (cq.type) pairs.push(['type', "'" + cq.type + "'"]);
  if (String(cq.postId || '').trim()) pairs.push(['post_id', String(parseInt(cq.postId, 10) || 0)]);
  if (String(cq.postType || '').trim()) pairs.push(['post_type', "'" + escPhp(slugify(cq.postType)) + "'"]);
  if (String(cq.userId || '').trim()) pairs.push(['user_id', String(parseInt(cq.userId, 10) || 0)]);
  if (String(cq.authorEmail || '').trim()) pairs.push(['author_email', "'" + escPhp(String(cq.authorEmail).trim()) + "'"]);
  if (String(cq.search || '').trim()) pairs.push(['search', "'" + escPhp(String(cq.search).trim()) + "'"]);
  if (String(cq.parent || '').trim() !== '') pairs.push(['parent', String(parseInt(cq.parent, 10) || 0)]);
  const num = parseInt(cq.number, 10);
  if (num) pairs.push(['number', String(num)]);
  pairs.push(['orderby', "'" + cq.orderby + "'"]);
  if (cq.order !== 'DESC') pairs.push(['order', "'" + cq.order + "'"]);
  if (cq.fields === 'ids') pairs.push(['fields', "'ids'"]);
  if (cq.hierarchical !== 'false') pairs.push(['hierarchical', "'" + cq.hierarchical + "'"]);
  if (cq.countOnly) pairs.push(['count', 'true']);
  if (!cq.updateCache) pairs.push(['update_comment_meta_cache', 'false']);
  if (cq.noFoundRows) pairs.push(['no_found_rows', 'true']);
  return 'array(\n' + indent(aligned(pairs), 1) + '\n)';
}

export function buildCode(cq: CommentQuery, mode: OutputMode): string {
  const args = buildArgs(cq);
  let out = '';
  if (mode === 'args') return withCredit(out + '$args = ' + args + ';\n');
  if (mode === 'get_comments') {
    out += '$comments = get_comments( ' + indent(args, 0) + ' );\n\n';
    if (cq.countOnly) return withCredit(out + 'printf(\n\t\'<p>%s</p>\',\n\tesc_html( number_format_i18n( (int) $comments ) )\n);\n');
    out += 'if ( $comments ) {\n\techo \'<ol class="comment-list">\';\n\twp_list_comments(\n\t\tarray(\n\t\t\t\'style\'      => \'ol\',\n\t\t\t\'short_ping\' => true,\n\t\t\t\'avatar_size\' => 40,\n\t\t),\n\t\t$comments\n\t);\n\techo \'</ol>\';\n}\n';
    return withCredit(out);
  }
  out += '$query = new WP_Comment_Query();\n\n$comments = $query->query( ' + indent(args, 0) + ' );\n\n';
  if (cq.countOnly) {
    out += 'printf(\n\t\'<p>%s</p>\',\n\tesc_html( number_format_i18n( (int) $comments ) )\n);\n';
    return withCredit(out);
  }
  if (cq.fields === 'ids') {
    out += 'foreach ( $comments as $comment_id ) {\n\t// Only ids were fetched — get_comment( $comment_id ) if you need the object.\n}\n';
    return withCredit(out);
  }
  out += 'if ( $comments ) {\n\techo \'<ul class="recent-comments">\';\n\n\tforeach ( $comments as $comment ) {\n\t\tprintf(\n\t\t\t\'<li><a href="%1$s">%2$s</a> on %3$s<p>%4$s</p></li>\',\n\t\t\tesc_url( get_comment_link( $comment ) ),\n\t\t\tesc_html( get_comment_author( $comment ) ),\n\t\t\tesc_html( get_the_title( $comment->comment_post_ID ) ),\n\t\t\tesc_html( wp_trim_words( $comment->comment_content, 20 ) )\n\t\t);\n\t}\n\n\techo \'</ul>\';\n} else {\n\tesc_html_e( \'No comments yet.\', \'mytheme\' );\n}\n';
  return withCredit(out);
}

export function validate(cq: CommentQuery): ValidationIssue[] {
  const out: ValidationIssue[] = [];
  const add = (severity: ValidationIssue['severity'], message: string, fix?: string, fixLabel?: string) => out.push({ severity, message, fix, fixLabel });
  if (cq.status === 'all') add('warning', 'status all includes held, spam and trashed comments. On a public page that publishes spam.', 'statusApprove', 'Only approved');
  if (cq.status === 'spam') add('recommendation', 'Querying spam is an admin-side job. Make sure this never renders on the front end.');
  if (!cq.type) add('warning', 'No type filter, so pingbacks and trackbacks appear alongside real comments — the usual reason a "recent comments" list shows link spam.', 'typeComment', 'Only comments');
  if (cq.type === 'pingback' || cq.type === 'trackback') add('recommendation', 'A list of ' + cq.type + 's is unusual on the front end. Most themes hide them entirely.');
  const num = parseInt(cq.number, 10);
  if (!num) add('warning', 'No number set. WP_Comment_Query has no default limit, so a busy site returns every comment row.', 'setTen', 'Limit to 10');
  else if (num > 100) add('recommendation', num + ' comments in one query with full objects is a lot of memory. ids plus lazy loading is cheaper.');
  if (cq.hierarchical !== 'false' && num) add('warning', 'With hierarchical set, number counts top-level comments, not total comments. Ten threads can be a hundred rows.', 'flatList', 'Use a flat list');
  if (cq.hierarchical !== 'false' && String(cq.parent || '').trim() !== '') add('error', 'hierarchical and parent contradict each other: parent asks for one level, hierarchical builds the tree.', 'clearParent', 'Clear parent');
  if (cq.countOnly && cq.fields === 'ids') add('warning', 'count returns a single number; fields ids is ignored alongside it.');
  if (cq.countOnly && num) add('warning', 'count with number limits the rows counted, which makes the count wrong.', 'clearNumber', 'Clear number');
  if (String(cq.authorEmail || '').trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(cq.authorEmail).trim())) add('error', '"' + cq.authorEmail + '" is not a valid email address, so this matches nothing.');
  if (String(cq.userId || '').trim() && !/^\d+$/.test(String(cq.userId).trim())) add('error', 'user_id takes a numeric user ID.');
  if (String(cq.postId || '').trim() && !/^\d+$/.test(String(cq.postId).trim())) add('error', 'post_id takes a numeric post ID. Use post_type or post_name for anything else.');
  if (String(cq.userId || '').trim() && String(cq.authorEmail || '').trim()) add('recommendation', 'user_id and author_email together only match comments where both agree — logged-in comments where the email was not changed.');
  if (cq.orderby === 'comment_date' && cq.status === 'approve') add('recommendation', 'comment_date is stored in site time; comment_date_gmt sorts consistently across a timezone change. Prefer the GMT column for ordering.', 'orderGmt', 'Order by GMT');
  if (String(cq.search || '').trim()) add('recommendation', 'search runs LIKE %term% across content, author, email and url. There is no index for that — fine in the admin, slow on a public endpoint.');
  if (!cq.updateCache && cq.fields === 'all') add('recommendation', 'Skipping the comment meta cache means any get_comment_meta() in your loop queries per comment.');
  if (cq.fields === 'ids' && cq.updateCache) add('recommendation', 'You are fetching ids only, so priming the meta cache does nothing useful.');
  return out;
}

export function freshProject(): CommentQuery {
  return {
    status: 'approve', type: 'comment',
    postId: '', postType: '', userId: '', authorEmail: '', search: '', parent: '',
    number: '10', orderby: 'comment_date_gmt', order: 'DESC', fields: 'all', hierarchical: 'false',
    countOnly: false, updateCache: true, noFoundRows: false,
  };
}

export function applyFix(cq: CommentQuery, kind: string): CommentQuery {
  const p: CommentQuery = JSON.parse(JSON.stringify(cq));
  if (kind === 'statusApprove') p.status = 'approve';
  if (kind === 'typeComment') p.type = 'comment';
  if (kind === 'setTen') p.number = '10';
  if (kind === 'flatList') p.hierarchical = 'false';
  if (kind === 'clearParent') p.parent = '';
  if (kind === 'clearNumber') p.number = '';
  if (kind === 'orderGmt') p.orderby = 'comment_date_gmt';
  return p;
}

export function typeNote(cq: CommentQuery): string {
  return cq.type === 'comment'
    ? 'Only real comments. Pingbacks and trackbacks are excluded, which is what a front-end list wants.'
    : cq.type === ''
      ? 'Every row in wp_comments, including pingbacks and trackbacks from other sites.'
      : 'Only ' + cq.type + ' rows.';
}

export function plainEnglish(cq: CommentQuery): string {
  const bits: string[] = [];
  bits.push(cq.status === 'all' ? 'of every status' : cq.status === 'approve' ? 'that are approved' : 'with status ' + cq.status);
  if (cq.type) bits.push('of type ' + cq.type);
  if (String(cq.postId || '').trim()) bits.push('on post ' + String(cq.postId).trim());
  if (String(cq.postType || '').trim()) bits.push('on ' + slugify(cq.postType) + ' entries');
  if (String(cq.userId || '').trim()) bits.push('written by user ' + String(cq.userId).trim());
  if (String(cq.authorEmail || '').trim()) bits.push('from ' + String(cq.authorEmail).trim());
  if (String(cq.search || '').trim()) bits.push('containing "' + String(cq.search).trim() + '"');
  if (String(cq.parent || '').trim() !== '') bits.push(parseInt(cq.parent, 10) === 0 ? 'that are not replies' : 'replying to comment ' + parseInt(cq.parent, 10));
  const num = parseInt(cq.number, 10);
  return (cq.countOnly ? 'Count comments ' : 'Fetch comments ') + bits.join(', ') + '. '
    + (cq.countOnly ? 'Returns a single number.' : (num ? 'At most ' + num + (cq.hierarchical !== 'false' ? ' threads' : ' comments') : 'No limit') + ', ' + (cq.order === 'DESC' ? 'newest' : 'oldest') + ' first' + (cq.hierarchical !== 'false' ? ', nested as a tree.' : '.'));
}

export const OUTPUT_HINTS: Record<OutputMode, string> = {
  query: 'The class, with a loop that links each comment back to its post.',
  get_comments: 'The wrapper, feeding wp_list_comments() for themed output.',
  args: 'Just the args array.',
};

export function fileNameFor(): string {
  return 'comment-query.php';
}

export interface RefArg {
  name: string;
  type: string;
  description: string;
}

export const REF_ARGS: RefArg[] = [
  { name: 'status', type: 'string|array', description: 'approve, hold, spam, trash or all. all is not "all public" — it includes spam.' },
  { name: 'type / type__in / type__not_in', type: 'string|array', description: 'comment, pingback, trackback, or a custom type. Omitting it returns everything, pingbacks included.' },
  { name: 'post_id / post_type / post_status', type: 'mixed', description: 'Filter by what the comment is attached to. post_id is a single numeric id; post__in takes a list.' },
  { name: 'user_id / author_email / author_url', type: 'mixed', description: 'user_id only matches logged-in commenters. Guests are identified by email alone.' },
  { name: 'parent / parent__in', type: 'int|array', description: 'Direct replies to a comment. parent 0 means top-level only.' },
  { name: 'hierarchical', type: 'string|bool', description: 'false, threaded or flat. Anything but false changes what number counts.' },
  { name: 'number / offset / paged', type: 'int', description: 'No default limit — always set number on a site with real traffic.' },
  { name: 'count', type: 'bool', description: 'Returns an integer instead of rows. Ignores fields, and a number makes it wrong.' },
];

export const REF_STATUSES = padTo('approve', 12) + 'visible on the site\n' + padTo('hold', 12) + 'awaiting moderation\n' + padTo('spam', 12) + 'flagged, hidden\n' + padTo('trash', 12) + 'deleted but recoverable\n' + padTo('all', 12) + 'every one of the above';
