import { useMemo, useRef, useState } from 'react';
import { GeneratorShell } from '../../components/generator/GeneratorShell';
import { ToggleRow } from '../../components/ui/Toggle';
import { useEditorState } from '../../lib/useEditorState';
import {
  CAPS,
  PERSIST_NOTE,
  SCREENS,
  TYPES,
  TYPE_COLOR,
  applyFix,
  buildCode,
  derive,
  freshProject,
  validate,
  type AdminNotice,
  type OutputMode,
} from '../../generators/adminNotice';
import { slugify } from '../../lib/codegen';

const OUTPUT_MODES: { id: OutputMode; label: string }[] = [
  { id: 'snippet', label: 'Snippet' },
  { id: 'functions', label: 'functions.php' },
  { id: 'plugin', label: 'Plugin file' },
];

const REF_CLASSES: { name: string; color: string; description: string }[] = [
  { name: 'notice notice-success', color: '#00A32A', description: 'Green. Something finished. Core uses it for saves and updates.' },
  { name: 'notice notice-info', color: '#72AEE6', description: 'Blue. Context the user did not ask for but might want.' },
  { name: 'notice notice-warning', color: '#DBA617', description: 'Amber. Something needs attention but nothing is broken yet — the right class for setup nudges.' },
  { name: 'notice notice-error', color: '#D63638', description: 'Red. Something failed or will fail. Spend it carefully.' },
  { name: 'is-dismissible', color: '#787C82', description: 'Core adds the X button and hides the notice on click. Client side only.' },
  { name: 'notice-alt', color: '#787C82', description: 'Flat background, no white card. Meant for notices inside other UI.' },
];

function padTo(s: string, w: number): string {
  return s + ' '.repeat(Math.max(0, w - s.length));
}

const refScreens = [
  ...SCREENS.map(([id, label]) => padTo(id, 22) + label),
  padTo('edit-<post_type>', 22) + 'Any post type list',
  padTo('<post_type>', 22) + 'That post type’s editor',
  padTo('settings_page_<slug>', 22) + 'Your own settings page',
].join('\n');

