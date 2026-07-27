import { useMemo, useRef } from 'react';
import { GeneratorShell } from '../../components/generator/GeneratorShell';
import { ToggleRow } from '../../components/ui/Toggle';
import { useEditorState } from '../../lib/useEditorState';
import {
  ENVS,
  GROUPS,
  PRESETS,
  REF_ARGS,
  SALT_KEYS,
  applyFix,
  buildCode,
  constValue,
  freshProject,
  freshSalts,
  validate,
  type Environment,
  type WpConfig,
} from '../../generators/wpConfig';

const OUTPUT_MODES: { id: WpConfig['mode']; label: string }[] = [
  { id: 'inline', label: 'Credentials inline' },
  { id: 'env', label: 'From getenv()' },
];

export function WpConfigGenerator() {
  const { state: wc, commit, undo, redo, reset, canUndo, canRedo, savedLabel } = useEditorState<WpConfig>('wp-config-generator-v1', freshProject);
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});

  const on = wc.constants || [];
  const has = (n: string) => on.indexOf(n) >= 0;
  const risky: Record<string, boolean> = { WP_DEBUG_DISPLAY: true, SAVEQUERIES: true, SCRIPT_DEBUG: true };
  const prod = wc.env === 'production' || wc.env === 'staging';

  const code = useMemo(() => buildCode(wc, wc.mode), [wc]);
  const issues = useMemo(() => validate(wc), [wc]);

  function focusField(id: string) {
    fieldRefs.current[id]?.focus();
  }
  function fix(kind: string) {
    commit((draft) => Object.assign(draft, applyFix(draft, kind)));
  }

  const totalConstants = GROUPS.reduce((n, g) => n + g[1].length, 0);

  return (
    <GeneratorShell
      category="core"
      title="wp-config.php Generator"
      description="The file everyone copies from the last project. Pick an environment and it writes the debug, cache and security constants that suit it — and warns about the ones that do not."
      code={code}
      filename="wp-config.php"
      editor={{ canUndo, canRedo, onUndo: undo, onRedo: redo, onNew: reset, savedLabel }}
      issues={issues}
      onFix={fix}
      onFocusField={focusField}
      outputModes={OUTPUT_MODES}
      activeOutputMode={wc.mode}
      onOutputModeChange={(id) => commit((p) => (p.mode = id as WpConfig['mode']))}
      outputHint={wc.mode === 'env' ? 'Safe to commit — the credentials live in the environment, not the file.' : 'Keep this file out of version control, or switch to environment variables.'}
      secondaryTab={{
        label: 'Reference',
        content: (
          <>
            <div style={{ fontFamily: 'var(--gfw-font-mono)', fontWeight: 700, fontSize: 13.5, marginBottom: 4 }}>wp-config.php</div>
            <div style={{ fontSize: 12, color: 'var(--gfw-text-mutest)', marginBottom: 14 }}>Loaded before anything else — no hooks exist yet</div>
            <div className="field-label">Order matters</div>
            <div style={{ fontSize: 12.5, lineHeight: 1.65, marginBottom: 16 }}>Everything must be defined before the require of wp-settings.php on the last line. A constant defined after it is ignored, silently — the most common reason a debug flag "does not work".</div>
            <div className="field-label">Constants worth knowing</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 16 }}>
              {REF_ARGS.map(([name, description]) => (
                <div key={name} style={{ borderBottom: '1px solid var(--gfw-border-muted)', paddingBottom: 9 }}>
                  <div className="gfw-mono" style={{ fontWeight: 700, fontSize: 12.5 }}>{name}</div>
                  <div style={{ fontSize: 12, color: 'var(--gfw-text-muted)', marginTop: 3 }}>{description}</div>
                </div>
              ))}
            </div>
            <div className="field-label">Keep credentials out of the repo</div>
            <div style={{ fontSize: 12.5, lineHeight: 1.65, marginBottom: 16 }}>The environment-variable mode reads DB details from getenv(), so the file itself is safe to commit. Whatever you do, wp-config.php should sit outside the web root or be denied by the server — it holds the keys to everything.</div>
            <div className="field-label">WP_ENVIRONMENT_TYPE</div>
            <div style={{ fontSize: 12.5, lineHeight: 1.65 }}>Since 5.5, core reads this and plugins can branch on wp_get_environment_type(). Valid values are local, development, staging and production. Setting it is how you stop a staging site emailing real customers.</div>
          </>
        ),
      }}
      form={
        <div>
          <div className="field-card field-card-primary">
            <div className="field-card-header">
              <div className="field-card-title">Environment</div>
              <div className="field-card-desc">{on.length} constant{on.length === 1 ? '' : 's'} set</div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {ENVS.map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={`chip${wc.env === id ? ' is-active' : ''}`}
                  onClick={() => commit((p) => { p.env = id as Environment; p.constants = PRESETS[id as Environment].on.slice(); })}
                >
                  {label}
                </button>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="field-label">DB_NAME</label>
                <input ref={(el) => (fieldRefs.current.dbName = el)} className="input gfw-mono" value={wc.dbName} onChange={(e) => commit((p) => (p.dbName = e.target.value), 'dbName')} placeholder="acme_wp" spellCheck={false} />
              </div>
              <div>
                <label className="field-label">DB_USER</label>
                <input ref={(el) => (fieldRefs.current.dbUser = el)} className="input gfw-mono" value={wc.dbUser} onChange={(e) => commit((p) => (p.dbUser = e.target.value), 'dbUser')} placeholder="acme_wp" spellCheck={false} />
              </div>
              <div>
                <label className="field-label">DB_PASSWORD</label>
                <input ref={(el) => (fieldRefs.current.dbPassword = el)} className="input gfw-mono" value={wc.dbPassword} onChange={(e) => commit((p) => (p.dbPassword = e.target.value), 'dbPassword')} placeholder="" spellCheck={false} />
              </div>
              <div>
                <label className="field-label">DB_HOST</label>
                <input className="input gfw-mono" value={wc.dbHost} onChange={(e) => commit((p) => (p.dbHost = e.target.value), 'dbHost')} placeholder="localhost" spellCheck={false} />
              </div>
              <div>
                <label className="field-label">table prefix</label>
                <input ref={(el) => (fieldRefs.current.prefix = el)} className="input gfw-mono" value={wc.prefix} onChange={(e) => commit((p) => (p.prefix = e.target.value), 'prefix')} placeholder="wp_" spellCheck={false} />
              </div>
              <div>
                <label className="field-label">site URL</label>
                <input ref={(el) => (fieldRefs.current.siteUrl = el)} className="input gfw-mono" value={wc.siteUrl} onChange={(e) => commit((p) => (p.siteUrl = e.target.value), 'siteUrl')} placeholder="https://example.com" spellCheck={false} />
              </div>
              <div>
                <label className="field-label">memory limit</label>
                <input ref={(el) => (fieldRefs.current.memory = el)} className="input gfw-mono" value={wc.memory} onChange={(e) => commit((p) => (p.memory = e.target.value), 'memory')} placeholder="256M" spellCheck={false} />
              </div>
            </div>
            <div className="field-hint" style={{ marginTop: 12, padding: '11px 13px', background: 'var(--gfw-surface)', border: '1px solid var(--gfw-border)', borderRadius: 7 }}>
              WP_ENVIRONMENT_TYPE is {wc.env}, so wp_get_environment_type() reports it and plugins can behave accordingly. {prod ? 'Debug output is kept off the page.' : 'Errors are visible while you work.'} {wc.mode === 'env' ? 'Database credentials come from environment variables.' : 'Database credentials are written into the file.'}
            </div>
          </div>

          <div className="field-card">
            <div className="field-card-header">
              <div className="field-card-title">Constants</div>
              <div className="field-card-desc">{on.length} of {totalConstants}</div>
            </div>
            {GROUPS.map(([label, items]) => (
              <div key={label} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>{label}</div>
                {items.map(([name, help]) => {
                  const isOn = has(name);
                  const bad = isOn && risky[name] && prod;
                  const valueNote = isOn ? ` Currently: ${constValue(wc, name).replace(/'/g, '')}.` : '';
                  const warningNote = bad ? ' Not recommended in production.' : '';
                  return (
                    <ToggleRow
                      key={name}
                      label={name}
                      help={`${help}${valueNote}${warningNote}`}
                      checked={isOn}
                      onChange={(v) => commit((p) => {
                        p.constants = p.constants || [];
                        const i = p.constants.indexOf(name);
                        if (v && i < 0) p.constants.push(name);
                        else if (!v && i >= 0) p.constants.splice(i, 1);
                      })}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          <div className="field-card">
            <div className="field-card-header">
              <div className="field-card-title">Salts</div>
              <div className="field-card-desc">{SALT_KEYS.filter((k) => (wc.salts || {})[k]).length} of 8 generated</div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--gfw-text-muted)', lineHeight: 1.6, marginBottom: 10 }}>
              Generated in your browser from crypto.getRandomValues — nothing is sent anywhere. Changing them logs every user out, which is the point after a compromise.
            </div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => commit((p) => (p.salts = freshSalts()))}>New salts</button>
          </div>
        </div>
      }
    />
  );
}
