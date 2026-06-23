import { screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/tests/utils/renderWithProviders.tsx';

const { magicLinkVerifyMock, meMock } = vi.hoisted(() => ({
  magicLinkVerifyMock: vi.fn(),
  meMock: vi.fn(),
}));
vi.mock('@/shared/api/auth-api.ts', () => ({
  authApi: { magicLinkVerify: magicLinkVerifyMock, me: meMock },
}));
vi.mock('@/shared/auth/token.ts', () => ({ setAccessToken: vi.fn() }));
vi.mock('@/shared/auth/refresh-timer.ts', () => ({ scheduleTokenRefresh: vi.fn() }));
vi.mock('@/shared/auth/session-lifetime.ts', () => ({ markSessionStart: vi.fn() }));
vi.mock('@/shared/store/useAuthStore/index.ts', () => ({
  useAuthStore: { getState: () => ({ setUser: vi.fn() }) },
}));

import { CallbackPage } from './CallbackPage.tsx';

afterEach(() => {
  vi.clearAllMocks();
  window.history.pushState({}, '', '/callback');
});

describe('CallbackPage', () => {
  it('renders the page container', async () => {
    renderWithProviders(<CallbackPage />);
    expect(await screen.findByTestId('callback-page')).toBeInTheDocument();
  });

  it('exchanges a magic-link ?token for a session', async () => {
    window.history.pushState({}, '', '/callback?token=ml_tok');
    magicLinkVerifyMock.mockResolvedValue({ accessToken: 'acc' });
    meMock.mockResolvedValue({ id: 'usr', email: 'a@b.test', role: 'user' });

    renderWithProviders(<CallbackPage />);

    await waitFor(() => expect(magicLinkVerifyMock).toHaveBeenCalledWith('ml_tok'));
  });
});
