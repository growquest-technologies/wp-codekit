import { Link } from 'react-router-dom';
import { Icon, GLYPH } from '../components/ui/Icon';
import { CATS, toolsHref } from '../data/tools';

const GROWQUEST_SERVICES = [
  { name: 'WordPress', body: 'Migration, custom development, and support & maintenance you can rely on.' },
  { name: 'Product Design', body: 'UI/UX for intuitive, multi-screen products that delight and convert.' },
  { name: 'Website Applications', body: 'Website development and custom web apps, built fast and built to scale.' },
  { name: 'Branding & Identity', body: 'Authentic brands with a clear story and a bold, confident look.' },
  { name: 'Ecommerce', body: 'Shopify, WooCommerce and Magento storefronts that convert and keep up at peak.' },
];

interface SiteFooterProps {
  showBrowseRow?: boolean;
}

export function SiteFooter({ showBrowseRow = true }: SiteFooterProps) {
  return (
    <footer style={{ background: 'var(--gfw-dark)', color: 'var(--gfw-dark-text)', marginTop: 'auto' }}>
      <div style={{ borderBottom: '1px solid var(--gfw-dark-border-strong)' }}>
        <div className="gfw-container" style={{ padding: 'clamp(42px,5vw,64px) 28px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'clamp(26px,4vw,60px)', alignItems: 'flex-start', marginBottom: 'clamp(28px,3.5vw,40px)' }}>
            <div style={{ flex: '1 1 380px', minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gfw-dark-text-muted)', marginBottom: 14 }}>
                The team behind WP CodeKit
              </div>
              <h2 style={{ fontSize: 'clamp(26px,3.2vw,38px)', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.06, color: '#fff', margin: '0 0 16px', maxWidth: '12ch' }}>
                We build what's next.
              </h2>
              <p style={{ fontSize: 'clamp(15px,1.45vw,17px)', lineHeight: 1.6, color: 'var(--gfw-dark-code)', maxWidth: '54ch', margin: 0 }}>
                GrowQuest is the technology partner behind ambitious brands and digital products. From first sketch to shipped product — and everything after — we're in it with you.
              </p>
            </div>
            <div style={{ flex: '0 1 300px', minWidth: 0 }}>
              <p style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--gfw-text-faint)', margin: '0 0 20px' }}>
                One team of veterans across strategy, design and engineering — so nothing gets lost in the handoff.
              </p>
              <a href="https://growquest.io" target="_blank" rel="noopener" className="btn btn-primary">
                growquest.io
                <Icon name={GLYPH.arrowRight} size={14} />
              </a>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,208px),1fr))', gap: 10 }}>
            {GROWQUEST_SERVICES.map((gs) => (
              <div key={gs.name} style={{ background: 'var(--gfw-dark-raised)', border: '1px solid var(--gfw-dark-border)', borderRadius: 10, padding: '20px 18px' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 7 }}>{gs.name}</div>
                <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--gfw-text-faint)', margin: 0 }}>{gs.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showBrowseRow && (
        <div className="gfw-container" style={{ padding: '26px 28px 22px', display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', borderBottom: '1px solid var(--gfw-dark-border-strong)' }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--gfw-dark-text-strong)', flexShrink: 0 }}>
            Browse generators
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {CATS.map((c) => (
              <Link key={c.id} to={toolsHref('', c.id)} className="footer-pill">
                {c.label}
              </Link>
            ))}
          </div>
          <div style={{ flex: 1, minWidth: 12 }} />
          <Link to="/contact" className="footer-link" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--gfw-accent-soft)', flexShrink: 0 }}>
            Request a generator →
          </Link>
        </div>
      )}

      <div className="gfw-container" style={{ padding: '24px 28px', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0 }}>
          <span style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--gfw-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M7.4 4.2 3.2 10l4.2 5.8" stroke="#fff" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12.6 4.2 16.8 10l-4.2 5.8" stroke="#fff" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--gfw-dark-text-strong)' }}>WPCodeKit</span>
        </Link>
        <span style={{ fontSize: 12.5, color: '#7C7565', maxWidth: 560 }}>
          Built by{' '}
          <a href="https://growquest.io" target="_blank" rel="noopener" className="footer-link" style={{ color: 'var(--gfw-dark-text)', fontWeight: 600 }}>
            GrowQuest
          </a>
          . Not affiliated with the WordPress Foundation. WordPress is a trademark of the WordPress Foundation.
        </span>
        <div style={{ flex: 1, minWidth: 20 }} />
        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
          <Link to="/tools" className="footer-link" style={{ fontSize: 12.5, color: 'var(--gfw-dark-text)' }}>Generators</Link>
          <Link to="/about" className="footer-link" style={{ fontSize: 12.5, color: 'var(--gfw-dark-text)' }}>About</Link>
          <Link to="/contact" className="footer-link" style={{ fontSize: 12.5, color: 'var(--gfw-dark-text)' }}>Contact</Link>
          <span style={{ fontSize: 12.5, color: '#7C7565' }}>© 2026</span>
        </div>
      </div>
    </footer>
  );
}
