import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/tests/utils/renderWithProviders.tsx';

const { performMockLoginMock } = vi.hoisted(() => ({
  performMockLoginMock: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/shared/auth/mock-auth.ts', () => ({
  performMockLogin: performMockLoginMock,
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

  it('does not read a magic-link token from the URL (code-entry flow only)', async () => {
    // A stray ?token must NOT trigger any token exchange — magic-link is
    // code-entry on the login screen, never a URL token here.
    window.history.pushState({}, '', '/callback?token=should_be_ignored');
    renderWithProviders(<CallbackPage />);
    expect(await screen.findByTestId('callback-page')).toBeInTheDocument();
  });
});
