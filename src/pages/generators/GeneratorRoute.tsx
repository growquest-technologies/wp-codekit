import { Suspense } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getGeneratorComponent } from '../../generators/registry';
import { CAT_MAP, TOOLS } from '../../data/tools';
import { usePageMeta } from '../../lib/usePageMeta';
import { useJsonLd } from '../../lib/useJsonLd';

const BASE_URL = 'https://www.wpcodekit.com';

export function GeneratorRoute() {
  const { toolId = '' } = useParams();
  const Comp = getGeneratorComponent(toolId);
  const tool = TOOLS.find((t) => t.id === toolId);

  usePageMeta(
    tool ? `${tool.name} Generator` : 'Generator not found',
    tool ? `${tool.desc} Free, client-side, no signup — generate the ${tool.fn} code and copy it straight into your plugin.` : "That generator doesn't exist.",
    `/tools/${toolId}`,
    { noindex: !Comp },
  );

  useJsonLd(
    'ld-breadcrumb',
    tool
      ? {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE_URL}/` },
            { '@type': 'ListItem', position: 2, name: 'Generators', item: `${BASE_URL}/tools` },
            { '@type': 'ListItem', position: 3, name: CAT_MAP[tool.cat].label, item: `${BASE_URL}/category/${tool.cat}` },
            { '@type': 'ListItem', position: 4, name: `${tool.name} Generator`, item: `${BASE_URL}/tools/${tool.id}` },
          ],
        }
      : null,
  );

  if (!Comp) {
    return (
      <div className="gfw-container" style={{ padding: '80px 28px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--gfw-text-strong)', marginBottom: 10 }}>
          {tool ? `${tool.name} isn't built yet` : 'Generator not found'}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--gfw-text-muted)', marginBottom: 22 }}>
          {tool ? "It's on the build list — let us know if you need it sooner." : "That generator doesn't exist."}
        </p>
        <Link to="/tools" className="btn btn-primary">Back to generators</Link>
      </div>
    );
  }

  return (
    <Suspense fallback={<div style={{ padding: 60, textAlign: 'center', color: 'var(--gfw-text-mutest)' }}>Loading…</div>}>
      <Comp />
    </Suspense>
  );
}
