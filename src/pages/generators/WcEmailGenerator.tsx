import { useMemo } from 'react';
import { GeneratorShell } from '../../components/generator/GeneratorShell';
import { CopyableCodePreview } from '../../components/generator/CopyableCodePreview';
import { useEditorState } from '../../lib/useEditorState';
import {
  ORDER_STATUSES,
  applyFix,
  buildCode,
  buildTemplate,
  derive,
  freshProject,
  validate,
  type Recipient,
  type Trigger,
  type WcEmail,
} from '../../generators/wcEmail';

export function WcEmailGenerator() {
  const { state: e, commit, undo, redo, reset, canUndo, canRedo, savedLabel } = useEditorState<WcEmail>('wc-email-generator-v1', freshProject);

  const d = useMemo(() => derive(e), [e]);
  const code = useMemo(() => buildCode(e), [e]);
  const template = useMemo(() => buildTemplate(e), [e]);
  const issues = useMemo(() => validate(e), [e]);
  const fileName = 'class-' + d.emailId.replace(/_/g, '-') + '-email.php';

  function fix(kind: string) {
    commit((draft) => Object.assign(draft, applyFix(draft, kind)));
  }

  return (
    <GeneratorShell
      category="woocommerce"
      title="WooCommerce Email Generator"
      description="A WC_Email subclass plus its own HTML template — with template_base set so wc_get_template_html() actually finds the plugin's file instead of falling through to core's."
      code={code}
      filename={fileName}
      editor={{ canUndo, canRedo, onUndo: undo, onRedo: redo, onNew: reset, savedLabel }}
      issues={issues}
      onFix={fix}
      secondaryTab={{
        label: 'Template',
        content: <CopyableCodePreview code={template} filename={'templates/emails/' + d.emailId.replace(/_/g, '-') + '.php'} />,
      }}
      form={
        <div>
          <div className="field-card field-card-primary">
            <div className="field-card-title">The email</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label className="field-label">Title (in Settings → Emails)</label>
                <input className="input" value={e.title} onChange={(ev) => commit((p) => (p.title = ev.target.value), 'title')} placeholder="Loyalty points earned" />
              </div>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>email id</label>
                <input className="input gfw-mono" value={e.emailId} onChange={(ev) => commit((p) => (p.emailId = ev.target.value), 'emailId')} placeholder="loyalty_earned" spellCheck={false} />
              </div>
            </div>
            <div className="field-group">
              <label className="field-label">Description</label>
              <input className="input" value={e.description} onChange={(ev) => commit((p) => (p.description = ev.target.value), 'description')} placeholder="Sent when..." />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label className="field-label">Heading</label>
                <input className="input" value={e.heading} onChange={(ev) => commit((p) => (p.heading = ev.target.value), 'heading')} placeholder="Order update" />
              </div>
              <div>
                <label className="field-label">Subject</label>
                <input className="input" value={e.subject} onChange={(ev) => commit((p) => (p.subject = ev.target.value), 'subject')} placeholder="Your order" />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 13 }}>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>function prefix</label>
                <input className="input gfw-mono" value={e.prefix} onChange={(ev) => commit((p) => (p.prefix = ev.target.value), 'prefix')} placeholder="acme" />
              </div>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>text domain</label>
                <input className="input gfw-mono" value={e.textDomain} onChange={(ev) => commit((p) => (p.textDomain = ev.target.value), 'textDomain')} placeholder="acme" />
              </div>
            </div>
            <div className="field-hint" style={{ marginTop: 12 }}>{d.className}</div>
          </div>

          <div className="field-card">
            <div className="field-card-title">Recipient</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['customer', 'admin'] as Recipient[]).map((r) => (
                <button key={r} type="button" onClick={() => commit((p) => (p.recipient = r))} className={`chip${e.recipient === r ? ' is-active' : ''}`}>
                  {r === 'customer' ? 'The customer on the order' : 'Site admin (or a fixed address)'}
                </button>
              ))}
            </div>
          </div>

          <div className="field-card">
            <div className="field-card-title">Trigger</div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 11 }}>
              {(['status', 'custom'] as Trigger[]).map((tr) => (
                <button key={tr} type="button" onClick={() => commit((p) => (p.trigger = tr))} className={`chip${e.trigger === tr ? ' is-active' : ''}`}>
                  {tr === 'status' ? 'Order status change' : 'Custom hook'}
                </button>
              ))}
            </div>
            {e.trigger === 'status' ? (
              <select className="select" value={e.triggerStatus} onChange={(ev) => commit((p) => (p.triggerStatus = ev.target.value))}>
                {ORDER_STATUSES.map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            ) : (
              <input className="input gfw-mono" value={e.customHook} onChange={(ev) => commit((p) => (p.customHook = ev.target.value), 'customHook')} placeholder="acme_loyalty_points_earned" />
            )}
          </div>

          <div className="field-card">
            <div className="field-card-title">Template intro line</div>
            <textarea
              className="input"
              style={{ width: '100%', minHeight: 72, resize: 'vertical', fontFamily: 'inherit' }}
              value={e.introText}
              onChange={(ev) => commit((p) => (p.introText = ev.target.value), 'introText')}
              placeholder="You just earned loyalty points on your recent order."
            />
          </div>
        </div>
      }
    />
  );
}
