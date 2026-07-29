import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon, GLYPH } from '../components/ui/Icon';
import { CATS, CAT_MAP, TOOLS, TOOL_ROUTES, toolsHref } from '../data/tools';
import { usePageMeta } from '../lib/usePageMeta';
import { useJsonLd } from '../lib/useJsonLd';

const VALUE_PROPS = [
  { num: '01', title: 'See it before you ship it', body: "Generators render a live preview of the result — a WordPress.org listing, an admin screen, a query result set — next to the code, so you catch mistakes here instead of in staging." },
  { num: '02', title: 'Editors, not just forms', body: 'Long-form fields are real editors. Drag blocks around, format text, reorder sections. The PHP or txt output regenerates as you work.' },
  { num: '03', title: 'Output you can actually use', body: 'Copy the snippet, download a single .php file, or take a zip-ready plugin scaffold with the header, folder structure and hooks already in place.' },
];

const FEATURED_IDS = ['readme', 'post-type', 'wp-query', 'shortcode', 'meta-box', 'settings-page', 'taxonomy', 'enqueue', 'rest-route', 'post-meta', 'cron', 'hooks'];

const ABOUT_STATS_POPULAR = ['register_post_type', 'taxonomy', 'WP_Query', 'shortcode', 'cron'];

const HOME_FAQ = [
  {
    q: 'Is WP CodeKit really free?',
    a: "Yes — every generator is free and anonymous. There's no account, no plan and no paywall on the copy or download step.",
  },
  {
    q: 'Is the generated code production-ready?',
    a: "Nonces and sanitisation are added wherever WordPress expects them, and defaults match WordPress core's own choices instead of our opinions. As with any generated code, review it before shipping.",
  },
  {
    q: 'Do I need to install a plugin to use it?',
    a: 'No. Everything runs in your browser — paste the generated PHP straight into your own plugin or theme.',
  },
  {
    q: 'Does WP CodeKit store or upload my code?',
    a: 'No. Nothing you type is sent anywhere — every generator runs entirely client-side, in your browser.',
  },
  {
    q: 'Which WordPress version does the generated code target?',
    a: "Current WordPress core APIs. Where a function needs a specific minimum version — WooCommerce's Blocks Checkout API, for instance — the generator notes it.",
  },
  {
    q: "Can I request a generator that doesn't exist yet?",
    a: 'Yes — use the contact form and tell us which function or workflow you keep writing by hand.',
  },
];

