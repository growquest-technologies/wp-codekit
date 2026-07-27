import { useMemo, useState } from 'react';
import { GeneratorShell } from '../../components/generator/GeneratorShell';
import { ToggleRow } from '../../components/ui/Toggle';
import { useEditorState } from '../../lib/useEditorState';
import {
  REF_ARGS,
  applyFix,
  buildCode,
  dataNote,
  freshProject,
  summaryNote,
  validate,
  type ActivationHooks,
  type OutputMode,
  type UninstallMode,
} from '../../generators/activationHooks';

const OUTPUT_MODES: { id: OutputMode; label: string }[] = [
  { id: 'plugin', label: 'Plugin file' },
  { id: 'snippet', label: 'Include' },
  { id: 'uninstall', label: 'uninstall.php' },
];
const OUTPUT_HINTS: Record<OutputMode, string> = {
  plugin: 'The main plugin file — register_activation_hook needs __FILE__ to be this file.',
  snippet: 'An include. Note that __FILE__ inside an include points at the include, not the plugin — pass the plugin file explicitly.',
  uninstall: 'Save as uninstall.php beside the plugin file. WordPress runs it only on delete.',
};
const UNINSTALL_OPTIONS: [UninstallMode, string][] = [['none', 'Leave everything'], ['options', 'Options and schedules'], ['all', 'Everything, including tables']];
const UNINSTALL_NOTES: Record<UninstallMode, string> = {
  none: 'uninstall.php exists but deletes nothing, so a reinstall picks up where the user left off.',
  options: 'Options, site options and scheduled events go. Custom tables and content are left alone — reversible, and usually the right default.',
  all: 'Options, schedules, roles, the custom table and optionally the plugin’s posts. Irreversible: run it only if this plugin owns that data outright.',
};

