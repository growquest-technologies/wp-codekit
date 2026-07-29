import { useMemo, useRef, useState } from 'react';
import { GeneratorShell } from '../../components/generator/GeneratorShell';
import { RepeatableCard } from '../../components/ui/RepeatableCard';
import { ToggleRow } from '../../components/ui/Toggle';
import { useDragReorder } from '../../lib/dragReorder';
import { useEditorState } from '../../lib/useEditorState';
import { useListOps } from '../../lib/useListOps';
import {
  TYPE_INFO,
  applyFix,
  buildCode,
  freshProject,
  slugify,
  usedTokens,
  validate,
  type AttrType,
  type OutputMode,
  type Shortcode,
} from '../../generators/shortcode';

const OUTPUT_MODES: { id: OutputMode; label: string }[] = [
  { id: 'snippet', label: 'Snippet' },
  { id: 'functions', label: 'functions.php' },
  { id: 'plugin', label: 'Plugin file' },
];

const ATTR_TYPES: { id: AttrType; label: string }[] = [
  { id: 'text', label: 'text' },
  { id: 'number', label: 'number' },
  { id: 'bool', label: 'true / false' },
  { id: 'url', label: 'url' },
  { id: 'color', label: 'hex colour' },
  { id: 'select', label: 'choice list' },
  { id: 'id', label: 'post ID' },
];

function pipelineFor(a: { type: AttrType }): string {
  const info = TYPE_INFO[a.type] || TYPE_INFO.text;
  if (a.type === 'bool') return 'filter_var( …, FILTER_VALIDATE_BOOLEAN ) → printed as true / false';
  if (a.type === 'select') return 'in_array() against the choices → esc_attr()';
  return (info.sanitize ? info.sanitize + '() → ' : '') + (info.escape ? info.escape + '()' : 'no escaping needed');
}

