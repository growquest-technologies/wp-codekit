import { useMemo, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Icon, GLYPH } from '../components/ui/Icon';
import { CATS, CAT_MAP, TOOLS, TOOL_ROUTES, fuzzyScore, type Tool } from '../data/tools';
import { usePageMeta } from '../lib/usePageMeta';
import { useJsonLd } from '../lib/useJsonLd';

const BASE_URL = 'https://www.wpcodekit.com';

type SortMode = 'relevance' | 'az';

export function ToolsIndex() {
  usePageMeta(
    `All ${TOOLS.length} WordPress Code Generators — Free, No Login | WP CodeKit`,
    `Browse all ${TOOLS.length} WordPress code generators — post types, taxonomies, queries, hooks, admin screens, themes and WooCommerce. Free, no signup.`,
    '/tools',
    { rawTitle: true },
  );

  // The full catalogue as one ItemList. This is the page an answer engine reads
  // when asked "what WordPress generators are there" — an explicit, ordered list
  // of all of them is far more extractable than 49 anchor tags.
  useJsonLd('ld-tools-list', {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `All ${TOOLS.length} WordPress code generators`,
    url: `${BASE_URL}/tools`,
    isPartOf: { '@id': `${BASE_URL}/#website` },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: TOOLS.length,
      itemListElement: TOOLS.map((t, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: `${t.name} Generator`,
        description: t.desc,
        url: `${BASE_URL}/tools/${t.id}`,
      })),
    },
  });

  const [params, setParams] = useSearchParams();
  const query = params.get('q') || '';
  const category = params.get('cat') || 'all';
  const sort = (params.get('sort') as SortMode) || 'relevance';
  const searchRef = useRef<HTMLInputElement>(null);

  function updateParams(next: Record<string, string>) {
    const merged = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) {
      if (v) merged.set(k, v);
      else merged.delete(k);
    }
    setParams(merged, { replace: true });
  }

  const results = useMemo(() => {
    const list = TOOLS.filter((t) => category === 'all' || t.cat === category);
    let scored = list.map((t) => ({ t, s: fuzzyScore(query, t) })).filter((r) => r.s > 0);
    if (query) {
      const top = scored.reduce((m, r) => Math.max(m, r.s), 0);
      const floor = Math.max(top * 0.45, 300);
      scored = scored.filter((r) => r.s >= floor);
    }
    if (sort === 'az' || !query) {
      scored.sort((a, b) => a.t.name.localeCompare(b.t.name));
    }
    if (query && sort === 'relevance') scored.sort((a, b) => b.s - a.s || a.t.name.localeCompare(b.t.name));
    return scored.map((r) => r.t);
  }, [query, category, sort]);

  const resultsLabel = `${results.length}${results.length === 1 ? ' generator' : ' generators'}${query ? ` matching “${query}”` : ''}`;

  return (
    <div>
      <section style={{ borderBottom: '1px solid var(--gfw-border)', background: '#fff' }}>
        <div className="gfw-container" style={{ padding: '48px 28px 34px' }}>
          <h1 style={{ fontSize: 'clamp(29px,3.4vw,38px)', fontWeight: 700, letterSpacing: '-0.028em', color: 'var(--gfw-text-strong)', marginBottom: 10 }}>Generators</h1>
          <p style={{ fontSize: 16, lineHeight: 1.55, color: 'var(--gfw-text-muted)', maxWidth: 560, marginBottom: 26 }}>
            Search by function name, WordPress concept, or what you're trying to build. Everything runs in your browser — nothing is uploaded.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 11, background: 'var(--gfw-bg)', border: '1px solid var(--gfw-border)', borderRadius: 11, padding: '0 16px', maxWidth: 640, boxShadow: 'var(--gfw-shadow-sm)' }}>
            <Icon name={GLYPH.search} size={18} style={{ color: 'var(--gfw-text-faint)', flexShrink: 0 }} />
            <input
              ref={searchRef}
              aria-label="Search generators"
              placeholder="Try “custom fields”, “cron”, or “WP_Query”"
              value={query}
              onChange={(e) => updateParams({ q: e.target.value })}
              style={{ flex: 1, border: 'none', outline: 'none', background: 'none', fontSize: 15.5, padding: '15px 0', color: 'var(--gfw-text)', minWidth: 0 }}
            />
            {query && (
              <button
                aria-label="Clear search"
                title="Clear search"
                onClick={() => {
                  updateParams({ q: '' });
                  searchRef.current?.focus();
                }}
                style={{ border: 'none', background: 'var(--gfw-border)', width: 20, height: 20, borderRadius: '50%', cursor: 'pointer', color: 'var(--gfw-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13, lineHeight: 1, padding: 0 }}
              >
                ×
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginTop: 20 }}>
            {[{ id: 'all', label: 'All' }, ...CATS].map((c) => (
              <button
                key={c.id}
                onClick={() => updateParams({ cat: c.id === 'all' ? '' : c.id })}
                className={`chip${category === c.id ? ' is-active' : ''}`}
              >
                {c.label}
                <span className="chip-count">{c.id === 'all' ? TOOLS.length : TOOLS.filter((t) => t.cat === c.id).length}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="gfw-container" style={{ padding: '26px 28px 84px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: 'var(--gfw-text-mutest)', fontWeight: 600 }}>{resultsLabel}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--gfw-text-faint)', fontWeight: 600 }}>Sort</span>
            {(['relevance', 'az'] as const).map((s) => (
              <button
                key={s}
                onClick={() => updateParams({ sort: s === 'relevance' ? '' : s })}
                className={`chip${sort === s ? ' is-active' : ''}`}
                style={{ borderRadius: 6, padding: '5px 10px', fontSize: 12 }}
              >
                {s === 'relevance' ? 'Relevance' : 'A–Z'}
              </button>
            ))}
          </div>
        </div>

        {results.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%,270px),1fr))', gap: 12, alignItems: 'start' }}>
            {results.map((t) => (
              <ToolCard key={t.id} tool={t} />
            ))}
          </div>
        ) : (
          <div style={{ border: '1px dashed var(--gfw-border-dashed)', borderRadius: 12, padding: '56px 28px', textAlign: 'center', background: 'var(--gfw-surface-muted)' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--gfw-text-strong)', marginBottom: 8 }}>No generator for “{query}” yet</div>
            <p style={{ fontSize: 14, color: 'var(--gfw-text-muted)', marginBottom: 22, lineHeight: 1.55 }}>Tell us what you need and it goes on the build list.</p>
            <Link to="/contact" className="btn btn-primary">Request this generator</Link>
          </div>
        )}
      </section>
    </div>
  );
}

function ToolCard({ tool }: { tool: Tool }) {
  return (
    <Link
      to={TOOL_ROUTES[tool.id]}
      className="card-link"
      style={{ background: '#fff', border: '1px solid var(--gfw-accent-tint-border)', borderRadius: 11, padding: '18px 20px' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: 'var(--gfw-font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--gfw-text-faint)' }}>
          {CAT_MAP[tool.cat].label}
        </span>
      </div>
      <div style={{ fontSize: 16.5, fontWeight: 700, color: 'var(--gfw-text-strong)', letterSpacing: '-0.014em', lineHeight: 1.2 }}>{tool.name}</div>
      <div style={{ fontFamily: 'var(--gfw-font-mono)', fontSize: 11.5, color: 'var(--gfw-accent)', wordBreak: 'break-all', lineHeight: 1.4 }}>{tool.fn}</div>
      <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--gfw-text-muted)' }}>{tool.desc}</div>
    </Link>
  );
}
