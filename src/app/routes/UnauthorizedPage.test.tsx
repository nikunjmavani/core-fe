import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/tests/utils/renderWithProviders.tsx';

const { logoutMock } = vi.hoisted(() => ({ logoutMock: vi.fn() }));
vi.mock('@/shared/auth/service.ts', () => ({ logout: logoutMock }));

import { Component as UnauthorizedPage } from './UnauthorizedPage.tsx';

describe('UnauthorizedPage', () => {
  it('renders the 403 with a Go Home link', async () => {
    renderWithProviders(<UnauthorizedPage />);
    expect(await screen.findByTestId('unauthorized-page')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /go home/i })).toBeInTheDocument();
  });

  it('offers a Sign out escape so the page is never a dead-end', async () => {
    // Regression: "Go Home" alone can loop when `/` re-resolves to the target
    // that just denied access — sign-out always breaks out.
    const user = userEvent.setup();
    renderWithProviders(<UnauthorizedPage />);
    await user.click(await screen.findByTestId('unauthorized-sign-out'));
    expect(logoutMock).toHaveBeenCalledTimes(1);
  });
});