export function AdminNoticeGenerator() {
  const { state: an, commit, undo, redo, reset, canUndo, canRedo, savedLabel } = useEditorState<AdminNotice>('admin-notice-generator-v1', freshProject);
  const [outputMode, setOutputMode] = useState<OutputMode>('snippet');
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});

  const d = useMemo(() => derive(an), [an]);
  const code = useMemo(() => buildCode(an, outputMode), [an, outputMode]);
  const issues = useMemo(() => validate(an), [an]);
  const fileName = (slugify(an.id).replace(/-/g, '_') || 'admin-notice').replace(/_/g, '-') + '-notice.php';

  function focusField(id: string) {
    fieldRefs.current[id]?.focus();
  }
  function fix(kind: string) {
    commit((draft) => Object.assign(draft, applyFix(draft, kind)));
  }
  function toggleScreen(id: string) {
    commit((p) => {
      p.screens = p.screens || [];
      const i = p.screens.indexOf(id);
      if (i >= 0) p.screens.splice(i, 1);
      else p.screens.push(id);
    });
  }

  const scopeNote = d.screens.length ? `${d.screens.length} screen${d.screens.length === 1 ? '' : 's'}` : 'everywhere';
  const previewNote = d.screens.length ? `Shown on ${d.screens.length} screen${d.screens.length === 1 ? '' : 's'}` : 'Shown on every admin screen';

  return (
    <GeneratorShell
      category="admin"
      title="Admin Notice Generator"
      description={<>Notices that appear on the right screens, to the right people, and stay gone when dismissed — the AJAX handler and nonce included.</>}
      form={
        <div>
          <div style={{ background: '#F0F0F1', border: '1px solid var(--gfw-border)', borderRadius: 8, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 10 }}>Live preview</div>
            <div style={{ background: '#fff', border: '1px solid #C3C4C7', borderLeft: `4px solid ${TYPE_COLOR[an.type]}`, padding: '1px 12px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 0, padding: '8px 0' }}>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: '#2C3338' }}>
                  {an.strong && <strong>{an.strong} </strong>}
                  {an.message}
                </p>
                {an.actionLabel && (
                  <p style={{ margin: '9px 0 8px' }}>
                    <span style={{ display: 'inline-block', background: '#2271B1', color: '#fff', fontSize: 13, padding: '4px 12px', borderRadius: 3 }}>{an.actionLabel}</span>
                  </p>
                )}
              </div>
              {an.dismissible && <span style={{ flexShrink: 0, fontSize: 16, color: '#787C82', padding: '6px 2px', lineHeight: 1 }}>×</span>}
            </div>
            <div style={{ marginTop: 9, fontSize: 11.5, color: '#787C82', lineHeight: 1.5 }}>{previewNote}</div>
          </div>

          <div className="field-card">
            <div className="field-card-title">The notice</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
              {TYPES.map(([v, l]) => (
                <button key={v} type="button" onClick={() => commit((p) => (p.type = v))} className={`chip${an.type === v ? ' is-active' : ''}`}>
                  {l}
                </button>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label className="field-label" htmlFor="an-strong">Lead-in (bold)</label>
                <input id="an-strong" className="input" value={an.strong} onChange={(e) => commit((p) => (p.strong = e.target.value), 'strong')} placeholder="Acme Toolkit:" />
              </div>
              <div>
                <label className="field-label" htmlFor="an-id">Notice id</label>
                <input id="an-id" ref={(el) => (fieldRefs.current.id = el)} className="input gfw-mono" value={an.id} onChange={(e) => commit((p) => (p.id = e.target.value), 'id')} placeholder="acme_setup" />
              </div>
            </div>
            <div className="field-group">
              <label className="field-label" htmlFor="an-message">Message</label>
              <textarea id="an-message" ref={(el) => (fieldRefs.current.message = el)} rows={2} className="textarea" value={an.message} onChange={(e) => commit((p) => (p.message = e.target.value), 'message')} placeholder="Add your API key to finish setting up." />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label className="field-label" htmlFor="an-actionlabel">Button label</label>
                <input id="an-actionlabel" className="input" value={an.actionLabel} onChange={(e) => commit((p) => (p.actionLabel = e.target.value), 'actionLabel')} placeholder="Open settings" />
              </div>
              <div>
                <label className="field-label" htmlFor="an-actionpage">Button target</label>
                <input id="an-actionpage" ref={(el) => (fieldRefs.current.actionPage = el)} className="input gfw-mono" value={an.actionPage} onChange={(e) => commit((p) => (p.actionPage = e.target.value), 'actionPage')} placeholder="options-general.php?page=acme" />
              </div>
            </div>
          </div>

          <div className="field-card" ref={(el) => (fieldRefs.current.screens = el as unknown as HTMLElement)}>
            <div className="field-card-header">
              <div className="field-card-title">Where it shows</div>
              <div className="field-card-desc">{scopeNote}</div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 13 }}>
              {SCREENS.map(([id, label]) => (
                <button key={id} type="button" onClick={() => toggleScreen(id)} className={`chip${d.screens.includes(id) ? ' is-active' : ''}`}>
                  {label}
                </button>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div ref={(el) => (fieldRefs.current.capability = el as unknown as HTMLElement)}>
                <label className="field-label" htmlFor="an-cap">Capability</label>
                <select id="an-cap" className="select" value={an.capability} onChange={(e) => commit((p) => (p.capability = e.target.value))}>
                  {CAPS.map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div ref={(el) => (fieldRefs.current.persist = el as unknown as HTMLElement)}>
                <label className="field-label" htmlFor="an-persist">Remembers dismissal</label>
                <select id="an-persist" className="select" value={an.persist} onChange={(e) => commit((p) => (p.persist = e.target.value as AdminNotice['persist']))}>
                  <option value="none">Not at all — returns on reload</option>
                  <option value="user">Per user, forever (user meta)</option>
                  <option value="user-days">Per user, snoozed (transient)</option>
                  <option value="site">Site-wide (option)</option>
                </select>
              </div>
              {an.persist === 'user-days' && (
                <div>
                  <label className="field-label" htmlFor="an-snooze">Snooze (days)</label>
                  <input id="an-snooze" ref={(el) => (fieldRefs.current.snoozeDays = el)} className="input gfw-mono" value={an.snoozeDays} onChange={(e) => commit((p) => (p.snoozeDays = e.target.value), 'snoozeDays')} placeholder="30" />
                </div>
              )}
              <div>
                <label className="field-label" htmlFor="an-prefix">Prefix</label>
                <input id="an-prefix" className="input gfw-mono" value={an.prefix} onChange={(e) => commit((p) => (p.prefix = e.target.value), 'prefix')} placeholder="acme" />
              </div>
              <div>
                <label className="field-label" htmlFor="an-td">Text domain</label>
                <input id="an-td" className="input gfw-mono" value={an.textDomain} onChange={(e) => commit((p) => (p.textDomain = e.target.value), 'textDomain')} placeholder="acme" />
              </div>
            </div>
            <div className="field-hint">{PERSIST_NOTE[an.persist](an, d)}</div>
          </div>

          <div className="toggle-card">
            <div className="toggle-card-title">Behaviour</div>
            <ToggleRow
              label="Dismissible"
              help="Adds is-dismissible so core prints the X button."
              checked={an.dismissible}
              onChange={(v) => commit((p) => (p.dismissible = v))}
              toggleRef={(el) => (fieldRefs.current.dismissible = el)}
            />
            <ToggleRow
              label="notice-alt styling"
              help="The flat variant core uses inside plugin table rows."
              checked={an.altStyle}
              onChange={(v) => commit((p) => (p.altStyle = v))}
            />
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
          <div>
            <div className="gfw-mono" style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--gfw-text-strong)', marginBottom: 4 }}>admin_notices</div>
            <div style={{ fontSize: 12, color: 'var(--gfw-text-mutest)', marginBottom: 14 }}>Fires after the admin header, before the page content</div>

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>The classes core styles</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 18 }}>
              {REF_CLASSES.map((rc) => (
                <div key={rc.name} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', borderBottom: '1px solid #F0ECE4', paddingBottom: 9 }}>
                  <span style={{ flexShrink: 0, width: 4, alignSelf: 'stretch', background: rc.color, borderRadius: 2 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="gfw-mono" style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--gfw-text-strong)' }}>{rc.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--gfw-text-body)', lineHeight: 1.5, marginTop: 3 }}>{rc.description}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>Where notices land</div>
            <div style={{ fontSize: 12.5, color: 'var(--gfw-text-body)', lineHeight: 1.65, marginBottom: 18 }}>
              Core moves the first element carrying a notice class to just under the page h1, so anything printed on admin_notices ends up there. If the notice belongs inline — inside your own settings page, under a specific field — add notice-inline and print it yourself rather than on the hook.
            </div>

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>Screen ids you can scope to</div>
            <pre className="gfw-mono" style={{ border: '1px solid var(--gfw-border)', borderRadius: 7, padding: '12px 14px', background: 'var(--gfw-surface-muted)', fontSize: 11.5, lineHeight: 1.6, color: 'var(--gfw-text-strong)', whiteSpace: 'pre-wrap', marginBottom: 18 }}>
              {refScreens}
            </pre>

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>Dismissal, honestly</div>
            <div style={{ fontSize: 12.5, color: 'var(--gfw-text-body)', lineHeight: 1.65 }}>
              is-dismissible only hides the notice in the DOM — reload and it is back. Anything that should stay dismissed needs a round trip: the AJAX handler and user meta this generator writes. Storing it site-wide instead means the first admin to click X dismisses it for the whole team.
            </div>
          </div>
        ),
      }}
    />
  );
}
