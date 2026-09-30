import { BrowserRouter } from 'react-router-dom';
import type { ReactNode } from 'react';

/**
 * The router boundary for the whole app.
 *
 * `App` renders a `<Routes>` tree, and `<Routes>` reads its routes from a
 * Router context — without one React throws
 * "useRoutes() may be used only in the context of a <Router> component" and the
 * ErrorBoundary catches it on every screen. That failure mode is invisible to
 * `npm test` (no test renders `App`) and to `npm run build` (bundling does not
 * evaluate components), so it is the browser test's job to catch it.
 *
 * `VITE_BASE_PATH` lets a buyer serve the app from a sub-directory
 * (e.g. `VITE_BASE_PATH=/crm`). The static asset path and this basename are
 * separate settings that must be kept in sync — see docs/SETUP.md.
 */
export function AppRouter({ children }: { children: ReactNode }) {
  const basename = import.meta.env.VITE_BASE_PATH?.trim() || undefined;
  return <BrowserRouter basename={basename}>{children}</BrowserRouter>;
}
