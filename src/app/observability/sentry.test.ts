import { describe, expect, it, vi } from 'vitest';

vi.mock('@sentry/react', () => ({
  init: vi.fn(),
  setUser: vi.fn(),
  tanstackRouterBrowserTracingIntegration: vi.fn(() => ({})),
  browserProfilingIntegration: vi.fn(() => ({})),
  replayIntegration: vi.fn(() => ({})),
}));

vi.mock('@/shared/store/useAuthStore/index.ts', () => ({
  useAuthStore: {
    subscribe: vi.fn(),
  },
}));

vi.mock('@/core/config/env.ts', () => ({
  config: {
    sentryDsn: 'https://test@sentry.io/123',
    environment: 'test',
    isProduction: false,
  },
}));

import * as Sentry from '@sentry/react';

import { initSentry } from './sentry.ts';

describe('initSentry', () => {
  it('calls Sentry.init when DSN is provided', async () => {
    const mockRouter = {} as Parameters<typeof initSentry>[0];
    await initSentry(mockRouter);
    expect(Sentry.init).toHaveBeenCalledOnce();
  });

  it('subscribes to auth store for user context', async () => {
    const { useAuthStore } = vi.mocked(
      await import('@/shared/store/useAuthStore/index.ts'),
    );
    const mockRouter = {} as Parameters<typeof initSentry>[0];
    await initSentry(mockRouter);
    expect(useAuthStore.subscribe).toHaveBeenCalled();
  });

  it('does not call init when DSN is missing', async () => {
    vi.resetModules();
    vi.doMock('@/core/config/env.ts', () => ({
      config: { sentryDsn: undefined, environment: 'test', isProduction: false },
    }));
    vi.doMock('@sentry/react', () => ({
      init: vi.fn(),
      setUser: vi.fn(),
      tanstackRouterBrowserTracingIntegration: vi.fn(() => ({})),
      browserProfilingIntegration: vi.fn(() => ({})),
      replayIntegration: vi.fn(() => ({})),
    }));
    vi.doMock('@/shared/store/useAuthStore/index.ts', () => ({
      useAuthStore: { subscribe: vi.fn() },
    }));

    const { initSentry: initSentryFresh } = await import('./sentry.ts');
    const SentryFresh = await import('@sentry/react');
    await initSentryFresh({} as Parameters<typeof initSentryFresh>[0]);
    expect(SentryFresh.init).not.toHaveBeenCalled();
  });
});
