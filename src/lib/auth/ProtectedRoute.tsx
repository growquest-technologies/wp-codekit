import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

/**
 * Not used by any route yet — every generator is free/anonymous today. Wrap a
 * route's element in this once a tool needs to sit behind login (e.g. saved
 * projects, paid export formats) rather than inventing a new gate per page.
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
