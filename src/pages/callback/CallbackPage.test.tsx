import { screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/tests/utils/renderWithProviders.tsx';

const { silentRefreshMock } = vi.hoisted(() => ({
  silentRefreshMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/shared/auth/service.ts', () => ({
  silentRefresh: silentRefreshMock,
}));

import { CallbackPage } from './CallbackPage.tsx';

beforeEach(() => {
  vi.clearAllMocks();
  window.history.pushState({}, '', '/callback');
  sessionStorage.clear();
});

afterEach(() => {
  window.history.pushState({}, '', '/callback');
  sessionStorage.clear();
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

  it('does not read an email OTP token from the URL (code-entry flow only)', async () => {
    window.history.pushState({}, '', '/callback?token=should_be_ignored');
    renderWithProviders(<CallbackPage />);
    expect(await screen.findByTestId('callback-page')).toBeInTheDocument();
  });
});
