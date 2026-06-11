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
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

import { ForgotPasswordForm } from './ForgotPasswordForm.tsx';

vi.mock('@/shared/api/auth-api.ts', () => ({
  authApi: {
    forgotPassword: vi.fn().mockResolvedValue(undefined),
  },
}));

function createTestRouter() {
  const rootRoute = createRootRoute({ component: () => <Outlet /> });
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <ForgotPasswordForm />,
  });
  const tree = rootRoute.addChildren([indexRoute]);
  const history = createMemoryHistory({ initialEntries: ['/'] });
  return createRouter({ routeTree: tree, history });
}

describe('ForgotPasswordForm', () => {
  const renderForm = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const router = createTestRouter();
    return render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );
  };

  it('renders form with email field', async () => {
    renderForm();
    expect(await screen.findByTestId('forgot-password-form')).toBeInTheDocument();
    expect(screen.getByTestId('forgot-password-email')).toBeInTheDocument();
    expect(screen.getByTestId('forgot-password-submit')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderForm();
    await screen.findByTestId('forgot-password-form');
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('shows validation error for empty submit', async () => {
    const user = userEvent.setup();
    renderForm();
    const submit = await screen.findByTestId('forgot-password-submit');
    await user.click(submit);
    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    });
  });
});
