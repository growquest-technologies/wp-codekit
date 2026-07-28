import { useMemo, useState } from 'react';
import { GeneratorShell } from '../../components/generator/GeneratorShell';
import { RepeatableCard } from '../../components/ui/RepeatableCard';
import { ToggleRow } from '../../components/ui/Toggle';
import { useDragReorder } from '../../lib/dragReorder';
import { useEditorState } from '../../lib/useEditorState';
import { useListOps } from '../../lib/useListOps';
import {
  JOBS,
  JOB_BODY,
  RECURRENCE,
  applyFix,
  buildCode,
  freshProject,
  referenceInfo,
  validate,
  type CronEvent,
  type Job,
  type OutputMode,
  type Recurrence,
} from '../../generators/cronEvent';

const OUTPUT_MODES: { id: OutputMode; label: string }[] = [
  { id: 'snippet', label: 'Snippet' },
  { id: 'functions', label: 'functions.php' },
  { id: 'plugin', label: 'Plugin file' },
];
const OUTPUT_HINTS: Record<OutputMode, string> = {
  snippet: 'Scheduling on init, since a snippet has no activation hook.',
  functions: 'Themes have no activation hook — the schedule call runs on init and relies on the guard.',
  plugin: 'The right home for cron: scheduled on activation, cleared on deactivation.',
};
const JOB_NOTES: Record<Job, string> = {
  sync: 'wp_remote_get() with a timeout, both failure branches handled, and a last-run stamp. The shape most integrations need.',
  cleanup: 'A bounded get_posts() batch rather than a single unbounded delete — cron has the same PHP timeout as any other request.',
  email: 'wp_mail() per recipient. Worth remembering that a digest that fails silently is worse than no digest.',
  custom: 'Your own body. The guards and the lock around it are still generated.',
};

