import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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

import { MfaForm } from './MfaForm.tsx';

const { mfaVerifyMock, establishSessionMock } = vi.hoisted(() => ({
  mfaVerifyMock: vi.fn().mockResolvedValue({ accessToken: 'token' }),
  establishSessionMock: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/shared/api/auth-api.ts', () => ({
  authApi: { mfaVerify: mfaVerifyMock },
}));
vi.mock('@/shared/auth/service.ts', () => ({
  establishSession: establishSessionMock,
}));

const mockUseLocation = vi.fn();
vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await (importOriginal as () => Promise<Record<string, unknown>>)();
  return {
    ...actual,
    useLocation: (...args: unknown[]) => mockUseLocation(...args),
  };
});

function createTestRouter() {
  const rootRoute = createRootRoute({ component: () => <Outlet /> });
  const mfaRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/mfa',
    component: () => <MfaForm />,
  });
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <div data-testid="home">home</div>,
  });
  const tree = rootRoute.addChildren([mfaRoute, indexRoute]);
  const history = createMemoryHistory({ initialEntries: ['/mfa'] });
  return createRouter({ routeTree: tree, history });
}

function renderWithRouter() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const router = createTestRouter();
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe('MfaForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mfaVerifyMock.mockResolvedValue({ accessToken: 'token' });
    mockUseLocation.mockReturnValue({ state: undefined });
  });

  it('renders session expired when no mfaToken in state', async () => {
    renderWithRouter();
    expect(await screen.findByText(/session expired/i)).toBeInTheDocument();
  });

  it('renders code form when mfaToken in state', async () => {
    mockUseLocation.mockReturnValue({ state: { mfaToken: 'temp-token' } });
    renderWithRouter();
    expect(await screen.findByTestId('mfa-form')).toBeInTheDocument();
    expect(screen.getByTestId('mfa-code')).toBeInTheDocument();
    expect(screen.getByTestId('mfa-submit')).toBeInTheDocument();
  });

  it('has no accessibility violations when form shown', async () => {
    mockUseLocation.mockReturnValue({ state: { mfaToken: 'temp-token' } });
    const { container } = renderWithRouter();
    await screen.findByTestId('mfa-form');
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('submits a 6-digit code as a TOTP factor and establishes the session', async () => {
    mockUseLocation.mockReturnValue({ state: { mfaToken: 'temp-token' } });
    const user = userEvent.setup();
    renderWithRouter();

    await user.type(await screen.findByTestId('mfa-code'), '123456');

    await waitFor(() =>
      expect(mfaVerifyMock).toHaveBeenCalledWith(
        { code: '123456', useRecoveryCode: false },
        'temp-token',
      ),
    );
    expect(establishSessionMock).toHaveBeenCalledWith('token');
  });

  it('toggles to a recovery code and submits it as a recovery factor', async () => {
    mockUseLocation.mockReturnValue({ state: { mfaToken: 'temp-token' } });
    const user = userEvent.setup();
    renderWithRouter();

    await user.click(await screen.findByTestId('mfa-toggle-recovery'));
    expect(screen.getByTestId('mfa-toggle-recovery')).toHaveTextContent(
      /authenticator app instead/i,
    );
    await user.type(screen.getByTestId('mfa-code'), 'abcd1234');
    await user.click(screen.getByTestId('mfa-submit'));

    await waitFor(() =>
      expect(mfaVerifyMock).toHaveBeenCalledWith(
        { code: 'abcd1234', useRecoveryCode: true },
        'temp-token',
      ),
    );
  });
});
