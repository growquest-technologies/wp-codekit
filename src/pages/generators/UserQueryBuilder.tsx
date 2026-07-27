import { useMemo, useState } from 'react';
import { GeneratorShell } from '../../components/generator/GeneratorShell';
import { ToggleRow } from '../../components/ui/Toggle';
import { useEditorState } from '../../lib/useEditorState';
import {
  COMPARES,
  OUTPUT_HINTS,
  REF_ARGS,
  REF_COUNT,
  ROLES,
  applyFix,
  buildCode,
  fileNameFor,
  freshProject,
  plainEnglish,
  validate,
  type OutputMode,
  type RoleMode,
  type UserMetaClause,
  type UserQuery,
} from '../../generators/userQuery';

const OUTPUT_MODES: { id: OutputMode; label: string }[] = [
  { id: 'query', label: 'WP_User_Query' },
  { id: 'get_users', label: 'get_users()' },
  { id: 'args', label: 'Args array' },
];

export function UserQueryBuilder() {
  const { state: uq, commit, undo, redo, reset, canUndo, canRedo, savedLabel } = useEditorState<UserQuery>('user-query-generator-v1', freshProject);
  const [outputMode, setOutputMode] = useState<OutputMode>('query');

  function toggleRole(r: string) {
    commit((p) => {
      const i = p.roles.indexOf(r);
      if (i >= 0) p.roles.splice(i, 1);
      else p.roles.push(r);
    });
  }

  function addMeta() {
    commit((p) => p.meta.push({ key: '', compare: '=', value: '' }));
  }

  function updateMeta(i: number, patch: Partial<UserMetaClause>, coalesceKey?: string) {
    commit((p) => Object.assign(p.meta[i], patch), coalesceKey);
  }

  function removeMeta(i: number) {
    commit((p) => p.meta.splice(i, 1));
  }

  const code = useMemo(() => buildCode(uq, outputMode), [uq, outputMode]);
  const issues = useMemo(() => validate(uq), [uq]);
  const fileName = fileNameFor();

  function fix(kind: string) {
    commit((draft) => Object.assign(draft, applyFix(draft, kind)));
  }

  const whoNote = uq.roles.length ? uq.roles.length + ' role' + (uq.roles.length === 1 ? '' : 's') + ' · ' + uq.roleMode : 'no role filter';
  const metaNote = uq.meta.length ? uq.meta.length + ' clause' + (uq.meta.length === 1 ? '' : 's') : 'none';

  return (
    <GeneratorShell
      category="query"
      title="User Query Builder"
      description={
        <>
          Query users by role, capability, meta and search — with the role vs role__in mixup and the count_total cost called out before you ship it.
        </>
      }
      code={code}
      filename={fileName}
      editor={{ canUndo, canRedo, onUndo: undo, onRedo: redo, onNew: reset, savedLabel }}
      issues={issues}
      onFix={fix}
      outputModes={OUTPUT_MODES}
      activeOutputMode={outputMode}
      onOutputModeChange={(id) => setOutputMode(id as OutputMode)}
      outputHint={OUTPUT_HINTS[outputMode]}
      secondaryTab={{
        label: 'Reference',
        content: (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <div style={{ border: '1px solid var(--gfw-border)', borderRadius: 8, padding: '16px 18px', background: 'var(--gfw-surface-sunken)', marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>In plain English</div>
              <div style={{ fontSize: 13, lineHeight: 1.65 }}>{plainEnglish(uq)}</div>
            </div>

            <div className="gfw-mono" style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 4 }}>new WP_User_Query()</div>
            <div style={{ fontSize: 12, color: 'var(--gfw-text-mutest)', marginBottom: 14 }}>Queries wp_users, JOINing wp_usermeta for roles and meta</div>

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>Arguments</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 18 }}>
              {REF_ARGS.map((r) => (
                <div key={r.name} style={{ borderBottom: '1px solid var(--gfw-border)', paddingBottom: 9 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                    <span className="gfw-mono" style={{ fontSize: 12.5, fontWeight: 700 }}>{r.name}</span>
                    <span className="type-badge">{r.type}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--gfw-text-muted)', lineHeight: 1.5, marginTop: 4 }}>{r.description}</div>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>Roles are meta, not columns</div>
            <div style={{ fontSize: 12.5, lineHeight: 1.65, marginBottom: 18 }}>A user's role lives in the wp_capabilities meta key, serialised, and prefixed per site on multisite. That is why role queries JOIN usermeta and why a role filter on a network with hundreds of sites behaves differently per site. blog_id decides which site's roles you are asking about.</div>

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>Counting</div>
            <pre className="gfw-mono" style={{ border: '1px solid var(--gfw-border)', borderRadius: 7, padding: '12px 14px', background: 'var(--gfw-surface-sunken)', fontSize: 11.5, lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: 8 }}>{REF_COUNT}</pre>
            <div style={{ fontSize: 12.5, lineHeight: 1.65 }}>get_total() only returns a number when count_total is on — which it is by default, and which costs a second query. Turn it off for a fixed-size list; keep it for pagination.</div>
          </div>
        ),
      }}
      form={
        <div>
          <div className="field-card field-card-primary">
            <div className="field-card-header">
              <div className="field-card-title">Who</div>
              <div className="field-card-desc">{whoNote}</div>
            </div>
            <label className="field-label">Roles</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 11 }}>
              {ROLES.map((r) => (
                <button key={r} type="button" onClick={() => toggleRole(r)} className={`chip${uq.roles.includes(r) ? ' is-active' : ''}`}>
                  {r}
                </button>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
              <div>
                <label className="field-label">role matching</label>
                <select className="select" value={uq.roleMode} onChange={(e) => commit((p) => (p.roleMode = e.target.value as RoleMode))}>
                  <option value="role__in">role__in — any of them</option>
                  <option value="role">role — all of them</option>
                  <option value="role__not_in">role__not_in — none of them</option>
                </select>
              </div>
              <div>
                <label className="field-label">capability</label>
                <input className="input gfw-mono" placeholder="edit_posts" value={uq.capability} onChange={(e) => commit((p) => (p.capability = e.target.value), 'capability')} />
              </div>
              <div>
                <label className="field-label">search</label>
                <input className="input gfw-mono" placeholder="*@example.com" value={uq.search} onChange={(e) => commit((p) => (p.search = e.target.value), 'search')} />
                <div className="field-hint">Wrap in * for a wildcard. Without one it is an exact match.</div>
              </div>
              <div>
                <label className="field-label">search columns</label>
                <select className="select" value={uq.searchColumn} onChange={(e) => commit((p) => (p.searchColumn = e.target.value))}>
                  <option value="">all default columns</option>
                  <option value="user_email">user_email</option>
                  <option value="user_login">user_login</option>
                  <option value="user_nicename">user_nicename</option>
                  <option value="display_name">display_name</option>
                </select>
              </div>
            </div>
          </div>

          <div className="field-card">
            <div className="field-card-header">
              <div className="field-card-title">Meta clauses</div>
              <div className="field-card-desc">{metaNote}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {uq.meta.map((m, i) => {
                const needsValue = m.compare !== 'EXISTS' && m.compare !== 'NOT EXISTS';
                return (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input className="input gfw-mono" style={{ flex: 1, minWidth: 130 }} placeholder="subscription_tier" value={m.key} onChange={(e) => updateMeta(i, { key: e.target.value }, `key-${i}`)} />
                    <select className="select" style={{ width: 120 }} value={m.compare} onChange={(e) => updateMeta(i, { compare: e.target.value })}>
                      {COMPARES.map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                    <input className="input gfw-mono" style={{ flex: 1, minWidth: 110 }} placeholder="pro" value={m.value} disabled={!needsValue} onChange={(e) => updateMeta(i, { value: e.target.value }, `value-${i}`)} />
                    <button type="button" aria-label="Remove clause" onClick={() => removeMeta(i)} className="btn btn-ghost btn-sm" style={{ color: '#B91C1C' }}>Remove</button>
                  </div>
                );
              })}
              {uq.meta.length === 0 && <div className="field-hint">No meta clauses. User meta lives in one big table — filtering on it is a JOIN per clause, same as posts.</div>}
            </div>
            <button type="button" onClick={addMeta} className="btn btn-ghost btn-sm" style={{ marginTop: 11 }}>Add meta clause</button>
          </div>

          <div className="field-card">
            <div className="field-card-title">Shape of the result</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12 }}>
              <div>
                <label className="field-label">number</label>
                <input className="input gfw-mono" placeholder="20" value={uq.number} onChange={(e) => commit((p) => (p.number = e.target.value), 'number')} />
              </div>
              <div>
                <label className="field-label">fields</label>
                <select className="select" value={uq.fields} onChange={(e) => commit((p) => (p.fields = e.target.value as UserQuery['fields']))}>
                  <option value="all">all — WP_User objects</option>
                  <option value="ID">ID — just ids</option>
                  <option value="ids">ids — just ids (alias)</option>
                  <option value="display_name">display_name</option>
                  <option value="user_email">user_email</option>
                </select>
              </div>
              <div>
                <label className="field-label">orderby</label>
                <select className="select" value={uq.orderby} onChange={(e) => commit((p) => (p.orderby = e.target.value))}>
                  <option value="display_name">display_name</option>
                  <option value="user_registered">user_registered</option>
                  <option value="user_login">user_login</option>
                  <option value="post_count">post_count</option>
                  <option value="meta_value">meta_value</option>
                  <option value="meta_value_num">meta_value_num</option>
                </select>
              </div>
              <div>
                <label className="field-label">order</label>
                <select className="select" value={uq.order} onChange={(e) => commit((p) => (p.order = e.target.value as 'ASC' | 'DESC'))}>
                  <option value="ASC">ASC</option>
                  <option value="DESC">DESC</option>
                </select>
              </div>
            </div>
            <div style={{ marginTop: 13 }}>
              <ToggleRow
                label="count_total"
                help="Runs a second COUNT query so get_total() has a number."
                checked={uq.countTotal}
                onChange={(v) => commit((p) => (p.countTotal = v))}
              />
              <ToggleRow
                label="has_published_posts"
                help="Only users who have actually published something."
                checked={uq.hasPublished}
                onChange={(v) => commit((p) => (p.hasPublished = v))}
              />
            </div>
          </div>
        </div>
      }
    />
  );
}
