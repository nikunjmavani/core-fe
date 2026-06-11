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
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

import { ResetPasswordForm } from './ResetPasswordForm.tsx';

vi.mock('../../../auth.api.ts', () => ({
  authApi: {
    resetPassword: vi.fn().mockResolvedValue(undefined),
  },
}));

function createTestRouter(initialEntry: string) {
  const rootRoute = createRootRoute({ component: () => <Outlet /> });
  const resetPasswordRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/reset-password',
    component: () => <ResetPasswordForm />,
  });
  const tree = rootRoute.addChildren([resetPasswordRoute]);
  const history = createMemoryHistory({ initialEntries: [initialEntry] });
  return createRouter({ routeTree: tree, history });
}

function renderWithRouter(initialEntry: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const router = createTestRouter(initialEntry);
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe('ResetPasswordForm', () => {
  it('renders invalid link message when no token', async () => {
    renderWithRouter('/reset-password');
    expect(await screen.findByText(/invalid link/i)).toBeInTheDocument();
  });

  it('has no accessibility violations when no token', async () => {
    const { container } = renderWithRouter('/reset-password');
    await screen.findByText(/invalid link/i);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('renders form when token is present', async () => {
    renderWithRouter('/reset-password?token=test-token-123');
    expect(await screen.findByTestId('reset-password-form')).toBeInTheDocument();
    expect(screen.getByTestId('reset-password-password')).toBeInTheDocument();
    expect(screen.getByTestId('reset-password-submit')).toBeInTheDocument();
  });

  it('has no accessibility violations when form shown', async () => {
    const { container } = renderWithRouter('/reset-password?token=test-token-123');
    await screen.findByTestId('reset-password-form');
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
