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

import { RegisterForm } from './RegisterForm.tsx';

vi.mock('@/shared/api/auth-api.ts', () => ({
  authApi: {
    register: vi.fn().mockResolvedValue({ accessToken: 'mock-token' }),
    me: vi.fn().mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      role: 'admin',
      organizationId: 't1',
      name: 'Test User',
    }),
  },
}));

// The strength meter debounces a real HIBP fetch — stub it so the form's unit
// tests never touch the network (the meter has its own coverage).
vi.mock('@/lib/password-breach.ts', () => ({
  checkPasswordBreached: vi.fn().mockResolvedValue(null),
}));

function createTestRouter() {
  const rootRoute = createRootRoute({ component: () => <Outlet /> });
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <RegisterForm />,
  });
  const tree = rootRoute.addChildren([indexRoute]);
  const history = createMemoryHistory({ initialEntries: ['/'] });
  return createRouter({ routeTree: tree, history });
}

describe('RegisterForm', () => {
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

  it('renders form with email and password fields', async () => {
    renderForm();
    expect(await screen.findByTestId('register-form')).toBeInTheDocument();
    expect(screen.getByTestId('register-email')).toBeInTheDocument();
    expect(screen.getByTestId('register-password')).toBeInTheDocument();
    expect(screen.getByTestId('register-submit')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderForm();
    await screen.findByTestId('register-form');
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('shows validation errors for empty submit', async () => {
    const user = userEvent.setup();
    renderForm();
    const submit = await screen.findByTestId('register-submit');
    await user.click(submit);
    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    });
  });
});
