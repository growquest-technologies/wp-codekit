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
  type OutputMode,
  type TermFieldType,
  type TermMeta,
} from '../../generators/termMeta';

const OUTPUT_MODES: { id: OutputMode; label: string }[] = [
  { id: 'snippet', label: 'Snippet' },
  { id: 'functions', label: 'functions.php' },
  { id: 'plugin', label: 'Plugin file' },
];

function padTo(s: string, w: number): string {
  return s + new Array(Math.max(0, w - s.length) + 1).join(' ');
}

const SAMPLE: Record<TermFieldType, string> = { color: '#3858E9', text: 'Everything we know, written down', number: '12', url: 'https://example.com', image: '482', textarea: '', checkbox: '', select: '' };

export function TermMetaGenerator() {
  const { state: tm, commit, undo, redo, reset, canUndo, canRedo, savedLabel } = useEditorState<TermMeta>('term-meta-generator-v1', freshProject);
  const [outputMode, setOutputMode] = useState<OutputMode>('plugin');

  const d = useMemo(() => derive(tm), [tm]);
  const code = useMemo(() => buildCode(tm, outputMode), [tm, outputMode]);
  const issues = useMemo(() => validate(tm), [tm]);
  const fileName = (slugify(tm.taxonomy) || 'term') + '-fields.php';
  const restCount = d.fields.filter((f) => f.inRest).length;
  const scopeNote = `${d.fields.length} field${d.fields.length === 1 ? '' : 's'} on ${d.tax} terms, ${restCount} exposed to REST. Hooks: ${d.tax}_add_form_fields, ${d.tax}_edit_form_fields, created_${d.tax}, edited_${d.tax}.`;
  const formNote = tm.addForm && tm.editForm
    ? 'Both forms are generated. The add screen uses div.form-field wrappers; this edit screen uses table rows.'
    : tm.editForm ? 'Only the edit form is generated — new terms cannot be given these values at creation.' : 'Only the add form is generated — values cannot be changed after creation.';
  const refHooks = padTo('{taxonomy}_add_form_fields', 30) + 'the add screen\n' + padTo('{taxonomy}_edit_form_fields', 30) + 'the edit screen\n' + padTo('created_{taxonomy}', 30) + 'after a term is created\n' + padTo('edited_{taxonomy}', 30) + 'after a term is updated\n' + padTo('manage_edit-{taxonomy}_columns', 30) + 'the terms table header\n' + padTo('manage_{taxonomy}_custom_column', 30) + 'the terms table cell';
  const refUsage = d.fields.length
    ? '$value = get_term_meta( $term_id, \'' + (d.metaPrefix + d.fields[0].key) + "', true );\n\n// In a term archive template:\n$term  = get_queried_object();\n$value = get_term_meta( $term->term_id, '" + (d.metaPrefix + d.fields[0].key) + "', true );"
    : 'Add a field first.';

  function fix(kind: string) {
    commit((draft) => Object.assign(draft, applyFix(draft, kind)));
  }

  function addField() {
    commit((p) => {
      p.fields = p.fields || [];
      const n = p.fields.length + 1;
      p.fields.push({ key: 'field_' + n, label: 'Field ' + n, type: 'text', inRest: true, description: '', choices: '' });
    });
  }

  function removeField(i: number) {
    commit((p) => p.fields.splice(i, 1));
  }

  type ToggleKey = 'addForm' | 'editForm' | 'column';
  const extraToggles: { key: ToggleKey; label: string; help: string; on: boolean }[] = [
    { key: 'addForm', label: 'Add-term form', help: 'The div-based markup the new-term screen expects.', on: tm.addForm },
    { key: 'editForm', label: 'Edit-term form', help: 'The table-row markup the edit screen expects — different from the add form.', on: tm.editForm },
    { key: 'column', label: 'Terms-table column', help: 'Shows the first field as a column in the terms list.', on: tm.column },
  ];
  function toggleFlag(key: ToggleKey) {
    commit((p) => { p[key] = !p[key]; });
  }

  return (
    <GeneratorShell
      category="content"
      title="Term Meta Generator"
      description="Term fields are three hooks, not one: the add form, the edit form, and a save that fires on both. All three generated together, so nothing silently fails to save."
      code={code}
      filename={fileName}
      editor={{ canUndo, canRedo, onUndo: undo, onRedo: redo, onNew: reset, savedLabel }}
      issues={issues}
      onFix={fix}
      outputModes={OUTPUT_MODES}
      activeOutputMode={outputMode}
      onOutputModeChange={(id) => setOutputMode(id as OutputMode)}
      secondaryTab={{
        label: 'Screen',
        content: (
          <div>
            <div className="field-hint" style={{ marginBottom: 10 }}>Edit term screen · {d.tax}</div>
            <div style={{ background: '#fff', border: '1px solid #C3C4C7', borderRadius: 2, padding: '14px 16px' }}>
              <h2 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600, color: '#1D2327' }}>Edit Category</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1D2327', marginBottom: 4 }}>Name</div>
                  <input readOnly value="Guides" style={{ width: '100%', maxWidth: 320, fontSize: 13.5, padding: '5px 8px', border: '1px solid #8C8F94', borderRadius: 3, background: '#fff' }} />
                </div>
                {d.fields.map((f) => (
                  <div key={f.key}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1D2327', marginBottom: 4 }}>{f.label || f.key}</div>
                    {['text', 'number', 'url', 'image'].includes(f.type) && (
                      <input readOnly value={SAMPLE[f.type]} style={{ width: '100%', maxWidth: 320, fontSize: 13.5, padding: '5px 8px', border: '1px solid #8C8F94', borderRadius: 3, background: '#fff' }} />
                    )}
                    {f.type === 'textarea' && (
                      <textarea readOnly value="" rows={3} style={{ width: '100%', fontSize: 13, padding: '6px 8px', border: '1px solid #8C8F94', borderRadius: 3, background: '#fff', resize: 'vertical' }} />
                    )}
                    {f.type === 'checkbox' && (
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5, color: '#2C3338' }}>
                        <input type="checkbox" readOnly style={{ width: 16, height: 16, accentColor: '#2271B1' }} />
                        {f.label || f.key}
                      </label>
                    )}
                    {f.type === 'select' && (
                      <select style={{ fontSize: 13.5, padding: '4px 8px', border: '1px solid #8C8F94', borderRadius: 3, background: '#fff', minWidth: 170 }}>
                        {f.parsed.map((c) => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                    )}
                    {f.type === 'color' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 26, height: 26, borderRadius: 3, border: '1px solid #8C8F94', background: '#3858E9', display: 'inline-block' }} />
                        <span className="gfw-mono" style={{ fontSize: 13, color: '#2C3338' }}>#3858E9</span>
                      </div>
                    )}
                    {f.description && <p style={{ margin: '5px 0 0', fontSize: 12.5, color: '#646970', lineHeight: 1.5 }}>{f.description}</p>}
                  </div>
                ))}
              </div>
              <button type="button" style={{ marginTop: 16, background: '#2271B1', border: '1px solid #2271B1', color: '#fff', fontSize: 13, padding: '6px 14px', borderRadius: 3, cursor: 'pointer' }}>Update</button>
            </div>
            <div style={{ marginTop: 12, fontSize: 11.5, color: 'var(--gfw-text-muted)', lineHeight: 1.6 }}>{formNote}</div>
          </div>
        ),
      }}
      extraSecondaryTabs={[
        {
          label: 'Reference',
          content: (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <div className="gfw-mono" style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 4 }}>register_term_meta()</div>
              <div className="field-hint" style={{ marginBottom: 14 }}>Plus three form hooks, all named after your taxonomy</div>

              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--gfw-text-faint)', marginBottom: 8 }}>The hooks involved</div>
              <div className="card gfw-mono" style={{ padding: '12px 14px', fontSize: 11.5, lineHeight: 1.7, whiteSpace: 'pre-wrap', marginBottom: 18 }}>{refHooks}</div>

              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--gfw-text-faint)', marginBottom: 8 }}>Two forms, different markup</div>
              <div style={{ fontSize: 12.5, lineHeight: 1.65, marginBottom: 18 }}>The add form is a stack of divs; the edit form is a table row. Reusing one markup for both is the reason term fields so often look broken on one screen and fine on the other — the generated code emits each properly.</div>

              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--gfw-text-faint)', marginBottom: 8 }}>Saving</div>
              <div style={{ fontSize: 12.5, lineHeight: 1.65, marginBottom: 18 }}>created_{'{taxonomy}'} and edited_{'{taxonomy}'} both fire after the term is written, so one handler serves both. It runs for every term save — including inline Quick Edit, where your fields are not in the request at all. That is why the handler checks isset() per field rather than blindly writing.</div>

              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--gfw-text-faint)', marginBottom: 8 }}>Reading it back</div>
              <div className="card gfw-mono" style={{ padding: '12px 14px', fontSize: 11.5, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{refUsage}</div>
            </div>
          ),
        },
      ]}
      form={
        <div>
          <div className="field-card field-card-primary">
            <div className="field-card-title">Scope</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>taxonomy</label>
                <input className="input gfw-mono" value={tm.taxonomy} onChange={(ev) => commit((p) => (p.taxonomy = ev.target.value), 'taxonomy')} placeholder="category" />
              </div>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>key prefix</label>
                <input className="input gfw-mono" value={tm.metaPrefix} onChange={(ev) => commit((p) => (p.metaPrefix = ev.target.value), 'metaPrefix')} placeholder="acme_" />
              </div>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>function prefix</label>
                <input className="input gfw-mono" value={tm.prefix} onChange={(ev) => commit((p) => (p.prefix = ev.target.value), 'prefix')} placeholder="acme" />
              </div>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>text domain</label>
                <input className="input gfw-mono" value={tm.textDomain} onChange={(ev) => commit((p) => (p.textDomain = ev.target.value), 'textDomain')} placeholder="acme" />
              </div>
            </div>
            <div className="field-hint" style={{ marginTop: 12 }}>{scopeNote}</div>
          </div>

          <div className="field-card">
            <div className="field-card-header">
              <div className="field-card-title">Fields</div>
              <div className="field-card-desc">{d.fields.length} {d.fields.length === 1 ? 'field' : 'fields'}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {tm.fields.map((f, i) => (
                <div key={i} className="card" style={{ padding: 11 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                      className="input"
                      style={{ flex: 1.4, minWidth: 130, fontWeight: 600 }}
                      value={f.label}
                      placeholder="Accent colour"
                      onChange={(ev) => commit((p) => (p.fields[i].label = ev.target.value), 'field-label-' + i)}
                    />
                    <input
                      className="input gfw-mono"
                      style={{ width: 120 }}
                      value={f.key}
                      placeholder="accent"
                      onChange={(ev) => commit((p) => (p.fields[i].key = ev.target.value), 'field-key-' + i)}
                    />
                    <select
                      className="select"
                      style={{ width: 118 }}
                      value={f.type}
                      onChange={(ev) => commit((p) => {
                        const v = ev.target.value as TermFieldType;
                        p.fields[i].type = v;
                        if (v === 'select' && !p.fields[i].choices) p.fields[i].choices = 'first:First, second:Second';
                      })}
                    >
                      {TYPES.map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <Toggle
                        checked={f.inRest}
                        onChange={(v) => commit((p) => (p.fields[i].inRest = v))}
                        ariaLabel="Show in REST"
                      />
                      <span style={{ fontSize: 12, color: 'var(--gfw-text-body)' }}>REST</span>
                    </div>
                    <button type="button" aria-label="Remove field" title="Remove field" onClick={() => removeField(i)} className="btn btn-ghost btn-sm">✕</button>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 7 }}>
                    <span className="gfw-mono" style={{ fontSize: 11, color: 'var(--gfw-text-faint)', whiteSpace: 'nowrap' }}>{d.metaPrefix + (f.key.trim() || 'field')}</span>
                    <input
                      className="input"
                      style={{ flex: 1, minWidth: 150 }}
                      value={f.description}
                      placeholder="Help text under the field."
                      onChange={(ev) => commit((p) => (p.fields[i].description = ev.target.value), 'field-description-' + i)}
                    />
                  </div>
                  {f.type === 'select' && (
                    <div style={{ marginTop: 7 }}>
                      <input
                        className="input gfw-mono"
                        value={f.choices}
                        placeholder="left:Left, right:Right"
                        onChange={(ev) => commit((p) => (p.fields[i].choices = ev.target.value), 'field-choices-' + i)}
                      />
                    </div>
                  )}
                </div>
              ))}
              {tm.fields.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--gfw-text-muted)' }}>No fields yet.</div>}
            </div>
            <button type="button" onClick={addField} className="btn btn-ghost btn-sm" style={{ marginTop: 11, borderStyle: 'dashed' }}>Add field</button>
          </div>

          <div className="toggle-card">
            <div className="toggle-card-title">Where it appears</div>
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
