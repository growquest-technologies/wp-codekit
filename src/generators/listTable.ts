import { escPhp, slugify as baseSlugify, withCredit, type ValidationIssue } from '../lib/codegen';

export type OutputMode = 'plugin' | 'page';
export type ColumnType = 'text' | 'number' | 'date' | 'link' | 'status';
export type SourceType = 'table' | 'posts' | 'array';

export interface ListColumn {
  key: string;
  label: string;
  type: ColumnType;
  sortable: boolean;
  primary: boolean;
}

export interface ListTable {
  labels: string;
  className: string;
  prefix: string;
  source: SourceType;
  sourceName: string;
  perPage: string;
  capability: string;
  columns: ListColumn[];
  rowActions: string;
  bulkActions: string;
  views: string;
  search: boolean;
  screenOption: boolean;
}

export const TYPES: [ColumnType, string][] = [
  ['text', 'Text'], ['number', 'Number'], ['date', 'Date'], ['link', 'Link'], ['status', 'Status badge'],
];

function fnSlug(s: string): string {
  return baseSlugify(s).replace(/-/g, '_');
}
function slug(s: string): string {
  return baseSlugify(s);
}
function pascal(s: string): string {
  return String(s || '').split(/[^A-Za-z0-9]+/).filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('_');
}
function indent(text: string, depth: number): string {
  const pad = '\t'.repeat(depth);
  return text.split('\n').map((l) => (l ? pad + l : '')).join('\n');
}
function aligned(pairs: [string, string][]): string {
  const w = pairs.reduce((m, p) => Math.max(m, p[0].length), 0);
  return pairs.map((p) => "'" + p[0] + "'" + ' '.repeat(w - p[0].length) + ' => ' + p[1] + ',').join('\n');
}
export interface ActionPair {
  value: string;
  label: string;
}
function pairs(str: string): ActionPair[] {
  return String(str || '')
    .split(',')
    .map((part) => {
      const p = part.trim();
      if (!p) return null;
      const i = p.indexOf(':');
      const v = fnSlug(i >= 0 ? p.slice(0, i) : p);
      const l = i >= 0 ? p.slice(i + 1).trim() : p.charAt(0).toUpperCase() + p.slice(1);
      return v ? { value: v, label: l || v } : null;
    })
    .filter((x): x is ActionPair => x != null);
}

export interface DerivedListTable {
  pre: string;
  singular: string;
  plural: string;
  cls: string;
  td: string;
  columns: ListColumn[];
  rowActions: ActionPair[];
  bulkActions: ActionPair[];
  views: ActionPair[];
  nonceAction: string;
}

export function derive(lt: ListTable): DerivedListTable {
  const parts = String(lt.labels || 'item, items').split(',');
  const singular = slug(parts[0]) || 'item';
  const plural = slug(parts[1] || '') || singular + 's';
  const pre = fnSlug(lt.prefix) || 'acme';
  return {
    pre, singular, plural,
    cls: pascal(lt.className) || 'Acme_Items_Table',
    td: pre.replace(/_/g, '-'),
    columns: (lt.columns || []).map((c) => ({ ...c, key: fnSlug(c.key) || 'col' })),
    rowActions: pairs(lt.rowActions),
    bulkActions: pairs(lt.bulkActions),
    views: pairs(lt.views),
    nonceAction: pre + '_bulk_' + (slug(parts[1] || '') || 'items'),
  };
}

