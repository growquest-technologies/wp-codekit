import { useMemo, useRef, useState } from 'react';
import { GeneratorShell } from '../../components/generator/GeneratorShell';
import { RepeatableCard } from '../../components/ui/RepeatableCard';
import { Toggle } from '../../components/ui/Toggle';
import { useDragReorder } from '../../lib/dragReorder';
import { useEditorState } from '../../lib/useEditorState';
import { useListOps } from '../../lib/useListOps';
import {
  CORE_METHODS,
  PRESETS,
  TYPES,
  applyFix,
  buildCode,
  derive,
  freshProject,
  validate,
  type FieldType,
  type OutputMode,
  type UserContactMethods,
} from '../../generators/userContactMethods';

const OUTPUT_MODES: { id: OutputMode; label: string }[] = [
  { id: 'snippet', label: 'Snippet' },
  { id: 'functions', label: 'functions.php' },
  { id: 'plugin', label: 'Plugin file' },
  { id: 'class', label: 'Class' },
];

export function UserContactMethodsGenerator() {
  const { state: ucm, commit, undo, redo, reset, canUndo, canRedo, savedLabel } = useEditorState<UserContactMethods>('user-contact-methods-generator-v1', freshProject);
  const drag = useDragReorder();
  const fields = useListOps<UserContactMethods>(commit)((p) => p.fields);
  const [outputMode, setOutputMode] = useState<OutputMode>('plugin');
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});

  const d = useMemo(() => derive(ucm), [ucm]);
  const code = useMemo(() => buildCode(ucm, outputMode), [ucm, outputMode]);
  const issues = useMemo(() => validate(ucm), [ucm]);
  const fileName = (d.pre || 'acme').replace(/_/g, '-') + '-contact-methods.php';

  function focusField(id: string) {
    fieldRefs.current[id]?.focus();
  }
  function fix(kind: string) {
    commit((draft) => Object.assign(draft, applyFix(draft, kind)));
  }
  function toggleCore(id: string) {
    commit((p) => {
      p.removedCore = p.removedCore || [];
      const i = p.removedCore.indexOf(id);
      if (i >= 0) p.removedCore.splice(i, 1);
      else p.removedCore.push(id);
    });
  }
  function addField() {
    commit((p) => {
      p.fields = p.fields || [];
      const n = p.fields.length + 1;
      p.fields.push({ label: 'Field ' + n, key: 'field_' + n, type: 'text', required: false, rest: false });
    });
  }
  function addPreset(i: number) {
    commit((p) => {
      p.fields = (p.fields || []).concat([JSON.parse(JSON.stringify(PRESETS[i].f))]);
    });
  }

  const fieldsNote = `${d.fields.length} ${d.fields.length === 1 ? 'field' : 'fields'}`;
  const coreNote = d.removed.length ? `${d.removed.length} removed` : 'all kept';

  const refSignature = `add_filter( 'user_contact_methods', 'callback', 10, 2 );\n\nfunction callback( $methods, $user ) {\n\t$methods['${d.pre}_mastodon'] = __( 'Mastodon', '${d.td}' );\n\n\treturn $methods;\n}`;
  const refArgs = [
    { name: '$methods', type: 'array', description: 'Meta key => visible label. The key is the usermeta key, verbatim — no prefixing happens for you.' },
    { name: '$user', type: 'WP_User|null', description: 'The user being edited. Null on the users list screen, so always null-check before reading roles.' },
    { name: 'save', type: 'core', description: 'wp_insert_user() walks the method list and writes each posted value through sanitize_text_field().' },
    { name: 'display', type: 'admin', description: 'Core renders one text input per method in the Contact Info table. There is no way to change the input type from this filter.' },
    { name: 'read', type: 'template', description: `get_the_author_meta( '${d.pre}_mastodon' ) or get_user_meta( $id, $key, true ) — both return the raw value, unescaped.` },
  ];
  const refUsage = `// Inside the loop.\n$url = get_the_author_meta( '${d.pre}_mastodon' );\n\nif ( $url ) {\n\tprintf(\n\t\t'<a href="%s" rel="me">Mastodon</a>',\n\t\tesc_url( $url )\n\t);\n}`;

  return (
    <GeneratorShell
      category="admin"
      title="User Contact Methods Generator"
      description={<>Add fields to the Contact Info table on the user profile screen, with sanitisation, validation, REST exposure and an output helper.</>}
      form={
        <div>
          <div className="field-card" ref={(el) => (fieldRefs.current.fields = el as unknown as HTMLElement)}>
            <div className="field-card-header">
              <div className="field-card-title">Your fields</div>
              <div className="field-card-desc">{fieldsNote}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {ucm.fields.map((f, i) => (
                <RepeatableCard
                  key={i}
                  index={i}
                  count={ucm.fields.length}
                  title={f.label || `Field ${i + 1}`}
                  subtitle={f.key}
                  drag={drag.bind('fields', i, fields.reorder)}
                  onMoveUp={() => fields.moveUp(i)}
                  onMoveDown={() => fields.moveDown(i)}
                  onRemove={() => fields.remove(i)}
                >
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <input className="input" style={{ flex: 1, minWidth: 120 }} placeholder="Mastodon" value={f.label} onChange={(e) => commit((p) => (p.fields[i].label = e.target.value))} />
                    <input className="input gfw-mono" style={{ width: 130 }} placeholder="mastodon" value={f.key} onChange={(e) => commit((p) => (p.fields[i].key = e.target.value))} />
                    <select className="select" style={{ width: 120 }} value={f.type} onChange={(e) => commit((p) => (p.fields[i].type = e.target.value as FieldType))}>
                      {TYPES.map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
                      <Toggle checked={f.required} onChange={(v) => commit((p) => (p.fields[i].required = v))} ariaLabel="Required" />
                      <span style={{ fontSize: 13.5, fontWeight: 650, color: 'var(--gfw-text-strong)' }}>Required</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
                      <Toggle checked={f.rest} onChange={(v) => commit((p) => (p.fields[i].rest = v))} ariaLabel="In REST" />
                      <span style={{ fontSize: 13.5, fontWeight: 650, color: 'var(--gfw-text-strong)' }}>In REST</span>
                    </div>
                  </div>
                </RepeatableCard>
              ))}
              {ucm.fields.length === 0 && <div className="field-hint">No fields yet.</div>}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-ghost btn-sm repeatable-add" onClick={addField}>Add field</button>
              {PRESETS.map((p, i) => (
                <button key={p.label} type="button" className="btn btn-ghost btn-sm" onClick={() => addPreset(i)}>+ {p.label}</button>
              ))}
            </div>
          </div>

          <div className="field-card field-card-primary">
            <div className="field-card-title">What ships alongside</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label className="field-label" htmlFor="ucm-prefix">Prefix</label>
                <input id="ucm-prefix" className="input gfw-mono" value={ucm.prefix} onChange={(e) => commit((p) => (p.prefix = e.target.value), 'prefix')} placeholder="acme" />
              </div>
              <div>
                <label className="field-label" htmlFor="ucm-td">Text domain</label>
                <input id="ucm-td" className="input gfw-mono" value={ucm.textDomain} onChange={(e) => commit((p) => (p.textDomain = e.target.value), 'textDomain')} placeholder="acme" />
              </div>
            </div>
            <div className="field-group" ref={(el) => (fieldRefs.current.helper = el as unknown as HTMLElement)}>
              <label className="field-label" htmlFor="ucm-helper">Output helper</label>
              <select id="ucm-helper" className="select" value={ucm.helper} onChange={(e) => commit((p) => (p.helper = e.target.value as UserContactMethods['helper']))}>
                <option value="none">None</option>
                <option value="single">One value at a time</option>
                <option value="list">A ready-made list of links</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <Toggle checked={ucm.validate} onChange={(v) => commit((p) => (p.validate = v))} ariaLabel="Validate on save" />
              <span
                ref={(el) => (fieldRefs.current.validate = el)}
                tabIndex={-1}
                style={{ fontSize: 13.5, fontWeight: 650, color: 'var(--gfw-text-strong)' }}
              >
                Validate on save — hooks user_profile_update_errors so bad URLs, bad emails and empty required fields are rejected before core writes them.
              </span>
            </div>
          </div>

          <div className="field-card" ref={(el) => (fieldRefs.current.removedCore = el as unknown as HTMLElement)}>
            <div className="field-card-header">
              <div className="field-card-title">Core methods</div>
              <div className="field-card-desc">{coreNote}</div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {CORE_METHODS.map(([id, help]) => (
                <button
                  key={id}
                  type="button"
                  title={help}
                  onClick={() => toggleCore(id)}
                  className={`chip${(ucm.removedCore || []).includes(id) ? ' is-active' : ''}`}
                  style={(ucm.removedCore || []).includes(id) ? { borderColor: '#B91C1C', background: '#FBEBEB', color: '#B91C1C' } : undefined}
                >
                  {id}
                </button>
              ))}
            </div>
          </div>
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
        label: 'Reference',
        content: (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <div className="gfw-mono" style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 4 }}>user_contact_methods</div>
            <div style={{ fontSize: 12, color: 'var(--gfw-text-mutest)', marginBottom: 14 }}>Filter, two arguments, applied by wp_get_user_contact_methods()</div>
            <pre className="gfw-mono" style={{ border: '1px solid var(--gfw-border)', borderRadius: 7, padding: '12px 14px', background: 'var(--gfw-surface-sunken)', fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginBottom: 18 }}>{refSignature}</pre>

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>How core handles the value</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 18 }}>
              {refArgs.map((ra) => (
                <div key={ra.name} style={{ borderBottom: '1px solid var(--gfw-border)', paddingBottom: 9 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                    <span className="gfw-mono" style={{ fontSize: 12.5, fontWeight: 700 }}>{ra.name}</span>
                    <span className="type-badge">{ra.type}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--gfw-text-muted)', lineHeight: 1.5, marginTop: 4 }}>{ra.description}</div>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>Reading a value in a template</div>
            <pre className="gfw-mono" style={{ border: '1px solid var(--gfw-border)', borderRadius: 7, padding: '12px 14px', background: 'var(--gfw-surface-sunken)', fontSize: 11.5, lineHeight: 1.7, whiteSpace: 'pre-wrap', marginBottom: 18 }}>{refUsage}</pre>

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>Core only sanitises, never validates</div>
            <div style={{ fontSize: 12.5, color: 'var(--gfw-text-strong)', lineHeight: 1.65, marginBottom: 18 }}>Every contact method is saved through sanitize_text_field() and nothing else. A URL field will happily store "not a url", and a handle field will store a full profile URL. That is why the generated code hooks user_profile_update_errors — it is the only place to reject a value before it is written.</div>

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>The keys are plain usermeta</div>
            <div style={{ fontSize: 12.5, color: 'var(--gfw-text-strong)', lineHeight: 1.65 }}>A method named twitter writes to the usermeta key twitter, in the same namespace as every other plugin on the site. Prefixing is not decoration here — it is the only thing stopping two plugins from writing over each other's values.</div>
          </div>
        ),
      }}
    />
  );
}
