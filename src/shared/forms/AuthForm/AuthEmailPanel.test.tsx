import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

const { emailVerificationCodeSend, emailLogin, establishSession } = vi.hoisted(() => ({
  emailVerificationCodeSend: vi.fn().mockResolvedValue({}),
  emailLogin: vi.fn().mockResolvedValue({ accessToken: 'mock-token' }),
  establishSession: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/shared/auth/captcha/useTurnstileReady/index.ts', () => ({
  useTurnstileReady: () => true,
}));

vi.mock('@/shared/api/auth-api.ts', () => ({
  authApi: {
    emailVerificationCodeSend,
    emailLogin,
  },
  // Real class so the verify-error path's `err instanceof MfaRequiredError`
  // check is evaluable (the panel imports it from this module).
  MfaRequiredError: class MfaRequiredError extends Error {
    mfaSessionToken = 'mock-mfa-token';
  },
}));

vi.mock('@/shared/auth/service.ts', () => ({
  establishSession,
}));

vi.mock('@/core/http/queryClient.ts', () => ({
  queryClient: {
    getQueryData: vi.fn(() => ({
      user: {
        id: 'usr_1',
        email: 'user@example.com',
        isEmailVerified: true,
        isMfaEnabled: false,
        firstName: null,
        lastName: null,
        avatarUrl: null,
        status: 'ACTIVE',
        createdAt: 't',
        updatedAt: 't',
      },
      activeOrganization: null,
      myPermissions: [],
      globalRole: null,
      organizations: [],
      deploymentFlags: { personalOrganizations: true, teamOrganizations: true },
      personalOrganizationId: null,
    })),
  },
}));

import { queryClient } from '@/core/http/queryClient.ts';

import { AuthEmailPanel } from './AuthEmailPanel.tsx';

function createTestRouter() {
  const rootRoute = createRootRoute({ component: () => <Outlet /> });
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <AuthEmailPanel />,
  });
  const tree = rootRoute.addChildren([indexRoute]);
  const history = createMemoryHistory({ initialEntries: ['/'] });
  return createRouter({ routeTree: tree, history });
}

/**
 * Router with the post-login destination routes mounted, so a successful verify
 * can navigate to a real target and we can assert the landing pathname. Each
 * destination renders a marker island (no `/login` chrome) so a bounce back
 * through the login screen would be observable.
 */
function createDestinationRouter(initialEntry = '/login') {
  const rootRoute = createRootRoute({ component: () => <Outlet /> });
  const loginRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/login',
    component: () => <AuthEmailPanel />,
  });
  const dashboardRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/dashboard',
    component: () => <div data-testid="dest-dashboard" />,
  });
  const onboardingRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/onboarding',
    component: () => <div data-testid="dest-onboarding" />,
  });
  const orgDashboardRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/organization/$organizationSlug/dashboard',
    component: () => <div data-testid="dest-org-dashboard" />,
  });
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => null,
  });
  const tree = rootRoute.addChildren([
    indexRoute,
    loginRoute,
    dashboardRoute,
    onboardingRoute,
    orgDashboardRoute,
  ]);
  return createRouter({
    routeTree: tree,
    history: createMemoryHistory({ initialEntries: [initialEntry] }),
  });
}

const TS = '2026-01-01T00:00:00.000Z';

async function verifyWith(router: ReturnType<typeof createDestinationRouter>) {
  const user = userEvent.setup();
  render(<RouterProvider router={router} />);
  await user.type(await screen.findByTestId('auth-email'), 'user@example.com');
  await user.click(screen.getByTestId('auth-email-submit'));
  await screen.findByTestId('auth-email-verify-panel');
  await user.type(await screen.findByTestId('auth-email-code'), '123456');
}

