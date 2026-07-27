import { useMemo, useRef, useState } from 'react';
import { GeneratorShell } from '../../components/generator/GeneratorShell';
import { Collapsible } from '../../components/ui/Collapsible';
import { Toggle, ToggleRow } from '../../components/ui/Toggle';
import { useEditorState } from '../../lib/useEditorState';
import {
  TYPES,
  applyFix,
  buildCode,
  derive,
  freshProject,
  validate,
  type ColumnType,
  type ListTable,
  type OutputMode,
} from '../../generators/listTable';
import { slugify } from '../../lib/codegen';

const OUTPUT_MODES: { id: OutputMode; label: string }[] = [
  { id: 'plugin', label: 'The class' },
  { id: 'page', label: 'Admin page' },
];

const SAMPLE_ROWS: Record<string, string>[] = [
  { title: 'Winter campaign brief', author: 'Sam', status: 'review', created: '12 Jul 2026' },
  { title: 'Pricing page rewrite', author: 'Ada', status: 'draft', created: '9 Jul 2026' },
  { title: 'Northwind case study', author: 'Sam', status: 'draft', created: '2 Jul 2026' },
];

const REF_ARGS = [
  { name: '__construct()', description: 'Pass singular and plural. The plural names the bulk-action field and the nonce, so changing it later breaks in-flight forms.' },
  { name: 'get_columns()', description: 'Key to label. A "cb" key renders the checkbox column, and its callback must be column_cb().' },
  { name: 'get_sortable_columns()', description: 'Key to array( orderby, already_sorted ). Also the whitelist you must check the request against before putting it in SQL.' },
  { name: 'column_default( $item, $column )', description: 'The fallback for any column with no column_{key} method. Escape here.' },
  { name: 'prepare_items()', description: 'Bulk action, fetch, set_pagination_args(), then $this->items. In that order.' },
  { name: 'get_views()', description: 'The status links above the table. Mark the current one with class="current".' },
  { name: 'row_actions( $actions )', description: 'The hover links under the primary column. Nonce every destructive one.' },
  { name: 'display() / search_box()', description: 'Called from your page callback, inside a form with the page hidden field.' },
];

