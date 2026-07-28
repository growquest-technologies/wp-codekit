import { useMemo, useRef, useState } from 'react';
import { GeneratorShell } from '../../components/generator/GeneratorShell';
import { RepeatableCard } from '../../components/ui/RepeatableCard';
import { ToggleRow } from '../../components/ui/Toggle';
import { useDragReorder } from '../../lib/dragReorder';
import { useEditorState } from '../../lib/useEditorState';
import { useListOps } from '../../lib/useListOps';
import {
  BODIES,
  TYPES,
  applyFix,
  buildCode,
  derive,
  freshProject,
  validate,
  type FieldType,
  type OutputMode,
  type WidgetClass,
} from '../../generators/widgetClass';

const OUTPUT_MODES: { id: OutputMode; label: string }[] = [
  { id: 'snippet', label: 'Snippet' },
  { id: 'functions', label: 'functions.php' },
  { id: 'plugin', label: 'Plugin file' },
];

const REF_ARGS = [
  { name: '__construct()', description: 'Calls parent::__construct() with the id_base, the picker name and a description. The id_base is permanent: change it and every saved instance is orphaned.' },
  { name: 'widget( $args, $instance )', description: "Prints the front end. $args carries the sidebar's before_widget, after_widget, before_title and after_title — print all four." },
  { name: 'form( $instance )', description: 'The admin form. Use get_field_id() and get_field_name() so core can namespace each input per instance.' },
  { name: 'update( $new, $old )', description: 'Returns the settings to store. Sanitise per field here; nothing else will.' },
];

const BODY_NOTE: Record<WidgetClass['body'], string> = {
  posts: 'get_posts() with no_found_rows, driven by your number field, printed as an escaped list.',
  text: 'A textarea rendered through wpautop() and wp_kses_post() — the shape core’s Text widget uses.',
  list: 'A stub get_items() method you fill in, with escaped output already wired.',
  blank: 'An empty widget() body between before_widget and after_widget.',
};

