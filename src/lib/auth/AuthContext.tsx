import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

/**
 * No backend exists yet. This context is the seam future auth/payment work plugs into:
 * swap `signIn`/`signOut` for real calls (e.g. to Clerk, Auth.js, or a custom API) and
 * flip `status` based on the real session, without touching any page that calls useAuth().
 */

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  plan: 'free' | 'pro';
}

type AuthStatus = 'unauthenticated' | 'authenticated';

interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  isAuthenticated: boolean;
  signIn: (email: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = 'gfw.auth.user';

function readStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser());

  const signIn = useCallback(async (email: string) => {
    // Placeholder: no backend yet. Replace with a real auth provider call
    // (session cookie, JWT, OAuth redirect, etc.) when auth is wired up.
    const mockUser: AuthUser = { id: 'local-' + email, email, plan: 'free' };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockUser));
    setUser(mockUser);
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status: user ? 'authenticated' : 'unauthenticated',
      isAuthenticated: !!user,
      signIn,
      signOut,
    }),
    [user, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
