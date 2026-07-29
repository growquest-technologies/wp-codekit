import { useMemo, useRef, useState } from 'react';
import { GeneratorShell } from '../../components/generator/GeneratorShell';
import { Collapsible } from '../../components/ui/Collapsible';
import { RepeatableCard } from '../../components/ui/RepeatableCard';
import { ToggleRow } from '../../components/ui/Toggle';
import { useDragReorder } from '../../lib/dragReorder';
import { useEditorState } from '../../lib/useEditorState';
import { useListOps } from '../../lib/useListOps';
import {
  CAPS,
  FIELD_TYPES,
  ICONS,
  PARENTS,
  PARENT_LABEL,
  applyFix,
  buildCode,
  derive,
  freshProject,
  placementNote,
  positionNote,
  storageNote,
  validate,
  type FieldType,
  type OutputMode,
  type SettingsField,
  type SettingsPage,
} from '../../generators/settingsPage';
import { slugify } from '../../lib/codegen';

const OUTPUT_MODES: { id: OutputMode; label: string }[] = [
  { id: 'snippet', label: 'Snippet' },
  { id: 'functions', label: 'functions.php' },
  { id: 'plugin', label: 'Plugin file' },
];

function padTo(s: string, w: number): string {
  return s + ' '.repeat(Math.max(0, w - s.length));
}

