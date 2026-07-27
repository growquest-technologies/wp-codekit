import { useMemo, useState } from 'react';
import { GeneratorShell } from '../../components/generator/GeneratorShell';
import { ToggleRow } from '../../components/ui/Toggle';
import { useEditorState } from '../../lib/useEditorState';
import {
  REF_ARGS,
  applyFix,
  buildCode,
  derive,
  freshProject,
  validate,
  type OutputMode,
  type PaymentGateway,
} from '../../generators/wcPaymentGateway';

const OUTPUT_MODES: { id: OutputMode; label: string }[] = [
  { id: 'offline', label: 'Offline' },
  { id: 'redirect', label: 'Redirect to processor' },
];

const OUTPUT_HINTS: Record<OutputMode, string> = {
  offline: 'Marks the order on-hold until you confirm payment by hand — the shape of Cheque/BACS.',
  redirect: 'Sends the customer to an external processor, with a webhook to confirm payment on return.',
};

export function WcPaymentGatewayGenerator() {
  const { state: pg, commit, undo, redo, reset, canUndo, canRedo, savedLabel } = useEditorState<PaymentGateway>('wc-payment-gateway-generator-v1', freshProject);
  const [outputMode, setOutputMode] = useState<OutputMode>('offline');

  const d = useMemo(() => derive(pg), [pg]);
  const code = useMemo(() => buildCode(pg, outputMode), [pg, outputMode]);
  const issues = useMemo(() => validate(pg), [pg]);
  const fileName = 'class-' + d.gatewayId.replace(/_/g, '-') + '-gateway.php';

  function fix(kind: string) {
    commit((draft) => Object.assign(draft, applyFix(draft, kind)));
  }

  return (
    <GeneratorShell
      category="woocommerce"
      title="Payment Gateway Generator"
      description="A WC_Payment_Gateway subclass — offline (mark on-hold, confirm by hand) or a redirect-to-processor stub with a webhook — using the exact result/redirect contract process_payment() must return."
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
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <div className="gfw-mono" style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 4 }}>extends WC_Payment_Gateway</div>
            <div style={{ fontSize: 12, color: 'var(--gfw-text-mutest)', marginBottom: 14 }}>Declared inside plugins_loaded, after WooCommerce's own base class has had a chance to load</div>

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>What matters</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 18 }}>
              {REF_ARGS.map((r) => (
                <div key={r.name} style={{ borderBottom: '1px solid var(--gfw-border)', paddingBottom: 9 }}>
                  <div className="gfw-mono" style={{ fontSize: 12.5, fontWeight: 700 }}>{r.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--gfw-text-muted)', lineHeight: 1.5, marginTop: 3 }}>{r.description}</div>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>Why the guard is not optional</div>
            <div style={{ fontSize: 12.5, color: 'var(--gfw-text-strong)', lineHeight: 1.65 }}>WC_Payment_Gateway does not exist until WooCommerce has loaded. Declaring the class at the top level of a plugin file — instead of inside a function hooked to plugins_loaded — fatals the entire site the moment WooCommerce is deactivated, not just checkout.</div>
          </div>
        ),
      }}
      form={
        <div>
          <div className="field-card field-card-primary">
            <div className="field-card-title">The gateway</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label className="field-label">Title (at checkout)</label>
                <input className="input" value={pg.title} onChange={(e) => commit((p) => (p.title = e.target.value), 'title')} placeholder="Pay by bank transfer" />
              </div>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>gateway id</label>
                <input className="input gfw-mono" value={pg.gatewayId} onChange={(e) => commit((p) => (p.gatewayId = e.target.value), 'gatewayId')} placeholder="gateway" spellCheck={false} />
              </div>
            </div>
            <div className="field-group">
              <label className="field-label">Method title (in Settings → Payments)</label>
              <input className="input" value={pg.methodTitle} onChange={(e) => commit((p) => (p.methodTitle = e.target.value), 'methodTitle')} placeholder="Acme Bank Transfer" />
            </div>
            <div className="field-group">
              <label className="field-label">Method description</label>
              <input className="input" value={pg.methodDescription} onChange={(e) => commit((p) => (p.methodDescription = e.target.value), 'methodDescription')} placeholder="Accepts manual bank transfers." />
            </div>
            <div className="field-group">
              <label className="field-label">Checkout description</label>
              <textarea className="input" style={{ width: '100%', minHeight: 56, resize: 'vertical', fontFamily: 'inherit' }} value={pg.checkoutDescription} onChange={(e) => commit((p) => (p.checkoutDescription = e.target.value), 'checkoutDescription')} placeholder="Shown under the title once selected." />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 13 }}>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>function prefix</label>
                <input className="input gfw-mono" value={pg.prefix} onChange={(e) => commit((p) => (p.prefix = e.target.value), 'prefix')} placeholder="acme" />
              </div>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>text domain</label>
                <input className="input gfw-mono" value={pg.textDomain} onChange={(e) => commit((p) => (p.textDomain = e.target.value), 'textDomain')} placeholder="acme" />
              </div>
            </div>
            <div className="field-hint" style={{ marginTop: 12 }}>{d.className}</div>
          </div>

          {outputMode === 'offline' && (
            <div className="field-card">
              <div className="field-card-title">Instructions</div>
              <ToggleRow
                label="Show instructions after checkout"
                help="Printed on the order-received page and in the order emails, the way Cheque/BACS do it in core."
                checked={pg.showInstructions}
                onChange={(v) => commit((p) => (p.showInstructions = v))}
              />
              {pg.showInstructions && (
                <textarea
                  className="input gfw-mono"
                  style={{ width: '100%', minHeight: 72, resize: 'vertical', marginTop: 11 }}
                  value={pg.instructions}
                  onChange={(e) => commit((p) => (p.instructions = e.target.value), 'instructions')}
                  placeholder="Our bank details are..."
                />
              )}
            </div>
          )}

          {outputMode === 'redirect' && (
            <div className="field-card">
              <div className="field-card-title">Processor</div>
              <ToggleRow
                label="Test mode by default"
                help="Adds a sandbox-endpoint checkbox, defaulted on."
                checked={pg.testMode}
                onChange={(v) => commit((p) => (p.testMode = v))}
              />
              <div className="field-hint" style={{ marginTop: 11 }}>An API key field (password type) is generated automatically — fill in your processor's real endpoint and payload after generating.</div>
            </div>
          )}
        </div>
      }
    />
  );
}