export function WidgetClassGenerator() {
  const { state: wg, commit, undo, redo, reset, canUndo, canRedo, savedLabel } = useEditorState<WidgetClass>('widget-class-generator-v1', freshProject);
  const drag = useDragReorder();
  const fields = useListOps<WidgetClass>(commit)((p) => p.fields);
  const [outputMode, setOutputMode] = useState<OutputMode>('plugin');
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});

  const d = useMemo(() => derive(wg), [wg]);
  const code = useMemo(() => buildCode(wg, outputMode), [wg, outputMode]);
  const issues = useMemo(() => validate(wg), [wg]);
  const fileName = 'class-' + (wg.className.replace(/[^a-z0-9_]+/gi, '_').toLowerCase() || 'widget').replace(/_/g, '-') + '.php';

  const previewFields = d.fields.map((f) => ({
    key: f.id,
    label: f.label || f.id,
    value: String(f.def || ''),
    isInput: ['text', 'number', 'url'].includes(f.type),
    isTextarea: f.type === 'textarea',
    isCheckbox: f.type === 'checkbox',
    isSelect: f.type === 'select',
    choices: f.parsed,
  }));
  const legacyNote = "On WordPress 5.8 and later this form appears inside a Legacy Widget block. The markup core expects — widefat inputs, get_field_id() ids — is what the generated form() prints.";

  function focusField(id: string) {
    fieldRefs.current[id]?.focus();
  }
  function fix(kind: string) {
    commit((draft) => Object.assign(draft, applyFix(draft, kind)));
  }

  return (
    <GeneratorShell
      category="design"
      title="Widget Class Generator"
      description="All four methods, wired to your fields: the output, the admin form, and an update() that sanitises each value by its own type."
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
        label: 'Preview',
        content: (
          <div style={{ background: '#F0F0F1', margin: '-14px -16px -18px', padding: '16px 18px 40px' }}>
            <div style={{ fontSize: 10.5, color: '#787C82', marginBottom: 10 }}>Appearance → Widgets, expanded</div>
            <div style={{ background: '#fff', border: '1px solid #C3C4C7', borderRadius: 2 }}>
              <div style={{ padding: '9px 12px', borderBottom: '1px solid #F0F0F1', display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', background: '#F6F7F7' }}>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: '#1D2327' }}>{wg.name}</span>
                <span style={{ fontSize: 12, color: '#787C82' }}>⌃</span>
              </div>
              <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {previewFields.map((pf) => (
                  <div key={pf.key}>
                    <div style={{ fontSize: 12.5, color: '#1D2327', marginBottom: 4 }}>{pf.label}:</div>
                    {pf.isInput && (
                      <input readOnly value={pf.value} style={{ width: '100%', fontSize: 13, padding: '4px 7px', border: '1px solid #8C8F94', borderRadius: 3, background: '#fff' }} />
                    )}
                    {pf.isTextarea && (
                      <textarea readOnly defaultValue="" rows={3} style={{ width: '100%', fontSize: 13, padding: '5px 7px', border: '1px solid #8C8F94', borderRadius: 3, background: '#fff', resize: 'vertical' }} />
                    )}
                    {pf.isCheckbox && (
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: '#2C3338' }}>
                        <input type="checkbox" readOnly style={{ width: 15, height: 15, accentColor: '#2271B1' }} />
                        {pf.label}
                      </label>
                    )}
                    {pf.isSelect && (
                      <select style={{ width: '100%', fontSize: 13, padding: '3px 6px', border: '1px solid #8C8F94', borderRadius: 3, background: '#fff' }}>
                        {pf.choices.map((pfc) => (
                          <option key={pfc.value} value={pfc.value}>{pfc.label}</option>
                        ))}
                      </select>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ padding: '9px 12px', borderTop: '1px solid #F0F0F1', background: '#F6F7F7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12.5, color: '#B32D2E' }}>Delete</span>
                <span style={{ background: '#2271B1', color: '#fff', fontSize: 12.5, padding: '4px 12px', borderRadius: 3 }}>Save</span>
              </div>
            </div>
            <div style={{ marginTop: 12, fontSize: 11.5, color: '#787C82', lineHeight: 1.6 }}>{legacyNote}</div>
          </div>
        ),
      }}
      extraSecondaryTabs={[
        {
          label: 'Reference',
          content: (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <div className="gfw-mono" style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 4 }}>extends WP_Widget</div>
              <div style={{ fontSize: 12, color: 'var(--gfw-text-mutest)', marginBottom: 14 }}>Registered on widgets_init</div>

              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>The four methods</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 18 }}>
                {REF_ARGS.map((ra) => (
                  <div key={ra.name} style={{ borderBottom: '1px solid var(--gfw-border)', paddingBottom: 9 }}>
                    <div className="gfw-mono" style={{ fontSize: 12.5, fontWeight: 700 }}>{ra.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--gfw-text-muted)', lineHeight: 1.5, marginTop: 3 }}>{ra.description}</div>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>$args comes from the sidebar</div>
              <div style={{ fontSize: 12.5, color: 'var(--gfw-text-strong)', lineHeight: 1.65, marginBottom: 18 }}>before_widget, after_widget, before_title and after_title are handed to widget() by whichever sidebar the widget sits in. Print them — a widget that ignores them loses the theme's wrapper and its heading styling.</div>

              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>Where these still appear</div>
              <div style={{ fontSize: 12.5, color: 'var(--gfw-text-strong)', lineHeight: 1.65 }}>Since WordPress 5.8 the Widgets screen is block-based, and a WP_Widget shows up inside a Legacy Widget block. It still works, still saves, and in a classic theme it is still the shortest path to a configurable sidebar module. For a block theme, a real block is the better investment.</div>
            </div>
          ),
        },
      ]}
      form={
        <div>
          <div className="field-card field-card-primary">
            <div className="field-card-title">The widget</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
              <div>
                <label className="field-label" htmlFor="wg-name">Name in the picker</label>
                <input id="wg-name" className="input" placeholder="Recent Case Studies" value={wg.name} onChange={(e) => commit((p) => (p.name = e.target.value), 'name')} />
              </div>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>widget id_base</label>
                <input className="input gfw-mono" spellCheck={false} placeholder="acme_case_studies" value={wg.idBase} onChange={(e) => commit((p) => (p.idBase = e.target.value), 'idBase')} />
              </div>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>class name</label>
                <input className="input gfw-mono" spellCheck={false} placeholder="Acme_Case_Studies_Widget" value={wg.className} onChange={(e) => commit((p) => (p.className = e.target.value), 'className')} />
              </div>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>text domain</label>
                <input className="input gfw-mono" spellCheck={false} placeholder="acme" value={wg.textDomain} onChange={(e) => commit((p) => (p.textDomain = e.target.value), 'textDomain')} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="field-label">Description</label>
                <input className="input" placeholder="Lists the newest case studies with thumbnails." value={wg.description} onChange={(e) => commit((p) => (p.description = e.target.value), 'description')} />
                <div className="field-hint">Shown under the name in the widget picker.</div>
              </div>
            </div>
          </div>

          <div className="field-card">
            <div className="field-card-title">What it renders</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {BODIES.map(([id, label]) => (
                <button key={id} type="button" onClick={() => commit((p) => (p.body = id))} className={`chip${wg.body === id ? ' is-active' : ''}`}>
                  {label}
                </button>
              ))}
            </div>
            <div className="field-hint">{BODY_NOTE[wg.body]}</div>
          </div>

          <div className="field-card">
            <div className="field-card-title">Settings fields</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {wg.fields.map((f, i) => (
                <RepeatableCard
                  key={i}
                  index={i}
                  count={wg.fields.length}
                  title={f.label || 'Untitled field'}
                  subtitle={f.id.trim() || 'field'}
                  drag={drag.bind('fields', i, fields.reorder)}
                  onMoveUp={() => fields.moveUp(i)}
                  onMoveDown={() => fields.moveDown(i)}
                  onRemove={() => fields.remove(i)}
                >
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input className="input" style={{ flex: '1.4 1 120px' }} placeholder="Title" value={f.label} onChange={(e) => commit((p) => (p.fields[i].label = e.target.value), `field-label-${i}`)} />
                    <input className="input gfw-mono" style={{ width: 110 }} spellCheck={false} placeholder="title" value={f.id} onChange={(e) => commit((p) => (p.fields[i].id = e.target.value), `field-id-${i}`)} />
                    <select
                      className="select"
                      style={{ width: 118 }}
                      value={f.type}
                      onChange={(e) => commit((p) => {
                        const v = e.target.value as FieldType;
                        p.fields[i].type = v;
                        if (v === 'select' && !p.fields[i].choices) p.fields[i].choices = 'first:First, second:Second';
                      })}
                    >
                      {TYPES.map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                    <input className="input gfw-mono" style={{ width: 110 }} spellCheck={false} placeholder="default" value={f.def} onChange={(e) => commit((p) => (p.fields[i].def = e.target.value), `field-def-${i}`)} />
                  </div>
                  {f.type === 'select' && (
                    <input
                      className="input gfw-mono"
                      spellCheck={false}
                      placeholder="date:Newest, title:A to Z"
                      value={f.choices}
                      onChange={(e) => commit((p) => (p.fields[i].choices = e.target.value), `field-choices-${i}`)}
                    />
                  )}
                </RepeatableCard>
              ))}
              {!wg.fields.length && <div className="field-hint">No fields — the widget renders the same thing everywhere it is placed.</div>}
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm repeatable-add"
              style={{ marginTop: 11 }}
              onClick={() => commit((p) => p.fields.push({ id: 'field_' + (p.fields.length + 1), label: 'Field ' + (p.fields.length + 1), type: 'text', def: '', choices: '' }))}
            >
              Add field
            </button>
          </div>

          <div className="toggle-card">
            <div className="toggle-card-title">Extras</div>
            <ToggleRow
              label="Shortcode wrapper"
              help="Renders the same widget output outside a sidebar, via output buffering."
              checked={wg.shortcode}
              onChange={(v) => commit((p) => (p.shortcode = v))}
            />
          </div>
        </div>
      }
    />
  );
}