function defLiteral(f: SettingsField): string {
  if (f.type === 'checkbox') return String(f.def) === '1' || String(f.def).toLowerCase() === 'true' ? 'true' : 'false';
  if (f.type === 'number') return String(parseInt(f.def, 10) || 0);
  return `'${String(f.def || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

const HOOK_BASE: Record<string, string> = { 'options-general.php': 'settings', 'tools.php': 'tools', 'themes.php': 'appearance', 'plugins.php': 'plugins', 'users.php': 'users', 'upload.php': 'media', 'edit.php': 'posts' };

export function SettingsPageGenerator() {
  const { state: sp, commit, undo, redo, reset, canUndo, canRedo, savedLabel } = useEditorState<SettingsPage>('settings-page-generator-v1', freshProject);
  const drag = useDragReorder();
  const listOf = useListOps<SettingsPage>(commit);
  const sections = listOf((p) => p.sections);
  const fields = listOf((p) => p.fields);
  const [outputMode, setOutputMode] = useState<OutputMode>('snippet');
  const [screenTab, setScreenTab] = useState('');
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});

  const d = useMemo(() => derive(sp), [sp]);
  const code = useMemo(() => buildCode(sp, outputMode), [sp, outputMode]);
  const issues = useMemo(() => validate(sp), [sp]);
  const fileName = (slugify(sp.slug) || 'settings') + '-settings.php';
  const isTop = sp.parent === 'top';
  const isCustomParent = sp.parent === 'custom';

  const activeScreenTab = sp.tabbed && d.sections.some((x) => x.id === screenTab) ? screenTab : d.sections[0].id;
  const shownSections = sp.tabbed ? d.sections.filter((x) => x.id === activeScreenTab) : d.sections;
  const placementLabel = d.isTop
    ? `Top-level menu at position ${parseInt(sp.position, 10) || 80}`
    : `${PARENT_LABEL[sp.parent] || d.parentFile} → ${sp.menuTitle || sp.pageTitle || 'Settings'}`;
  const screenTabs = d.sections.map((sec) => ({ id: sec.id, label: sec.title, active: sec.id === activeScreenTab }));
  const screenSections = shownSections.map((sec) => {
    const rows = d.fields.filter((f) => f.section === sec.id);
    return {
      title: sec.title,
      description: sec.description,
      empty: rows.length === 0,
      fields: rows.map((f) => ({
        key: f.id,
        label: f.label || f.id,
        value: f.type === 'checkbox' ? '' : String(f.def || ''),
        placeholder: f.placeholder || '',
        description: f.description,
        hasDescription: !!f.description,
        isInput: ['text', 'number', 'email', 'url'].includes(f.type),
        isTextarea: f.type === 'textarea',
        isCheckbox: f.type === 'checkbox',
        isSelect: f.type === 'select',
        isRadio: f.type === 'radio',
        isColor: f.type === 'color',
        checked: String(f.def) === '1' || String(f.def) === 'true',
        inlineLabel: f.label || f.id,
        swatch: /^#[0-9a-f]{3,8}$/i.test(String(f.def)) ? String(f.def) : '#ffffff',
        choices: f.parsed.map((c, ci) => ({ value: c.value, label: c.label, checked: String(f.def) ? c.value === String(f.def) : ci === 0 })),
      })),
    };
  });

  const refFunction = d.isTop ? 'add_menu_page()' : 'add_submenu_page()';
  const refSignature = d.isTop
    ? `add_menu_page(\n\t$page_title,\n\t$menu_title,\n\t'${d.cap}',\n\t'${d.slug}',\n\t$callback,\n\t'${sp.icon || 'dashicons-admin-generic'}',\n\t${parseInt(sp.position, 10) || 80}\n);`
    : `add_submenu_page(\n\t'${d.parentFile}',\n\t$page_title,\n\t$menu_title,\n\t'${d.cap}',\n\t'${d.slug}',\n\t$callback\n);`;
  const refFlow = [
    'admin_menu fires. Your callback registers the page and WordPress remembers the capability, the slug and the render callback.',
    `admin_init fires. register_setting() adds the option to the allowed list for the group "${d.group}" — without it, options.php refuses the save.`,
    'The page renders. settings_fields() prints the nonce, the option_page field and the referer; do_settings_sections() walks the sections and fields you registered.',
    'On submit the form posts to options.php, not to your page. Core checks the nonce and the capability, then runs your sanitise callback.',
    'options.php saves the value and redirects back with settings-updated=true. ' + (sp.settingsErrors ? 'settings_errors() prints the notice.' : 'Nothing prints a notice unless you call settings_errors().'),
  ];
  const refOptionShape = d.arrayMode
    ? `wp_options\n  option_name:  ${d.opt}\n  option_value: array(\n${d.fields.map((f) => '    ' + padTo(`'${f.id}'`, 14) + ' => ' + defLiteral(f) + ',').join('\n')}\n  )`
    : `wp_options\n${d.fields.map((f) => '  ' + padTo(d.pre + '_' + f.id, 20) + ' => ' + defLiteral(f)).join('\n')}`;
  const refHookSuffix = d.isTop
    ? 'toplevel_page_' + d.slug
    : (HOOK_BASE[d.parentFile] || slugify(String(d.parentFile).replace(/\.php.*$/, '')) || 'admin') + '_page_' + d.slug;
  const refHookNote = sp.scopedAssets
    ? `The generated code stores what add_${d.isTop ? 'menu' : 'submenu'}_page() returned rather than hard-coding this string — safer if the slug or the parent ever changes.`
    : 'Turn on screen-scoped assets and the generator will capture this from the return value instead of you hard-coding it.';

  function focusField(id: string) {
    fieldRefs.current[id]?.focus();
  }
  function fix(kind: string) {
    commit((draft) => Object.assign(draft, applyFix(draft, kind)));
  }

  function addSection() {
    commit((p) => {
      const n = p.sections.length + 1;
      p.sections.push({ id: 'section_' + n, title: 'Section ' + n, description: '' });
    });
  }
  function removeSection(i: number) {
    commit((p) => {
      if (p.sections.length < 2) return;
      const removed = p.sections[i].id;
      p.sections.splice(i, 1);
      const first = p.sections[0].id;
      p.fields.forEach((f) => {
        if (f.section === removed) f.section = first;
      });
    });
  }
  function addField() {
    commit((p) => {
      const n = p.fields.length + 1;
      p.fields.push({ id: 'field_' + n, label: 'Field ' + n, type: 'text', section: slugify(p.sections[0]?.id) || 'general', def: '', description: '', placeholder: '', choices: '' });
    });
  }

  const sectionsNote = `${sp.sections.length} ${sp.sections.length === 1 ? 'section' : 'sections'}${sp.tabbed ? ' · one tab each' : ' · stacked on one screen'}`;
  const fieldsNote = `${sp.fields.length} ${sp.fields.length === 1 ? 'field' : 'fields'} · ${sp.storage !== 'individual' ? 'one option' : sp.fields.length + ' options'}`;

  return (
    <GeneratorShell
      category="admin"
      title="Settings Page Generator"
      description={<>Menu registration, the Settings API wiring, a real sanitiser per field type, and the screen it all renders into — laid out the way core expects.</>}
      form={
        <div>
          <div className="field-card field-card-primary">
            <div className="field-card-title">The page</div>
            <div className="field-group">
              <label className="field-label" htmlFor="sp-title">Page title</label>
              <input id="sp-title" ref={(el) => (fieldRefs.current.pageTitle = el)} className="input" value={sp.pageTitle} onChange={(e) => commit((p) => (p.pageTitle = e.target.value), 'pageTitle')} placeholder="Acme Toolkit Settings" />
            </div>
            <div className="field-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label className="field-label" htmlFor="sp-menutitle">Menu title</label>
                <input id="sp-menutitle" className="input" value={sp.menuTitle} onChange={(e) => commit((p) => (p.menuTitle = e.target.value), 'menuTitle')} placeholder="Acme Toolkit" />
              </div>
              <div>
                <label className="field-label" htmlFor="sp-slug">Menu slug</label>
                <input id="sp-slug" ref={(el) => (fieldRefs.current.slug = el)} className="input gfw-mono" value={sp.slug} onChange={(e) => commit((p) => (p.slug = e.target.value), 'slug')} placeholder="acme-toolkit" />
              </div>
            </div>
            <div className="field-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label className="field-label" htmlFor="sp-parent">Lives under</label>
                <select id="sp-parent" className="select" value={sp.parent} onChange={(e) => commit((p) => (p.parent = e.target.value))}>
                  {PARENTS.map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div ref={(el) => (fieldRefs.current.capability = el as unknown as HTMLElement)}>
                <label className="field-label" htmlFor="sp-cap">Capability</label>
                <select id="sp-cap" className="select" value={sp.capability} onChange={(e) => commit((p) => (p.capability = e.target.value))}>
                  {CAPS.map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
            </div>
            {isCustomParent && (
              <div className="field-group">
                <label className="field-label" htmlFor="sp-customparent">Parent file</label>
                <input id="sp-customparent" className="input gfw-mono" value={sp.customParent} onChange={(e) => commit((p) => (p.customParent = e.target.value), 'customParent')} placeholder="edit.php?post_type=book" />
              </div>
            )}
            {isTop && (
              <div ref={(el) => (fieldRefs.current.position = el as unknown as HTMLElement)} className="field-group">
                <label className="field-label" htmlFor="sp-position">Position</label>
                <input id="sp-position" className="input gfw-mono" value={sp.position} onChange={(e) => commit((p) => (p.position = e.target.value), 'position')} placeholder="80" />
                <div className="field-hint">{positionNote(sp.position)}</div>
              </div>
            )}
            {isTop && (
              <div ref={(el) => (fieldRefs.current.icon = el as unknown as HTMLElement)} className="field-group">
                <div className="field-label">Menu icon</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {ICONS.map((i) => (
                    <button key={i} type="button" onClick={() => commit((p) => (p.icon = i))} className={`chip${sp.icon === i ? ' is-active' : ''}`}>
                      {i.replace('dashicons-', '')}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="field-hint">{placementNote(sp)}</div>
          </div>

          <div className="field-card">
            <div className="field-card-title">Storage &amp; naming</div>
            <div className="field-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label className="field-label" htmlFor="sp-prefix">Function prefix</label>
                <input id="sp-prefix" className="input gfw-mono" value={sp.prefix} onChange={(e) => commit((p) => (p.prefix = e.target.value), 'prefix')} />
              </div>
              <div>
                <label className="field-label" htmlFor="sp-td">Text domain</label>
                <input id="sp-td" ref={(el) => (fieldRefs.current.textDomain = el)} className="input gfw-mono" value={sp.textDomain} onChange={(e) => commit((p) => (p.textDomain = e.target.value), 'textDomain')} />
              </div>
              <div>
                <label className="field-label" htmlFor="sp-optname">Option name</label>
                <input id="sp-optname" ref={(el) => (fieldRefs.current.optionName = el)} className="input gfw-mono" value={sp.optionName} onChange={(e) => commit((p) => (p.optionName = e.target.value), 'optionName')} />
              </div>
              <div>
                <label className="field-label" htmlFor="sp-optgroup">Option group</label>
                <input id="sp-optgroup" className="input gfw-mono" value={sp.optionGroup} onChange={(e) => commit((p) => (p.optionGroup = e.target.value), 'optionGroup')} />
              </div>
            </div>
            <div className="field-group" ref={(el) => (fieldRefs.current.storage = el as unknown as HTMLElement)} style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center' }}>
              {(['array', 'individual'] as const).map((m) => (
                <button key={m} type="button" onClick={() => commit((p) => (p.storage = m))} className={`chip${sp.storage === m ? ' is-active' : ''}`}>
                  {m === 'array' ? 'One array option' : 'One option per field'}
                </button>
              ))}
              <span style={{ width: 1, height: 20, background: 'var(--gfw-border)' }} />
              {(['procedural', 'class'] as const).map((m) => (
                <button key={m} type="button" onClick={() => commit((p) => (p.codeStyle = m))} className={`chip${sp.codeStyle === m ? ' is-active' : ''}`}>
                  {m === 'procedural' ? 'Functions' : 'Class'}
                </button>
              ))}
            </div>
            <div className="field-hint">{storageNote(sp)}</div>
          </div>

          <div className="field-card">
            <div className="field-card-header">
              <div className="field-card-title">Sections</div>
              <div className="field-card-desc">{sectionsNote}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {sp.sections.map((sec, i) => (
                <RepeatableCard
                  key={i}
                  index={i}
                  count={sp.sections.length}
                  title={sec.title || `Section ${i + 1}`}
                  drag={drag.bind('sections', i, sections.reorder)}
                  onMoveUp={() => sections.moveUp(i)}
                  onMoveDown={() => sections.moveDown(i)}
                  onRemove={() => removeSection(i)}
                >
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <input className="input" style={{ flex: 1, minWidth: 110 }} placeholder="General" value={sec.title} onChange={(e) => commit((p) => (p.sections[i].title = e.target.value))} />
                    <input
                      className="input gfw-mono"
                      style={{ width: 120 }}
                      placeholder="general"
                      value={sec.id}
                      onChange={(e) => {
                        const v = e.target.value;
                        commit((p) => {
                          const old = p.sections[i].id;
                          p.sections[i].id = v;
                          p.fields.forEach((f) => {
                            if (f.section === old) f.section = slugify(v);
                          });
                        });
                      }}
                    />
                    <input className="input" style={{ flex: 1.6, minWidth: 150 }} placeholder="What this group covers." value={sec.description} onChange={(e) => commit((p) => (p.sections[i].description = e.target.value))} />
                  </div>
                </RepeatableCard>
              ))}
            </div>
            <button type="button" className="btn btn-ghost btn-sm repeatable-add" style={{ marginTop: 10 }} onClick={addSection}>Add section</button>
          </div>

          <div className="field-card" ref={(el) => (fieldRefs.current.fields = el as unknown as HTMLElement)}>
            <div className="field-card-header">
              <div className="field-card-title">Fields</div>
              <div className="field-card-desc">{fieldsNote}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {sp.fields.map((f, i) => {
                const needsChoices = f.type === 'select' || f.type === 'radio';
                return (
                  <RepeatableCard
                    key={i}
                    index={i}
                    count={sp.fields.length}
                    title={f.label || `Field ${i + 1}`}
                    subtitle={f.id}
                    drag={drag.bind('fields', i, fields.reorder)}
                    onMoveUp={() => fields.moveUp(i)}
                    onMoveDown={() => fields.moveDown(i)}
                    onRemove={() => fields.remove(i)}
                  >
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <input className="input" style={{ flex: 1.5, minWidth: 130 }} placeholder="API key" value={f.label} onChange={(e) => commit((p) => (p.fields[i].label = e.target.value))} />
                      <input className="input gfw-mono" style={{ width: 120 }} placeholder="api_key" value={f.id} onChange={(e) => commit((p) => (p.fields[i].id = e.target.value))} />
                      <select className="select" style={{ width: 112 }} value={f.type} onChange={(e) => commit((p) => {
                        const v = e.target.value as FieldType;
                        p.fields[i].type = v;
                        if ((v === 'select' || v === 'radio') && !p.fields[i].choices) p.fields[i].choices = 'first:First, second:Second';
                      })}>
                        {FIELD_TYPES.map(([v, l]) => (
                          <option key={v} value={v}>{l}</option>
                        ))}
                      </select>
                      <select className="select" style={{ width: 124 }} value={f.section} onChange={(e) => commit((p) => (p.fields[i].section = e.target.value))}>
                        {sp.sections.map((sec) => (
                          <option key={sec.id} value={sec.id}>{sec.title}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <input className="input gfw-mono" style={{ width: 120 }} placeholder={f.type === 'checkbox' ? '1 or 0' : f.type === 'number' ? '0' : 'default'} value={f.def} onChange={(e) => commit((p) => (p.fields[i].def = e.target.value))} />
                      <input className="input" style={{ width: 150 }} placeholder="placeholder text" value={f.placeholder} onChange={(e) => commit((p) => (p.fields[i].placeholder = e.target.value))} />
                      <input className="input" style={{ flex: 1, minWidth: 160 }} placeholder="Help text under the field." value={f.description} onChange={(e) => commit((p) => (p.fields[i].description = e.target.value))} />
                    </div>
                    {needsChoices && (
                      <div>
                        <input className="input gfw-mono" placeholder="fast:Fast, safe:Safe" value={f.choices} onChange={(e) => commit((p) => (p.fields[i].choices = e.target.value))} />
                        <div className="field-hint">value:Label pairs, comma separated. Values are whitelisted in the sanitiser.</div>
                      </div>
                    )}
                  </RepeatableCard>
                );
              })}
              {sp.fields.length === 0 && <div className="field-hint">No fields yet — an empty settings page is just a heading.</div>}
            </div>
            <button type="button" className="btn btn-ghost btn-sm repeatable-add" style={{ marginTop: 10 }} onClick={addField}>Add field</button>
          </div>

          <Collapsible title="Extras">
            <div className="toggle-card">
              {([
                ['tabbed', 'Tabbed sections', 'Each section becomes a nav-tab and gets its own do_settings_sections() page.'],
                ['settingsErrors', 'Print the saved notice', 'Calls settings_errors() — required on top-level pages, which core does not notice for you.'],
                ['capCheck', 'Capability check in the render callback', 'A current_user_can() guard before anything is printed.'],
                ['scopedAssets', 'Screen-scoped assets', 'Stores the hook suffix and enqueues CSS on this screen only.'],
                ['resetButton', 'Reset to defaults', 'A nonced admin-post handler that restores the defaults.'],
                ['showInRest', 'Expose over REST', 'Adds show_in_rest — with a generated object schema for the array option.'],
                ['uninstall', 'Uninstall cleanup snippet', 'Appends the uninstall.php that deletes the option on delete.'],
              ] as const).map(([key, label, help]) => (
                <ToggleRow
                  key={key}
                  label={label}
                  help={help}
                  checked={sp[key]}
                  onChange={(v) => commit((p) => (p[key] = v as never))}
                />
              ))}
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
        label: 'Preview',
        content: (
          <div style={{ background: '#F0F0F1', margin: '-14px -16px -18px', padding: '16px 18px 40px', minWidth: 420 }}>
            <div style={{ fontSize: 11, color: '#787C82', marginBottom: 10 }}>How the screen renders — {placementLabel}</div>
            <h1 style={{ margin: '0 0 12px', fontSize: 23, fontWeight: 400, color: '#1D2327', lineHeight: 1.3 }}>{sp.pageTitle}</h1>
            {sp.settingsErrors && (
              <div style={{ background: '#fff', border: '1px solid #C3C4C7', borderLeft: '4px solid #00A32A', padding: '9px 12px', marginBottom: 14, fontSize: 13, color: '#1D2327' }}>Settings saved.</div>
            )}
            {sp.tabbed && (
              <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid #C3C4C7', marginBottom: 16, paddingLeft: 8 }}>
                {screenTabs.map((stab) => (
                  <button
                    key={stab.id}
                    onClick={() => setScreenTab(stab.id)}
                    style={{
                      fontSize: 14,
                      padding: '7px 12px 8px',
                      border: '1px solid #C3C4C7',
                      borderBottom: stab.active ? '1px solid #F0F0F1' : '1px solid #C3C4C7',
                      background: stab.active ? '#F0F0F1' : '#DCDCDE',
                      color: stab.active ? '#1D2327' : '#50575E',
                      cursor: 'pointer',
                      marginBottom: -1,
                      borderRadius: '2px 2px 0 0',
                    }}
                  >
                    {stab.label}
                  </button>
                ))}
              </div>
            )}
            {screenSections.map((ss, si) => (
              <div key={si} style={{ marginBottom: 18 }}>
                <h2 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 600, color: '#1D2327' }}>{ss.title}</h2>
                <p style={{ margin: '0 0 10px', fontSize: 13, color: '#50575E', lineHeight: 1.6 }}>{ss.description}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {ss.fields.map((sf) => (
                    <div key={sf.key} style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: 14, alignItems: 'start' }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: '#1D2327', paddingTop: 5, lineHeight: 1.4 }}>{sf.label}</div>
                      <div style={{ minWidth: 0 }}>
                        {sf.isInput && (
                          <input readOnly value={sf.value} placeholder={sf.placeholder} style={{ width: '100%', maxWidth: 280, fontSize: 13.5, padding: '5px 8px', border: '1px solid #8C8F94', borderRadius: 3, background: '#fff', color: '#2C3338' }} />
                        )}
                        {sf.isTextarea && (
                          <textarea readOnly defaultValue={sf.value} placeholder={sf.placeholder} rows={3} style={{ width: '100%', fontSize: 13, fontFamily: "'JetBrains Mono', monospace", padding: '6px 8px', border: '1px solid #8C8F94', borderRadius: 3, background: '#fff', color: '#2C3338', resize: 'vertical' }} />
                        )}
                        {sf.isCheckbox && (
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5, color: '#2C3338' }}>
                            <input type="checkbox" readOnly checked={sf.checked} style={{ width: 16, height: 16, accentColor: '#2271B1' }} />
                            {sf.inlineLabel}
                          </label>
                        )}
                        {sf.isSelect && (
                          <select defaultValue={sf.value} style={{ fontSize: 13.5, padding: '4px 8px', border: '1px solid #8C8F94', borderRadius: 3, background: '#fff', color: '#2C3338', minWidth: 160 }}>
                            {sf.choices.map((sfc) => (
                              <option key={sfc.value} value={sfc.value}>{sfc.label}</option>
                            ))}
                          </select>
                        )}
                        {sf.isRadio && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            {sf.choices.map((sfr) => (
                              <label key={sfr.value} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5, color: '#2C3338' }}>
                                <input type="radio" readOnly checked={sfr.checked} style={{ accentColor: '#2271B1' }} />
                                {sfr.label}
                              </label>
                            ))}
                          </div>
                        )}
                        {sf.isColor && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ width: 26, height: 26, borderRadius: 3, border: '1px solid #8C8F94', background: sf.swatch, display: 'inline-block' }} />
                            <span className="gfw-mono" style={{ fontSize: 13, color: '#2C3338' }}>{sf.value}</span>
                          </div>
                        )}
                        {sf.hasDescription && <p style={{ margin: '5px 0 0', fontSize: 13, color: '#646970', fontStyle: 'italic', lineHeight: 1.5 }}>{sf.description}</p>}
                      </div>
                    </div>
                  ))}
                  {ss.empty && <div style={{ fontSize: 13, color: '#787C82' }}>No fields in this section.</div>}
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
              <button style={{ background: '#2271B1', border: '1px solid #2271B1', color: '#fff', fontSize: 13, padding: '6px 14px', borderRadius: 3, cursor: 'pointer' }}>Save Changes</button>
              {sp.resetButton && (
                <button style={{ background: '#F6F7F7', border: '1px solid #2271B1', color: '#2271B1', fontSize: 13, padding: '6px 14px', borderRadius: 3, cursor: 'pointer' }}>Reset to defaults</button>
              )}
            </div>
          </div>
        ),
      }}
      extraSecondaryTabs={[
        {
          label: 'Reference',
          content: (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <div className="gfw-mono" style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 4 }}>{refFunction}</div>
              <div style={{ fontSize: 12, color: 'var(--gfw-text-mutest)', marginBottom: 14 }}>{placementLabel}</div>
              <pre className="gfw-mono" style={{ border: '1px solid var(--gfw-border)', borderRadius: 7, padding: '12px 14px', background: 'var(--gfw-surface-sunken)', fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginBottom: 18 }}>{refSignature}</pre>

              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>What core does, in order</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 18 }}>
                {refFlow.map((text, i) => (
                  <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                    <span style={{ flexShrink: 0, width: 19, height: 19, borderRadius: '50%', background: 'var(--gfw-accent-tint)', color: 'var(--gfw-accent-strong)', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span>
                    <span style={{ flex: 1, fontSize: 12.5, lineHeight: 1.55, color: 'var(--gfw-text-strong)' }}>{text}</span>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>In the database</div>
              <pre className="gfw-mono" style={{ border: '1px solid var(--gfw-border)', borderRadius: 7, padding: '12px 14px', background: 'var(--gfw-surface-sunken)', fontSize: 11.5, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginBottom: 18 }}>{refOptionShape}</pre>

              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>Screen hook suffix</div>
              <pre className="gfw-mono" style={{ border: '1px solid var(--gfw-border)', borderRadius: 7, padding: '12px 14px', background: 'var(--gfw-surface-sunken)', fontSize: 12, color: 'var(--gfw-text-strong)', marginBottom: 8, wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>{refHookSuffix}</pre>
              <div style={{ fontSize: 12, color: 'var(--gfw-text-muted)', lineHeight: 1.6 }}>{refHookNote}</div>
            </div>
          ),
        },
      ]}
    />
  );
}
