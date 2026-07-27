import { useMemo, useState } from 'react';
import { GeneratorShell } from '../../components/generator/GeneratorShell';
import { ToggleRow } from '../../components/ui/Toggle';
import { useEditorState } from '../../lib/useEditorState';
import {
  POST_TYPES,
  applyFix,
  buildCode,
  derive,
  freshProject,
  slugify,
  validate,
  type OutputMode,
  type PostStatus,
} from '../../generators/postStatus';

const OUTPUT_MODES: { id: OutputMode; label: string }[] = [
  { id: 'snippet', label: 'Snippet' },
  { id: 'functions', label: 'functions.php' },
  { id: 'plugin', label: 'Plugin file' },
];

const REF_ARGS: { name: string; type: string; description: string }[] = [
  { name: 'label', type: 'string', description: 'What people see. Register it with _x() and a "post status" context so translators know what it is.' },
  { name: 'label_count', type: 'array', description: 'Built with _n_noop() for the singular and plural forms. %s is the count in the list-table link.' },
  { name: 'public', type: 'bool', description: 'True makes posts in this status viewable on the front end. A review status should be false.' },
  { name: 'internal', type: 'bool', description: 'Reserved for core statuses like auto-draft. Setting it hides the status from everything.' },
  { name: 'exclude_from_search', type: 'bool', description: 'Keeps the posts out of search results and feeds. Almost always true for a non-public status.' },
  { name: 'show_in_admin_all_list', type: 'bool', description: 'Whether the posts appear in the All view of the list table.' },
  { name: 'show_in_admin_status_list', type: 'bool', description: 'Whether the status gets its own filter link with a count.' },
  { name: 'date_floating', type: 'bool', description: 'Leaves post_date unset until publish, the way draft does.' },
  { name: 'post_type', type: 'array', description: 'Which post types may use it. Since WordPress 5.3 — earlier versions ignore it.' },
];

