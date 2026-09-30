import { Navigate, Route, Routes } from 'react-router-dom';
import { lazy, Suspense } from 'react';

import { AppLayout } from './AppLayout';
import { ErrorBoundary } from './ErrorBoundary';
import { FullPageLoader, RequireAnonymous, RequireAuth } from './route-guards';
import { useAuth } from '@/providers/AuthProvider';

import { SignInPage } from './pages/SignInPage';
import { SignUpPage } from './pages/SignUpPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { NotFoundPage } from './pages/NotFoundPage';

/**
 * Feature screens are lazy-loaded to optimize bundle splitting.
 */
const DashboardPage = lazy(() =>
  import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const ProspectsPage = lazy(() =>
  import('./pages/ProspectsPage').then((m) => ({ default: m.ProspectsPage })),
);
const ContactsPage = lazy(() =>
  import('./pages/ContactsPage').then((m) => ({ default: m.ContactsPage })),
);
const PipelinePage = lazy(() =>
  import('./pages/PipelinePage').then((m) => ({ default: m.PipelinePage })),
);
const TasksPage = lazy(() =>
  import('./pages/TasksPage').then((m) => ({ default: m.TasksPage })),
);
const MembersPage = lazy(() =>
  import('./pages/MembersPage').then((m) => ({ default: m.MembersPage })),
);
const RolesPage = lazy(() =>
  import('./pages/RolesPage').then((m) => ({ default: m.RolesPage })),
);
const AuditPage = lazy(() =>
  import('./pages/AuditPage').then((m) => ({ default: m.AuditPage })),
);
const SettingsPage = lazy(() =>
  import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);

function ProtectedApp() {
  const { isLoading, organizations } = useAuth();

  if (isLoading) return <FullPageLoader label="Loading your workspace" />;

  if (organizations.length === 0) return <Navigate to="/onboarding" replace />;

  return (
    <AppLayout>
      <Suspense fallback={<FullPageLoader />}>
        <Routes>
          <Route index element={<DashboardPage />} />
          <Route path="prospects" element={<ProspectsPage />} />
          <Route path="contacts" element={<ContactsPage />} />
          <Route path="pipeline" element={<PipelinePage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="members" element={<MembersPage />} />
          <Route path="roles" element={<RolesPage />} />
          <Route path="audit" element={<AuditPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </AppLayout>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        <Route element={<RequireAnonymous />}>
          <Route path="/login" element={<SignInPage />} />
          <Route path="/sign-in" element={<Navigate to="/login" replace />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/sign-up" element={<Navigate to="/signup" replace />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/*" element={<ProtectedApp />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}
