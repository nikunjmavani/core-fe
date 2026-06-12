import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('posthog-js', () => ({
  default: {
    init: vi.fn(),
    reset: vi.fn(),
    __loaded: false,
  },
}));

vi.mock('@/core/config/env.ts', () => ({
  config: {
    posthogKey: 'phc_test_key',
    posthogHost: 'https://us.i.posthog.com',
  },
}));

import posthogModule from 'posthog-js';

import type { AuthUser } from '@/shared/auth/types.ts';

const TEST_USER: AuthUser = {
  id: 'user-1',
  email: 'test@example.com',
  role: 'admin',
  organizationId: 'org_1',
  name: 'Test User',
};

/**
 * Self-contained fresh world: vi.doMock from earlier tests persists across
 * resetModules, and resetModules splits module instances — so each test
 * here re-mocks and re-imports everything it touches (store included).
 */
async function loadFreshPostHog() {
  vi.resetModules();
  vi.doMock('@/core/config/env.ts', () => ({
    config: { posthogKey: 'phc_test', posthogHost: undefined },
  }));
  vi.doMock('posthog-js', () => ({
    default: { init: vi.fn(), reset: vi.fn(), __loaded: false },
  }));
  const { initPostHog } = await import('./posthog.ts');
  const phMock = (await import('posthog-js')).default;
  const { useAuthStore } = await import('@/shared/store/useAuthStore/index.ts');
  return { initPostHog, phMock, useAuthStore };
}

describe('initPostHog', () => {
  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it('calls posthog.init when key is provided', async () => {
    const { initPostHog } = await import('./posthog.ts');
    initPostHog();
    expect(posthogModule.init).toHaveBeenCalledWith(
      'phc_test_key',
      expect.objectContaining({
        api_host: 'https://us.i.posthog.com',
        capture_pageview: true,
      }),
    );
  });

  it('does not call init when key is missing', async () => {
    vi.resetModules();
    vi.doMock('@/core/config/env.ts', () => ({
      config: { posthogKey: undefined, posthogHost: undefined },
    }));
    vi.doMock('posthog-js', () => ({ default: { init: vi.fn(), __loaded: false } }));

    const { initPostHog } = await import('./posthog.ts');
    const phMock = (await import('posthog-js')).default;
    initPostHog();
    expect(phMock.init).not.toHaveBeenCalled();
  });

  it('before_send scrubs token URLs from event properties (incl. $set_once)', async () => {
    const { initPostHog, phMock } = await loadFreshPostHog();
    initPostHog();

    const options = vi.mocked(phMock.init).mock.calls[0]?.[1] as unknown as {
      before_send: (event: unknown) => unknown;
    };
    const event = {
      properties: {
        $current_url: 'https://x.dev/reset-password?token=sec-1',
        $set_once: { $initial_current_url: 'https://x.dev/verify-email?token=sec-2' },
      },
    };

    const out = options.before_send(event) as typeof event;

    expect(out.properties.$current_url).toBe(
      'https://x.dev/reset-password?token=[Filtered]',
    );
    expect(out.properties.$set_once.$initial_current_url).toBe(
      'https://x.dev/verify-email?token=[Filtered]',
    );
    expect(options.before_send(null)).toBeNull(); // pass-through, no crash
  });

  it('resets the anonymous identity when the session ends', async () => {
    const { initPostHog, phMock, useAuthStore } = await loadFreshPostHog();
    useAuthStore.setState({ user: null, isAuthenticated: false, isLoading: false });
    initPostHog();

    useAuthStore.getState().setUser(TEST_USER); // login: no reset
    expect(phMock.reset).not.toHaveBeenCalled();

    useAuthStore.getState().clearAuth(); // logout: reset once
    expect(phMock.reset).toHaveBeenCalledTimes(1);

    useAuthStore.setState({ user: null }); // staying logged out: still once
    expect(phMock.reset).toHaveBeenCalledTimes(1);
  });

  it('does not crash when init throws', async () => {
    vi.resetModules();
    vi.doMock('@/core/config/env.ts', () => ({
      config: { posthogKey: 'phc_test', posthogHost: undefined },
    }));
    vi.doMock('posthog-js', () => ({
      default: {
        init: vi.fn(() => {
          throw new Error('PostHog init failed');
        }),
        __loaded: false,
      },
    }));

    const { initPostHog } = await import('./posthog.ts');
    expect(() => initPostHog()).not.toThrow();
  });
});
