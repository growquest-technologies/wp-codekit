import { useAuth } from '../../lib/auth/AuthContext';
import { usePageMeta } from '../../lib/usePageMeta';

/** Placeholder account screen behind ProtectedRoute — see CLAUDE.md for the auth seam. */
export function Account() {
  usePageMeta('Account', 'Your WP CodeKit account.', '/account', { noindex: true });

  const { user, signOut } = useAuth();

  return (
    <div className="gfw-container" style={{ padding: '80px 28px', maxWidth: 480 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--gfw-text-strong)', marginBottom: 10 }}>Account</h1>
      <p style={{ fontSize: 14, color: 'var(--gfw-text-muted)', marginBottom: 24 }}>Signed in as {user?.email}. Plan: {user?.plan}.</p>
      <button onClick={signOut} className="btn btn-ghost">Sign out</button>
    </div>
  );
}