export function CronEventGenerator() {
  const { state: cr, commit, undo, redo, reset, canUndo, canRedo, savedLabel } = useEditorState<CronEvent>('cron-generator-v1', freshProject);
  const drag = useDragReorder();
  const args = useListOps<CronEvent>(commit)((p) => p.args);
  const [outputMode, setOutputMode] = useState<OutputMode>('plugin');

  const isCustomInterval = cr.recurrence === 'custom';
  const code = useMemo(() => buildCode(cr, outputMode), [cr, outputMode]);
  const issues = useMemo(() => validate(cr), [cr]);
  const ref = useMemo(() => referenceInfo(cr), [cr]);
  const fileName = (cr.hook ? cr.hook.toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '') : 'cron-event').replace(/_/g, '-') + '.php';

  function fix(kind: string) {
    commit((draft) => Object.assign(draft, applyFix(draft, kind)));
  }

  return (
    <GeneratorShell
      category="core"
      title="Cron Event Generator"
      description="Scheduling is the easy half. This writes the guard that stops duplicates, the lock that stops overlap, and the cleanup that runs on deactivation."
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
            <div style={{ fontFamily: 'var(--gfw-font-mono)', fontWeight: 700, fontSize: 13.5, marginBottom: 4 }}>{ref.functionName}</div>
            <div style={{ fontSize: 12, color: 'var(--gfw-text-mutest)', marginBottom: 14 }}>{ref.subtitle}</div>
            <pre className="gfw-mono" style={{ border: '1px solid var(--gfw-border)', borderRadius: 7, padding: '10px 12px', background: 'var(--gfw-surface-muted)', fontSize: 12, whiteSpace: 'pre-wrap', marginBottom: 16 }}>{ref.signature}</pre>
            <div className="field-label">Built-in schedules</div>
            <pre className="gfw-mono" style={{ border: '1px solid var(--gfw-border)', borderRadius: 7, padding: '10px 12px', background: 'var(--gfw-surface-muted)', fontSize: 11.5, whiteSpace: 'pre-wrap', marginBottom: 16 }}>{ref.schedules}</pre>
            <div className="field-label">WP-Cron is not cron</div>
            <div style={{ fontSize: 12.5, lineHeight: 1.65, marginBottom: 16 }}>Nothing runs on a timer. WP-Cron checks for due events when someone loads a page, so a quiet site runs its 15-minute job whenever the next visitor happens to arrive. On a busy site the opposite bites: two overlapping requests can both fire the same event, which is what the lock in the generated callback is for.</div>
            <div className="field-label">Real cron, for anything that matters</div>
            <pre className="gfw-mono" style={{ border: '1px solid var(--gfw-border)', borderRadius: 7, padding: '10px 12px', background: 'var(--gfw-surface-muted)', fontSize: 11.5, whiteSpace: 'pre-wrap', wordBreak: 'break-all', marginBottom: 16 }}>{ref.realCron}</pre>
            <div className="field-label">Inspecting and firing by hand</div>
            <pre className="gfw-mono" style={{ border: '1px solid var(--gfw-border)', borderRadius: 7, padding: '10px 12px', background: 'var(--gfw-surface-muted)', fontSize: 11.5, whiteSpace: 'pre-wrap', wordBreak: 'break-all', marginBottom: 16 }}>{ref.cli}</pre>
            <div className="field-label">Timestamps are UTC</div>
            <div style={{ fontSize: 12.5, lineHeight: 1.65 }}>wp_schedule_event() takes a Unix timestamp, which has no timezone. strtotime( 'tomorrow 03:00' ) resolves against the server clock, not the site's timezone setting — so a site set to Europe/Lisbon on a US server runs its overnight job in the afternoon. Use wp_date() or add the offset when the hour actually matters.</div>
          </>
        ),
      }}
      form={
        <div>
          <div className="field-card field-card-primary">
            <div className="field-card-title">The event</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="field-label">Hook name</label>
                <input className="input gfw-mono" value={cr.hook} onChange={(e) => commit((p) => (p.hook = e.target.value), 'hook')} placeholder="acme_sync_products" spellCheck={false} />
                <div className="field-hint">This is the action name WP-Cron fires. Anything else on the site can hook it too — including WP-CLI and you, by hand.</div>
              </div>
              <div>
                <label className="field-label">recurrence</label>
                <select className="select" value={cr.recurrence} onChange={(e) => commit((p) => (p.recurrence = e.target.value as Recurrence))}>
                  {RECURRENCE.map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">first run</label>
                <select className="select" value={cr.firstRun} onChange={(e) => commit((p) => (p.firstRun = e.target.value as CronEvent['firstRun']))}>
                  <option value="now">Immediately</option>
                  <option value="hour">In an hour</option>
                  <option value="tomorrow">Tomorrow, quiet hours</option>
                  <option value="midnight">Next midnight, site time</option>
                </select>
              </div>
              {isCustomInterval && (
                <div>
                  <label className="field-label">interval name</label>
                  <input className="input gfw-mono" value={cr.intervalName} onChange={(e) => commit((p) => (p.intervalName = e.target.value), 'intervalName')} placeholder="every_fifteen_minutes" spellCheck={false} />
                </div>
              )}
              {isCustomInterval && (
                <div>
                  <label className="field-label">every (minutes)</label>
                  <input className="input gfw-mono" value={cr.intervalMinutes} onChange={(e) => commit((p) => (p.intervalMinutes = e.target.value), 'intervalMinutes')} placeholder="15" spellCheck={false} />
                </div>
              )}
              <div>
                <label className="field-label">prefix</label>
                <input className="input gfw-mono" value={cr.prefix} onChange={(e) => commit((p) => (p.prefix = e.target.value), 'prefix')} placeholder="acme" spellCheck={false} />
              </div>
              <div>
                <label className="field-label">text domain</label>
                <input className="input gfw-mono" value={cr.textDomain} onChange={(e) => commit((p) => (p.textDomain = e.target.value), 'textDomain')} placeholder="acme" spellCheck={false} />
              </div>
            </div>
            <div style={{ marginTop: 12, padding: '11px 13px', background: 'var(--gfw-surface)', border: '1px solid var(--gfw-border)', borderRadius: 7, fontSize: 12, color: 'var(--gfw-text-muted)', lineHeight: 1.6 }}>{ref.scheduleNote}</div>
          </div>

          <div className="field-card">
            <div className="field-card-title">What it does</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {JOBS.map(([id, label]) => (
                <button key={id} type="button" className={`chip${cr.job === id ? ' is-active' : ''}`} onClick={() => commit((p) => { p.job = id; p.body = JOB_BODY[id]; })}>
                  {label}
                </button>
              ))}
            </div>
            <div className="field-hint" style={{ marginBottom: 10 }}>{JOB_NOTES[cr.job]}</div>
            <textarea className="textarea gfw-mono" rows={8} value={cr.body} onChange={(e) => commit((p) => (p.body = e.target.value), 'body')} placeholder="// The work goes here." spellCheck={false} />
          </div>

          <div className="field-card">
            <div className="field-card-header">
              <div className="field-card-title">Arguments</div>
              <div className="field-card-desc">{cr.args.length ? cr.args.length + (cr.args.length === 1 ? ' argument' : ' arguments') : 'none'}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {cr.args.map((a, i) => (
                <RepeatableCard
                  key={i}
                  index={i}
                  count={cr.args.length}
                  title={a.name || `Argument ${i + 1}`}
                  subtitle={a.value}
                  drag={drag.bind('args', i, args.reorder)}
                  onMoveUp={() => args.moveUp(i)}
                  onMoveDown={() => args.moveDown(i)}
                  onRemove={() => args.remove(i)}
                >
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input className="input gfw-mono" style={{ width: 130 }} value={a.name} onChange={(e) => commit((p) => (p.args[i].name = e.target.value), 'arg-name-' + i)} placeholder="$batch" spellCheck={false} />
                    <input className="input gfw-mono" style={{ width: 110 }} value={a.value} onChange={(e) => commit((p) => (p.args[i].value = e.target.value), 'arg-value-' + i)} placeholder="50" spellCheck={false} />
                    <input className="input" style={{ flex: 1 }} value={a.description} onChange={(e) => commit((p) => (p.args[i].description = e.target.value), 'arg-desc-' + i)} placeholder="What it controls." />
                  </div>
                </RepeatableCard>
              ))}
              {!cr.args.length && <div style={{ fontSize: 12.5, color: 'var(--gfw-text-mutest)' }}>No arguments — simpler to unschedule, since wp_next_scheduled() has to be called with the exact same args to find the event.</div>}
            </div>
            <button type="button" className="btn btn-ghost btn-sm repeatable-add" style={{ marginTop: 11 }} onClick={() => commit((p) => { p.args.push({ name: '$batch', value: '50', description: '' }); })}>Add argument</button>
          </div>

          <div className="toggle-card">
            <div className="toggle-card-title">Safety net</div>
            <ToggleRow
              label="wp_next_scheduled() guard"
              help="The one line between one scheduled event and forty."
              checked={cr.nextScheduledGuard}
              onChange={(v) => commit((p) => (p.nextScheduledGuard = v))}
            />
            <ToggleRow
              label="Unschedule on deactivation"
              help="wp_clear_scheduled_hook() so the event does not outlive the plugin."
              checked={cr.unschedule}
              onChange={(v) => commit((p) => (p.unschedule = v))}
            />
            <ToggleRow
              label="Overlap lock"
              help="A transient that stops two simultaneous requests both running the job."
              checked={cr.lock}
              onChange={(v) => commit((p) => (p.lock = v))}
            />
          </div>
        </div>
      }
    />
  );
}
