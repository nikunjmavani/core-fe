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

import { LoginForm } from './LoginForm.tsx';

vi.mock('@/shared/api/auth-api.ts', () => ({
  authApi: {
    login: vi.fn(),
    me: vi.fn(),
  },
}));

vi.mock('@/shared/auth/token.ts', () => ({
  setAccessToken: vi.fn(),
}));

vi.mock('@/shared/auth/refresh-timer.ts', () => ({
  scheduleTokenRefresh: vi.fn(),
}));

vi.mock('@/shared/store/useAuthStore/index.ts', () => ({
  useAuthStore: {
    getState: () => ({
      setUser: vi.fn(),
    }),
  },
}));

function createTestRouter() {
  const rootRoute = createRootRoute({ component: () => <Outlet /> });
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <LoginForm />,
  });
  const tree = rootRoute.addChildren([indexRoute]);
  const history = createMemoryHistory({ initialEntries: ['/'] });
  return createRouter({ routeTree: tree, history });
}

describe('LoginForm', () => {
  const renderForm = () => {
    const router = createTestRouter();
    return render(<RouterProvider router={router} />);
  };

  it('renders form with email, password, and submit', async () => {
    renderForm();
    expect(await screen.findByTestId('login-form')).toBeInTheDocument();
    expect(screen.getByTestId('login-email')).toBeInTheDocument();
    expect(screen.getByTestId('login-password')).toBeInTheDocument();
    expect(screen.getByTestId('login-submit')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderForm();
    await screen.findByTestId('login-form');
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('shows validation errors for empty submit', async () => {
    const user = userEvent.setup();
    renderForm();
    const submit = await screen.findByTestId('login-submit');
    await user.click(submit);
    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument();
    });
  });

  it('renders Sign in with Google button', async () => {
    renderForm();
    expect(await screen.findByTestId('login-google')).toBeInTheDocument();
    expect(screen.getByText(/Sign in with Google/)).toBeInTheDocument();
  });
});
