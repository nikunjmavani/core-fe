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

import {
  requireActiveOrganization,
  requireOrganizationContext,
} from '@/app/guards/route-guards.ts';
import { requireAuth } from '@/core/rbac/guards.ts';
import { FullPageSpinner } from '@/shared/components/FullPageSpinner/index.ts';
import { SettingsModal } from '@/shared/components/SettingsModal/index.ts';
import { useAuthStore } from '@/shared/store/useAuthStore/index.ts';
import { resolveRootRedirect } from '@/shared/tenancy/organization-resolver.ts';

import { ErrorBoundary } from './ErrorBoundary.tsx';

// ── Lazy components ──
const AuthLayout = lazy(() =>
  import('@/shared/layouts/AuthLayout/index.ts').then((m) => ({
    default: m.AuthLayout,
  })),
);
const LoginPage = lazy(() =>
  import('@/pages/login/login.route.tsx').then((m) => ({ default: m.Component })),
);
const RegisterPage = lazy(() =>
  import('@/pages/register/register.route.tsx').then((m) => ({
    default: m.Component,
  })),
);
const ForgotPasswordPage = lazy(() =>
  import('@/pages/forgot-password/forgot-password.route.tsx').then((m) => ({
    default: m.Component,
  })),
);
const ResetPasswordPage = lazy(() =>
  import('@/pages/reset-password/reset-password.route.tsx').then((m) => ({
    default: m.Component,
  })),
);
const VerifyEmailPage = lazy(() =>
  import('@/pages/verify-email/verify-email.route.tsx').then((m) => ({
    default: m.Component,
  })),
);
const MfaPage = lazy(() =>
  import('@/pages/mfa/mfa.route.tsx').then((m) => ({ default: m.Component })),
);
const CallbackPage = lazy(() =>
  import('@/pages/callback/callback.route.tsx').then((m) => ({
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
const OrganizationPickerPage = lazy(() =>
  import('@/pages/organization/organization.route.tsx').then((m) => ({
    default: m.Component,
  })),
);
const OrganizationShell = lazy(() =>
  import('@/pages/organization/$organizationId/organization-id.route.tsx').then((m) => ({
    default: m.Component,
  })),
);
const DashboardPage = lazy(() =>
  import('@/pages/organization/$organizationId/dashboard/dashboard.route.tsx').then(
    (m) => ({ default: m.Component }),
  ),
);
const SuspendedPage = lazy(() =>
  import('@/pages/organization/$organizationId/suspended/suspended.route.tsx').then(
    (m) => ({ default: m.Component }),
  ),
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
      {/* Global hash-driven settings modal — overlays any page (#settings/…). */}
      <SettingsModal />
      <Toaster richColors closeButton position="top-right" />
    </>
  ),
  notFoundComponent: () => <Lazy C={NotFoundPage} />,
  errorComponent: ({ error }) => <ErrorBoundary error={error} />,
});

// ── Auth shell ──
// Pathless layout route (`id`, not `path`): mounts the split-screen AuthLayout
// once over every auth page; the pages keep their top-level URLs (/login, …).
const authShellRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'auth-shell',
  component: () => (
    <Suspense fallback={<FullPageSpinner />}>
      <AuthLayout>
        <Outlet />
      </AuthLayout>
    </Suspense>
  ),
});

// ── Public ──
const loginRoute = createRoute({
  getParentRoute: () => authShellRoute,
  path: '/login',
  // `redirect` = post-login return path, set by requireAuth (validated in
  // LoginForm). Optional return type keeps `search` optional for plain links.
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
  component: () => <Lazy C={LoginPage} />,
});

const registerRoute = createRoute({
  getParentRoute: () => authShellRoute,
  path: '/register',
  component: () => <Lazy C={RegisterPage} />,
});

const forgotPasswordRoute = createRoute({
  getParentRoute: () => authShellRoute,
  path: '/forgot-password',
  component: () => <Lazy C={ForgotPasswordPage} />,
});

const resetPasswordRoute = createRoute({
  getParentRoute: () => authShellRoute,
  path: '/reset-password',
  component: () => <Lazy C={ResetPasswordPage} />,
});

const verifyEmailRoute = createRoute({
  getParentRoute: () => authShellRoute,
  path: '/verify-email',
  component: () => <Lazy C={VerifyEmailPage} />,
});

const mfaRoute = createRoute({
  getParentRoute: () => authShellRoute,
  path: '/mfa',
  component: () => <Lazy C={MfaPage} />,
});

// One provider-agnostic OAuth / magic-link return URL for all third parties —
// the backend brokers each provider's dance and lands every flow on /callback.
// Outside the auth shell: it renders a bare spinner, not the split-screen form.
const callbackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/callback',
  component: () => <Lazy C={CallbackPage} />,
});

const onboardingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/onboarding',
  beforeLoad: ({ location }) => requireAuth(location.href),
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

// ── Index resolver ──
// `/` keeps no UI: last-used organization → its dashboard, else the
// `/organization` picker, else onboarding (routing-and-tenancy.md §2).
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: async ({ location }) => {
    requireAuth(location.href);
    throw redirect(await resolveRootRedirect());
  },
  component: () => null,
});

// ── Organization picker (/organization) ──
const organizationPickerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/organization',
  beforeLoad: ({ location }) => requireAuth(location.href),
  component: () => <Lazy C={OrganizationPickerPage} />,
});

// ── Organization shell (/organization/$organizationId) ──
// The URL is the single source of truth for organization context: the guard
// chain validates the param, confirms membership (404 otherwise), syncs the
// derived store, and refetches per-organization permissions on change.
const organizationShellRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/organization/$organizationId',
  beforeLoad: async ({ location, params }) => {
    requireAuth(location.href);
    await requireOrganizationContext(params.organizationId);
  },
  component: function OrganizationShellRoute() {
    const isLoading = useAuthStore((s) => s.isLoading);
    if (isLoading) return <FullPageSpinner />;
    return <Lazy C={OrganizationShell} />;
  },
});

const organizationDashboardRoute = createRoute({
  getParentRoute: () => organizationShellRoute,
  path: 'dashboard',
  beforeLoad: ({ params }) => requireActiveOrganization(params.organizationId),
  component: () => <Lazy C={DashboardPage} />,
});

// Outside the status gate on purpose: a suspended organization must still be
// able to render its blocked state without redirect-looping.
const organizationSuspendedRoute = createRoute({
  getParentRoute: () => organizationShellRoute,
  path: 'suspended',
  component: () => <Lazy C={SuspendedPage} />,
});

// Settings is no longer a route space: the global SettingsModal (mounted on
// the root route) is driven by the URL hash — #settings/<scope>/<section> —
// so it overlays any page without unmounting it. See
// shared/components/SettingsModal/ and routing-and-tenancy.md §7.

// ── 404 ──
const notFoundRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '$',
  component: () => <Lazy C={NotFoundPage} />,
});

// ── Tree ──
export const routeTree = rootRoute.addChildren([
  indexRoute,
  authShellRoute.addChildren([
    loginRoute,
    registerRoute,
    forgotPasswordRoute,
    resetPasswordRoute,
    verifyEmailRoute,
    mfaRoute,
  ]),
  callbackRoute,
  onboardingRoute,
  acceptInviteRoute,
  unauthorizedRoute,
  organizationPickerRoute,
  organizationShellRoute.addChildren([
    organizationDashboardRoute,
    organizationSuspendedRoute,
  ]),
  notFoundRoute,
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
