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

  describe('idle-gated reload', () => {
    const realLocation = window.location;
    let reload: ReturnType<typeof vi.fn>;

    function setVisibility(state: 'visible' | 'hidden') {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => state,
      });
    }

    beforeEach(() => {
      sessionStorage.clear();
      reload = vi.fn();
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: { ...realLocation, reload },
      });
      setVisibility('visible');
      vi.stubEnv('DEV', false);
      vi.stubEnv('MODE', 'production');
      vi.stubEnv('VITE_APP_BUILD_ID', 'build-OLD');
    });

    afterEach(() => {
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: realLocation,
      });
      setVisibility('visible');
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

    it('reloads ONCE once the user is idle and marks the buildId', async () => {
      mockVersionResponse('build-NEW');
      const { startVersionCheck } = await import('./check.ts');
      const cleanup = startVersionCheck();

      await vi.advanceTimersByTimeAsync(2_000); // initial check → reload pending
      expect(reload).not.toHaveBeenCalled(); // still "active" — deferred

      await vi.advanceTimersByTimeAsync(60_000); // cross the idle threshold

      expect(reload).toHaveBeenCalledTimes(1);
      expect(sessionStorage.getItem('core:version-check:reloaded-for')).toBe('build-NEW');
      cleanup?.();
    });

    it('calls onUpdateAvailable once per new buildId with reloadNow', async () => {
      mockVersionResponse('build-NEW');
      const onUpdateAvailable = vi.fn();
      const { startVersionCheck } = await import('./check.ts');
      const cleanup = startVersionCheck({ onUpdateAvailable });

      await vi.advanceTimersByTimeAsync(2_000);

      expect(onUpdateAvailable).toHaveBeenCalledOnce();
      const ctx = onUpdateAvailable.mock.calls[0]?.[0] as {
        buildId: string;
        reloadNow: () => void;
      };
      expect(ctx.buildId).toBe('build-NEW');
      ctx.reloadNow();
      expect(reload).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(60_000);
      expect(onUpdateAvailable).toHaveBeenCalledOnce(); // not duplicated on poll
      cleanup?.();
    });

    it('reloads immediately when the tab is hidden (invisible reload)', async () => {
      mockVersionResponse('build-NEW');
      const { startVersionCheck } = await import('./check.ts');
      const cleanup = startVersionCheck();

      await vi.advanceTimersByTimeAsync(2_000); // detect → pending (visible + active)
      expect(reload).not.toHaveBeenCalled();

      setVisibility('hidden');
      document.dispatchEvent(new Event('visibilitychange'));
      await vi.advanceTimersByTimeAsync(0);

      expect(reload).toHaveBeenCalledTimes(1); // applied at once, no idle wait
      cleanup?.();
    });

    it('defers while a field is focused, then reloads once it is idle', async () => {
      mockVersionResponse('build-NEW');
      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();

      const { startVersionCheck } = await import('./check.ts');
      const cleanup = startVersionCheck();

      await vi.advanceTimersByTimeAsync(2_000); // detect
      await vi.advanceTimersByTimeAsync(60_000); // idle elapsed, but field is focused
      expect(reload).not.toHaveBeenCalled();

      input.blur(); // user leaves the field
      await vi.advanceTimersByTimeAsync(10_000); // next safety re-check

      expect(reload).toHaveBeenCalledTimes(1);
      input.remove();
      cleanup?.();
    });

    it('does NOT reload again while stuck on the same advertised buildId', async () => {
      sessionStorage.setItem('core:version-check:reloaded-for', 'build-NEW');
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockVersionResponse('build-NEW');
      const { startVersionCheck } = await import('./check.ts');
      const cleanup = startVersionCheck();

      await vi.advanceTimersByTimeAsync(2_000); // initial check
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

      await vi.advanceTimersByTimeAsync(2_000);
      await vi.advanceTimersByTimeAsync(60_000); // idle → apply the deferred reload

      expect(reload).toHaveBeenCalledTimes(1);
      expect(sessionStorage.getItem('core:version-check:reloaded-for')).toBe(
        'build-NEWER',
      );
      cleanup?.();
    });
    it('does not re-notify while snoozed', async () => {
      mockVersionResponse('build-NEW');
      const onUpdateAvailable = vi.fn();
      const { startVersionCheck } = await import('./check.ts');
      const { snoozeVersionUpdate } = await import('./version-update-snooze.ts');
      const cleanup = startVersionCheck({ onUpdateAvailable });

      await vi.advanceTimersByTimeAsync(2_000);
      expect(onUpdateAvailable).toHaveBeenCalledOnce();
      snoozeVersionUpdate('build-NEW');

      await vi.advanceTimersByTimeAsync(60_000);
      expect(onUpdateAvailable).toHaveBeenCalledOnce();
      cleanup?.();
    });
  });
});
