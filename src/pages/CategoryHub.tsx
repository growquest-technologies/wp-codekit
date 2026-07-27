import { Link, useParams } from 'react-router-dom';
import { CAT_MAP, CATS, TOOLS } from '../data/tools';
import { usePageMeta } from '../lib/usePageMeta';
import { useJsonLd } from '../lib/useJsonLd';

const BASE_URL = 'https://www.wpcodekit.com';

const INTRO: Record<string, string> = {
  content:
    "Content generators cover the building blocks of what visitors see and editors manage — post types, taxonomies, custom fields and shortcodes. Start here if you're modelling data: a recipe post type, a portfolio taxonomy, a shortcode that renders a pricing table.",
  admin:
    'Admin generators build the screens editors and site owners actually use day to day — settings pages, dashboard widgets, admin notices, list tables and the toolbar. Useful whenever a client needs a place to configure something without touching code.',
  query:
    "Query generators write the WP_Query-family calls WordPress core ships — the main loop plus its companion query classes for taxonomies, meta, dates, users, terms and comments. Pick the arguments in a form instead of re-reading the developer handbook every time you need a meta_query relation right.",
  design:
    'Design generators wire up theme-level integration points — sidebars, nav menu locations, theme support flags, a full WP_Widget class and theme.json. Aimed at theme development, not admin screens.',
  core: 'Core generators are the plumbing every plugin eventually needs — hooks, wp-config constants, enqueued scripts, cron events, REST routes, activation hooks and the plugin file header itself. The ones you write from muscle memory, except generated correctly the first time.',
  woocommerce:
    'WooCommerce generators extend the store beyond what settings screens expose — a payment gateway class, a shipping method, checkout fields, cart fees, custom order statuses, account endpoints and transactional emails. Each one is checked against real WooCommerce core APIs — HPOS-safe order queries, correct process_payment() return contracts — not guessed.',
};

export function CategoryHub() {
  const { cat = '' } = useParams();
  const category = CAT_MAP[cat];
  const tools = TOOLS.filter((t) => t.cat === cat);

  usePageMeta(
    category ? `${category.label} Generators` : 'Category not found',
    category ? `${INTRO[cat]} ${tools.length} free generators, no signup.` : "That category doesn't exist.",
    `/category/${cat}`,
    { noindex: !category },
  );

  useJsonLd(
    'ld-breadcrumb',
    category
      ? {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE_URL}/` },
            { '@type': 'ListItem', position: 2, name: 'Generators', item: `${BASE_URL}/tools` },
            { '@type': 'ListItem', position: 3, name: `${category.label} Generators`, item: `${BASE_URL}/category/${cat}` },
          ],
        }
      : null,
  );

  if (!category) {
    return (
      <div className="gfw-container" style={{ padding: '80px 28px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--gfw-text-strong)', marginBottom: 10 }}>Category not found</h1>
        <p style={{ fontSize: 14, color: 'var(--gfw-text-muted)', marginBottom: 22 }}>That category doesn't exist.</p>
        <Link to="/tools" className="btn btn-primary">Browse all generators</Link>
      </div>
    );
  }

  const otherCategories = CATS.filter((c) => c.id !== cat);

  return (
    <div>
      <section className="gfw-container" style={{ paddingTop: 44, paddingBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, color: 'var(--gfw-text-faint)', marginBottom: 16, flexWrap: 'wrap' }}>
          <Link to="/" style={{ color: 'var(--gfw-text-mutest)', fontWeight: 600 }}>Home</Link>
          <span aria-hidden="true">/</span>
          <Link to="/tools" style={{ color: 'var(--gfw-text-mutest)', fontWeight: 600 }}>Generators</Link>
          <span aria-hidden="true">/</span>
          <span style={{ color: 'var(--gfw-text-muted)', fontWeight: 600 }}>{category.label}</span>
        </div>
        <h1 style={{ margin: '0 0 14px', maxWidth: '20ch', fontSize: 'clamp(28px,3.6vw,40px)', lineHeight: 1.08, fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--gfw-text-strong)' }}>
          {category.label} Generators
        </h1>
        <p style={{ margin: 0, maxWidth: '68ch', fontSize: 15.5, lineHeight: 1.65, color: 'var(--gfw-text-muted)' }}>{INTRO[cat]}</p>
      </section>

      <section className="gfw-container" style={{ paddingTop: 32, paddingBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 240px), 1fr))', gap: 12 }}>
          {tools.map((t) => (
            <Link
              key={t.id}
              to={`/tools/${t.id}`}
              className="card-link"
              style={{ borderRadius: 11, border: '1px solid var(--gfw-border)', background: '#fff', padding: '16px 18px' }}
            >
              <span style={{ fontFamily: 'var(--gfw-font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', color: 'var(--gfw-text-faint)', textTransform: 'uppercase' }}>
                {t.fn}
              </span>
              <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--gfw-text-strong)' }}>{t.name}</span>
              <span style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--gfw-text-soft)' }}>{t.desc}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="gfw-container" style={{ paddingTop: 24, paddingBottom: 64 }}>
        <div style={{ borderTop: '1px solid var(--gfw-border-muted)', paddingTop: 24, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--gfw-text-faint)' }}>
            Other categories
          </span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {otherCategories.map((c) => (
              <Link key={c.id} to={`/category/${c.id}`} className="chip">
                {c.label}
              </Link>
            ))}
          </div>
          <div style={{ flex: 1, minWidth: 12 }} />
          <Link to="/tools" style={{ fontSize: 13, fontWeight: 650 }}>
            All {TOOLS.length} generators →
          </Link>
        </div>
      </section>
    </div>
  );
}
