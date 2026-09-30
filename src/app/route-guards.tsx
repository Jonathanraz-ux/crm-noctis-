import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import { useAuth } from '@/providers/AuthProvider';

/** Full-page spinner for the short window before the session is known. */
export function FullPageLoader({ label = 'Loading' }: { label?: string }) {
  return (
    <div
      className="bg-surface-subtle grid h-full place-items-center"
      role="status"
      aria-live="polite"
    >
      <div className="text-foreground-muted flex items-center gap-2.5 text-sm">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        {label}…
      </div>
    </div>
  );
}

/**
 * Gate for every signed-in screen.
 *
 * The `remembered` redirect is the whole point: without it, following a deep
 * link while signed out drops the user on /login and the original destination
 * is lost.
 */
export function RequireAuth() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <FullPageLoader label="Checking your session" />;
  if (!user)
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  return <Outlet />;
}

/** Keeps a signed-in user out of the login and sign-up screens. */
export function RequireAnonymous() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <FullPageLoader label="Checking your session" />;
  if (user) return <Navigate to="/" replace />;
  return <Outlet />;
}
