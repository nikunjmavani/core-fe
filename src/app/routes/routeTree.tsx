import {
  createRootRoute,
  createRoute,
  createRouter,
  HeadContent,
  lazyRouteComponent,
  Outlet,
  redirect,
} from '@tanstack/react-router';
import { Suspense } from 'react';
import { Toaster } from 'sonner';

import {
  requireActiveOrganization,
  requireOrganizationContext,
} from '@/app/guards/route-guards.ts';
import { requireAuth } from '@/core/rbac/guards.ts';
import { FullPageSpinner } from '@/shared/components/FullPageSpinner/index.ts';
import { OfflineIndicator } from '@/shared/components/OfflineIndicator/index.ts';
import { RouteErrorBoundary } from '@/shared/components/RouteErrorBoundary/index.ts';
import { SettingsModal } from '@/shared/components/SettingsModal/index.ts';
import { useAuthStore } from '@/shared/store/useAuthStore/index.ts';
import { resolveRootRedirect } from '@/shared/tenancy/organization-resolver.ts';

import { ErrorBoundary } from './ErrorBoundary.tsx';

// ── Lazy components ──
// lazyRouteComponent (not React.lazy): the router can call `.preload()` on
// these, which is what makes `defaultPreload: 'intent'` actually fetch the
// island's chunk on hover/touch. Suspension is handled by the router's
// defaultPendingComponent.
const AuthLayout = lazyRouteComponent(
  () => import('@/shared/layouts/AuthLayout/index.ts'),
  'AuthLayout',
);
const LoginPage = lazyRouteComponent(
  () => import('@/pages/login/login.route.tsx'),
  'Component',
);
const RegisterPage = lazyRouteComponent(
  () => import('@/pages/register/register.route.tsx'),
  'Component',
);
const ForgotPasswordPage = lazyRouteComponent(
  () => import('@/pages/forgot-password/forgot-password.route.tsx'),
  'Component',
);
const ResetPasswordPage = lazyRouteComponent(
  () => import('@/pages/reset-password/reset-password.route.tsx'),
  'Component',
);
const VerifyEmailPage = lazyRouteComponent(
  () => import('@/pages/verify-email/verify-email.route.tsx'),
  'Component',
);
const MfaPage = lazyRouteComponent(
  () => import('@/pages/mfa/mfa.route.tsx'),
  'Component',
);
const CallbackPage = lazyRouteComponent(
  () => import('@/pages/callback/callback.route.tsx'),
  'Component',
);
const OnboardingPage = lazyRouteComponent(
  () => import('@/pages/onboarding/onboarding.route.tsx'),
  'Component',
);
const AcceptInvitePage = lazyRouteComponent(
  () => import('@/pages/accept-invite/accept-invite.route.tsx'),
  'Component',
);
const UnauthorizedPage = lazyRouteComponent(
  () => import('@/app/routes/UnauthorizedPage.tsx'),
  'Component',
);
const OrganizationPickerPage = lazyRouteComponent(
  () => import('@/pages/organization/organization.route.tsx'),
  'Component',
);
const OrganizationShell = lazyRouteComponent(
  () => import('@/pages/organization/$organizationId/organization-id.route.tsx'),
  'Component',
);
const DashboardPage = lazyRouteComponent(
  () => import('@/pages/organization/$organizationId/dashboard/dashboard.route.tsx'),
  'Component',
);
const SuspendedPage = lazyRouteComponent(
  () => import('@/pages/organization/$organizationId/suspended/suspended.route.tsx'),
  'Component',
);
const NotFoundPage = lazyRouteComponent(
  () => import('@/app/routes/NotFoundPage.tsx'),
  'Component',
);

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
      <OfflineIndicator />
      <Toaster richColors closeButton position="top-right" />
    </>
  ),
  notFoundComponent: () => <NotFoundPage />,
  errorComponent: ({ error }) => <ErrorBoundary error={error} />,
});

// ── Auth shell ──
// Pathless layout route (`id`, not `path`): mounts the split-screen AuthLayout
// once over every auth page; the pages keep their top-level URLs (/login, …).
// AuthLayout is rendered inside a custom component (it wraps Outlet), so it
// keeps a local Suspense boundary — the router only manages route components.
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
  errorComponent: RouteErrorBoundary,
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
  component: LoginPage,
  errorComponent: RouteErrorBoundary,
});

const registerRoute = createRoute({
  getParentRoute: () => authShellRoute,
  path: '/register',
  component: RegisterPage,
  errorComponent: RouteErrorBoundary,
});

