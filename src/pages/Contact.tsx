import { useState } from 'react';
import { Icon, GLYPH } from '../components/ui/Icon';
import { usePageMeta } from '../lib/usePageMeta';

const CONTACT_TOPICS = ['Generator request', 'Bug report', 'Wrong output', 'WordPress development', 'Something else'];

const CONTACT_CHANNELS = [
  { label: 'Email', value: 'hello@wpcodekit.com', note: 'Best for anything with a code sample attached.' },
  { label: 'Bug tracker', value: 'github.com/wpcodekit', note: 'Wrong output, malformed PHP, escaping mistakes.' },
  { label: 'Changelog', value: '/changelog', note: 'What shipped, weekly.' },
];

const CONTACT_FAQ = [
  { q: 'Is there an API?', a: 'Not yet. It is on the list once the generator set is complete.' },
  { q: 'Can I self-host this?', a: 'The generators are client-side, so yes — ask and we will send the build.' },
  { q: 'Do you store my plugin details?', a: 'No. Everything stays in your browser.' },
];

const CONTACT_WEBHOOK_URL = 'https://webhook.ottokit.com/ottokit/eeb0c52b-03c3-411e-abe0-80460d1c819c';

export function Contact() {
  usePageMeta('Contact', 'Request a generator, report a bug, or ask a WordPress development question.', '/contact');

  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [topic, setTopic] = useState('Generator request');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSending(true);
    try {
      const res = await fetch(CONTACT_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, topic, message, source: 'wpcodekit.com/contact' }),
      });
      if (!res.ok) throw new Error(`Webhook responded ${res.status}`);
      setSent(true);
    } catch {
      setError("Couldn't send your message — please try again, or email hello@wpcodekit.com directly.");
    } finally {
      setSending(false);
    }
  }

  function reset() {
    setSent(false);
    setError('');
    setName('');
    setEmail('');
    setMessage('');
  }

  return (
    <div className="gfw-container" style={{ padding: '60px 28px 90px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,320px),1fr))', gap: 'clamp(34px,4vw,64px)', alignItems: 'start' }}>
      <div>
        <h1 style={{ fontSize: 'clamp(30px,3.8vw,40px)', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--gfw-text-strong)', marginBottom: 14, lineHeight: 1.08 }}>
          Get in touch
        </h1>
        <p style={{ fontSize: 17, lineHeight: 1.6, color: 'var(--gfw-text-muted)', maxWidth: 520, marginBottom: 34 }}>
          Bug reports, generator requests, and "your output is wrong on WordPress 6.9" all welcome. We read everything.
        </p>

        {sent ? (
          <div style={{ background: 'var(--gfw-success-bg)', border: '1px solid var(--gfw-success-border)', borderRadius: 12, padding: '30px 28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--gfw-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name={GLYPH.check} size={13} style={{ color: '#fff' }} />
              </span>
              <h2 style={{ fontSize: 19, fontWeight: 700, color: 'var(--gfw-success-text)' }}>Message sent</h2>
            </div>
            <p style={{ fontSize: 14.5, lineHeight: 1.6, color: 'var(--gfw-success-text-soft)', marginBottom: 20 }}>
              Thanks — we reply to most messages within two working days.
            </p>
            <button onClick={reset} className="btn btn-outline-success btn-sm">Send another</button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="card" style={{ padding: 'clamp(20px,2.4vw,28px)', display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,190px),1fr))', gap: 18 }}>
              <div>
                <label htmlFor="gfw-name" className="field-label">Name</label>
                <input id="gfw-name" required className="marketing-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ada Lovelace" />
              </div>
              <div>
                <label htmlFor="gfw-email" className="field-label">Email</label>
                <input id="gfw-email" type="email" required className="marketing-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </div>
            </div>

            <div>
              <div className="field-label">What's this about?</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {CONTACT_TOPICS.map((t) => (
                  <button key={t} type="button" onClick={() => setTopic(t)} className={`chip${topic === t ? ' is-active' : ''}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {topic === 'WordPress development' && (
              <div style={{ display: 'flex', gap: 11, background: 'var(--gfw-accent-tint)', border: '1px solid var(--gfw-accent-tint-border)', borderRadius: 10, padding: '13px 15px' }}>
                <Icon name={GLYPH.info} size={15} style={{ color: 'var(--gfw-accent)', flexShrink: 0, marginTop: 2 }} />
                <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--gfw-accent-strong)' }}>
                  Development enquiries are routed to{' '}
                  <a href="https://growquest.io" target="_blank" rel="noopener" style={{ fontWeight: 700 }}>GrowQuest</a>, our development brand — migration, custom builds and ongoing support. Your reply will come from a GrowQuest address.
                </p>
              </div>
            )}

            <div>
              <label htmlFor="gfw-msg" className="field-label">Message</label>
              <textarea id="gfw-msg" rows={7} required className="marketing-textarea" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Which generator, what you expected, what you got…" />
            </div>

            {error && (
              <div style={{ display: 'flex', gap: 10, background: '#FBEAE3', border: '1px solid var(--gfw-border)', borderRadius: 10, padding: '11px 14px' }}>
                <Icon name={GLYPH.warning} size={15} style={{ color: 'var(--gfw-danger)', flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--gfw-danger)', margin: 0 }}>{error}</p>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <button type="submit" className="btn btn-primary" disabled={sending}>{sending ? 'Sending…' : 'Send message'}</button>
              <span style={{ fontSize: 12.5, color: 'var(--gfw-text-mutest)' }}>Usually answered within two working days.</span>
            </div>
          </form>
        )}
      </div>

      <aside style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
        {CONTACT_CHANNELS.map((cc) => (
          <div key={cc.label} className="card" style={{ padding: '20px 22px' }}>
            <div className="gfw-eyebrow" style={{ marginBottom: 9 }}>{cc.label}</div>
            <div style={{ fontFamily: 'var(--gfw-font-mono)', fontSize: 13.5, fontWeight: 500, color: 'var(--gfw-accent)', marginBottom: 7, wordBreak: 'break-all' }}>{cc.value}</div>
            <p style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--gfw-text-muted)' }}>{cc.note}</p>
          </div>
        ))}
        <div style={{ background: 'var(--gfw-dark)', borderRadius: 12, padding: '20px 22px', color: 'var(--gfw-border)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gfw-dark-text-muted)', marginBottom: 10 }}>
            Need a team, not a snippet?
          </div>
          <p style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--gfw-dark-code)', marginBottom: 14 }}>
            WP CodeKit is built by GrowQuest — WordPress migration, custom development and support, plus product design, web apps, branding and ecommerce.
          </p>
          <a href="https://growquest.io" target="_blank" rel="noopener" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 650, color: 'var(--gfw-accent-soft)' }}>
            growquest.io
            <Icon name={GLYPH.arrowRight} size={13} />
          </a>
        </div>
        <div style={{ background: 'var(--gfw-surface-sunken)', border: '1px solid var(--gfw-border)', borderRadius: 12, padding: '20px 22px' }}>
          <div className="gfw-eyebrow" style={{ marginBottom: 12 }}>Before you write in</div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {CONTACT_FAQ.map((cf) => (
              <li key={cf.q} style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--gfw-text-body)' }}>
                <span style={{ fontWeight: 700, color: 'var(--gfw-text-strong)' }}>{cf.q}</span> {cf.a}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
