import { useMemo, useState } from 'react';
import { GeneratorShell } from '../../components/generator/GeneratorShell';
import { CheckboxChip } from '../../components/ui/CheckboxChip';
import { useEditorState } from '../../lib/useEditorState';
import {
  CORE_TABS,
  applyFix,
  buildCode,
  derive,
  freshProject,
  validate,
  type OutputMode,
  type ProductTabs,
} from '../../generators/wcProductTabs';

const OUTPUT_MODES: { id: OutputMode; label: string }[] = [
  { id: 'snippet', label: 'Snippet' },
  { id: 'functions', label: 'functions.php' },
  { id: 'plugin', label: 'Plugin file' },
];

const KEEP_KEY: Record<string, keyof ProductTabs> = {
  description: 'keepDescription',
  additional_information: 'keepAdditionalInfo',
  reviews: 'keepReviews',
};

export function WcProductTabsGenerator() {
  const { state: pt, commit, undo, redo, reset, canUndo, canRedo, savedLabel } = useEditorState<ProductTabs>('wc-product-tabs-generator-v1', freshProject);
  const [outputMode, setOutputMode] = useState<OutputMode>('plugin');

  const d = useMemo(() => derive(pt), [pt]);
  const code = useMemo(() => buildCode(pt, outputMode), [pt, outputMode]);
  const issues = useMemo(() => validate(pt), [pt]);
  const fileName = (d.pre || 'acme').replace(/_/g, '-') + '-product-tabs.php';

  function fix(kind: string) {
    commit((draft) => Object.assign(draft, applyFix(draft, kind)));
  }
  function addTab() {
    commit((p) => p.tabs.push({ key: 'tab_' + (p.tabs.length + 1), title: 'Tab ' + (p.tabs.length + 1), priority: '50', content: '' }));
  }
  function removeTab(i: number) {
    commit((p) => p.tabs.splice(i, 1));
  }

  const keptCount = [pt.keepDescription, pt.keepAdditionalInfo, pt.keepReviews].filter(Boolean).length;
  const tabsNote = `${d.tabs.length} added · ${keptCount} of 3 core tabs kept`;

  return (
    <GeneratorShell
      category="woocommerce"
      title="Product Tab Generator"
      description="Add tabs to the single product page, remove the core ones you don't want, and both live in one filter callback so priority ordering never fights itself."
      code={code}
      filename={fileName}
      editor={{ canUndo, canRedo, onUndo: undo, onRedo: redo, onNew: reset, savedLabel }}
      issues={issues}
      onFix={fix}
      outputModes={OUTPUT_MODES}
      activeOutputMode={outputMode}
      onOutputModeChange={(id) => setOutputMode(id as OutputMode)}
      secondaryTab={{
        label: 'Reference',
        content: (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <div className="gfw-mono" style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 4 }}>woocommerce_product_tabs</div>
            <div style={{ fontSize: 12, color: 'var(--gfw-text-mutest)', marginBottom: 14 }}>One filter, keyed array — add, remove or re-order in the same callback</div>

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>Core tabs and their priority</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 18 }}>
              {CORE_TABS.map(([key, label, priority]) => (
                <div key={key} style={{ borderBottom: '1px solid var(--gfw-border)', paddingBottom: 9 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                    <span className="gfw-mono" style={{ fontSize: 12.5, fontWeight: 700 }}>{key}</span>
                    <span className="type-badge">priority {priority}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--gfw-text-muted)', lineHeight: 1.5, marginTop: 4 }}>{label} — {key === 'reviews' ? 'only appears at all when reviews are enabled for the product.' : 'always registered, regardless of settings.'}</div>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>Priority decides position, not the array order</div>
            <div style={{ fontSize: 12.5, color: 'var(--gfw-text-strong)', lineHeight: 1.65, marginBottom: 18 }}>WooCommerce sorts the final $tabs array by priority before rendering. Give a new tab 15 to land between Description (10) and Additional information (20) — pushing it to the end of the array does nothing on its own.</div>

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>One callback per tab</div>
            <div style={{ fontSize: 12.5, color: 'var(--gfw-text-strong)', lineHeight: 1.65 }}>callback must be a real callable — each new tab gets its own render function here rather than one shared function branching on which tab is active.</div>
          </div>
        ),
      }}
      form={
        <div>
          <div className="field-card field-card-primary">
            <div className="field-card-title">Core tabs to keep</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {CORE_TABS.map(([key, label]) => (
                <CheckboxChip key={key} active={!!pt[KEEP_KEY[key]]} onClick={() => commit((p) => { (p[KEEP_KEY[key]] as boolean) = !p[KEEP_KEY[key]]; })}>
                  {label}
                </CheckboxChip>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>function prefix</label>
                <input className="input gfw-mono" value={pt.prefix} onChange={(e) => commit((p) => (p.prefix = e.target.value), 'prefix')} placeholder="acme" />
              </div>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>text domain</label>
                <input className="input gfw-mono" value={pt.textDomain} onChange={(e) => commit((p) => (p.textDomain = e.target.value), 'textDomain')} placeholder="acme" />
              </div>
            </div>
          </div>

          <div className="field-card">
            <div className="field-card-header">
              <div className="field-card-title">New tabs</div>
              <div className="field-card-desc">{tabsNote}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pt.tabs.map((t, i) => (
                <div key={i} className="card" style={{ padding: 11 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input className="input" style={{ flex: 1.4, minWidth: 120 }} placeholder="Sizing" value={t.title} onChange={(e) => commit((p) => (p.tabs[i].title = e.target.value), `title-${i}`)} />
                    <input className="input gfw-mono" style={{ width: 110 }} placeholder="sizing" value={t.key} onChange={(e) => commit((p) => (p.tabs[i].key = e.target.value), `key-${i}`)} />
                    <input className="input gfw-mono" style={{ width: 80 }} placeholder="15" value={t.priority} onChange={(e) => commit((p) => (p.tabs[i].priority = e.target.value), `priority-${i}`)} />
                    <button type="button" aria-label="Remove tab" title="Remove tab" onClick={() => removeTab(i)} className="btn btn-ghost btn-sm">✕</button>
                  </div>
                  <div style={{ marginTop: 7 }}>
                    <textarea
                      className="input"
                      style={{ width: '100%', minHeight: 56, resize: 'vertical', fontFamily: 'inherit' }}
                      placeholder="What this tab prints — plain text, wrapped in paragraphs."
                      value={t.content}
                      onChange={(e) => commit((p) => (p.tabs[i].content = e.target.value), `content-${i}`)}
                    />
                  </div>
                </div>
              ))}
              {pt.tabs.length === 0 && <div className="field-hint">No new tabs yet.</div>}
            </div>
            <button type="button" onClick={addTab} className="btn btn-ghost btn-sm" style={{ marginTop: 11, borderStyle: 'dashed' }}>Add tab</button>
          </div>
        </div>
      }
    />
  );
}
