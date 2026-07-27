import { useMemo, useState } from 'react';
import { GeneratorShell } from '../../components/generator/GeneratorShell';
import { Toggle, ToggleRow } from '../../components/ui/Toggle';
import { useEditorState } from '../../lib/useEditorState';
import {
  TYPES,
  applyFix,
  buildCode,
  derive,
  freshProject,
  slugify,
  validate,
  type Capability,
  type MetaType,
  type OutputMode,
  type PostMeta,
} from '../../generators/postMeta';

const OUTPUT_MODES: { id: OutputMode; label: string }[] = [
  { id: 'snippet', label: 'Snippet' },
  { id: 'functions', label: 'functions.php' },
  { id: 'plugin', label: 'Plugin file' },
];

const REF_ARGS: { name: string; type: string; description: string }[] = [
  { name: '$post_type', type: 'string', description: 'Which post type the key belongs to. An empty string registers it for all of them, which also means every REST post response carries it.' },
  { name: 'type', type: 'string', description: 'string, integer, number, boolean, array or object. Used for REST validation, not for storage — the database column is always text.' },
  { name: 'single', type: 'bool', description: 'Whether one value or many rows. Changes both get_post_meta() and the REST shape.' },
  { name: 'default', type: 'mixed', description: 'Returned when no row exists. Since 5.5 — and only honoured when single is true.' },
  { name: 'sanitize_callback', type: 'callable', description: 'Runs on every save, including from REST. The only place your value is cleaned.' },
  { name: 'auth_callback', type: 'callable', description: 'Decides who may read and write over REST. Defaults to a per-post edit check.' },
  { name: 'show_in_rest', type: 'bool|array', description: 'true for scalars. Arrays and objects need the array form with an explicit schema.' },
];

