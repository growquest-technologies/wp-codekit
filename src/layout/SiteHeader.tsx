import { Link, useLocation } from 'react-router-dom';
import { Icon, GLYPH } from '../components/ui/Icon';
import { TOOLS } from '../data/tools';

const NAV_LINKS = [
  { label: 'Generators', path: '/tools' },
  { label: 'About', path: '/about' },
  { label: 'Contact', path: '/contact' },
];

export function SiteHeader() {
  const location = useLocation();
  const toolCount = TOOLS.length;

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 60,
        background: 'rgba(250,249,247,0.94)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--gfw-border)',
        flexShrink: 0,
      }}
    >
      <div className="gfw-container" style={{ height: 64, display: 'flex', alignItems: 'center', gap: 28 }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <span
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: 'var(--gfw-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M7.4 4.2 3.2 10l4.2 5.8" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12.6 4.2 16.8 10l-4.2 5.8" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.05 }}>
            <span style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--gfw-text-strong)', letterSpacing: '-0.015em' }}>
              WP<span style={{ color: 'var(--gfw-accent)' }}>CodeKit</span>
            </span>
            <span style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--gfw-text-faint)' }}>
              WordPress code generators
            </span>
          </span>
        </Link>

        <nav style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 6 }}>
          {NAV_LINKS.map((nl) => {
            const on = location.pathname === nl.path || (nl.path === '/tools' && location.pathname.startsWith('/tools'));
            return (
              <Link key={nl.path} to={nl.path} className={`nav-link${on ? ' is-active' : ''}`}>
                {nl.label}
              </Link>
            );
          })}
        </nav>

        <div style={{ flex: 1, minWidth: 8 }} />

        <Link
          to="/tools"
          style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 600, color: 'var(--gfw-text-muted)', flexShrink: 0 }}
        >
          <Icon name={GLYPH.search} size={15} />
          All {toolCount} generators
        </Link>
      </div>
    </header>
  );
}
