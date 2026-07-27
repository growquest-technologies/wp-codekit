import { Suspense } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getGeneratorComponent } from '../../generators/registry';
import { TOOLS } from '../../data/tools';

export function GeneratorRoute() {
  const { toolId = '' } = useParams();
  const Comp = getGeneratorComponent(toolId);
  const tool = TOOLS.find((t) => t.id === toolId);

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
