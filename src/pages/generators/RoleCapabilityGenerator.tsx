import { useMemo, useRef, useState } from 'react';
import { GeneratorShell } from '../../components/generator/GeneratorShell';
import { Collapsible } from '../../components/ui/Collapsible';
import { ToggleRow } from '../../components/ui/Toggle';
import { useEditorState } from '../../lib/useEditorState';
import {
  BASE_ROLES,
  CAP_GROUPS,
  DANGEROUS,
  GRANT_ROLES,
  applyFix,
  buildCode,
  derive,
  freshProject,
  validate,
  type BaseRoleKey,
  type OutputMode,
  type RoleCapability,
} from '../../generators/roleCapability';
import { slugify } from '../../lib/codegen';

const OUTPUT_MODES: { id: OutputMode; label: string }[] = [
  { id: 'plugin', label: 'Plugin file' },
  { id: 'functions', label: 'functions.php' },
];

const MATRIX_ROLES: BaseRoleKey[] = ['contributor', 'author', 'editor'];

const REF_ARGS = [
  { name: 'add_role( $slug, $name, $caps )', description: 'Creates the role in the wp_user_roles option. Returns null and does nothing if the slug already exists.' },
  { name: 'get_role( $slug )->add_cap( $cap )', description: 'The only reliable way to change an existing role. One database write per call, so batch them behind a version check.' },
  { name: 'remove_cap( $cap )', description: 'Removes a capability. Note that removing is not the same as denying — a cap set to false is an explicit deny.' },
  { name: 'remove_role( $slug )', description: 'Deletes the role. Users who had it are left with no role, so reassign them first.' },
  { name: 'wp_roles()->roles', description: 'The full map as core sees it, after every plugin has had its say. Useful when debugging why a capability appeared.' },
];

