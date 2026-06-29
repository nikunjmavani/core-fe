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

import { signInWithPasskey } from '@/shared/auth/passkey-sign-in.ts';

import { AuthForm } from './AuthForm.tsx';

vi.mock('@/shared/auth/captcha/useTurnstileReady/index.ts', () => ({
  useTurnstileReady: () => true,
}));

vi.mock('@/core/config/auth-methods.ts', () => ({
  enabledOAuthProviders: vi.fn(() => ['google', 'github']),
}));

vi.mock('@/shared/hooks/useAuthMethods/index.ts', () => ({
  useAuthMethods: vi.fn(() => ({
    emailPassword: true,
    email: true,
    oauth: { google: true, github: true, apple: false },
    passkey: true,
    oauthAutoGoogle: false,
  })),
}));

vi.mock('@/shared/api/auth-api.ts', () => ({
  authApi: {
    oauthStart: vi.fn().mockResolvedValue('https://oauth.example/redirect'),
    emailVerificationCodeSend: vi.fn().mockResolvedValue(undefined),
    emailLogin: vi.fn().mockResolvedValue({ accessToken: 'mock-token' }),
  },
  MfaRequiredError: class MfaRequiredError extends Error {
    mfaSessionToken = '';
  },
}));

vi.mock('@/shared/auth/passkey-sign-in.ts', () => ({
  signInWithPasskey: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/shared/auth/service.ts', () => ({
  establishSession: vi.fn().mockResolvedValue(undefined),
}));

function createTestRouter() {
  const rootRoute = createRootRoute({ component: () => <Outlet /> });
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <AuthForm />,
  });
  const tree = rootRoute.addChildren([indexRoute]);
  const history = createMemoryHistory({ initialEntries: ['/'] });
  return createRouter({ routeTree: tree, history });
}

describe('AuthForm', () => {
  const renderForm = () => {
    const router = createTestRouter();
    return render(<RouterProvider router={router} />);
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens the email panel by default', async () => {
    renderForm();
    expect(await screen.findByTestId('auth-form')).toBeInTheDocument();
    expect(await screen.findByTestId('auth-email-panel')).toBeInTheDocument();
  });

  it('lists social sign-in before the email credential slot', async () => {
    renderForm();
    const social = await screen.findByTestId('auth-social-methods');
    const email = await screen.findByTestId('auth-email-panel');
    expect(
      social.compareDocumentPosition(email) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(await screen.findByTestId('auth-method-divider')).toBeInTheDocument();
  });

  it('renders OAuth and passkey continue buttons', async () => {
    renderForm();
    expect(await screen.findByTestId('auth-continue-google')).toBeInTheDocument();
    expect(await screen.findByTestId('auth-continue-github')).toBeInTheDocument();
    expect(await screen.findByTestId('auth-continue-passkey')).toBeInTheDocument();
  });

  it('hides method picker after the user submits their email', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(await screen.findByTestId('auth-email'), 'user@example.com');
    await user.click(screen.getByTestId('auth-email-submit'));

    await waitFor(() =>
      expect(screen.getByTestId('auth-form')).toHaveAttribute('data-email-verify'),
    );
    expect(screen.queryByTestId('auth-social-methods')).not.toBeInTheDocument();
    expect(screen.queryByTestId('auth-method-divider')).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Check your email' }),
    ).toBeInTheDocument();
    expect(screen.getByText('user@example.com')).toBeInTheDocument();
    expect(
      screen.queryByText(/one account for sign-in and sign-up/i),
    ).not.toBeInTheDocument();
  });

  it('disables other continue actions while email submit is in flight', async () => {
    const user = userEvent.setup();
    let resolveSend: (() => void) | undefined;
    const { authApi } = await import('@/shared/api/auth-api.ts');
    vi.mocked(authApi.emailVerificationCodeSend).mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveSend = resolve;
        }),
    );

    renderForm();
    await user.type(await screen.findByTestId('auth-email'), 'user@example.com');
    await user.click(screen.getByTestId('auth-email-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('auth-continue-google')).toBeDisabled();
      expect(screen.getByTestId('auth-continue-passkey')).toBeDisabled();
    });

    resolveSend?.();
    await waitFor(() =>
      expect(screen.getByTestId('auth-email-verify-panel')).toBeInTheDocument(),
    );
  });

  it('invokes passkey sign-in and disables other methods while loading', async () => {
    const user = userEvent.setup();
    let resolvePasskey: (() => void) | undefined;
    vi.mocked(signInWithPasskey).mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolvePasskey = resolve;
        }),
    );

    renderForm();
    await user.click(await screen.findByTestId('auth-continue-passkey'));

    await waitFor(() => {
      expect(screen.getByTestId('auth-continue-google')).toBeDisabled();
      expect(screen.getByTestId('auth-email')).toBeDisabled();
    });

    resolvePasskey?.();
    await waitFor(() => expect(signInWithPasskey).toHaveBeenCalledOnce());
  });

  it('has no accessibility violations', async () => {
    const { container } = renderForm();
    await screen.findByTestId('auth-form');
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
