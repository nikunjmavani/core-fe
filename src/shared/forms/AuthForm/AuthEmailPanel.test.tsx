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
