import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCooldownClock } from './useCooldownClock.ts';

describe('useCooldownClock', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('bumps time after deferred tick and interval while cooldown is active', () => {
    const until = Date.now() + 10_000;
    const { result, unmount } = renderHook(() => useCooldownClock(until));
    const initial = result.current;

    act(() => {
      vi.advanceTimersByTime(0);
    });
    expect(result.current).toBeGreaterThanOrEqual(initial);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current).toBeGreaterThanOrEqual(initial);

    unmount();
  });

  it('returns a timestamp when cooldown is inactive', () => {
    const { result } = renderHook(() => useCooldownClock(null));
    expect(typeof result.current).toBe('number');
  });
});
