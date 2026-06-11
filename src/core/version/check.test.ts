import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('startVersionCheck', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('returns undefined in dev mode', async () => {
    vi.stubEnv('DEV', true);
    vi.stubEnv('MODE', 'development');
    const { startVersionCheck } = await import('./check.ts');
    expect(startVersionCheck()).toBeUndefined();
  });

  it('returns undefined in test mode', async () => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('MODE', 'test');
    const { startVersionCheck } = await import('./check.ts');
    expect(startVersionCheck()).toBeUndefined();
  });

  it('returns undefined when no build ID is set', async () => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('MODE', 'production');
    vi.stubEnv('VITE_APP_BUILD_ID', '');
    const { startVersionCheck } = await import('./check.ts');
    expect(startVersionCheck()).toBeUndefined();
  });

  it('returns a cleanup function when properly configured', async () => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('MODE', 'production');
    vi.stubEnv('VITE_APP_BUILD_ID', 'abc123');

    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify({ buildId: 'abc123', builtAt: '2025-01-01' }), {
        status: 200,
      }),
    );

    const { startVersionCheck } = await import('./check.ts');
    const cleanup = startVersionCheck();
    expect(typeof cleanup).toBe('function');

    cleanup?.();
  });
});
