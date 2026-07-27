import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth/AuthContext';
import { usePageMeta } from '../../lib/usePageMeta';

/** Placeholder sign-in screen. No real auth provider is wired up yet — see CLAUDE.md. */
export function Login() {
  usePageMeta('Sign in', 'Sign in to WP CodeKit.', '/login', { noindex: true });

  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const from = (location.state as { from?: Location })?.from?.pathname || '/account';

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await signIn(email);
    navigate(from, { replace: true });
  }

  return (
    <div className="gfw-container" style={{ padding: '80px 28px', maxWidth: 420 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--gfw-text-strong)', marginBottom: 10 }}>Sign in</h1>
      <p style={{ fontSize: 14, color: 'var(--gfw-text-muted)', marginBottom: 24, lineHeight: 1.6 }}>
        No account is required to use any generator. This screen is a placeholder for future saved-project and paid-plan features.
      </p>
      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label className="field-label" htmlFor="login-email">Email</label>
          <input id="login-email" type="email" className="marketing-input" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </div>
        <button type="submit" className="btn btn-primary">Continue</button>
      </form>
    </div>
  );
}