export function Home() {
  const navigate = useNavigate();
  const [heroQuery, setHeroQuery] = useState('');

  usePageMeta(
    'WP CodeKit — WordPress code generators',
    "Fill in a form, get production-ready WordPress PHP. Post types, taxonomies, queries, hooks, readme.txt and more. Live previews, no signup.",
    '/',
    { rawTitle: true },
  );

  useJsonLd('ld-faq', {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: HOME_FAQ.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  });

  const featuredTools = FEATURED_IDS.map((id) => TOOLS.find((t) => t.id === id)).filter((t): t is NonNullable<typeof t> => !!t);

  function onHeroSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    navigate(toolsHref(heroQuery, 'all'));
  }

  return (
    <div>
      {/* Hero */}
      <section
        className="gfw-container"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))',
          alignItems: 'center',
          gap: 'clamp(32px, 4vw, 56px)',
          paddingTop: 'clamp(44px, 6vw, 76px)',
          paddingBottom: 56,
        }}
      >
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 22,
              padding: '5px 12px 5px 8px',
              borderRadius: 20,
              border: '1px solid var(--gfw-border)',
              background: '#fff',
              fontSize: 11.5,
              fontWeight: 650,
              color: 'var(--gfw-text-label)',
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gfw-success)' }} />
            {TOOLS.length} generators · nothing behind a login
          </div>
          <h1
            style={{
              margin: '0 0 20px',
              maxWidth: '15ch',
              fontSize: 'clamp(34px, 5vw, 57px)',
              lineHeight: 1.03,
              fontWeight: 700,
              letterSpacing: '-0.033em',
              color: 'var(--gfw-text-strong)',
            }}
          >
            Every WordPress generator, one place.
          </h1>
          <p
            style={{
              margin: '0 0 30px',
              maxWidth: 520,
              fontSize: 'clamp(16px, 1.5vw, 18.5px)',
              lineHeight: 1.5,
              color: 'var(--gfw-text-muted)',
            }}
          >
            Fill in a form, get production-ready PHP. Post types, taxonomies, queries, hooks, readme files — with live previews of what you're actually building.
          </p>

          <form onSubmit={onHeroSearchSubmit} style={{ display: 'flex', maxWidth: 520, gap: 10, marginBottom: 18 }}>
            <div
              style={{
                display: 'flex',
                flex: 1,
                alignItems: 'center',
                gap: 10,
                borderRadius: 10,
                border: '1px solid var(--gfw-border)',
                background: '#fff',
                padding: '0 14px',
                boxShadow: 'var(--gfw-shadow-sm)',
              }}
            >
              <Icon name={GLYPH.search} size={17} style={{ flexShrink: 0, color: 'var(--gfw-text-faint)' }} />
              <input
                aria-label="Search generators"
                placeholder="register_post_type, taxonomy, WP_Query…"
                value={heroQuery}
                onChange={(e) => setHeroQuery(e.target.value)}
                style={{
                  flex: 1,
                  minWidth: 0,
                  border: 'none',
                  background: 'transparent',
                  padding: '13px 0',
                  fontSize: 15,
                  color: 'var(--gfw-text)',
                  outline: 'none',
                }}
              />
            </div>
            <button type="submit" className="btn btn-dark" style={{ flexShrink: 0 }}>
              Search
            </button>
          </form>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--gfw-text-mutest)' }}>
            <span style={{ fontWeight: 600 }}>Popular:</span>
            {ABOUT_STATS_POPULAR.map((p) => (
              <Link key={p} to={toolsHref(p, 'all')} className="popular-search-pill">
                {p}
              </Link>
            ))}
          </div>
        </div>

        {/* Hero code panel */}
        <div className="code-panel">
          <div className="code-panel-titlebar">
            <span className="code-panel-dot" />
            <span className="code-panel-dot" />
            <span className="code-panel-dot" />
            <span className="code-panel-filename">post-type.php</span>
            <div style={{ flex: 1 }} />
            <span className="code-panel-badge">GENERATED</span>
          </div>
          <pre className="code-panel-body" style={{ fontSize: 'clamp(10.5px, 1.15vw, 12.5px)' }}>
            <span style={{ color: 'var(--gfw-dark-text-muted)' }}>{'// Register the "Recipe" post type\n'}</span>
            <span style={{ color: '#8FA9FF' }}>add_action</span>
            {'( '}
            <span style={{ color: '#B7D48A' }}>'init'</span>
            {', '}
            <span style={{ color: '#8FA9FF' }}>function</span>
            {'() {\n  '}
            <span style={{ color: '#8FA9FF' }}>register_post_type</span>
            {'( '}
            <span style={{ color: '#B7D48A' }}>'recipe'</span>
            {', [\n    '}
            <span style={{ color: '#B7D48A' }}>'labels'</span>
            {'       => [\n      '}
            <span style={{ color: '#B7D48A' }}>'name'</span>
            {'          => '}
            <span style={{ color: '#B7D48A' }}>'Recipes'</span>
            {',\n      '}
            <span style={{ color: '#B7D48A' }}>'singular_name'</span>
            {' => '}
            <span style={{ color: '#B7D48A' }}>'Recipe'</span>
            {',\n    ],\n    '}
            <span style={{ color: '#B7D48A' }}>'public'</span>
            {'       => '}
            <span style={{ color: '#E0A87A' }}>true</span>
            {',\n    '}
            <span style={{ color: '#B7D48A' }}>'has_archive'</span>
            {'  => '}
            <span style={{ color: '#E0A87A' }}>true</span>
            {',\n    '}
            <span style={{ color: '#B7D48A' }}>'menu_icon'</span>
            {'    => '}
            <span style={{ color: '#B7D48A' }}>'dashicons-carrot'</span>
            {',\n    '}
            <span style={{ color: '#B7D48A' }}>'supports'</span>
            {'     => [ '}
            <span style={{ color: '#B7D48A' }}>'title'</span>
            {', '}
            <span style={{ color: '#B7D48A' }}>'editor'</span>
            {', '}
            <span style={{ color: '#B7D48A' }}>'thumbnail'</span>
            {' ],\n    '}
            <span style={{ color: '#B7D48A' }}>'show_in_rest'</span>
            {' => '}
            <span style={{ color: '#E0A87A' }}>true</span>
            {',\n  ] );\n} );'}
            <span className="gfw-caret">▍</span>
          </pre>
        </div>
      </section>

      {/* Value props */}
      <section style={{ borderTop: '1px solid var(--gfw-border)', borderBottom: '1px solid var(--gfw-border)', background: '#fff' }}>
        <div
          className="gfw-container"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
            columnGap: 0,
            rowGap: 28,
            paddingTop: 52,
            paddingBottom: 52,
          }}
        >
          {VALUE_PROPS.map((vp, i) => (
            <div
              key={vp.num}
              style={{
                paddingRight: 'clamp(18px, 2.4vw, 34px)',
                paddingLeft: i === 0 ? 0 : 'clamp(18px, 2.4vw, 34px)',
                borderLeft: i === 0 ? 'none' : '1px solid var(--gfw-border-muted)',
              }}
            >
              <div style={{ marginBottom: 14, fontFamily: 'var(--gfw-font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--gfw-accent)' }}>{vp.num}</div>
              <h3 style={{ margin: '0 0 10px', fontSize: 19, fontWeight: 700, letterSpacing: '-0.015em', color: 'var(--gfw-text-strong)' }}>{vp.title}</h3>
              <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6, color: 'var(--gfw-text-muted)' }}>{vp.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured tool */}
      <section className="gfw-container" style={{ paddingTop: 64 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 22 }}>
          <h2 className="gfw-eyebrow">Most useful tools</h2>
          <div className="gfw-rule" />
          <Link to="/tools" style={{ fontSize: 13, fontWeight: 650 }}>
            All {TOOLS.length} generators →
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 240px), 1fr))', gap: 12 }}>
          {featuredTools.map((t) => (
            <Link
              key={t.id}
              to={TOOL_ROUTES[t.id]}
              className="card-link"
              style={{ borderRadius: 11, border: '1px solid var(--gfw-border)', background: '#fff', padding: '16px 18px' }}
            >
              <span style={{ fontFamily: 'var(--gfw-font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', color: 'var(--gfw-text-faint)', textTransform: 'uppercase' }}>
                {CAT_MAP[t.cat].label}
              </span>
              <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--gfw-text-strong)' }}>{t.name}</span>
              <span style={{ fontFamily: 'var(--gfw-font-mono)', fontSize: 11, color: 'var(--gfw-accent)' }}>{t.fn}</span>
              <span style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--gfw-text-soft)' }}>{t.desc}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Browse by category */}
      <section className="gfw-container" style={{ paddingTop: 64 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 22 }}>
          <h2 className="gfw-eyebrow">Browse by category</h2>
          <div className="gfw-rule" />
          <Link to="/tools" style={{ fontSize: 13, fontWeight: 650 }}>
            All {TOOLS.length} generators →
          </Link>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: 12 }}>
          {CATS.map((c) => (
            <Link
              key={c.id}
              to={`/category/${c.id}`}
              className="card-link"
              style={{ minHeight: 150, borderRadius: 11, border: '1px solid var(--gfw-border)', background: '#fff', padding: '20px 18px 18px' }}
            >
              <div style={{ fontFamily: 'var(--gfw-font-mono)', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--gfw-accent)' }}>
                {TOOLS.filter((t) => t.cat === c.id).length}
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--gfw-text-strong)' }}>{c.label}</div>
              <div style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--gfw-text-mutest)' }}>{c.blurb}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="gfw-container" style={{ paddingTop: 64 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 22 }}>
          <h2 className="gfw-eyebrow">Frequently asked</h2>
          <div className="gfw-rule" />
        </div>
        <div style={{ maxWidth: 760, borderTop: '1px solid var(--gfw-border-muted)' }}>
          {HOME_FAQ.map((f) => (
            <details key={f.q} style={{ borderBottom: '1px solid var(--gfw-border-muted)', padding: '18px 0' }}>
              <summary
                style={{
                  cursor: 'pointer',
                  listStyle: 'none',
                  fontSize: 15.5,
                  fontWeight: 650,
                  letterSpacing: '-0.01em',
                  color: 'var(--gfw-text-strong)',
                }}
              >
                {f.q}
              </summary>
              <p style={{ margin: '10px 0 0', fontSize: 14, lineHeight: 1.65, color: 'var(--gfw-text-muted)' }}>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="gfw-container" style={{ paddingTop: 64, paddingBottom: 84 }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 'clamp(20px, 3vw, 44px)',
            borderRadius: 16,
            border: '1px solid var(--gfw-border)',
            background: '#fff',
            padding: 'clamp(26px, 3vw, 38px) clamp(24px, 3vw, 40px)',
          }}
        >
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ marginBottom: 8, maxWidth: '24ch', fontSize: 'clamp(20px, 2.2vw, 26px)', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--gfw-text-strong)' }}>
              Can't find the generator you need?
            </div>
            <p style={{ margin: 0, maxWidth: '52ch', fontSize: 14.5, lineHeight: 1.6, color: 'var(--gfw-text-muted)' }}>
              Tell us which function or workflow you keep writing by hand.
            </p>
          </div>
          <Link to="/contact" className="btn btn-dark" style={{ flexShrink: 0 }}>
            Request a generator
            <Icon name={GLYPH.arrowRight} size={15} />
          </Link>
        </div>
      </section>
    </div>
  );
}
