/* eslint-disable react-refresh/only-export-components -- route tree exports router + routeTree */
import {
  createRootRoute,
  createRoute,
  createRouter,
  HeadContent,
  Outlet,
  redirect,
} from '@tanstack/react-router';
import { lazy, Suspense } from 'react';
import { Toaster } from 'sonner';

import { AUTH_ROUTES, TENANT } from '@/core/config/constants.ts';
import { dashboardSearchSchema } from '@/pages/dashboard/dashboard.search.ts';
import { listMyOrganizations } from '@/shared/api/my-orgs.ts';
import { getMyPermissions } from '@/shared/api/organization-api.ts';
import { FullPageSpinner } from '@/shared/components/FullPageSpinner.tsx';
import { useAuthStore } from '@/shared/store/useAuthStore/index.ts';
import {
  getLastTenantFromStorage,
  persistTenantToStorage,
  useTenantStore,
} from '@/shared/store/useTenantStore/index.ts';

import { ErrorBoundary } from './ErrorBoundary.tsx';

// ── Lazy components ──
const LoginPage = lazy(() =>
  import('@/pages/auth/login/login.route.tsx').then((m) => ({ default: m.Component })),
);
const RegisterPage = lazy(() =>
  import('@/pages/auth/register/register.route.tsx').then((m) => ({
    default: m.Component,
  })),
);
const ForgotPasswordPage = lazy(() =>
  import('@/pages/auth/forgot-password/forgot-password.route.tsx').then((m) => ({
    default: m.Component,
  })),
);
const ResetPasswordPage = lazy(() =>
  import('@/pages/auth/reset-password/reset-password.route.tsx').then((m) => ({
    default: m.Component,
  })),
);
const VerifyEmailPage = lazy(() =>
  import('@/pages/auth/verify-email/verify-email.route.tsx').then((m) => ({
    default: m.Component,
  })),
);
const MfaPage = lazy(() =>
  import('@/pages/auth/mfa/mfa.route.tsx').then((m) => ({ default: m.Component })),
);
const AuthCallbackPage = lazy(() =>
  import('@/pages/auth/callback/callback.route.tsx').then((m) => ({
    default: m.Component,
  })),
);
const OnboardingPage = lazy(() =>
  import('@/pages/onboarding/onboarding.route.tsx').then((m) => ({
    default: m.Component,
  })),
);
const AcceptInvitePage = lazy(() =>
  import('@/pages/accept-invite/accept-invite.route.tsx').then((m) => ({
    default: m.Component,
  })),
);
const UnauthorizedPage = lazy(() =>
  import('@/app/routes/UnauthorizedPage.tsx').then((m) => ({ default: m.Component })),
);
const DashboardLayout = lazy(() =>
  import('@/shared/layouts/DashboardLayout/index.ts').then((m) => ({
    default: m.Component,
  })),
);
const DashboardPage = lazy(() =>
  import('@/pages/dashboard/dashboard.route.tsx').then((m) => ({
    default: m.Component,
  })),
);
const NotFoundPage = lazy(() =>
  import('@/app/routes/NotFoundPage.tsx').then((m) => ({ default: m.Component })),
);

function Lazy({ C }: { C: React.LazyExoticComponent<React.ComponentType> }) {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <C />
    </Suspense>
  );
}

// ── Root ──
const rootRoute = createRootRoute({
  head: () => ({
    meta: [
      { title: 'Core Admin' },
      { name: 'description', content: 'Enterprise admin dashboard' },
    ],
  }),
  component: () => (
    <>
      <HeadContent />
      <div className="bg-background text-foreground min-h-screen">
        <Outlet />
      </div>
      <Toaster richColors closeButton position="top-right" />
    </>
  ),
  errorComponent: ({ error }) => <ErrorBoundary error={error} />,
});

// ── Public ──
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: () => <Lazy C={LoginPage} />,
});

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register',
  component: () => <Lazy C={RegisterPage} />,
});

const forgotPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/forgot-password',
  component: () => <Lazy C={ForgotPasswordPage} />,
});

const resetPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reset-password',
  component: () => <Lazy C={ResetPasswordPage} />,
});

const verifyEmailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/verify-email',
  component: () => <Lazy C={VerifyEmailPage} />,
});

const mfaRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/mfa',
  component: () => <Lazy C={MfaPage} />,
});

const authCallbackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/callback',
  component: () => <Lazy C={AuthCallbackPage} />,
});

const onboardingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/onboarding',
  beforeLoad: () => {
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) throw redirect({ to: AUTH_ROUTES.LOGIN });
  },
  component: () => <Lazy C={OnboardingPage} />,
});

const acceptInviteRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/accept-invite/$invitationId',
  component: () => <Lazy C={AcceptInvitePage} />,
});

const unauthorizedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/unauthorized',
  component: () => <Lazy C={UnauthorizedPage} />,
});

// ── Protected / (dashboard layout + index) ──
// Pathless layout route (uses `id`, not `path`) so it can wrap the index `/`
// and sibling paths without colliding with the index route's own `/` id.
const dashboardLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'protected',
  beforeLoad: async () => {
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) throw redirect({ to: AUTH_ROUTES.LOGIN });

    const store = useTenantStore.getState();
    const hasTenant = store.tenantId && store.tenantId !== TENANT.LOCALHOST_FALLBACK;
    if (!hasTenant) {
      const last = getLastTenantFromStorage();
      if (last) {
        store.setTenant(last.id, last.slug);
      } else {
        const list = await listMyOrganizations();
        if (list.length === 0) {
          throw redirect({ to: '/onboarding' });
        }
        const first = list[0];
        if (first) {
          store.setTenant(first.id, first.slug);
          persistTenantToStorage(first.id, first.slug);
        }
      }
    }

    // Resolve the user's org-scoped permissions for RBAC gating.
    if (useTenantStore.getState().permissions.length === 0) {
      useTenantStore.getState().setPermissions(await getMyPermissions());
    }
  },
  component: function ProtectedLayout() {
    const isLoading = useAuthStore((s) => s.isLoading);
    if (isLoading) return <FullPageSpinner />;
    return (
      <Suspense fallback={<FullPageSpinner />}>
        <DashboardLayout />
      </Suspense>
    );
  },
});

const dashboardIndexRoute = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: '/',
  validateSearch: (search) => dashboardSearchSchema.parse(search),
  component: () => (
    <Suspense fallback={<FullPageSpinner />}>
      <DashboardPage />
    </Suspense>
  ),
});

// ── Settings (dialog-as-route) ──
// /settings is a "modal route": the SettingsDialog (mounted in DashboardLayout)
// reads the URL and shows the matching section. Each leaf route renders null so
// the dashboard chrome stays in place behind the dialog backdrop.
const settingsLayoutRoute = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: 'settings',
  component: () => null,
});

const settingsIndexRoute = createRoute({
  getParentRoute: () => settingsLayoutRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/settings/profile' });
  },
  component: () => null,
});

const settingsProfileRoute = createRoute({
  getParentRoute: () => settingsLayoutRoute,
  path: 'profile',
  component: () => null,
});

const settingsAccountRoute = createRoute({
  getParentRoute: () => settingsLayoutRoute,
  path: 'account',
  component: () => null,
});

const settingsSecurityRoute = createRoute({
  getParentRoute: () => settingsLayoutRoute,
  path: 'security',
  component: () => null,
});

const settingsAppearanceRoute = createRoute({
  getParentRoute: () => settingsLayoutRoute,
  path: 'appearance',
  component: () => null,
});

const settingsNotificationsRoute = createRoute({
  getParentRoute: () => settingsLayoutRoute,
  path: 'notifications',
  component: () => null,
});

const settingsOrgGeneralRoute = createRoute({
  getParentRoute: () => settingsLayoutRoute,
  path: 'organization',
  component: () => null,
});

// ── 404 ──
const notFoundRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '$',
  component: () => <Lazy C={NotFoundPage} />,
});

// ── Tree ──
export const routeTree = rootRoute.addChildren([
  loginRoute,
  registerRoute,
  forgotPasswordRoute,
  resetPasswordRoute,
  verifyEmailRoute,
  mfaRoute,
  authCallbackRoute,
  onboardingRoute,
  acceptInviteRoute,
  unauthorizedRoute,
  dashboardLayoutRoute.addChildren([
    dashboardIndexRoute,
    settingsLayoutRoute.addChildren([
      settingsIndexRoute,
      settingsProfileRoute,
      settingsAccountRoute,
      settingsSecurityRoute,
      settingsAppearanceRoute,
      settingsNotificationsRoute,
      settingsOrgGeneralRoute,
    ]),
  ]),
  notFoundRoute,
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