export function RoleCapabilityGenerator() {
  const { state: rc, commit, undo, redo, reset, canUndo, canRedo, savedLabel } = useEditorState<RoleCapability>('role-capability-generator-v1', freshProject);
  const [outputMode, setOutputMode] = useState<OutputMode>('plugin');
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});

  const d = useMemo(() => derive(rc), [rc]);
  const code = useMemo(() => buildCode(rc, outputMode), [rc, outputMode]);
  const issues = useMemo(() => validate(rc), [rc]);
  const fileName = (slugify(rc.slug).replace(/-/g, '_') || 'role').replace(/_/g, '-') + '-role.php';

  function focusField(id: string) {
    fieldRefs.current[id]?.focus();
  }
  function fix(kind: string) {
    commit((draft) => Object.assign(draft, applyFix(draft, kind)));
  }
  function toggleCap(c: string) {
    commit((p) => {
      p.caps = p.caps || [];
      const i = p.caps.indexOf(c);
      if (i >= 0) p.caps.splice(i, 1);
      else p.caps.push(c);
    });
  }
  function toggleGrant(r: string) {
    commit((p) => {
      p.grantTo = p.grantTo || [];
      const i = p.grantTo.indexOf(r);
      if (i >= 0) p.grantTo.splice(i, 1);
      else p.grantTo.push(r);
    });
  }

  const capsNote = `${d.caps.length} granted${d.caps.some((c) => DANGEROUS.includes(c)) ? ' · includes high-risk' : ''}`;
  const grantNote = d.grants.length ? d.grants.join(', ') : 'nobody else';

  const matrixHeaders = [{ label: d.slug.length > 9 ? d.slug.slice(0, 8) + '…' : d.slug }, ...MATRIX_ROLES.map((r) => ({ label: r.slice(0, 7) }))];
  const matrixRows = useMemo(() => {
    const all: string[] = [];
    CAP_GROUPS.forEach(([, items]) => items.forEach(([cap]) => all.push(cap)));
    d.custom.forEach((c) => { if (all.indexOf(c) === -1) all.push(c); });
    return all
      .filter((cap) => d.caps.includes(cap) || MATRIX_ROLES.some((r) => BASE_ROLES[r].caps.includes(cap)))
      .map((cap) => {
        const mine = d.caps.includes(cap);
        const risky = DANGEROUS.includes(cap);
        const cells = [
          { mark: mine ? '✓' : '·', color: mine ? (risky ? '#B91C1C' : '#1F7A4C') : '#C9C2B4' },
          ...MATRIX_ROLES.map((r) => {
            const on = BASE_ROLES[r].caps.includes(cap);
            return { mark: on ? '✓' : '·', color: on ? '#948C7E' : '#DCD7CE' };
          }),
        ];
        return { cap, nameColor: mine ? (risky ? '#B91C1C' : 'var(--gfw-text-strong)') : 'var(--gfw-text-mutest)', cells };
      });
  }, [d.caps, d.custom]);

  return (
    <GeneratorShell
      category="admin"
      title="Role & Capability Generator"
      description={<>Build a custom role and its capability map, with a versioned migration and a cleanup routine that reassigns users before removing it.</>}
      form={
        <div>
          <div className="field-card field-card-primary">
            <div className="field-card-title">The role</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label className="field-label" htmlFor="rc-name">Display name</label>
                <input id="rc-name" ref={(el) => (fieldRefs.current.name = el)} className="input" value={rc.name} onChange={(e) => commit((p) => (p.name = e.target.value), 'name')} placeholder="Shop Editor" />
              </div>
              <div>
                <label className="field-label" htmlFor="rc-slug">Role slug</label>
                <input id="rc-slug" ref={(el) => (fieldRefs.current.slug = el)} className="input gfw-mono" value={rc.slug} onChange={(e) => commit((p) => (p.slug = e.target.value), 'slug')} placeholder="shop_editor" />
              </div>
            </div>
            <div className="field-group">
              <label className="field-label" htmlFor="rc-basedon">Start from</label>
              <select
                id="rc-basedon"
                className="select"
                value={rc.basedOn}
                onChange={(e) => {
                  const v = e.target.value as BaseRoleKey;
                  commit((p) => {
                    p.basedOn = v;
                    p.caps = BASE_ROLES[v] ? BASE_ROLES[v].caps.slice() : [];
                  });
                }}
              >
                {(Object.keys(BASE_ROLES) as BaseRoleKey[]).map((k) => (
                  <option key={k} value={k}>{BASE_ROLES[k].label}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label className="field-label" htmlFor="rc-prefix">Prefix</label>
                <input id="rc-prefix" className="input gfw-mono" value={rc.prefix} onChange={(e) => commit((p) => (p.prefix = e.target.value), 'prefix')} placeholder="acme" />
              </div>
              <div>
                <label className="field-label" htmlFor="rc-version">Version</label>
                <input id="rc-version" ref={(el) => (fieldRefs.current.version = el)} className="input gfw-mono" value={rc.version} onChange={(e) => commit((p) => (p.version = e.target.value), 'version')} placeholder="1" />
              </div>
            </div>
            <div className="field-hint">
              {d.slug} starts from {BASE_ROLES[rc.basedOn] ? BASE_ROLES[rc.basedOn].label : 'nothing'} and ends with {d.caps.length} capabilit{d.caps.length === 1 ? 'y' : 'ies'}
              {d.custom.length ? `, including ${d.custom.length} custom` : ''}
              {rc.migrate ? `. Version ${d.version} is re-applied on admin_init when it changes.` : '. No migration — changes will not apply to sites that already ran this.'}
            </div>
          </div>

          <div className="field-card" ref={(el) => (fieldRefs.current.caps = el as unknown as HTMLElement)}>
            <div className="field-card-header">
              <div className="field-card-title">Capabilities</div>
              <div className="field-card-desc">{capsNote}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {CAP_GROUPS.map(([label, items]) => (
                <div key={label}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gfw-text-mutest)', marginBottom: 7 }}>{label}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {items.map(([cap, help]) => {
                      const on = (rc.caps || []).includes(cap);
                      const risky = DANGEROUS.includes(cap);
                      return (
                        <button
                          key={cap}
                          type="button"
                          title={help}
                          onClick={() => toggleCap(cap)}
                          className={`chip${on ? ' is-active' : ''}`}
                          style={on && risky ? { borderColor: '#B91C1C', background: '#FBEBEB', color: '#B91C1C' } : undefined}
                        >
                          {cap}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="field-group" ref={(el) => (fieldRefs.current.customCaps = el as unknown as HTMLElement)}>
              <label className="field-label" htmlFor="rc-customcaps">Custom capabilities (comma separated)</label>
              <input id="rc-customcaps" className="input gfw-mono" value={rc.customCaps} onChange={(e) => commit((p) => (p.customCaps = e.target.value), 'customCaps')} placeholder="edit_briefs, publish_briefs" />
            </div>
          </div>

          <div className="field-card" ref={(el) => (fieldRefs.current.grantTo = el as unknown as HTMLElement)}>
            <div className="field-card-header">
              <div className="field-card-title">Also grant to existing roles</div>
              <div className="field-card-desc">{grantNote}</div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {GRANT_ROLES.map((r) => (
                <button key={r} type="button" onClick={() => toggleGrant(r)} className={`chip${(rc.grantTo || []).includes(r) ? ' is-active' : ''}`}>
                  {r}
                </button>
              ))}
            </div>
          </div>

          <Collapsible title="Migration & cleanup" defaultOpen>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="toggle-card">
                <ToggleRow
                  label="Versioned migration"
                  help="Re-applies the map on admin_init whenever the version number changes."
                  checked={rc.migrate}
                  onChange={(v) => commit((p) => (p.migrate = v))}
                  toggleRef={(el) => (fieldRefs.current.migrate = el)}
                />
                <ToggleRow
                  label="Cleanup routine"
                  help="Reassigns affected users, then removes the role and its option."
                  checked={rc.removeOnUninstall}
                  onChange={(v) => commit((p) => (p.removeOnUninstall = v))}
                />
              </div>
              {rc.removeOnUninstall && (
                <div ref={(el) => (fieldRefs.current.fallbackRole = el as unknown as HTMLElement)}>
                  <label className="field-label" htmlFor="rc-fallback">Fallback role</label>
                  <input id="rc-fallback" className="input gfw-mono" value={rc.fallbackRole} onChange={(e) => commit((p) => (p.fallbackRole = e.target.value), 'fallbackRole')} placeholder="subscriber" />
                </div>
              )}
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
        label: 'Matrix',
        content: (
          <div>
            <div style={{ fontSize: 10.5, color: 'var(--gfw-text-mutest)', marginBottom: 11 }}>Your role against the three core roles it sits between. ✓ granted, · not granted.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, minWidth: 340 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr repeat(4, 46px)', gap: 4, paddingBottom: 7, borderBottom: '1px solid var(--gfw-border)' }}>
                <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)' }}>Capability</span>
                {matrixHeaders.map((mh, i) => (
                  <span key={i} style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--gfw-text-mutest)', textAlign: 'center', lineHeight: 1.2 }}>{mh.label}</span>
                ))}
              </div>
              {matrixRows.map((mr) => (
                <div key={mr.cap} style={{ display: 'grid', gridTemplateColumns: '1fr repeat(4, 46px)', gap: 4, padding: '6px 0', borderBottom: '1px solid var(--gfw-border-muted)', alignItems: 'center' }}>
                  <span className="gfw-mono" style={{ fontSize: 11.5, color: mr.nameColor }}>{mr.cap}</span>
                  {mr.cells.map((mc, i) => (
                    <span key={i} style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: mc.color }}>{mc.mark}</span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ),
      }}
      extraSecondaryTabs={[
        {
          label: 'Reference',
          content: (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <div className="gfw-mono" style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 4 }}>add_role()</div>
              <div style={{ fontSize: 12, color: 'var(--gfw-text-mutest)', marginBottom: 14 }}>Writes to the wp_user_roles option — once</div>

              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>Why the version matters</div>
              <div style={{ fontSize: 12.5, color: 'var(--gfw-text-strong)', lineHeight: 1.65, marginBottom: 18 }}>add_role() returns null and does nothing if the role already exists. Change the capability list in your code and nothing happens on any site that already ran it once. The generated migration stores a version number and re-applies the map whenever it changes — the difference between code that works on your machine and code that works on a client's.</div>

              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>Arguments and friends</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 18 }}>
                {REF_ARGS.map((ra) => (
                  <div key={ra.name} style={{ borderBottom: '1px solid var(--gfw-border)', paddingBottom: 9 }}>
                    <div className="gfw-mono" style={{ fontSize: 12.5, fontWeight: 700 }}>{ra.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--gfw-text-muted)', lineHeight: 1.5, marginTop: 3 }}>{ra.description}</div>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>Primitive vs meta capabilities</div>
              <div style={{ fontSize: 12.5, color: 'var(--gfw-text-strong)', lineHeight: 1.65, marginBottom: 18 }}>edit_posts is primitive: it lives in the role. edit_post — singular — is a meta capability that core maps at runtime against the specific post and its author. Never store singular meta caps in a role; check them with current_user_can( edit_post, $post_id ) instead.</div>

              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>On uninstall</div>
              <div style={{ fontSize: 12.5, color: 'var(--gfw-text-strong)', lineHeight: 1.65 }}>remove_role() deletes the role but leaves every user who had it with no role at all — they lose admin access entirely. The generated cleanup reassigns those users first, which is the part most plugins skip.</div>
            </div>
          ),
        },
      ]}
    />
  );
}
