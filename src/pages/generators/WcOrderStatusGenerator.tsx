import { useMemo, useState } from 'react';
import { GeneratorShell } from '../../components/generator/GeneratorShell';
import { ToggleRow } from '../../components/ui/Toggle';
import { useEditorState } from '../../lib/useEditorState';
import {
  CORE_STATUSES,
  applyFix,
  buildCode,
  derive,
  freshProject,
  validate,
  type OrderStatus,
  type OutputMode,
} from '../../generators/wcOrderStatus';

const OUTPUT_MODES: { id: OutputMode; label: string }[] = [
  { id: 'snippet', label: 'Snippet' },
  { id: 'functions', label: 'functions.php' },
  { id: 'plugin', label: 'Plugin file' },
];

export function WcOrderStatusGenerator() {
  const { state: os, commit, undo, redo, reset, canUndo, canRedo, savedLabel } = useEditorState<OrderStatus>('wc-order-status-generator-v1', freshProject);
  const [outputMode, setOutputMode] = useState<OutputMode>('plugin');

  const d = useMemo(() => derive(os), [os]);
  const code = useMemo(() => buildCode(os, outputMode), [os, outputMode]);
  const issues = useMemo(() => validate(os), [os]);
  const fileName = d.slug + '-order-status.php';

  function fix(kind: string) {
    commit((draft) => Object.assign(draft, applyFix(draft, kind)));
  }

  return (
    <GeneratorShell
      category="woocommerce"
      title="Custom Order Status Generator"
      description="A new order status, wired into the admin dropdown, the orders list filters and the bulk-action menu WooCommerce builds automatically from the registered list."
      code={code}
      filename={fileName}
      editor={{ canUndo, canRedo, onUndo: undo, onRedo: redo, onNew: reset, savedLabel }}
      issues={issues}
      onFix={fix}
      outputModes={OUTPUT_MODES}
      activeOutputMode={outputMode}
      onOutputModeChange={(id) => setOutputMode(id as OutputMode)}
      form={
        <div>
          <div className="field-card field-card-primary">
            <div className="field-card-title">The status</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label className="field-label">Label</label>
                <input className="input" value={os.label} onChange={(e) => commit((p) => (p.label = e.target.value), 'label')} placeholder="Awaiting pickup" />
              </div>
              <div>
                <label className="field-label">Slug</label>
                <input className="input gfw-mono" value={os.slug} onChange={(e) => commit((p) => (p.slug = e.target.value), 'slug')} placeholder="awaiting-pickup" spellCheck={false} />
                <div className="field-hint gfw-mono">{d.status} — {d.status.length}/20 characters</div>
              </div>
            </div>
            <div className="field-group">
              <label className="field-label">Insert after</label>
              <select className="select" value={os.insertAfter} onChange={(e) => commit((p) => (p.insertAfter = e.target.value))}>
                {CORE_STATUSES.map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 13 }}>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>function prefix</label>
                <input className="input gfw-mono" value={os.prefix} onChange={(e) => commit((p) => (p.prefix = e.target.value), 'prefix')} placeholder="acme" />
              </div>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>text domain</label>
                <input className="input gfw-mono" value={os.textDomain} onChange={(e) => commit((p) => (p.textDomain = e.target.value), 'textDomain')} placeholder="acme" />
              </div>
            </div>
            <div className="field-hint" style={{ marginTop: 12 }}>This code is identical whether or not High-Performance Order Storage is on — an order's status is a plain string either way, stored in the wc- prefixed form.</div>
          </div>

          <div className="toggle-card">
            <div className="toggle-card-title">Visibility</div>
            <ToggleRow
              label="Exclude from search"
              help="Orders in this status are skipped by the admin search box."
              checked={os.excludeFromSearch}
              onChange={(v) => commit((p) => (p.excludeFromSearch = v))}
            />
            <ToggleRow
              label="Show in “All” orders list"
              help="Counted and listed when no status filter is applied."
              checked={os.showInAdminAllList}
              onChange={(v) => commit((p) => (p.showInAdminAllList = v))}
            />
            <ToggleRow
              label="Show in the status filter list"
              help="Appears as its own filter link above the orders table, with a live count."
              checked={os.showInAdminStatusList}
              onChange={(v) => commit((p) => (p.showInAdminStatusList = v))}
            />
          </div>

          <div className="field-card">
            <div className="field-card-title">Admin badge colour</div>
            <ToggleRow
              label="Give it a colour in the orders list"
              help="Adds a small admin_head style block targeting the status badge markup."
              checked={os.badgeEnabled}
              onChange={(v) => commit((p) => (p.badgeEnabled = v))}
            />
            {os.badgeEnabled && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 11 }}>
                <div>
                  <label className="field-label gfw-mono" style={{ fontSize: 11 }}>background</label>
                  <input className="input gfw-mono" value={os.badgeBg} onChange={(e) => commit((p) => (p.badgeBg = e.target.value), 'badgeBg')} placeholder="#f0ad4e" />
                </div>
                <div>
                  <label className="field-label gfw-mono" style={{ fontSize: 11 }}>text colour</label>
                  <input className="input gfw-mono" value={os.badgeFg} onChange={(e) => commit((p) => (p.badgeFg = e.target.value), 'badgeFg')} placeholder="#ffffff" />
                </div>
              </div>
            )}
          </div>
        </div>
      }
    />
  );
}
