import { useMemo, useState } from 'react';
import { GeneratorShell } from '../../components/generator/GeneratorShell';
import { RepeatableCard } from '../../components/ui/RepeatableCard';
import { ToggleRow } from '../../components/ui/Toggle';
import { useDragReorder } from '../../lib/dragReorder';
import { useEditorState } from '../../lib/useEditorState';
import { useListOps } from '../../lib/useListOps';
import {
  FIELD_TYPES,
  POST_TYPES,
  REST_TYPE,
  SANITIZE,
  applyFix,
  buildCode,
  derive,
  freshProject,
  validate,
  type FieldType,
  type MetaBox,
  type OutputMode,
} from '../../generators/metaBox';

const OUTPUT_MODES: { id: OutputMode; label: string }[] = [
  { id: 'snippet', label: 'Snippet' },
  { id: 'functions', label: 'functions.php' },
  { id: 'plugin', label: 'Plugin file' },
];

function padTo(s: string, w: number): string {
  return s + new Array(Math.max(0, w - s.length) + 1).join(' ');
}

export function MetaBoxGenerator() {
  const { state: mb, commit, undo, redo, reset, canUndo, canRedo, savedLabel } = useEditorState<MetaBox>('meta-box-generator-v1', freshProject);
  const drag = useDragReorder();
  const fields = useListOps<MetaBox>(commit)((p) => p.fields);
  const [outputMode, setOutputMode] = useState<OutputMode>('snippet');

  const d = useMemo(() => derive(mb), [mb]);
  const code = useMemo(() => buildCode(mb, outputMode), [mb, outputMode]);
  const issues = useMemo(() => validate(mb), [mb]);
  const fileName = (d.id || 'meta-box').replace(/_/g, '-') + '.php';

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

  function addField() {
    commit((p) => {
      const n = p.fields.length + 1;
      p.fields.push({ id: 'field_' + n, label: 'Field ' + n, type: 'text', description: '', choices: '' });
    });
  }


  const refSignature = "add_meta_box(\n\t'" + d.id + "',\n\t__( '" + mb.title.replace(/'/g, "\\'") + "', '" + d.td + "' ),\n\t$callback,\n\tarray( " + (d.types.map((x) => "'" + x + "'").join(', ') || "'post'") + " ),\n\t'" + mb.context + "',\n\t'" + mb.priority + "'\n);";
  const refFlow = [
    'The editor posts the whole form to post.php. save_post fires — for your post type, for autosaves, for revisions and for quick edits alike.',
    'Verify the nonce. This proves the request came from your form and not from somewhere else.',
    'Bail on autosaves and revisions. Autosave posts a partial form, so writing on it is how fields mysteriously empty themselves.',
    'Check the capability against this specific post — current_user_can( edit_post, $post_id ), not a blanket edit_posts.',
    'Sanitise per field, then update_post_meta() for values and delete_post_meta() for empties. Storing an empty string is not the same as having no value.',
  ];
  const refKeys = d.fields.length
    ? d.fields.map((f) => padTo(d.metaPrefix + f.id, 26) + padTo(REST_TYPE[f.type], 9) + padTo(SANITIZE[f.type] + '()', 26) + 'posts as ' + d.pre + '_' + f.id).join('\n')
    : 'No fields yet.';
  const blockEditorNote = mb.registerMeta
    ? 'In the block editor this renders in the panel below the canvas, and register_post_meta() means the same values are readable over REST.'
    : 'In the block editor this renders in the panel below the canvas. Without register_post_meta() nothing else — block, sidebar or API — can read these values.';

  type ToggleKey = 'nonceCheck' | 'autosaveGuard' | 'capCheck' | 'typeCheck' | 'registerMeta';
  const extraToggles: { key: ToggleKey; label: string; help: string; on: boolean }[] = [
    { key: 'nonceCheck', label: 'Nonce check', help: 'wp_nonce_field() in the box and wp_verify_nonce() before saving.', on: mb.nonceCheck },
    { key: 'autosaveGuard', label: 'Autosave and revision guard', help: 'Bails on autosaves and revisions, which otherwise blank your fields.', on: mb.autosaveGuard },
    { key: 'capCheck', label: 'Capability check', help: 'current_user_can( edit_post, $post_id ) before writing.', on: mb.capCheck },
    { key: 'typeCheck', label: 'Post type check', help: 'Skips the handler on saves of unrelated post types.', on: mb.typeCheck },
    { key: 'registerMeta', label: 'register_post_meta()', help: 'Registers the keys with show_in_rest so blocks and the editor can read them.', on: mb.registerMeta },
  ];
  function toggleFlag(key: ToggleKey) {
    commit((p) => { p[key] = !p[key]; });
  }

  return (
    <GeneratorShell
      category="content"
      title="Meta Box Generator"
      description="Fields in the editor, and a save handler that checks the nonce, the autosave, the revision and the capability — in that order, before it writes anything."
      code={code}
      filename={fileName}
      editor={{ canUndo, canRedo, onUndo: undo, onRedo: redo, onNew: reset, savedLabel }}
      issues={issues}
      onFix={fix}
      outputModes={OUTPUT_MODES}
      activeOutputMode={outputMode}
      onOutputModeChange={(id) => setOutputMode(id as OutputMode)}
      secondaryTab={{
        label: 'Preview',
        content: (
          <div>
            <div className="field-hint" style={{ marginBottom: 10 }}>
              Editor · {mb.context === 'side' ? 'sidebar column' : mb.context === 'normal' ? 'below the content' : 'advanced area'} · {d.types.join(', ') || 'no post type'}
            </div>
            <div style={{ background: '#fff', border: '1px solid #C3C4C7', borderRadius: 2 }}>
              <div style={{ padding: '9px 12px', borderBottom: '1px solid #F0F0F1', display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#1D2327' }}>{mb.title}</span>
                <span style={{ fontSize: 14, color: '#787C82' }}>⌃</span>
              </div>
              <div style={{ padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {d.fields.map((f) => (
                  <div key={f.id}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1D2327', marginBottom: 5 }}>{f.label || f.id}</div>
                    {['text', 'number', 'date', 'url', 'email'].includes(f.type) && (
                      <input readOnly value="" placeholder={f.type === 'date' ? 'yyyy-mm-dd' : ''} style={{ width: '100%', maxWidth: 300, fontSize: 13.5, padding: '5px 8px', border: '1px solid #8C8F94', borderRadius: 3, background: '#fff' }} />
                    )}
                    {f.type === 'textarea' && (
                      <textarea readOnly value="" rows={3} style={{ width: '100%', fontSize: 13, padding: '6px 8px', border: '1px solid #8C8F94', borderRadius: 3, background: '#fff', resize: 'vertical' }} />
                    )}
                    {f.type === 'checkbox' && (
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5, color: '#2C3338' }}>
                        <input type="checkbox" readOnly style={{ width: 16, height: 16, accentColor: '#2271B1' }} />
                        {f.label || f.id}
                      </label>
                    )}
                    {f.type === 'select' && (
                      <select style={{ fontSize: 13.5, padding: '4px 8px', border: '1px solid #8C8F94', borderRadius: 3, background: '#fff', minWidth: 170 }}>
                        {f.parsed.map((c) => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                    )}
                    {f.description && <p style={{ margin: '5px 0 0', fontSize: 12.5, color: '#646970', fontStyle: 'italic', lineHeight: 1.5 }}>{f.description}</p>}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ marginTop: 12, fontSize: 11.5, color: 'var(--gfw-text-muted)', lineHeight: 1.6 }}>{blockEditorNote}</div>
          </div>
        ),
      }}
      extraSecondaryTabs={[
        {
          label: 'Reference',
          content: (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <div className="gfw-mono" style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 4 }}>add_meta_box()</div>
              <div className="field-hint" style={{ marginBottom: 14 }}>Registered on add_meta_boxes, saved on save_post</div>
              <div className="card gfw-mono" style={{ padding: '12px 14px', fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginBottom: 18 }}>{refSignature}</div>

              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--gfw-text-faint)', marginBottom: 8 }}>The save order that matters</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 18 }}>
                {refFlow.map((text, i) => (
                  <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                    <span style={{ flexShrink: 0, width: 19, height: 19, borderRadius: '50%', background: 'var(--gfw-accent-tint)', color: 'var(--gfw-accent-strong)', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span>
                    <span style={{ flex: 1, fontSize: 12.5, lineHeight: 1.55 }}>{text}</span>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--gfw-text-faint)', marginBottom: 8 }}>Meta keys written</div>
              <div className="card gfw-mono" style={{ padding: '12px 14px', fontSize: 11.5, lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: 18 }}>{refKeys}</div>

              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--gfw-text-faint)', marginBottom: 8 }}>The leading underscore</div>
              <div style={{ fontSize: 12.5, lineHeight: 1.65, marginBottom: 18 }}>A meta key starting with _ is protected: it stays out of the Custom Fields panel and cannot be edited by hand. That is what you want for values your box owns. Drop the underscore only if the client should be able to see and change the raw value.</div>

              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--gfw-text-faint)', marginBottom: 8 }}>Block editor</div>
              <div style={{ fontSize: 12.5, lineHeight: 1.65 }}>Classic meta boxes still render in the block editor, in a panel below the canvas — unless a block-based sidebar replaces them. What they do not do is participate in the editor's own save cycle, so register_post_meta() with show_in_rest is what lets a block or a plugin sidebar read and write the same value.</div>
            </div>
          ),
        },
      ]}
      form={
        <div>
          <div className="field-card field-card-primary">
            <div className="field-card-title">The box</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="field-label" htmlFor="mb-title">Title</label>
                <input id="mb-title" className="input" value={mb.title} onChange={(ev) => commit((p) => (p.title = ev.target.value), 'title')} placeholder="Event details" />
              </div>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>box id</label>
                <input className="input gfw-mono" value={mb.id} onChange={(ev) => commit((p) => (p.id = ev.target.value), 'id')} placeholder="acme_event_details" />
              </div>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>context</label>
                <select className="select" value={mb.context} onChange={(ev) => commit((p) => (p.context = ev.target.value as MetaBox['context']))}>
                  <option value="normal">normal — under the editor</option>
                  <option value="side">side — sidebar column</option>
                  <option value="advanced">advanced — below normal</option>
                </select>
              </div>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>priority</label>
                <select className="select" value={mb.priority} onChange={(ev) => commit((p) => (p.priority = ev.target.value as MetaBox['priority']))}>
                  <option value="high">high</option>
                  <option value="default">default</option>
                  <option value="low">low</option>
                </select>
              </div>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>meta prefix</label>
                <input className="input gfw-mono" value={mb.metaPrefix} onChange={(ev) => commit((p) => (p.metaPrefix = ev.target.value), 'metaPrefix')} placeholder="_acme_" />
              </div>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>function prefix</label>
                <input className="input gfw-mono" value={mb.prefix} onChange={(ev) => commit((p) => (p.prefix = ev.target.value), 'prefix')} placeholder="acme" />
              </div>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>text domain</label>
                <input className="input gfw-mono" value={mb.textDomain} onChange={(ev) => commit((p) => (p.textDomain = ev.target.value), 'textDomain')} placeholder="acme" />
              </div>
            </div>
            <div style={{ marginTop: 13 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--gfw-text-faint)', marginBottom: 7 }}>Post types</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {POST_TYPES.map((pt) => (
                  <button key={pt} type="button" onClick={() => togglePostType(pt)} className={`chip gfw-mono${(mb.postTypes || []).includes(pt) ? ' is-active' : ''}`}>
                    {pt}
                  </button>
                ))}
              </div>
              <input
                className="input gfw-mono"
                value={mb.customPostType}
                onChange={(ev) => commit((p) => (p.customPostType = ev.target.value), 'customPostType')}
                placeholder="Or a custom type: event, listing"
              />
            </div>
          </div>

          <div className="field-card">
            <div className="field-card-header">
              <div className="field-card-title">Fields</div>
              <div className="field-card-desc">{d.fields.length} {d.fields.length === 1 ? 'field' : 'fields'} · keys prefixed {d.metaPrefix}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {mb.fields.map((f, i) => (
                <RepeatableCard
                  key={i}
                  index={i}
                  count={mb.fields.length}
                  title={f.label || 'Untitled field'}
                  subtitle={d.metaPrefix + (f.id || 'field')}
                  drag={drag.bind('fields', i, fields.reorder)}
                  onMoveUp={() => fields.moveUp(i)}
                  onMoveDown={() => fields.moveDown(i)}
                  onRemove={() => fields.remove(i)}
                >
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                      className="input"
                      style={{ flex: 1.5, minWidth: 130, fontWeight: 600 }}
                      value={f.label}
                      placeholder="Start date"
                      onChange={(ev) => commit((p) => (p.fields[i].label = ev.target.value), 'field-label-' + i)}
                    />
                    <input
                      className="input gfw-mono"
                      style={{ width: 130 }}
                      value={f.id}
                      placeholder="start_date"
                      onChange={(ev) => commit((p) => (p.fields[i].id = ev.target.value), 'field-id-' + i)}
                    />
                    <select
                      className="select"
                      style={{ width: 118 }}
                      value={f.type}
                      onChange={(ev) => commit((p) => {
                        const v = ev.target.value as FieldType;
                        p.fields[i].type = v;
                        if (v === 'select' && !p.fields[i].choices) p.fields[i].choices = 'first:First, second:Second';
                      })}
                    >
                      {FIELD_TYPES.map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <input
                    className="input"
                    value={f.description}
                    placeholder="Help text under the field."
                    onChange={(ev) => commit((p) => (p.fields[i].description = ev.target.value), 'field-description-' + i)}
                  />
                  {f.type === 'select' && (
                    <input
                      className="input gfw-mono"
                      value={f.choices}
                      placeholder="online:Online, venue:In person"
                      onChange={(ev) => commit((p) => (p.fields[i].choices = ev.target.value), 'field-choices-' + i)}
                    />
                  )}
                </RepeatableCard>
              ))}
              {mb.fields.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--gfw-text-muted)' }}>No fields — the box will render an empty panel.</div>}
            </div>
            <button type="button" onClick={addField} className="btn btn-ghost btn-sm repeatable-add" style={{ marginTop: 11 }}>Add field</button>
          </div>

          <div className="toggle-card">
            <div className="toggle-card-title">Save handler</div>
            {extraToggles.map((t) => (
              <ToggleRow
                key={t.key}
                label={t.label}
                help={t.help}
                checked={t.on}
                onChange={() => toggleFlag(t.key)}
              />
            ))}
          </div>
        </div>
      }
    />
  );
}
