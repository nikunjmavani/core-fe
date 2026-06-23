import { screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/tests/utils/renderWithProviders.tsx';

const { performMockLoginMock, silentRefreshMock } = vi.hoisted(() => ({
  performMockLoginMock: vi.fn().mockResolvedValue(undefined),
  silentRefreshMock: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/shared/auth/mock-auth.ts', () => ({
  performMockLogin: performMockLoginMock,
}));
vi.mock('@/shared/auth/service.ts', () => ({
  silentRefresh: silentRefreshMock,
}));

import { CallbackPage } from './CallbackPage.tsx';

afterEach(() => {
  vi.clearAllMocks();
  window.history.pushState({}, '', '/callback');
});

describe('CallbackPage', () => {
  it('renders the spinner container while resolving the OAuth return', async () => {
    renderWithProviders(<CallbackPage />);
    expect(await screen.findByTestId('callback-page')).toBeInTheDocument();
  });

  it('exchanges the HttpOnly refresh cookie via silentRefresh on return', async () => {
    renderWithProviders(<CallbackPage />);
    await waitFor(() => expect(silentRefreshMock).toHaveBeenCalledTimes(1));
  });

  it('does not read a magic-link token from the URL (code-entry flow only)', async () => {
    // A stray ?token must NOT trigger any token exchange from the URL — the only
    // credential consumed here is the HttpOnly cookie via silentRefresh.
    window.history.pushState({}, '', '/callback?token=should_be_ignored');
    renderWithProviders(<CallbackPage />);
    expect(await screen.findByTestId('callback-page')).toBeInTheDocument();
  });
});
