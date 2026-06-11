import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('posthog-js', () => ({
  default: {
    init: vi.fn(),
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
