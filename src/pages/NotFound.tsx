import { Link } from 'react-router-dom';
import { usePageMeta } from '../lib/usePageMeta';

export function NotFound() {
  usePageMeta('Page not found', "That page doesn't exist.", '/404', { noindex: true });

  return (
    <div className="gfw-container" style={{ padding: '100px 28px', textAlign: 'center' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--gfw-text-strong)', marginBottom: 10 }}>Page not found</h1>
      <p style={{ fontSize: 14, color: 'var(--gfw-text-muted)', marginBottom: 22 }}>That page doesn't exist.</p>
      <Link to="/" className="btn btn-primary">Back home</Link>
    </div>
  );
}