export function PostStatusGenerator() {
  const { state: ps, commit, undo, redo, reset, canUndo, canRedo, savedLabel } = useEditorState<PostStatus>('post-status-generator-v1', freshProject);
  const [outputMode, setOutputMode] = useState<OutputMode>('plugin');

  const d = useMemo(() => derive(ps), [ps]);
  const code = useMemo(() => buildCode(ps, outputMode), [ps, outputMode]);
  const issues = useMemo(() => validate(ps), [ps]);
  const fileName = (slugify(ps.slug) || 'post-status') + '-status.php';
  const previewNote = (ps.isPublic ? 'Public — reachable on the front end' : 'Not public — admin only')
    + (ps.excludeFromSearch ? ', hidden from search' : ', appears in search')
    + (ps.showInStatusList ? ', has a filter link' : ', no filter link')
    + (d.types.length ? ' · ' + d.types.join(', ') : ' · every post type');
  const refQuery = "// Query it like any other status.\n$in_review = new WP_Query(\n\tarray(\n\t\t'post_type'   => '" + (d.types[0] || 'post') + "',\n\t\t'post_status' => '" + d.slug + "',\n\t)\n);\n\n// Move a post into it.\nwp_update_post(\n\tarray(\n\t\t'ID'          => $post_id,\n\t\t'post_status' => '" + d.slug + "',\n\t)\n);";

  function fix(kind: string) {
    commit((draft) => Object.assign(draft, applyFix(draft, kind)));
  }

  function togglePostType(pt: string) {
    commit((p) => {
      p.postTypes = p.postTypes || [];
      const i = p.postTypes.indexOf(pt);
      if (i >= 0) p.postTypes.splice(i, 1);
      else p.postTypes.push(pt);
    });
  }

  type VisKey = 'isPublic' | 'internal' | 'excludeFromSearch' | 'showInAllList' | 'showInStatusList' | 'dateFloating';
  const visibilityToggles: { key: VisKey; label: string; help: string; on: boolean }[] = [
    { key: 'isPublic', label: 'public', help: 'Posts in this status are viewable on the front end by anyone with the link.', on: ps.isPublic },
    { key: 'internal', label: 'internal', help: 'For core plumbing only — auto-draft and inherit use this. Leave it off.', on: ps.internal },
    { key: 'excludeFromSearch', label: 'exclude_from_search', help: 'Keeps these posts out of site search and feeds.', on: ps.excludeFromSearch },
    { key: 'showInAllList', label: 'show_in_admin_all_list', help: 'Include them in the "All" view of the posts list.', on: ps.showInAllList },
    { key: 'showInStatusList', label: 'show_in_admin_status_list', help: 'The filter link with a count at the top of the posts list.', on: ps.showInStatusList },
    { key: 'dateFloating', label: 'date_floating', help: 'Leave the post date unset until it is published, the way drafts behave.', on: ps.dateFloating },
  ];

  type WireKey = 'displayState' | 'editorDropdown' | 'adminFilter';
  const wiringToggles: { key: WireKey; label: string; help: string; on: boolean }[] = [
    { key: 'displayState', label: 'Label beside the post title', help: 'The display_post_states filter, so the list shows "— In review".', on: ps.displayState },
    { key: 'editorDropdown', label: 'Editor status dropdown', help: 'Adds the option to the classic editor Status select. The block editor ignores PHP statuses.', on: ps.editorDropdown },
    { key: 'adminFilter', label: 'Include in the All view', help: 'A pre_get_posts helper for when show_in_admin_all_list is off but you still want it in All.', on: ps.adminFilter },
  ];

  function toggleVis(key: VisKey) {
    commit((p) => { p[key] = !p[key]; });
  }
  function toggleWire(key: WireKey) {
    commit((p) => { p[key] = !p[key]; });
  }

  return (
    <GeneratorShell
      category="content"
      title="Post Status Generator"
      description="register_post_status() alone gets you a status nobody can select. This adds the editor dropdown, the list-table link and the label the display shows."
      code={code}
      filename={fileName}
      editor={{ canUndo, canRedo, onUndo: undo, onRedo: redo, onNew: reset, savedLabel }}
      issues={issues}
      onFix={fix}
      outputModes={OUTPUT_MODES}
      activeOutputMode={outputMode}
      onOutputModeChange={(id) => setOutputMode(id as OutputMode)}
      secondaryTab={{
        label: 'Reference',
        content: (
          <div>
            <div className="card" style={{ background: '#F0F0F1', padding: 16, marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--gfw-text-faint)', marginBottom: 10 }}>How the posts list reads</div>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 13, color: '#2271B1', marginBottom: 12 }}>
                <span>All <span style={{ color: '#787C82' }}>(24)</span></span>
                <span>Published <span style={{ color: '#787C82' }}>(18)</span></span>
                <span style={{ fontWeight: 600, color: '#1D2327' }}>{ps.label || 'In review'} <span style={{ color: '#787C82' }}>(3)</span></span>
                <span>Drafts <span style={{ color: '#787C82' }}>(3)</span></span>
              </div>
              <div style={{ background: '#fff', border: '1px solid #C3C4C7', borderRadius: 2, padding: '10px 12px' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#2271B1' }}>The winter campaign brief</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1D2327' }}>— {ps.label || 'In review'}</span>
                </div>
                <div style={{ fontSize: 12.5, color: '#787C82', marginTop: 4 }}>{previewNote}</div>
              </div>
            </div>

            <div className="gfw-mono" style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 4 }}>register_post_status()</div>
            <div className="field-hint" style={{ marginBottom: 14 }}>Called on init — and that is only half the job</div>

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--gfw-text-faint)', marginBottom: 8 }}>Arguments</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 18 }}>
              {REF_ARGS.map((r) => (
                <div key={r.name} style={{ borderBottom: '1px solid var(--gfw-border)', paddingBottom: 9 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                    <span className="gfw-mono" style={{ fontSize: 12.5, fontWeight: 700 }}>{r.name}</span>
                    <span className="type-badge">{r.type}</span>
                  </div>
                  <div style={{ fontSize: 12, lineHeight: 1.5, marginTop: 4 }}>{r.description}</div>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--gfw-text-faint)', marginBottom: 8 }}>The part core leaves to you</div>
            <div style={{ fontSize: 12.5, lineHeight: 1.65, marginBottom: 18 }}>Nothing in register_post_status() adds your status to the editor's Status dropdown or prints its name next to a post title. The classic editor needs a snippet of JavaScript in post_submitbox_misc_actions; the display label needs the display_post_states filter. Both are generated here.</div>

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--gfw-text-faint)', marginBottom: 8 }}>The block editor</div>
            <div style={{ fontSize: 12.5, lineHeight: 1.65, marginBottom: 18 }}>The block editor does not read post statuses registered in PHP at all. Custom statuses appear only through a plugin that registers them in JavaScript, or in the classic editor. The list-table filter link and display label do still work — which is often enough for an editorial workflow.</div>

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--gfw-text-faint)', marginBottom: 8 }}>Querying it</div>
            <div className="card gfw-mono" style={{ padding: '12px 14px', fontSize: 11.5, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{refQuery}</div>
          </div>
        ),
      }}
      form={
        <div>
          <div className="field-card field-card-primary">
            <div className="field-card-title">The status</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12 }}>
              <div>
                <label className="field-label">Label</label>
                <input className="input" value={ps.label} onChange={(ev) => commit((p) => (p.label = ev.target.value), 'label')} placeholder="In review" />
              </div>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>status slug</label>
                <input className="input gfw-mono" value={ps.slug} onChange={(ev) => commit((p) => (p.slug = ev.target.value), 'slug')} placeholder="in-review" />
              </div>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>prefix</label>
                <input className="input gfw-mono" value={ps.prefix} onChange={(ev) => commit((p) => (p.prefix = ev.target.value), 'prefix')} placeholder="acme" />
              </div>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>text domain</label>
                <input className="input gfw-mono" value={ps.textDomain} onChange={(ev) => commit((p) => (p.textDomain = ev.target.value), 'textDomain')} placeholder="acme" />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>label_count singular / plural</label>
                <input className="input gfw-mono" value={ps.countLabel} onChange={(ev) => commit((p) => (p.countLabel = ev.target.value), 'countLabel')} placeholder='In review <span class="count">(%s)</span>' />
                <div className="field-hint">%s is the count. Without it the number never shows in the list-table links.</div>
              </div>
            </div>
            <div style={{ marginTop: 13 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--gfw-text-faint)', marginBottom: 7 }}>Post types that can use it</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {POST_TYPES.map((pt) => (
                  <button key={pt} type="button" onClick={() => togglePostType(pt)} className={`chip gfw-mono${(ps.postTypes || []).includes(pt) ? ' is-active' : ''}`}>
                    {pt}
                  </button>
                ))}
              </div>
              <input
                className="input gfw-mono"
                value={ps.customPostType}
                onChange={(ev) => commit((p) => (p.customPostType = ev.target.value), 'customPostType')}
                placeholder="Or your own: brief, listing"
              />
            </div>
          </div>

          <div className="toggle-card">
            <div className="toggle-card-title">Visibility</div>
            {visibilityToggles.map((t) => (
              <ToggleRow key={t.key} label={t.label} help={t.help} checked={t.on} onChange={() => toggleVis(t.key)} />
            ))}
          </div>

          <div className="toggle-card">
            <div className="toggle-card-title">Make it usable</div>
            {wiringToggles.map((t) => (
              <ToggleRow key={t.key} label={t.label} help={t.help} checked={t.on} onChange={() => toggleWire(t.key)} />
            ))}
          </div>
        </div>
      }
    />
  );
}