export function buildCode(lt: ListTable, mode: OutputMode): string {
  const d = derive(lt);
  const pre = d.pre;
  const t = (s: string) => "__( '" + escPhp(s) + "', '" + d.td + "' )";
  const primary = d.columns.filter((c) => c.primary)[0] || d.columns[0];
  const perPage = parseInt(lt.perPage, 10) || 20;

  if (mode === 'page') {
    return withCredit(
      '<?php\n/**\n * The admin page that renders the table.\n */\nfunction ' +
        pre +
        '_render_' +
        d.plural +
        "_page() {\n\tif ( ! current_user_can( '" +
        lt.capability +
        "' ) ) {\n\t\treturn;\n\t}\n\n\t$table = new " +
        d.cls +
        '();\n\t$table->prepare_items();\n\t?>\n\t<div class="wrap">\n\t\t<h1><?php echo esc_html( get_admin_page_title() ); ?></h1>\n\t\t<form method="get">\n\t\t\t<input type="hidden" name="page" value="' +
        pre +
        '-' +
        d.plural +
        '" />\n\t\t\t<?php\n' +
        (lt.views ? '\t\t\t$table->views();\n' : '') +
        (lt.search ? '\t\t\t$table->search_box( ' + t('Search ' + d.plural) + ", '" + pre + "-search' );\n" : '') +
        '\t\t\t$table->display();\n\t\t\t?>\n\t\t</form>\n\t</div>\n\t<?php\n}\n\n/**\n * Add the page and remember the per-page option.\n */\nfunction ' +
        pre +
        '_' +
        d.plural +
        '_menu() {\n\t$hook = add_menu_page(\n\t\t' +
        t(d.plural.charAt(0).toUpperCase() + d.plural.slice(1)) +
        ',\n\t\t' +
        t(d.plural.charAt(0).toUpperCase() + d.plural.slice(1)) +
        ",\n\t\t'" +
        lt.capability +
        "',\n\t\t'" +
        pre +
        '-' +
        d.plural +
        "',\n\t\t'" +
        pre +
        '_render_' +
        d.plural +
        "_page',\n\t\t'dashicons-list-view'\n\t);\n\n\tadd_action( \"load-{$hook}\", function () {\n\t\tadd_screen_option(\n\t\t\t'per_page',\n\t\t\tarray(\n\t\t\t\t'label'   => " +
        t('Per page') +
        ",\n\t\t\t\t'default' => " +
        perPage +
        ",\n\t\t\t\t'option'  => '" +
        pre +
        '_' +
        d.plural +
        "_per_page',\n\t\t\t)\n\t\t);\n\t} );\n}\nadd_action( 'admin_menu', '" +
        pre +
        '_' +
        d.plural +
        "_menu' );\n\n/**\n * Screen options only save when the option is allowed.\n */\nadd_filter(\n\t'set-screen-option',\n\tfunction ( $status, $option, $value ) {\n\t\treturn '" +
        pre +
        '_' +
        d.plural +
        "_per_page' === $option ? (int) $value : $status;\n\t},\n\t10,\n\t3\n);\n"
    );
  }

  let out = '';
  if (mode === 'plugin') {
    out += '<?php\n/**\n * Plugin Name:       ' + d.plural.charAt(0).toUpperCase() + d.plural.slice(1) + ' list table\n * Description:       An admin table of ' + d.plural + ' with sorting, search and bulk actions.\n * Version:           1.0.0\n * Requires PHP:      7.4\n */\n\ndefined( \'ABSPATH\' ) || exit;\n\n';
  } else {
    out += "<?php\n\ndefined( 'ABSPATH' ) || exit;\n\n";
  }
  out += "if ( ! class_exists( 'WP_List_Table' ) ) {\n\trequire_once ABSPATH . 'wp-admin/includes/class-wp-list-table.php';\n}\n\n";

  out += '/**\n * A table of ' + d.plural + '.\n */\nclass ' + d.cls + ' extends WP_List_Table {\n\n';
  out += "\t/**\n\t * Tell the parent what one row is called.\n\t */\n\tpublic function __construct() {\n\t\tparent::__construct(\n\t\t\tarray(\n\t\t\t\t'singular' => '" + d.singular + "',\n\t\t\t\t'plural'   => '" + d.plural + "',\n\t\t\t\t'ajax'     => false,\n\t\t\t)\n\t\t);\n\t}\n\n";

  const colPairs: [string, string][] = [];
  if (d.bulkActions.length) colPairs.push(['cb', "'<input type=\"checkbox\" />'"]);
  d.columns.forEach((c) => colPairs.push([c.key, t(c.label || c.key)]));
  out += '\t/**\n\t * The columns, in order.\n\t *\n\t * @return array\n\t */\n\tpublic function get_columns() {\n\t\treturn array(\n' + indent(aligned(colPairs), 3) + '\n\t\t);\n\t}\n\n';

  const sortable = d.columns.filter((c) => c.sortable);
  out +=
    '\t/**\n\t * Which columns can be sorted, and which is sorted by default.\n\t *\n\t * @return array\n\t */\n\tpublic function get_sortable_columns() {\n\t\treturn array(\n' +
    (sortable.length ? indent(aligned(sortable.map((c, i) => [c.key, "array( '" + c.key + "', " + (i === 0 ? 'true' : 'false') + ' )'] as [string, string])), 3) : '') +
    '\n\t\t);\n\t}\n\n';

  if (primary) {
    out += "\t/**\n\t * Which column carries the row actions.\n\t *\n\t * @return string\n\t */\n\tprotected function get_default_primary_column_name() {\n\t\treturn '" + primary.key + "';\n\t}\n\n";
  }

  if (d.bulkActions.length) {
    out +=
      '\t/**\n\t * The checkbox column.\n\t *\n\t * @param array $item One row.\n\t * @return string\n\t */\n\tpublic function column_cb( $item ) {\n\t\treturn sprintf(\n\t\t\t\'<input type="checkbox" name="' +
      d.plural +
      '[]" value="%s" />\',\n\t\t\tesc_attr( $item[\'id\'] )\n\t\t);\n\t}\n\n';
    out += '\t/**\n\t * The bulk actions dropdown.\n\t *\n\t * @return array\n\t */\n\tpublic function get_bulk_actions() {\n\t\treturn array(\n' + indent(aligned(d.bulkActions.map((a) => [a.value, t(a.label)] as [string, string])), 3) + '\n\t\t);\n\t}\n\n';
    out +=
      "\t/**\n\t * Run a bulk action. Called before anything is fetched.\n\t */\n\tprotected function process_bulk_action() {\n\t\t$action = $this->current_action();\n\n\t\tif ( ! $action ) {\n\t\t\treturn;\n\t\t}\n\n\t\tcheck_admin_referer( 'bulk-' . $this->_args['plural'] );\n\n\t\tif ( ! current_user_can( '" +
      lt.capability +
      "' ) ) {\n\t\t\twp_die( esc_html__( 'You are not allowed to do that.', '" +
      d.td +
      "' ) );\n\t\t}\n\n\t\t$ids = isset( $_REQUEST['" +
      d.plural +
      "'] ) ? array_map( 'absint', (array) $_REQUEST['" +
      d.plural +
      "'] ) : array();\n\n\t\tif ( ! $ids ) {\n\t\t\treturn;\n\t\t}\n\n\t\tswitch ( $action ) {\n" +
      indent(d.bulkActions.map((a) => "case '" + a.value + "':\n\t// " + a.label + ' — act on $ids here.\n\tbreak;').join('\n\n'), 3) +
      '\n\t\t}\n\t}\n\n';
  }

  if (d.views.length) {
    out +=
      "\t/**\n\t * The status links above the table.\n\t *\n\t * @return array\n\t */\n\tprotected function get_views() {\n\t\t$current = isset( $_REQUEST['status'] ) ? sanitize_key( $_REQUEST['status'] ) : 'all';\n\t\t$base    = remove_query_arg( array( 'status', 'paged' ) );\n\t\t$views   = array();\n\n" +
      indent(
        d.views
          .map(
            (v) =>
              "$views['" +
              v.value +
              "'] = sprintf(\n\t'<a href=\"%1$s\"%2$s>%3$s</a>',\n\tesc_url( add_query_arg( 'status', '" +
              v.value +
              "', $base ) ),\n\t'" +
              v.value +
              "' === $current ? ' class=\"current\"' : '',\n\tesc_html( " +
              t(v.label) +
              ' )\n);'
          )
          .join('\n\n'),
        2
      ) +
      '\n\n\t\treturn $views;\n\t}\n\n';
  }

  d.columns.forEach((c) => {
    if (c === primary && d.rowActions.length) {
      out +=
        '\t/**\n\t * The primary column, with its row actions.\n\t *\n\t * @param array $item One row.\n\t * @return string\n\t */\n\tpublic function column_' +
        c.key +
        '( $item ) {\n\t\t$actions = array(\n' +
        indent(
          d.rowActions
            .map(
              (a) =>
                "'" +
                a.value +
                "' => sprintf(\n\t'<a href=\"%1$s\"" +
                (a.value === 'delete' ? ' class="submitdelete"' : '') +
                '>%2$s</a>\',\n\tesc_url( wp_nonce_url( add_query_arg( array( \'action\' => \'' +
                a.value +
                "', '" +
                d.singular +
                "' => $item['id'] ) ), '" +
                pre +
                '_' +
                a.value +
                "_' . $item['id'] ) ),\n\tesc_html( " +
                t(a.label) +
                ' )\n),'
            )
            .join('\n'),
          3
        ) +
        '\n\t\t);\n\n\t\treturn sprintf(\n\t\t\t\'<strong>%1$s</strong>%2$s\',\n\t\t\tesc_html( $item[\'' +
        c.key +
        "'] ),\n\t\t\t$this->row_actions( $actions )\n\t\t);\n\t}\n\n";
    } else if (c.type === 'status') {
      out +=
        '\t/**\n\t * @param array $item One row.\n\t * @return string\n\t */\n\tpublic function column_' +
        c.key +
        '( $item ) {\n\t\treturn sprintf(\n\t\t\t\'<span class="' +
        pre +
        '-status ' +
        pre +
        '-status--%1$s">%2$s</span>\',\n\t\t\tesc_attr( $item[\'' +
        c.key +
        "'] ),\n\t\t\tesc_html( ucfirst( $item['" +
        c.key +
        "'] ) )\n\t\t);\n\t}\n\n";
    } else if (c.type === 'date') {
      out += '\t/**\n\t * @param array $item One row.\n\t * @return string\n\t */\n\tpublic function column_' + c.key + '( $item ) {\n\t\treturn esc_html( mysql2date( get_option( \'date_format\' ), $item[\'' + c.key + "'] ) );\n\t}\n\n";
    } else if (c.type === 'number') {
      out += '\t/**\n\t * @param array $item One row.\n\t * @return string\n\t */\n\tpublic function column_' + c.key + '( $item ) {\n\t\treturn esc_html( number_format_i18n( (int) $item[\'' + c.key + "'] ) );\n\t}\n\n";
    }
  });

  out += "\t/**\n\t * Anything without its own column_ method lands here.\n\t *\n\t * @param array  $item        One row.\n\t * @param string $column_name The column.\n\t * @return string\n\t */\n\tpublic function column_default( $item, $column_name ) {\n\t\treturn isset( $item[ $column_name ] ) ? esc_html( $item[ $column_name ] ) : '';\n\t}\n\n";

  out += "\t/**\n\t * Shown when there is nothing to list.\n\t */\n\tpublic function no_items() {\n\t\tesc_html_e( 'No " + d.plural + " yet.', '" + d.td + "' );\n\t}\n\n";

  let fetch = '';
  if (lt.source === 'table') {
    fetch =
      "global $wpdb;\n\n$table   = $wpdb->prefix . '" +
      fnSlug(lt.sourceName) +
      "';\n$orderby = isset( $_REQUEST['orderby'] ) ? sanitize_key( $_REQUEST['orderby'] ) : '" +
      (sortable[0] ? sortable[0].key : 'id') +
      "';\n$order   = isset( $_REQUEST['order'] ) && 'desc' === strtolower( $_REQUEST['order'] ) ? 'DESC' : 'ASC';\n$search  = isset( $_REQUEST['s'] ) ? sanitize_text_field( wp_unslash( $_REQUEST['s'] ) ) : '';\n\n// Only ever sort by a column you declared sortable.\n$allowed = array_keys( $this->get_sortable_columns() );\n\nif ( ! in_array( $orderby, $allowed, true ) ) {\n\t$orderby = '" +
      (sortable[0] ? sortable[0].key : 'id') +
      "';\n}\n\n$where = 'WHERE 1=1';\n$args  = array();\n\nif ( '' !== $search ) {\n\t$where .= ' AND " +
      (primary ? primary.key : 'id') +
      " LIKE %s';\n\t$args[] = '%' . $wpdb->esc_like( $search ) . '%';\n}\n\n$args[] = $per_page;\n$args[] = $offset;\n\n// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared\n$sql = \"SELECT * FROM {$table} {$where} ORDER BY {$orderby} {$order} LIMIT %d OFFSET %d\";\n\n$items = $wpdb->get_results( $wpdb->prepare( $sql, $args ), ARRAY_A );\n$total = (int) $wpdb->get_var( \"SELECT COUNT(*) FROM {$table} {$where}\" );";
  } else if (lt.source === 'posts') {
    fetch =
      '$query = new WP_Query(\n\tarray(\n\t\t\'post_type\'      => \'' +
      slug(lt.sourceName) +
      "',\n\t\t'post_status'    => 'any',\n\t\t'posts_per_page' => $per_page,\n\t\t'offset'         => $offset,\n\t\t's'              => isset( $_REQUEST['s'] ) ? sanitize_text_field( wp_unslash( $_REQUEST['s'] ) ) : '',\n\t)\n);\n\n$items = array_map(\n\tfunction ( $post ) {\n\t\treturn array(\n\t\t\t'id'    => $post->ID,\n\t\t\t'" +
      (primary ? primary.key : 'title') +
      "' => get_the_title( $post ),\n\t\t\t'date'  => $post->post_date,\n\t\t);\n\t},\n\t$query->posts\n);\n\n$total = (int) $query->found_posts;";
  } else {
    fetch =
      '$all = ' +
      pre +
      "_get_" +
      d.plural +
      "();\n\n$search = isset( $_REQUEST['s'] ) ? strtolower( sanitize_text_field( wp_unslash( $_REQUEST['s'] ) ) ) : '';\n\nif ( '' !== $search ) {\n\t$all = array_filter(\n\t\t$all,\n\t\tfunction ( $item ) use ( $search ) {\n\t\t\treturn false !== strpos( strtolower( implode( ' ', $item ) ), $search );\n\t\t}\n\t);\n}\n\n$total = count( $all );\n$items = array_slice( $all, $offset, $per_page );";
  }

  out += '\t/**\n\t * Fetch, paginate and hand the rows to the parent.\n\t *\n\t * Order matters: bulk action, then fetch, then pagination, then items.\n\t */\n\tpublic function prepare_items() {\n\t\t$this->_column_headers = array( $this->get_columns(), array(), $this->get_sortable_columns() );\n\n';
  if (d.bulkActions.length) out += '\t\t$this->process_bulk_action();\n\n';
  out +=
    "\t\t$per_page = $this->get_items_per_page( '" +
    pre +
    '_' +
    d.plural +
    "_per_page', " +
    perPage +
    ' );\n\t\t$paged    = $this->get_pagenum();\n\t\t$offset   = ( $paged - 1 ) * $per_page;\n\n' +
    indent(fetch, 2) +
    "\n\n\t\t$this->set_pagination_args(\n\t\t\tarray(\n\t\t\t\t'total_items' => $total,\n\t\t\t\t'per_page'    => $per_page,\n\t\t\t\t'total_pages' => (int) ceil( $total / $per_page ),\n\t\t\t)\n\t\t);\n\n\t\t$this->items = $items;\n\t}\n}\n";

  if (lt.source === 'array') {
    out += '\n/**\n * The rows. Replace with your own source.\n *\n * @return array\n */\nfunction ' + pre + '_get_' + d.plural + '() {\n\treturn array();\n}\n';
  }
  return withCredit(out);
}

