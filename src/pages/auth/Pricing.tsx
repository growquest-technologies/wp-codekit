import { usePageMeta } from '../../lib/usePageMeta';

/** Placeholder pricing page — reserved route for future paid plans. See CLAUDE.md. */
export function Pricing() {
  usePageMeta('Pricing', 'Every WP CodeKit generator is free — no paid tier today.', '/pricing', { noindex: true });

  return (
    <div className="gfw-container" style={{ padding: '80px 28px', maxWidth: 640 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--gfw-text-strong)', marginBottom: 10 }}>Pricing</h1>
      <p style={{ fontSize: 14, color: 'var(--gfw-text-muted)', lineHeight: 1.6 }}>
        Every generator is free today — there is no paid tier yet. This route is reserved so a future plan/checkout flow
        has a home without touching the rest of the app.
      </p>
    </div>
  );
}