export function ActivationHooksGenerator() {
  const { state: ah, commit, undo, redo, reset, canUndo, canRedo, savedLabel } = useEditorState<ActivationHooks>('activation-hooks-generator-v1', freshProject);
  const [outputMode, setOutputMode] = useState<OutputMode>('plugin');

  const code = useMemo(() => buildCode(ah, outputMode), [ah, outputMode]);
  const issues = useMemo(() => validate(ah), [ah]);
  const fileName = outputMode === 'uninstall' ? 'uninstall.php' : (ah.prefix ? ah.prefix.toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '') : 'plugin').replace(/_/g, '-') + '.php';

  function fix(kind: string) {
    commit((draft) => Object.assign(draft, applyFix(draft, kind)));
  }

  return (
    <GeneratorShell
      category="core"
      title="Activation Hooks Generator"
      description="The three lifecycle routines, in the order they really run — with the version gate that makes upgrades possible and the uninstall file that keeps the database clean."
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
          <>
            <div style={{ fontFamily: 'var(--gfw-font-mono)', fontWeight: 700, fontSize: 13.5, marginBottom: 4 }}>register_activation_hook()</div>
            <div style={{ fontSize: 12, color: 'var(--gfw-text-mutest)', marginBottom: 14 }}>Runs once, in a request where almost nothing is loaded</div>
            <div className="field-label">What is and is not available</div>
            <div style={{ fontSize: 12.5, lineHeight: 1.65, marginBottom: 16 }}>Activation fires on the plugins.php request, before init on the next load. Your own post types are not registered yet, no other plugin has necessarily loaded, and nothing you hook to init has run. That is why flushing rewrite rules during activation only works if you register the post type first — or defer the flush to the next load, which is what this generates.</div>
            <div className="field-label">The three hooks</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 16 }}>
              {REF_ARGS.map(([name, description]) => (
                <div key={name} style={{ borderBottom: '1px solid var(--gfw-border-muted)', paddingBottom: 9 }}>
                  <div className="gfw-mono" style={{ fontWeight: 700, fontSize: 12.5 }}>{name}</div>
                  <div style={{ fontSize: 12, color: 'var(--gfw-text-muted)', marginTop: 3 }}>{description}</div>
                </div>
              ))}
            </div>
            <div className="field-label">Deactivation is not uninstall</div>
            <div style={{ fontSize: 12.5, lineHeight: 1.65, marginBottom: 16 }}>Deactivation happens on every update, every debugging session and every accidental click. Clear scheduled events and transients there — never delete data. Data deletion belongs in uninstall.php, which runs only when someone deliberately deletes the plugin.</div>
            <div className="field-label">Multisite</div>
            <div style={{ fontSize: 12.5, lineHeight: 1.65 }}>A network activation fires the hook once with $network_wide true — not once per site. Looping over get_sites() is the only way to seed every site, and it is why the generated activation checks that flag.</div>
          </>
        ),
      }}
      form={
        <div>
          <div className="field-card field-card-primary">
            <div className="field-card-title">The plugin</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
              <div>
                <label className="field-label">function prefix</label>
                <input className="input gfw-mono" value={ah.prefix} onChange={(e) => commit((p) => (p.prefix = e.target.value), 'prefix')} placeholder="acme" spellCheck={false} />
              </div>
              <div>
                <label className="field-label">version</label>
                <input className="input gfw-mono" value={ah.version} onChange={(e) => commit((p) => (p.version = e.target.value), 'version')} placeholder="1.2.0" spellCheck={false} />
              </div>
              <div>
                <label className="field-label">min PHP</label>
                <input className="input gfw-mono" value={ah.minPhp} onChange={(e) => commit((p) => (p.minPhp = e.target.value), 'minPhp')} placeholder="7.4" spellCheck={false} />
              </div>
              <div>
                <label className="field-label">min WordPress</label>
                <input className="input gfw-mono" value={ah.minWp} onChange={(e) => commit((p) => (p.minWp = e.target.value), 'minWp')} placeholder="6.0" spellCheck={false} />
              </div>
            </div>
            <div style={{ marginTop: 12, padding: '11px 13px', background: 'var(--gfw-surface)', border: '1px solid var(--gfw-border)', borderRadius: 7, fontSize: 12, color: 'var(--gfw-text-muted)', lineHeight: 1.6 }}>{summaryNote(ah)}</div>
          </div>

          <div className="toggle-card">
            <div className="toggle-card-title">On activation</div>
            <ToggleRow
              label="PHP and WordPress guard"
              help="Deactivates itself with a readable message instead of a fatal error."
              checked={ah.requirementChecks}
              onChange={(v) => commit((p) => (p.requirementChecks = v))}
            />
            <ToggleRow
              label="Deferred rewrite flush"
              help="Flags on activation, flushes on wp_loaded once post types exist."
              checked={ah.flushRules}
              onChange={(v) => commit((p) => (p.flushRules = v))}
            />
            <ToggleRow
              label="Schedule cron events"
              help="Guarded with wp_next_scheduled so activation cannot double-book."
              checked={ah.scheduleCron}
              onChange={(v) => commit((p) => (p.scheduleCron = v))}
            />
            <ToggleRow
              label="Version-gated upgrades"
              help="Compares the stored version with the constant and re-runs install()."
              checked={ah.upgradeRoutine}
              onChange={(v) => commit((p) => (p.upgradeRoutine = v))}
            />
            <ToggleRow
              label="Multisite aware"
              help="Loops every site with switch_to_blog on a network activation."
              checked={ah.networkAware}
              onChange={(v) => commit((p) => (p.networkAware = v))}
            />
          </div>

          <div className="field-card">
            <div className="field-card-header">
              <div className="field-card-title">Options and tables to manage</div>
              <div className="field-card-desc">{dataNote(ah)}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              <div>
                <label className="field-label">options to seed and delete</label>
                <input className="input gfw-mono" value={ah.options} onChange={(e) => commit((p) => (p.options = e.target.value), 'options')} placeholder="acme_settings, acme_version" spellCheck={false} />
              </div>
              <div>
                <label className="field-label">custom table (no prefix)</label>
                <input className="input gfw-mono" value={ah.table} onChange={(e) => commit((p) => (p.table = e.target.value), 'table')} placeholder="acme_events" spellCheck={false} />
              </div>
              <div>
                <label className="field-label">cron hooks to clear</label>
                <input className="input gfw-mono" value={ah.cronHooks} onChange={(e) => commit((p) => (p.cronHooks = e.target.value), 'cronHooks')} placeholder="acme_sync_products" spellCheck={false} />
              </div>
              <div>
                <label className="field-label">roles to remove</label>
                <input className="input gfw-mono" value={ah.roles} onChange={(e) => commit((p) => (p.roles = e.target.value), 'roles')} placeholder="acme_manager" spellCheck={false} />
              </div>
            </div>
          </div>

          <div className="field-card">
            <div className="field-card-title">On uninstall</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {UNINSTALL_OPTIONS.map(([id, label]) => (
                <button key={id} type="button" className={`chip${ah.uninstall === id ? ' is-active' : ''}`} onClick={() => commit((p) => (p.uninstall = id))}>
                  {label}
                </button>
              ))}
            </div>
            <div className="field-hint">{UNINSTALL_NOTES[ah.uninstall]}</div>
          </div>
        </div>
      }
    />
  );
}