describe('AuthEmailPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('advances to the verification step after sending a code', async () => {
    const user = userEvent.setup();
    const router = createTestRouter();
    render(<RouterProvider router={router} />);

    await user.type(await screen.findByTestId('auth-email'), 'user@example.com');
    await user.click(screen.getByTestId('auth-email-submit'));

    await waitFor(() =>
      expect(emailVerificationCodeSend).toHaveBeenCalledWith('user@example.com'),
    );
    expect(await screen.findByTestId('auth-email-verify-panel')).toBeInTheDocument();
    expect(screen.getByTestId('auth-email-code')).toBeInTheDocument();
  });

  it('prefills the verify code when the response echoes debug_verification_code', async () => {
    emailVerificationCodeSend.mockResolvedValueOnce({
      debug_verification_code: '135790',
    });
    const user = userEvent.setup();
    const router = createTestRouter();
    render(<RouterProvider router={router} />);

    await user.type(await screen.findByTestId('auth-email'), 'user@example.com');
    await user.click(screen.getByTestId('auth-email-submit'));

    await screen.findByTestId('auth-email-verify-panel');
    expect(await screen.findByTestId('auth-email-code')).toHaveValue('135790');
  });

  it('leaves the verify code empty when no debug code is echoed', async () => {
    emailVerificationCodeSend.mockResolvedValueOnce({});
    const user = userEvent.setup();
    const router = createTestRouter();
    render(<RouterProvider router={router} />);

    await user.type(await screen.findByTestId('auth-email'), 'user@example.com');
    await user.click(screen.getByTestId('auth-email-submit'));

    await screen.findByTestId('auth-email-verify-panel');
    expect(await screen.findByTestId('auth-email-code')).toHaveValue('');
  });

  it('verifies the code and establishes a session', async () => {
    const user = userEvent.setup();
    const router = createTestRouter();
    render(<RouterProvider router={router} />);

    await user.type(await screen.findByTestId('auth-email'), 'user@example.com');
    await user.click(screen.getByTestId('auth-email-submit'));
    await screen.findByTestId('auth-email-verify-panel');

    const codeInput = await screen.findByTestId('auth-email-code');
    await user.type(codeInput, '123456');

    await waitFor(() =>
      expect(emailLogin).toHaveBeenCalledWith({
        email: 'user@example.com',
        code: '123456',
      }),
    );
    expect(establishSession).toHaveBeenCalledWith('mock-token');
  });

  // Regression: a returning user with an active team org must land DIRECTLY on
  // that org's dashboard — not bounce through the `/` resolver, which re-fetches
  // me/context and keeps `/login` mounted for the round-trip (flash of login).
  it('navigates straight to the active org dashboard, not through `/`', async () => {
    vi.mocked(queryClient.getQueryData).mockReturnValueOnce({
      user: {
        id: 'usr_1',
        email: 'user@example.com',
        isEmailVerified: true,
        isMfaEnabled: false,
        firstName: null,
        lastName: null,
        avatarUrl: null,
        status: 'ACTIVE',
        onboardingCompleted: true,
        createdAt: TS,
        updatedAt: TS,
      },
      activeOrganization: {
        id: 'org_abcdefghij0123456789x',
        name: 'Acme',
        slug: 'acme',
        type: 'TEAM',
        status: 'ACTIVE',
        logoUrl: null,
        createdAt: TS,
        updatedAt: TS,
      },
      myPermissions: [],
      globalRole: null,
      organizations: [],
      deploymentFlags: { personalOrganizations: true, teamOrganizations: true },
      personalOrganizationId: null,
    });
    const router = createDestinationRouter();

    await verifyWith(router);

    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/organization/acme/dashboard'),
    );
    expect(screen.queryByTestId('auth-email-verify-panel')).not.toBeInTheDocument();
  });

  // Regression: a fresh signup (no active org, no memberships) lands on
  // onboarding directly.
  it('navigates a fresh signup straight to onboarding', async () => {
    vi.mocked(queryClient.getQueryData).mockReturnValueOnce({
      user: {
        id: 'usr_1',
        email: 'user@example.com',
        isEmailVerified: true,
        isMfaEnabled: false,
        firstName: null,
        lastName: null,
        avatarUrl: null,
        status: 'ACTIVE',
        createdAt: TS,
        updatedAt: TS,
      },
      activeOrganization: null,
      myPermissions: [],
      globalRole: null,
      organizations: [],
      deploymentFlags: { personalOrganizations: true, teamOrganizations: true },
      personalOrganizationId: null,
    });
    const router = createDestinationRouter();

    await verifyWith(router);

    await waitFor(() => expect(router.state.location.pathname).toBe('/onboarding'));
  });

  // A deep link saved by requireAuth (?redirect=) must survive the onboarding
  // hop — the wizard forwards it and returns the user there after finishing.
  it('forwards the saved deep link onto /onboarding for a fresh signup', async () => {
    vi.mocked(queryClient.getQueryData).mockReturnValueOnce({
      user: {
        id: 'usr_1',
        email: 'user@example.com',
        isEmailVerified: true,
        isMfaEnabled: false,
        firstName: null,
        lastName: null,
        avatarUrl: null,
        status: 'ACTIVE',
        createdAt: TS,
        updatedAt: TS,
      },
      activeOrganization: null,
      myPermissions: [],
      globalRole: null,
      organizations: [],
      deploymentFlags: { personalOrganizations: true, teamOrganizations: true },
      personalOrganizationId: null,
    });
    const router = createDestinationRouter(
      '/login?redirect=%2Forganization%2Facme%2Fsettings',
    );

    await verifyWith(router);

    await waitFor(() => expect(router.state.location.pathname).toBe('/onboarding'));
    expect(router.state.location.search).toEqual({
      redirect: '/organization/acme/settings',
    });
  });

  it('shows inline resend and change-email helpers on the verify step', async () => {
    const user = userEvent.setup();
    const router = createTestRouter();
    render(<RouterProvider router={router} />);

    await user.type(await screen.findByTestId('auth-email'), 'user@example.com');
    await user.click(screen.getByTestId('auth-email-submit'));
    await screen.findByTestId('auth-email-verify-panel');

    expect(screen.getByText(/didn't receive a code/i)).toBeInTheDocument();
    expect(screen.getByTestId('auth-email-resend-countdown')).toHaveTextContent(/2:0/);
    expect(screen.getByText(/wrong email/i)).toBeInTheDocument();
    expect(screen.getByTestId('auth-email-change')).toHaveTextContent(
      /change email address/i,
    );
    expect(screen.queryByText(/use a different email/i)).not.toBeInTheDocument();
  });

  it('returns to the email step and clears any error when changing email', async () => {
    emailVerificationCodeSend.mockRejectedValueOnce(new Error('Send failed'));
    const user = userEvent.setup();
    const router = createTestRouter();
    render(<RouterProvider router={router} />);

    // First send fails → banner shows on the email step.
    await user.type(await screen.findByTestId('auth-email'), 'user@example.com');
    await user.click(screen.getByTestId('auth-email-submit'));
    expect(await screen.findByTestId('auth-email-error-banner')).toBeInTheDocument();

    // A successful resend advances to verify, then change-email returns to the
    // email step with the error cleared.
    await user.click(screen.getByTestId('auth-email-submit'));
    await screen.findByTestId('auth-email-verify-panel');
    await user.click(screen.getByTestId('auth-email-change'));

    expect(await screen.findByTestId('auth-email-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('auth-email-error-banner')).not.toBeInTheDocument();
  });

  it('notifies the parent when the step changes', async () => {
    const onStepChange = vi.fn();
    const user = userEvent.setup();
    const rootRoute = createRootRoute({ component: () => <Outlet /> });
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
      component: () => <AuthEmailPanel onStepChange={onStepChange} />,
    });
    const router = createRouter({
      routeTree: rootRoute.addChildren([indexRoute]),
      history: createMemoryHistory({ initialEntries: ['/'] }),
    });
    render(<RouterProvider router={router} />);

    await waitFor(() => expect(onStepChange).toHaveBeenCalledWith('email', undefined));

    await user.type(await screen.findByTestId('auth-email'), 'user@example.com');
    await user.click(screen.getByTestId('auth-email-submit'));

    await waitFor(() =>
      expect(onStepChange).toHaveBeenCalledWith('verify', 'user@example.com'),
    );
  });

  // Regression: a failed send-code must surface a VISIBLE error. Toasts fired
  // from the async catch can be dropped by sonner (created into history but
  // never made active), so the inline banner is the reliable feedback surface.
  // Without it the user pressed Continue and saw nothing.
  it('surfaces an inline error banner when sending the code fails', async () => {
    emailVerificationCodeSend.mockRejectedValueOnce(new Error('Network error'));
    const user = userEvent.setup();
    const router = createTestRouter();
    render(<RouterProvider router={router} />);

    await user.type(await screen.findByTestId('auth-email'), 'user@example.com');
    await user.click(screen.getByTestId('auth-email-submit'));

    const banner = await screen.findByTestId('auth-email-error-banner');
    expect(banner).toHaveTextContent(/network error/i);
    expect(banner).toHaveAttribute('role', 'alert');
    // Stays on the email step (never advanced to verify).
    expect(screen.queryByTestId('auth-email-verify-panel')).not.toBeInTheDocument();
  });

  // Regression: a failed verify (wrong/expired code, backend error) must surface
  // a visible inline error on the verify step, not rely on a toast alone.
  it('surfaces an inline error banner when verifying the code fails', async () => {
    emailLogin.mockRejectedValueOnce(new Error('Bad code'));
    const user = userEvent.setup();
    const router = createTestRouter();
    render(<RouterProvider router={router} />);

    await user.type(await screen.findByTestId('auth-email'), 'user@example.com');
    await user.click(screen.getByTestId('auth-email-submit'));
    await screen.findByTestId('auth-email-verify-panel');
    await user.type(await screen.findByTestId('auth-email-code'), '123456');

    const banner = await screen.findByTestId('auth-email-error-banner');
    expect(banner).toHaveTextContent(/bad code/i);
    expect(banner).toHaveAttribute('role', 'alert');
  });

  it('has no accessibility violations on the email step', async () => {
    const router = createTestRouter();
    const { container } = render(<RouterProvider router={router} />);
    await screen.findByTestId('auth-email-panel');
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
