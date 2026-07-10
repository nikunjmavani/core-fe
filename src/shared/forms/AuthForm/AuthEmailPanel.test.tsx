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
  emailVerificationCodeSend: vi.fn().mockResolvedValue(undefined),
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
function createDestinationRouter() {
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
    history: createMemoryHistory({ initialEntries: ['/login'] }),
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

  it('has no accessibility violations on the email step', async () => {
    const router = createTestRouter();
    const { container } = render(<RouterProvider router={router} />);
    await screen.findByTestId('auth-email-panel');
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