export function freshProject(): ListTable {
  return {
    labels: 'brief, briefs', className: 'Acme_Briefs_Table', prefix: 'acme',
    source: 'table', sourceName: 'acme_briefs', perPage: '20', capability: 'edit_others_posts',
    columns: [
      { key: 'title', label: 'Title', type: 'text', sortable: true, primary: true },
      { key: 'author', label: 'Author', type: 'text', sortable: false, primary: false },
      { key: 'status', label: 'Status', type: 'status', sortable: true, primary: false },
      { key: 'created', label: 'Created', type: 'date', sortable: true, primary: false },
    ],
    rowActions: 'edit:Edit, delete:Delete',
    bulkActions: 'delete:Delete permanently',
    views: 'all:All, draft:Drafts, review:In review',
    search: true, screenOption: true,
  };
}

export function validate(lt: ListTable): ValidationIssue[] {
  const d = derive(lt);
  const out: ValidationIssue[] = [];
  const add = (severity: ValidationIssue['severity'], message: string, targetId?: string, fix?: string, fixLabel?: string) => out.push({ severity, message, targetId, fix, fixLabel });

  if (!d.columns.length) add('error', 'No columns, so get_columns() returns an empty array and the table renders nothing.', 'columns');
  if (String(lt.labels || '').indexOf(',') === -1) add('warning', 'Give both a singular and a plural, comma separated — the plural becomes the bulk-action field name and the nonce.', 'labels', 'fixLabels', 'Use ' + d.singular + ', ' + d.plural);
  if (!pascal(lt.className)) add('error', 'A class name is required.', 'className');
  if (!String(lt.sourceName || '').trim()) add('error', (lt.source === 'posts' ? 'A post type' : lt.source === 'table' ? 'A table name' : 'A source name') + ' is required.', 'sourceName');
  const seen: Record<string, boolean> = {};
  d.columns.forEach((c) => {
    if (seen[c.key]) add('error', 'Two columns share the key "' + c.key + '".', 'columns');
    seen[c.key] = true;
    if (c.key === 'cb') add('error', '"cb" is reserved for the checkbox column — rename this one.', 'columns');
    if (!String(c.label || '').trim()) add('warning', 'The column "' + c.key + '" has no label, so its header is blank.', 'columns');
  });
  const primaries = d.columns.filter((c) => c.primary);
  if (!primaries.length) add('warning', 'No primary column, so row actions attach to the first column by default and the mobile toggle has nothing to expand.', 'columns', 'setPrimary', 'Make the first one primary');
  if (primaries.length > 1) add('error', primaries.length + ' columns are marked primary. Only one can be.', 'columns', 'onePrimary', 'Keep the first');
  if (!d.columns.some((c) => c.sortable)) add('recommendation', 'Nothing is sortable. On a list of any length, sorting is the first thing a user reaches for.', 'columns', 'makeSortable', 'Make the first sortable');
  if (d.bulkActions.length && !d.columns.length) add('error', 'Bulk actions need a checkbox column, which needs at least one real column beside it.', 'bulkActions');
  if (d.bulkActions.some((a) => a.value === 'delete')) add('recommendation', 'A delete bulk action is generated with check_admin_referer() and a capability check. Keep both — a bulk delete behind a GET link is the classic list-table vulnerability.', 'bulkActions');
  if (!d.bulkActions.length) add('recommendation', 'No bulk actions, so no checkbox column is rendered. Fine for a read-only log.', 'bulkActions');
  if (!lt.search && lt.source !== 'array') add('recommendation', 'No search box. The query is written to accept an s parameter either way, so turning it on is free.', 'search', 'addSearch', 'Add the search box');
  if (lt.source === 'table') {
    add('recommendation', 'The generated query interpolates the sorted column, but only after checking it against get_sortable_columns() — that whitelist is what makes it safe. Do not loosen it.', 'source');
    if (!fnSlug(lt.sourceName)) add('error', 'The table name must be a plain identifier; the $wpdb prefix is added for you.', 'sourceName');
  }
  if (lt.source === 'posts') add('recommendation', 'For a post type, the core posts list table already gives you sorting, search, bulk edit and quick edit. A custom table is worth it only when you need columns core cannot show.', 'source');
  const per = parseInt(lt.perPage, 10);
  if (!per) add('error', 'Set a per-page default.', 'perPage');
  else if (per > 100) add('warning', per + ' rows per page is a lot of DOM for an admin screen. Twenty to fifty is typical, and the screen option lets users raise it.', 'perPage');
  if (!lt.screenOption) add('recommendation', 'Without a screen option, users cannot change the per-page count — and get_items_per_page() will always fall back to your default.', 'screenOption', 'addScreenOption', 'Add the screen option');
  if (d.views.length && !d.views.some((v) => v.value === 'all')) add('warning', 'The views list has no "all" entry, so there is no way back to the unfiltered table.', 'views', 'addAll', 'Add all');
  add('recommendation', 'WP_List_Table is marked @access private in core. It has been stable for years, but test this screen after every major WordPress release.', undefined);
  return out;
}

export function applyFix(lt: ListTable, kind: string): ListTable {
  const p: ListTable = JSON.parse(JSON.stringify(lt));
  const d = derive(p);
  if (kind === 'fixLabels') p.labels = d.singular + ', ' + d.plural;
  if (kind === 'setPrimary' && p.columns.length) p.columns[0].primary = true;
  if (kind === 'onePrimary') {
    let seen = false;
    p.columns.forEach((c) => {
      if (c.primary) {
        if (seen) c.primary = false;
        seen = true;
      }
    });
  }
  if (kind === 'makeSortable' && p.columns.length) p.columns[0].sortable = true;
  if (kind === 'addSearch') p.search = true;
  if (kind === 'addScreenOption') p.screenOption = true;
  if (kind === 'addAll') p.views = 'all:All' + (String(p.views || '').trim() ? ', ' + p.views : '');
  return p;
}
