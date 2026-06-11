import { vi } from 'vitest';

import { startIdleTimeout } from './idle-timeout.ts';

describe('idle-timeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls onWarn after warnAfterMs of idle time', () => {
    const onWarn = vi.fn();
    const onLogout = vi.fn();

    startIdleTimeout({
      warnAfterMs: 5000,
      logoutAfterMs: 10000,
      onWarn,
      onLogout,
    });

    expect(onWarn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(5000);
    expect(onWarn).toHaveBeenCalledOnce();
    expect(onLogout).not.toHaveBeenCalled();
  });

  it('calls onLogout after logoutAfterMs of idle time', () => {
    const onWarn = vi.fn();
    const onLogout = vi.fn();

    startIdleTimeout({
      warnAfterMs: 5000,
      logoutAfterMs: 10000,
      onWarn,
      onLogout,
    });

    vi.advanceTimersByTime(10000);
    expect(onLogout).toHaveBeenCalledOnce();
  });

  it('cleanup function clears timers and prevents callbacks', () => {
    const onWarn = vi.fn();
    const onLogout = vi.fn();

    const cleanup = startIdleTimeout({
      warnAfterMs: 5000,
      logoutAfterMs: 10000,
      onWarn,
      onLogout,
    });

    cleanup();
    vi.advanceTimersByTime(15000);
    expect(onWarn).not.toHaveBeenCalled();
    expect(onLogout).not.toHaveBeenCalled();
  });

  it('calls onActive when user interacts during warning phase', () => {
    const onWarn = vi.fn();
    const onLogout = vi.fn();
    const onActive = vi.fn();

    startIdleTimeout({
      warnAfterMs: 5000,
      logoutAfterMs: 10000,
      onWarn,
      onLogout,
      onActive,
    });

    // Enter warning phase
    vi.advanceTimersByTime(5000);
    expect(onWarn).toHaveBeenCalledOnce();

    // Advance past throttle period (10s) then trigger activity
    vi.advanceTimersByTime(11000);
    document.dispatchEvent(new Event('mousedown'));

    expect(onActive).toHaveBeenCalledOnce();
  });
});