const forgotPasswordRoute = createRoute({
  getParentRoute: () => authShellRoute,
  path: '/forgot-password',
  component: ForgotPasswordPage,
  errorComponent: RouteErrorBoundary,
});

const resetPasswordRoute = createRoute({
  getParentRoute: () => authShellRoute,
  path: '/reset-password',
  component: ResetPasswordPage,
  errorComponent: RouteErrorBoundary,
});

const verifyEmailRoute = createRoute({
  getParentRoute: () => authShellRoute,
  path: '/verify-email',
  component: VerifyEmailPage,
  errorComponent: RouteErrorBoundary,
});

const mfaRoute = createRoute({
  getParentRoute: () => authShellRoute,
  path: '/mfa',
  component: MfaPage,
  errorComponent: RouteErrorBoundary,
});

// One provider-agnostic OAuth / magic-link return URL for all third parties —
// the backend brokers each provider's dance and lands every flow on /callback.
// Outside the auth shell: it renders a bare spinner, not the split-screen form.
const callbackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/callback',
  component: CallbackPage,
  errorComponent: RouteErrorBoundary,
});

const onboardingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/onboarding',
  beforeLoad: ({ location }) => requireAuth(location.href),
  component: OnboardingPage,
  errorComponent: RouteErrorBoundary,
});

const acceptInviteRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/accept-invite/$invitationId',
  component: AcceptInvitePage,
  errorComponent: RouteErrorBoundary,
});

const unauthorizedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/unauthorized',
  component: UnauthorizedPage,
  errorComponent: RouteErrorBoundary,
});

// ── Index resolver ──
// `/` keeps no UI: last-used organization → its dashboard, else the
// `/organization` picker, else onboarding (routing-and-tenancy.md §2).
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: async ({ location, preload }) => {
    // Resolving `/` triggers fetches and always throws a redirect — pointless
    // (and side-effectful) for hover preloads.
    if (preload) return;
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
  component: OrganizationPickerPage,
  errorComponent: RouteErrorBoundary,
});

// ── Organization shell (/organization/$organizationId) ──
// The URL is the single source of truth for organization context: the guard
// chain validates the param, confirms membership (404 otherwise), syncs the
// derived store, and refetches per-organization permissions on change.
const organizationShellRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/organization/$organizationId',
  beforeLoad: async ({ location, params, preload }) => {
    requireAuth(location.href);
    // Context sync mutates the organization store and fetches permissions —
    // never run it for a hover preload (the chunk still preloads). With
    // defaultPreloadStaleTime: 0 the guard re-runs on real navigation.
    if (preload) return;
    await requireOrganizationContext(params.organizationId);
  },
  component: function OrganizationShellRoute() {
    const isLoading = useAuthStore((s) => s.isLoading);
    if (isLoading) return <FullPageSpinner />;
    return (
      <Suspense fallback={<FullPageSpinner />}>
        <OrganizationShell />
      </Suspense>
    );
  },
  errorComponent: RouteErrorBoundary,
});

const organizationDashboardRoute = createRoute({
  getParentRoute: () => organizationShellRoute,
  path: 'dashboard',
  beforeLoad: ({ params, preload }) => {
    if (preload) return;
    requireActiveOrganization(params.organizationId);
  },
  component: DashboardPage,
  errorComponent: RouteErrorBoundary,
});

// Outside the status gate on purpose: a suspended organization must still be
// able to render its blocked state without redirect-looping.
const organizationSuspendedRoute = createRoute({
  getParentRoute: () => organizationShellRoute,
  path: 'suspended',
  component: SuspendedPage,
  errorComponent: RouteErrorBoundary,
});

// Settings is no longer a route space: the global SettingsModal (mounted on
// the root route) is driven by the URL hash — #settings/<scope>/<section> —
// so it overlays any page without unmounting it. See
// shared/components/SettingsModal/ and routing-and-tenancy.md §7.

// ── 404 ──
const notFoundRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '$',
  component: NotFoundPage,
  errorComponent: RouteErrorBoundary,
});

// ── Tree ──
const routeTree = rootRoute.addChildren([
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

export const router = createRouter({
  routeTree,
  // Preload the destination island's chunk (and pure loaders) on hover/touch.
  defaultPreload: 'intent',
  // Preloaded guard results are immediately stale: beforeLoad re-runs on the
  // real navigation, so the side-effectful guard chain (org context sync,
  // permission refetch) is never satisfied by a hover.
  defaultPreloadStaleTime: 0,
  defaultPendingComponent: () => <FullPageSpinner />,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
