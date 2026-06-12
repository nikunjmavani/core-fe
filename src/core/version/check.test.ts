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

  describe('reload-loop guard', () => {
    const realLocation = window.location;
    let reload: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      sessionStorage.clear();
      reload = vi.fn();
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: { ...realLocation, reload },
      });
      vi.stubEnv('DEV', false);
      vi.stubEnv('MODE', 'production');
      vi.stubEnv('VITE_APP_BUILD_ID', 'build-OLD');
    });

    afterEach(() => {
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: realLocation,
      });
      sessionStorage.clear();
    });

    function mockVersionResponse(buildId: string) {
      vi.mocked(globalThis.fetch).mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify({ buildId, builtAt: '2026-01-01' }), {
            status: 200,
          }),
        ),
      );
    }

    it('reloads ONCE for a new buildId and marks it in sessionStorage', async () => {
      mockVersionResponse('build-NEW');
      const { startVersionCheck } = await import('./check.ts');
      const cleanup = startVersionCheck();

      await vi.advanceTimersByTimeAsync(5_000); // initial delayed check

      expect(reload).toHaveBeenCalledTimes(1);
      expect(sessionStorage.getItem('core:version-check:reloaded-for')).toBe('build-NEW');
      cleanup?.();
    });

    it('does NOT reload again while stuck on the same advertised buildId', async () => {
      sessionStorage.setItem('core:version-check:reloaded-for', 'build-NEW');
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockVersionResponse('build-NEW');
      const { startVersionCheck } = await import('./check.ts');
      const cleanup = startVersionCheck();

      await vi.advanceTimersByTimeAsync(5_000); // initial check
      await vi.advanceTimersByTimeAsync(60_000); // first poll

      expect(reload).not.toHaveBeenCalled();
      expect(warn).toHaveBeenCalled();
      cleanup?.();
      warn.mockRestore();
    });

    it('reloads again when an even NEWER buildId ships', async () => {
      sessionStorage.setItem('core:version-check:reloaded-for', 'build-NEW');
      mockVersionResponse('build-NEWER');
      const { startVersionCheck } = await import('./check.ts');
      const cleanup = startVersionCheck();

      await vi.advanceTimersByTimeAsync(5_000);

      expect(reload).toHaveBeenCalledTimes(1);
      expect(sessionStorage.getItem('core:version-check:reloaded-for')).toBe(
        'build-NEWER',
      );
      cleanup?.();
    });
  });
});
