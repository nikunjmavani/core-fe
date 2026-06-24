import {
  createRootRoute,
  createRoute,
  createRouter,
  HeadContent,
  lazyRouteComponent,
  notFound,
  Outlet,
  redirect,
} from '@tanstack/react-router';
import { Suspense } from 'react';
import { Toaster } from 'sonner';

import { requireOrgStatus, resolveActiveOrg } from '@/app/guards/org-gates.ts';
import { redirectIfAuthenticated, requireAuth } from '@/core/rbac/guards.ts';
import { APP_TITLE, composePageTitle, manifestHead } from '@/lib/routes/page-head.ts';
import { parseInvitationIdParam } from '@/lib/routes/params.ts';
import { manifest as acceptInviteManifest } from '@/pages/accept-invite/accept-invite.manifest.ts';
import { manifest as callbackManifest } from '@/pages/callback/callback.manifest.ts';
import { manifest as forgotPasswordManifest } from '@/pages/forgot-password/forgot-password.manifest.ts';
import { manifest as loginManifest } from '@/pages/login/login.manifest.ts';
import { manifest as mfaManifest } from '@/pages/mfa/mfa.manifest.ts';
import { manifest as onboardingManifest } from '@/pages/onboarding/onboarding.manifest.ts';
import { manifest as dashboardManifest } from '@/pages/organization/$organizationId/dashboard/dashboard.manifest.ts';
import { manifest as organizationShellManifest } from '@/pages/organization/$organizationId/organization-id.manifest.ts';
import { manifest as suspendedManifest } from '@/pages/organization/$organizationId/suspended/suspended.manifest.ts';
import { manifest as organizationPickerManifest } from '@/pages/organization/organization.manifest.ts';
import { manifest as registerManifest } from '@/pages/register/register.manifest.ts';
import { manifest as resetPasswordManifest } from '@/pages/reset-password/reset-password.manifest.ts';
import { manifest as verifyEmailManifest } from '@/pages/verify-email/verify-email.manifest.ts';
import { ConsentBanner } from '@/shared/components/ConsentBanner/index.ts';
import { FullPageSpinner } from '@/shared/components/FullPageSpinner/index.ts';
import { OfflineIndicator } from '@/shared/components/OfflineIndicator/index.ts';
import { RouteAnnouncer } from '@/shared/components/RouteAnnouncer/index.ts';
import { RouteErrorBoundary } from '@/shared/components/RouteErrorBoundary/index.ts';
import { SettingsModalLazy } from '@/shared/components/SettingsModal/index.ts';
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
// Personal-org space reuses the shared AppShell directly (no org param in URL).
const PersonalShell = lazyRouteComponent(
  () => import('@/shared/layouts/AppShell/index.ts'),
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
      { title: APP_TITLE },
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
      <SettingsModalLazy />
      <OfflineIndicator />
      {/* aria-live announcer: reads the new document.title on navigation. */}
      <RouteAnnouncer />
      {/* Cookie-consent gate for analytics (PostHog). */}
      <ConsentBanner />
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
  // Guest-only gateway (FE-18): a signed-in user never sees any auth page —
  // one redirect here covers every child (login, register, reset, mfa, …).
  beforeLoad: () => redirectIfAuthenticated(),
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
  head: manifestHead(loginManifest),
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
  head: manifestHead(registerManifest),
  // `redirect` = returnTo when a deep link routes a guest here (FE-59).
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
  component: RegisterPage,
  errorComponent: RouteErrorBoundary,
});

const forgotPasswordRoute = createRoute({
  getParentRoute: () => authShellRoute,
  path: '/forgot-password',
  head: manifestHead(forgotPasswordManifest),
  component: ForgotPasswordPage,
  errorComponent: RouteErrorBoundary,
});

const resetPasswordRoute = createRoute({
  getParentRoute: () => authShellRoute,
  path: '/reset-password',
  head: manifestHead(resetPasswordManifest),
  component: ResetPasswordPage,
  errorComponent: RouteErrorBoundary,
});

const verifyEmailRoute = createRoute({
  getParentRoute: () => authShellRoute,
  path: '/verify-email',
  head: manifestHead(verifyEmailManifest),
  component: VerifyEmailPage,
  errorComponent: RouteErrorBoundary,
});

const mfaRoute = createRoute({
  getParentRoute: () => authShellRoute,
  path: '/mfa',
  head: manifestHead(mfaManifest),
  component: MfaPage,
  errorComponent: RouteErrorBoundary,
});

// One provider-agnostic OAuth / magic-link return URL for all third parties —
// the backend brokers each provider's dance and lands every flow on /callback.
// Outside the auth shell: it renders a bare spinner, not the split-screen form.
const callbackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/callback',
  head: manifestHead(callbackManifest),
  component: CallbackPage,
  errorComponent: RouteErrorBoundary,
});

const onboardingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/onboarding',
  head: manifestHead(onboardingManifest),
  beforeLoad: ({ location }) => requireAuth(location.href),
  component: OnboardingPage,
  errorComponent: RouteErrorBoundary,
});

const acceptInviteRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/accept-invite/$invitationId',
  head: manifestHead(acceptInviteManifest),
  beforeLoad: ({ params }) => {
    if (!parseInvitationIdParam(params.invitationId)) throw notFound();
  },
  component: AcceptInvitePage,
  errorComponent: RouteErrorBoundary,
});

const unauthorizedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/unauthorized',
  head: () => ({ meta: [{ title: composePageTitle('Unauthorized') }] }),
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
  head: manifestHead(organizationPickerManifest),
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
  head: manifestHead(organizationShellManifest),
  beforeLoad: async ({ location, params, preload }) => {
    requireAuth(location.href);
    // Context sync mutates the organization store and fetches permissions —
    // never run it for a hover preload (the chunk still preloads). With
    // defaultPreloadStaleTime: 0 the guard re-runs on real navigation.
    if (preload) return;
    await resolveActiveOrg({ params });
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
  head: manifestHead(dashboardManifest),
  beforeLoad: ({ params, preload }) => {
    if (preload) return;
    requireOrgStatus({ params });
  },
  component: DashboardPage,
  errorComponent: RouteErrorBoundary,
});

// Outside the status gate on purpose: a suspended organization must still be
// able to render its blocked state without redirect-looping.
const organizationSuspendedRoute = createRoute({
  getParentRoute: () => organizationShellRoute,
  path: 'suspended',
  head: manifestHead(suspendedManifest),
  component: SuspendedPage,
  errorComponent: RouteErrorBoundary,
});

// ── Personal space (/dashboard) ──
// Personal organizations land on root URLs — no `$organizationId` in the path.
// The active org comes from the session context (me/context / JWT), not the URL,
// so this shell only requires an authenticated session. (Dual-URL, research/11
// §3.3.) The org-scoped team space remains `/organization/$organizationId/*`.
const personalShellRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'personal-app',
  beforeLoad: ({ location, preload }) => {
    if (preload) return;
    requireAuth(location.href);
  },
  component: function PersonalShellRoute() {
    return (
      <Suspense fallback={<FullPageSpinner />}>
        <PersonalShell />
      </Suspense>
    );
  },
  errorComponent: RouteErrorBoundary,
});

const personalDashboardRoute = createRoute({
  getParentRoute: () => personalShellRoute,
  path: '/dashboard',
  head: () => ({ meta: [{ title: composePageTitle('Dashboard') }] }),
  component: DashboardPage,
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
  head: () => ({ meta: [{ title: composePageTitle('Page not found') }] }),
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
  personalShellRoute.addChildren([personalDashboardRoute]),
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