export function ListTableGenerator() {
  const { state: lt, commit, undo, redo, reset, canUndo, canRedo, savedLabel } = useEditorState<ListTable>('list-table-generator-v1', freshProject);
  const [outputMode, setOutputMode] = useState<OutputMode>('plugin');
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});

  const d = useMemo(() => derive(lt), [lt]);
  const code = useMemo(() => buildCode(lt, outputMode), [lt, outputMode]);
  const issues = useMemo(() => validate(lt), [lt]);
  const fileName = outputMode === 'page' ? d.pre.replace(/_/g, '-') + '-' + d.plural + '-page.php' : 'class-' + slugify(d.cls) + '.php';

  function focusField(id: string) {
    fieldRefs.current[id]?.focus();
  }
  function fix(kind: string) {
    commit((draft) => Object.assign(draft, applyFix(draft, kind)));
  }
  function addColumn() {
    commit((p) => {
      p.columns = p.columns || [];
      const n = p.columns.length + 1;
      p.columns.push({ key: 'col_' + n, label: 'Column ' + n, type: 'text', sortable: false, primary: false });
    });
  }

  const columnsNote = `${d.columns.length} column${d.columns.length === 1 ? '' : 's'} · ${d.columns.filter((c) => c.sortable).length} sortable`;
  const actionsNote = `${d.rowActions.length} row · ${d.bulkActions.length} bulk · ${d.views.length} views`;

  const pageTitle = d.plural.charAt(0).toUpperCase() + d.plural.slice(1);
  const previewViews = d.views.map((v, i) => ({
    label: v.label,
    count: i === 0 ? '24' : i === 1 ? '18' : '6',
    color: i === 0 ? '#1D2327' : '#2271B1',
    weight: i === 0 ? 600 : 400,
  }));
  const previewBulk = d.bulkActions.map((a) => ({ value: a.value, label: a.label }));
  const previewColumns = d.columns.map((c) => ({ label: c.label || c.key, sortMark: c.sortable ? ' ↕' : '' }));
  const previewRows = SAMPLE_ROWS.map((row) => ({
    cells: d.columns.map((c, i) => {
      const val = row[c.key] !== undefined ? row[c.key] : c.type === 'number' ? '12' : c.type === 'date' ? '1 Jul 2026' : '—';
      return { text: val, color: c.primary || i === 0 ? '#2271B1' : '#2C3338', weight: c.primary || i === 0 ? 600 : 400 };
    }),
  }));
  const paginationLabel = `3 ${d.plural} · ${parseInt(lt.perPage, 10) || 20} per page`;

  return (
    <GeneratorShell
      category="admin"
      title="List Table Generator"
      description={<>A WP_List_Table subclass with sortable columns, row and bulk actions, search and the admin page that renders it.</>}
      form={
        <div>
          <div className="field-card field-card-primary">
            <div className="field-card-title">The table</div>
            <div className="field-group">
              <label className="field-label" htmlFor="lt-labels">Labels (singular, plural)</label>
              <input id="lt-labels" ref={(el) => (fieldRefs.current.labels = el)} className="input" value={lt.labels} onChange={(e) => commit((p) => (p.labels = e.target.value), 'labels')} placeholder="brief, briefs" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label className="field-label" htmlFor="lt-class">Class name</label>
                <input id="lt-class" ref={(el) => (fieldRefs.current.className = el)} className="input gfw-mono" value={lt.className} onChange={(e) => commit((p) => (p.className = e.target.value), 'className')} placeholder="Acme_Briefs_Table" />
              </div>
              <div>
                <label className="field-label" htmlFor="lt-prefix">Prefix</label>
                <input id="lt-prefix" className="input gfw-mono" value={lt.prefix} onChange={(e) => commit((p) => (p.prefix = e.target.value), 'prefix')} placeholder="acme" />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label className="field-label" htmlFor="lt-source">Data source</label>
                <select id="lt-source" className="select" value={lt.source} onChange={(e) => commit((p) => (p.source = e.target.value as ListTable['source']))}>
                  <option value="table">Custom $wpdb table</option>
                  <option value="posts">Post type</option>
                  <option value="array">Array (your own function)</option>
                </select>
              </div>
              <div>
                <label className="field-label" htmlFor="lt-sourcename">
                  {lt.source === 'posts' ? 'Post type' : lt.source === 'table' ? 'Table name (no prefix)' : 'Source function suffix'}
                </label>
                <input id="lt-sourcename" ref={(el) => (fieldRefs.current.sourceName = el)} className="input gfw-mono" value={lt.sourceName} onChange={(e) => commit((p) => (p.sourceName = e.target.value), 'sourceName')} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label className="field-label" htmlFor="lt-perpage">Per page</label>
                <input id="lt-perpage" ref={(el) => (fieldRefs.current.perPage = el)} className="input gfw-mono" value={lt.perPage} onChange={(e) => commit((p) => (p.perPage = e.target.value), 'perPage')} placeholder="20" />
              </div>
              <div>
                <label className="field-label" htmlFor="lt-cap">Capability</label>
                <input id="lt-cap" className="input gfw-mono" value={lt.capability} onChange={(e) => commit((p) => (p.capability = e.target.value), 'capability')} placeholder="edit_others_posts" />
              </div>
            </div>
          </div>

          <div className="field-card" ref={(el) => (fieldRefs.current.columns = el as unknown as HTMLElement)}>
            <div className="field-card-header">
              <div className="field-card-title">Columns</div>
              <div className="field-card-desc">{columnsNote}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {lt.columns.map((c, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <input className="input" style={{ flex: 1, minWidth: 110 }} placeholder="Title" value={c.label} onChange={(e) => commit((p) => (p.columns[i].label = e.target.value))} />
                  <input className="input gfw-mono" style={{ width: 100 }} placeholder="title" value={c.key} onChange={(e) => commit((p) => (p.columns[i].key = e.target.value))} />
                  <select className="select" style={{ width: 130 }} value={c.type} onChange={(e) => commit((p) => (p.columns[i].type = e.target.value as ColumnType))}>
                    {TYPES.map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                    <Toggle checked={c.sortable} onChange={(v) => commit((p) => (p.columns[i].sortable = v))} ariaLabel="Sortable" />
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--gfw-text-strong)' }}>Sortable</span>
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                    <Toggle checked={c.primary} onChange={() => commit((p) => { const next = !p.columns[i].primary; p.columns.forEach((o) => (o.primary = false)); p.columns[i].primary = next; })} ariaLabel="Primary" />
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--gfw-text-strong)' }}>Primary</span>
                  </span>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => commit((p) => p.columns.splice(i, 1))}>Remove</button>
                </div>
              ))}
              {lt.columns.length === 0 && <div className="field-hint">No columns yet.</div>}
            </div>
            <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={addColumn}>Add column</button>
          </div>

          <div className="field-card">
            <div className="field-card-header">
              <div className="field-card-title">Actions</div>
              <div className="field-card-desc">{actionsNote}</div>
            </div>
            <div className="field-group">
              <label className="field-label" htmlFor="lt-rowactions">Row actions (value:Label, comma separated)</label>
              <input id="lt-rowactions" className="input gfw-mono" value={lt.rowActions} onChange={(e) => commit((p) => (p.rowActions = e.target.value), 'rowActions')} placeholder="edit:Edit, delete:Delete" />
            </div>
            <div className="field-group" ref={(el) => (fieldRefs.current.bulkActions = el as unknown as HTMLElement)}>
              <label className="field-label" htmlFor="lt-bulkactions">Bulk actions</label>
              <input id="lt-bulkactions" className="input gfw-mono" value={lt.bulkActions} onChange={(e) => commit((p) => (p.bulkActions = e.target.value), 'bulkActions')} placeholder="delete:Delete permanently" />
            </div>
            <div className="field-group" ref={(el) => (fieldRefs.current.views = el as unknown as HTMLElement)}>
              <label className="field-label" htmlFor="lt-views">Status views</label>
              <input id="lt-views" className="input gfw-mono" value={lt.views} onChange={(e) => commit((p) => (p.views = e.target.value), 'views')} placeholder="all:All, draft:Drafts, review:In review" />
            </div>
          </div>

          <Collapsible title="Extras" defaultOpen>
            <div className="toggle-card">
              <div className="toggle-card-title">Table extras</div>
              <ToggleRow
                label="Search box"
                help="search_box() above the table, wired to the s parameter."
                checked={lt.search}
                onChange={(v) => commit((p) => (p.search = v))}
                toggleRef={(el) => (fieldRefs.current.search = el)}
              />
              <ToggleRow
                label="Per-page screen option"
                help="add_screen_option plus the set-screen-option filter that lets it save."
                checked={lt.screenOption}
                onChange={(v) => commit((p) => (p.screenOption = v))}
                toggleRef={(el) => (fieldRefs.current.screenOption = el)}
              />
            </div>
          </Collapsible>
        </div>
      }
      code={code}
      filename={fileName}
      editor={{ canUndo, canRedo, onUndo: undo, onRedo: redo, onNew: reset, savedLabel }}
      issues={issues}
      onFix={fix}
      onFocusField={focusField}
      outputModes={OUTPUT_MODES}
      activeOutputMode={outputMode}
      onOutputModeChange={(id) => setOutputMode(id as OutputMode)}
      secondaryTab={{
        label: 'Screen',
        content: (
          <div style={{ background: '#F0F0F1', margin: '-14px -16px -18px', padding: '16px 18px 40px' }}>
            <h1 style={{ margin: '0 0 12px', fontSize: 23, fontWeight: 400, color: '#1D2327' }}>{pageTitle}</h1>
            {d.views.length > 0 && (
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 13, marginBottom: 10 }}>
                {previewViews.map((pv, i) => (
                  <span key={i} style={{ color: pv.color, fontWeight: pv.weight }}>
                    {pv.label} <span style={{ color: '#787C82' }}>({pv.count})</span>
                  </span>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {d.bulkActions.length > 0 && (
                  <>
                    <select style={{ fontSize: 13, padding: '3px 6px', border: '1px solid #8C8F94', borderRadius: 3, background: '#fff' }}>
                      <option value="">Bulk actions</option>
                      {previewBulk.map((pb) => (
                        <option key={pb.value} value={pb.value}>{pb.label}</option>
                      ))}
                    </select>
                    <span style={{ fontSize: 13, padding: '3px 10px', border: '1px solid #8C8F94', borderRadius: 3, background: '#F6F7F7', color: '#2C3338' }}>Apply</span>
                  </>
                )}
              </div>
              {lt.search && (
                <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                  <input value="" readOnly placeholder={`Search ${d.plural}`} style={{ fontSize: 13, padding: '3px 7px', border: '1px solid #8C8F94', borderRadius: 3, background: '#fff', width: 150 }} />
                  <span style={{ fontSize: 13, padding: '3px 10px', border: '1px solid #8C8F94', borderRadius: 3, background: '#F6F7F7', color: '#2C3338' }}>Search</span>
                </div>
              )}
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', border: '1px solid #C3C4C7', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #C3C4C7' }}>
                  {d.bulkActions.length > 0 && (
                    <th style={{ width: 28, padding: '8px 6px', textAlign: 'left' }}><input type="checkbox" readOnly style={{ width: 15, height: 15 }} /></th>
                  )}
                  {previewColumns.map((pc, i) => (
                    <th key={i} style={{ padding: '8px 8px', textAlign: 'left', fontWeight: 600, color: '#2271B1', whiteSpace: 'nowrap' }}>{pc.label}{pc.sortMark}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((pr, ri) => (
                  <tr key={ri} style={{ borderBottom: '1px solid #F0F0F1' }}>
                    {d.bulkActions.length > 0 && (
                      <td style={{ padding: '8px 6px' }}><input type="checkbox" readOnly style={{ width: 15, height: 15 }} /></td>
                    )}
                    {pr.cells.map((pcell, ci) => (
                      <td key={ci} style={{ padding: '8px 8px', color: pcell.color, fontWeight: pcell.weight }}>{pcell.text}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: 8, textAlign: 'right', fontSize: 13, color: '#787C82' }}>{paginationLabel}</div>
          </div>
        ),
      }}
      extraSecondaryTabs={[
        {
          label: 'Reference',
          content: (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <div className="gfw-mono" style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 4 }}>extends WP_List_Table</div>
              <div style={{ fontSize: 12, color: 'var(--gfw-text-mutest)', marginBottom: 14 }}>A private core class you are officially not supposed to extend</div>

              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>Methods you override</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 18 }}>
                {REF_ARGS.map((ra) => (
                  <div key={ra.name} style={{ borderBottom: '1px solid var(--gfw-border)', paddingBottom: 9 }}>
                    <div className="gfw-mono" style={{ fontSize: 12.5, fontWeight: 700 }}>{ra.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--gfw-text-muted)', lineHeight: 1.5, marginTop: 3 }}>{ra.description}</div>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>The require nobody expects</div>
              <pre className="gfw-mono" style={{ border: '1px solid var(--gfw-border)', borderRadius: 7, padding: '12px 14px', background: 'var(--gfw-surface-sunken)', fontSize: 11.5, lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: 8 }}>{"if ( ! class_exists( 'WP_List_Table' ) ) {\n\trequire_once ABSPATH . 'wp-admin/includes/class-wp-list-table.php';\n}"}</pre>
              <div style={{ fontSize: 12.5, color: 'var(--gfw-text-strong)', lineHeight: 1.65, marginBottom: 18 }}>WP_List_Table is not loaded on every admin request, and it is marked private in core. It has been stable for a decade, but that is a promise nobody made — pin the require and test after major releases.</div>

              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>Order matters in prepare_items()</div>
              <div style={{ fontSize: 12.5, color: 'var(--gfw-text-strong)', lineHeight: 1.65, marginBottom: 18 }}>Process bulk actions first, then fetch, then set_pagination_args, then assign $this-&gt;items. Setting items before pagination means the count is wrong; fetching before the bulk action means you display rows you just deleted.</div>

              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>Escaping</div>
              <div style={{ fontSize: 12.5, color: 'var(--gfw-text-strong)', lineHeight: 1.65 }}>Nothing in this class escapes for you. Every column callback returns markup that goes straight into the page — so each one here escapes its own value, and the generated row_actions() output is built from esc_url() and esc_html().</div>
            </div>
          ),
        },
      ]}
    />
  );
}
