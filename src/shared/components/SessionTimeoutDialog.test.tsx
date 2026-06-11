import { waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

import { useAuthStore } from '@/shared/store/useAuthStore/index.ts';

import { renderWithProviders } from '../../../tests/utils/renderWithProviders.tsx';
import { SessionTimeoutDialog } from './SessionTimeoutDialog.tsx';

vi.mock('@/shared/auth/idle-timeout.ts', () => ({
  startIdleTimeout: vi.fn(() => vi.fn()),
}));

vi.mock('@/shared/auth/service.ts', () => ({
  forceLogout: vi.fn(),
}));

describe('SessionTimeoutDialog', () => {
  beforeEach(() => {
    useAuthStore.getState().setUser({
      id: 'test-user',
      email: 'test@example.com',
      role: 'user',
      tenantId: 't1',
      name: 'Test User',
    });
  });

  afterEach(() => {
    useAuthStore.getState().clearAuth();
    vi.clearAllMocks();
  });

  it('renders when not shown (open=false)', () => {
    const { container } = renderWithProviders(<SessionTimeoutDialog />);
    expect(container).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderWithProviders(<SessionTimeoutDialog />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('calls startIdleTimeout when authenticated', async () => {
    const { startIdleTimeout } = await import('@/shared/auth/idle-timeout.ts');
    renderWithProviders(<SessionTimeoutDialog />);
    await waitFor(() => {
      expect(startIdleTimeout).toHaveBeenCalledWith(
        expect.objectContaining({
          warnAfterMs: 5 * 60 * 1000,
        }),
      );
    });
  });

  it('returns cleanup function from startIdleTimeout', async () => {
    const { startIdleTimeout } = await import('@/shared/auth/idle-timeout.ts');
    const { unmount } = renderWithProviders(<SessionTimeoutDialog />);
    await waitFor(() => expect(startIdleTimeout).toHaveBeenCalled());
    const cleanup = vi.mocked(startIdleTimeout).mock.results[0]?.value;
    unmount();
    expect(typeof cleanup).toBe('function');
  });
});
