import type { ReactNode } from 'react';
import { AuthProvider } from '@/providers/AuthProvider';
import { QueryProvider } from '@/providers/QueryProvider';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { ToastProvider } from '@/providers/ToastProvider';

/**
 * The provider tree, from outermost to innermost:
 *
 * 1. ThemeProvider — reads system preference and persists the user's choice.
 * 2. QueryProvider — react-query client with retry/stale-time defaults.
 * 3. AuthProvider  — Supabase session + profile + org + permissions.
 * 4. ToastProvider — global toast notifications.
 *
 * Order matters: `AuthProvider` depends on `QueryProvider` being available,
 * and `ToastProvider` renders DOM that depends on the theme.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
