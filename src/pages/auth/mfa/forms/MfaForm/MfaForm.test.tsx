import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

import { MfaForm } from './MfaForm.tsx';

vi.mock('../../../auth.api.ts', () => ({
  authApi: {
    mfaVerify: vi.fn().mockResolvedValue({ accessToken: 'token' }),
    me: vi.fn().mockResolvedValue({
      id: '1',
      email: 'u@e.com',
      role: 'admin',
      tenantId: 't1',
    }),
  },
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
  const tree = rootRoute.addChildren([mfaRoute]);
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
});