export function ShortcodeGenerator() {
  const { state: sc, commit, undo, redo, reset, canUndo, canRedo, savedLabel } = useEditorState<Shortcode>('shortcode-generator-v1', freshProject);
  const drag = useDragReorder();
  const attrs = useListOps<Shortcode>(commit)((p) => p.attrs);
  const [outputMode, setOutputMode] = useState<OutputMode>('snippet');
  const markupRef = useRef<HTMLTextAreaElement | null>(null);

  const code = useMemo(() => buildCode(sc, outputMode), [sc, outputMode]);
  const issues = useMemo(() => validate(sc), [sc]);
  const tag = slugify(sc.tag) || 'my_shortcode';
  const validAttrs = useMemo(() => sc.attrs.filter((a) => slugify(a.name)), [sc.attrs]);
  const tokens = useMemo(() => usedTokens(sc.markup), [sc.markup]);
  const names = validAttrs.map((a) => slugify(a.name));
  const unknown = tokens.filter((t) => names.indexOf(t) === -1 && !(sc.enclosing && t === 'content'));
  const usageExample = '[' + tag + validAttrs.map((a) => ' ' + slugify(a.name) + '="' + a.def + '"').join('') + ']';
  const fileName = tag.replace(/_/g, '-') + '.php';

  function fix(kind: string) {
    commit((draft) => Object.assign(draft, applyFix(draft, kind)));
  }

  function insertToken(token: string) {
    const el = markupRef.current;
    if (!el) { commit((p) => { p.markup += '{' + token + '}'; }); return; }
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const next = el.value.slice(0, start) + '{' + token + '}' + el.value.slice(end);
    commit((p) => (p.markup = next));
    setTimeout(() => { el.focus(); const pos = start + token.length + 2; el.setSelectionRange(pos, pos); }, 30);
  }

  function addAttr() {
    commit((p) => p.attrs.push({ name: '', type: 'text', def: '', choices: '', description: '' }));
  }

  return (
    <GeneratorShell
      category="content"
      title="Shortcode Generator"
      description={
        <>
          Typed attributes, <span className="gfw-mono" style={{ fontSize: 12 }}>shortcode_atts()</span> defaults and the right escaping function for every value — without you having to remember which is which.
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
      secondaryTab={{
        label: 'Usage',
        content: (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--gfw-text-faint)' }}>In a post or page</div>
            <div className="card gfw-mono" style={{ padding: '12px 14px', fontSize: 12.5, lineHeight: 1.6, wordBreak: 'break-all' }}>{usageExample}</div>
            {sc.enclosing && (
              <div className="card gfw-mono" style={{ padding: '12px 14px', fontSize: 12.5, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {'[' + tag + ']\n\tYour wrapped content here.\n[/' + tag + ']'}
              </div>
            )}
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--gfw-text-faint)', marginTop: 10 }}>In a template</div>
            <div className="card gfw-mono" style={{ padding: '12px 14px', fontSize: 12.5, lineHeight: 1.6, wordBreak: 'break-all' }}>
              {"echo do_shortcode( '" + usageExample.replace(/'/g, "\\'") + "' );"}
            </div>

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--gfw-text-faint)', marginTop: 10 }}>Attributes</div>
            {validAttrs.length === 0 ? (
              <div style={{ fontSize: 12.5, color: 'var(--gfw-text-muted)' }}>No attributes — the shortcode takes no configuration.</div>
            ) : (
              validAttrs.map((a) => (
                <div key={a.name} style={{ borderBottom: '1px solid var(--gfw-border)', paddingBottom: 9 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                    <span className="gfw-mono" style={{ fontSize: 12.5, fontWeight: 700 }}>{slugify(a.name)}</span>
                    <span className="type-badge">{a.type}</span>
                    <span className="gfw-mono" style={{ fontSize: 11.5, color: 'var(--gfw-text-faint)' }}>default {a.def === '' ? "''" : a.def}</span>
                  </div>
                  {a.description && <div style={{ fontSize: 12, color: 'var(--gfw-text-body)', lineHeight: 1.5, marginTop: 4 }}>{a.description}</div>}
                </div>
              ))
            )}
          </div>
        ),
      }}
      form={
        <div>
          <div className="field-card field-card-primary">
            <div className="field-card-title">The shortcode</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '14px 16px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="field-label" htmlFor="sc-tag">Tag</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="gfw-mono" style={{ fontSize: 16, color: 'var(--gfw-text-faint)' }}>[</span>
                  <input
                    id="sc-tag"
                    className="input gfw-mono"
                    value={sc.tag}
                    onChange={(ev) => commit((p) => (p.tag = ev.target.value), 'tag')}
                    placeholder="team_grid"
                    style={{ flex: 1 }}
                  />
                  <span className="gfw-mono" style={{ fontSize: 16, color: 'var(--gfw-text-faint)' }}>]</span>
                </div>
                <div className="field-hint">Lowercase, underscores rather than dashes, and prefixed so no other plugin claims it first.</div>
              </div>
              <div>
                <label className="field-label" htmlFor="sc-fnprefix">Function prefix</label>
                <input id="sc-fnprefix" className="input gfw-mono" value={sc.fnPrefix} onChange={(ev) => commit((p) => (p.fnPrefix = ev.target.value), 'fnPrefix')} placeholder="mytheme" />
              </div>
              <div>
                <label className="field-label" htmlFor="sc-textdomain">Text domain</label>
                <input id="sc-textdomain" className="input gfw-mono" value={sc.textDomain} onChange={(ev) => commit((p) => (p.textDomain = ev.target.value), 'textDomain')} placeholder="textdomain" />
              </div>
            </div>
          </div>

          <div className="field-card">
            <div className="field-card-header">
              <div className="field-card-title">Attributes</div>
              <div className="field-card-desc">The type decides the sanitiser and the escaping.</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sc.attrs.map((a, i) => (
                <RepeatableCard
                  key={i}
                  index={i}
                  count={sc.attrs.length}
                  title={slugify(a.name) || 'Untitled attribute'}
                  subtitle={a.type}
                  drag={drag.bind('attrs', i, attrs.reorder)}
                  onMoveUp={() => attrs.moveUp(i)}
                  onMoveDown={() => attrs.moveDown(i)}
                  onRemove={() => attrs.remove(i)}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 9 }}>
                    <div>
                      <label className="field-label" style={{ fontSize: 11 }}>name</label>
                      <input
                        className="input gfw-mono"
                        value={a.name}
                        placeholder="title"
                        onChange={(ev) => commit((p) => (p.attrs[i].name = ev.target.value), 'attr-name-' + i)}
                      />
                    </div>
                    <div>
                      <label className="field-label" style={{ fontSize: 11 }}>type</label>
                      <select
                        className="select"
                        value={a.type}
                        onChange={(ev) => commit((p) => {
                          const v = ev.target.value as AttrType;
                          p.attrs[i].type = v;
                          if (v === 'select' && !p.attrs[i].choices) p.attrs[i].choices = 'grid, list';
                        })}
                      >
                        {ATTR_TYPES.map((t) => (
                          <option key={t.id} value={t.id}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="field-label" style={{ fontSize: 11 }}>default</label>
                      <input
                        className="input gfw-mono"
                        value={a.def}
                        placeholder={(TYPE_INFO[a.type] || TYPE_INFO.text).def}
                        onChange={(ev) => commit((p) => (p.attrs[i].def = ev.target.value), 'attr-def-' + i)}
                      />
                    </div>
                    {a.type === 'select' && (
                      <div>
                        <label className="field-label" style={{ fontSize: 11 }}>choices — comma separated</label>
                        <input
                          className="input gfw-mono"
                          value={a.choices}
                          placeholder="grid, list"
                          onChange={(ev) => commit((p) => (p.attrs[i].choices = ev.target.value), 'attr-choices-' + i)}
                        />
                      </div>
                    )}
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label className="field-label" style={{ fontSize: 11 }}>description — used in the docblock</label>
                      <input
                        className="input"
                        value={a.description}
                        placeholder="Heading shown above the grid."
                        onChange={(ev) => commit((p) => (p.attrs[i].description = ev.target.value), 'attr-description-' + i)}
                      />
                    </div>
                  </div>
                  <div className="gfw-mono" style={{ fontSize: 11, color: 'var(--gfw-text-muted)' }}>{pipelineFor(a)}</div>
                </RepeatableCard>
              ))}
              <button type="button" onClick={addAttr} className="btn btn-ghost btn-sm repeatable-add" style={{ alignSelf: 'flex-start' }}>+ Attribute</button>
            </div>
          </div>

          <div className="field-card">
            <div className="field-card-header">
              <div className="field-card-title">Output markup</div>
              <div className="field-card-desc">Write HTML. Drop an attribute in with <span className="gfw-mono" style={{ fontSize: 11 }}>{'{name}'}</span>.</div>
            </div>
            <textarea
              id="sc-markup"
              aria-label="Output markup"
              ref={markupRef}
              rows={7}
              spellCheck={false}
              className="textarea gfw-mono"
              value={sc.markup}
              placeholder='<div class="team-grid">…</div>'
              onChange={(ev) => commit((p) => (p.markup = ev.target.value), 'markup')}
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 9, alignItems: 'center' }}>
              <span className="field-hint" style={{ margin: 0 }}>Insert:</span>
              {names.concat(sc.enclosing ? ['content'] : []).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => insertToken(n)}
                  className={`chip${tokens.indexOf(n) !== -1 ? ' is-active' : ''}`}
                >
                  {'{' + n + '}'}
                </button>
              ))}
            </div>
            {unknown.length > 0 && (
              <div style={{ marginTop: 9, fontSize: 11.5, color: 'var(--gfw-accent-strong)', lineHeight: 1.5 }}>
                Unknown token(s): {unknown.map((u) => '{' + u + '}').join(', ')} — these render as literal text.
              </div>
            )}
          </div>

          <div className="toggle-card">
            <div className="toggle-card-title">Behaviour</div>
            <ToggleRow
              label="Enclosing shortcode"
              help={`Accepts wrapped content as {content}`}
              checked={sc.enclosing}
              onChange={(v) => commit((p) => (p.enclosing = v))}
            />
            <ToggleRow
              label="Run in classic text widgets"
              checked={sc.inWidgets}
              onChange={(v) => commit((p) => (p.inWidgets = v))}
            />
            <ToggleRow
              label="Run in excerpts"
              checked={sc.inExcerpts}
              onChange={(v) => commit((p) => (p.inExcerpts = v))}
            />
          </div>
        </div>
      }
    />
  );
}