export function PostMetaGenerator() {
  const { state: pm, commit, undo, redo, reset, canUndo, canRedo, savedLabel } = useEditorState<PostMeta>('post-meta-generator-v1', freshProject);
  const [outputMode, setOutputMode] = useState<OutputMode>('plugin');

  const d = useMemo(() => derive(pm), [pm]);
  const code = useMemo(() => buildCode(pm, outputMode), [pm, outputMode]);
  const issues = useMemo(() => validate(pm), [pm]);
  const fileName = (slugify(pm.postType) || 'post') + '-meta.php';
  const restCount = d.keys.filter((k) => k.inRest).length;
  const scopeNote = (d.postType ? 'Registered for ' + d.postType + ' only.' : 'Registered for every post type.')
    + ' ' + restCount + ' of ' + d.keys.length + ' key' + (d.keys.length === 1 ? '' : 's') + ' exposed to REST, authorised with '
    + (pm.capability === 'edit_post' ? 'edit_post on the individual post.' : pm.capability + '.');
  const refUsage = d.keys.length
    ? d.keys.slice(0, 3).map((k) => {
        const full = d.metaPrefix + k.key;
        return '// PHP\n$value = get_post_meta( $post_id, \'' + full + "', " + (k.single ? 'true' : 'false') + ' );'
          + (k.inRest ? '\n\n// REST\nGET  /wp-json/wp/v2/' + (d.postType ? d.postType + 's' : 'posts') + '/123\n     → meta.' + full : '');
      }).join('\n\n')
    : 'Add a key first.';

  function fix(kind: string) {
    commit((draft) => Object.assign(draft, applyFix(draft, kind)));
  }

  function addKey() {
    commit((p) => {
      p.keys = p.keys || [];
      p.keys.push({ key: 'field_' + (p.keys.length + 1), type: 'string', single: true, inRest: true, def: '', description: '' });
    });
  }

  function removeKey(i: number) {
    commit((p) => p.keys.splice(i, 1));
  }

  return (
    <GeneratorShell
      category="content"
      title="Post Meta Generator"
      description="Typed meta keys with a sanitiser, an auth callback and a REST schema — so a block, the API and your PHP all read the same value the same way."
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
            <div className="gfw-mono" style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 4 }}>register_post_meta()</div>
            <div className="field-hint" style={{ marginBottom: 14 }}>Called on init, before REST routes are built</div>

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

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--gfw-text-faint)', marginBottom: 8 }}>Reading it back</div>
            <div className="card gfw-mono" style={{ padding: '12px 14px', fontSize: 11.5, lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: 18 }}>{refUsage}</div>

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--gfw-text-faint)', marginBottom: 8 }}>single changes the shape</div>
            <div style={{ fontSize: 12.5, lineHeight: 1.65, marginBottom: 18 }}>With single true, get_post_meta() returns the value and REST exposes a scalar. With it false you get an array of every row for that key, and REST exposes an array — a difference that quietly breaks block code written against the other shape.</div>

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--gfw-text-faint)', marginBottom: 8 }}>auth_callback</div>
            <div style={{ fontSize: 12.5, lineHeight: 1.65 }}>It defaults to a capability check on edit_post for the specific post, which is right. Override it only to tighten, never to loosen — a permissive auth_callback on a REST-exposed key lets any authenticated user write it.</div>
          </div>
        ),
      }}
      form={
        <div>
          <div className="field-card field-card-primary">
            <div className="field-card-title">Scope</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>post type</label>
                <input className="input gfw-mono" value={pm.postType} onChange={(ev) => commit((p) => (p.postType = ev.target.value), 'postType')} placeholder="post — empty for all" />
              </div>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>key prefix</label>
                <input className="input gfw-mono" value={pm.metaPrefix} onChange={(ev) => commit((p) => (p.metaPrefix = ev.target.value), 'metaPrefix')} placeholder="acme_" />
              </div>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>function prefix</label>
                <input className="input gfw-mono" value={pm.prefix} onChange={(ev) => commit((p) => (p.prefix = ev.target.value), 'prefix')} placeholder="acme" />
              </div>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>auth capability</label>
                <select className="select gfw-mono" value={pm.capability} onChange={(ev) => commit((p) => (p.capability = ev.target.value as Capability))}>
                  <option value="edit_post">edit_post — this post</option>
                  <option value="edit_posts">edit_posts — any post</option>
                  <option value="manage_options">manage_options — admins</option>
                </select>
              </div>
            </div>
            <div className="field-hint" style={{ marginTop: 12 }}>{scopeNote}</div>
          </div>

          <div className="field-card">
            <div className="field-card-header">
              <div className="field-card-title">Meta keys</div>
              <div className="field-card-desc">{d.keys.length} {d.keys.length === 1 ? 'key' : 'keys'}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pm.keys.map((k, i) => {
                const full = d.metaPrefix + (k.key.trim() || 'field');
                const isProtected = full.charAt(0) === '_';
                return (
                  <div key={i} className="card" style={{ padding: 11 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <input
                        className="input gfw-mono"
                        style={{ flex: 1, minWidth: 130 }}
                        value={k.key}
                        placeholder="reading_time"
                        onChange={(ev) => commit((p) => (p.keys[i].key = ev.target.value), 'key-' + i)}
                      />
                      <select
                        className="select"
                        style={{ width: 120 }}
                        value={k.type}
                        onChange={(ev) => commit((p) => (p.keys[i].type = ev.target.value as MetaType))}
                      >
                        {TYPES.map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--gfw-text-body)' }}>
                        <Toggle checked={k.single} onChange={(v) => commit((p) => (p.keys[i].single = v))} ariaLabel="single" />
                        single
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--gfw-text-body)' }}>
                        <Toggle checked={k.inRest} onChange={(v) => commit((p) => (p.keys[i].inRest = v))} ariaLabel="REST" />
                        REST
                      </span>
                      <button type="button" aria-label="Remove key" title="Remove key" onClick={() => removeKey(i)} className="btn btn-ghost btn-sm">✕</button>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 7 }}>
                      <input
                        className="input gfw-mono"
                        style={{ width: 120 }}
                        value={k.def}
                        placeholder="default"
                        onChange={(ev) => commit((p) => (p.keys[i].def = ev.target.value), 'def-' + i)}
                      />
                      <input
                        className="input"
                        style={{ flex: 1, minWidth: 160 }}
                        value={k.description}
                        placeholder="What it holds — shown in the API schema."
                        onChange={(ev) => commit((p) => (p.keys[i].description = ev.target.value), 'description-' + i)}
                      />
                      <span className="gfw-mono" style={{ fontSize: 11, color: 'var(--gfw-text-faint)', whiteSpace: 'nowrap' }}>{full}</span>
                    </div>
                    {isProtected && (
                      <div style={{ marginTop: 7, fontSize: 11.5, color: 'var(--gfw-accent-strong)', lineHeight: 1.45 }}>
                        Leading underscore: protected from the Custom Fields panel — and invisible to REST unless you register it, which is exactly what this does.
                      </div>
                    )}
                  </div>
                );
              })}
              {pm.keys.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--gfw-text-muted)' }}>No keys yet.</div>}
            </div>
            <button type="button" onClick={addKey} className="btn btn-ghost btn-sm" style={{ marginTop: 11, borderStyle: 'dashed' }}>Add meta key</button>
          </div>

          <div className="toggle-card">
            <div className="toggle-card-title">Extras</div>
            <ToggleRow
              label="Helper accessors"
              help="A typed get_ function per key, so templates never repeat the string."
              checked={pm.helperFns}
              onChange={(v) => commit((p) => (p.helperFns = v))}
            />
            <ToggleRow
              label="Uninstall cleanup"
              help="delete_post_meta_by_key() for each key, as an uninstall.php comment."
              checked={pm.uninstall}
              onChange={(v) => commit((p) => (p.uninstall = v))}
            />
          </div>
        </div>
      }
    />
  );
}
