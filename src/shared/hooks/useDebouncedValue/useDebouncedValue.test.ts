import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useDebouncedValue } from './useDebouncedValue.ts';

describe('useDebouncedValue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the initial value immediately', () => {
    const { result } = renderHook(() => useDebouncedValue('a', 300));
    expect(result.current).toBe('a');
  });

  it('updates only after the delay elapses without further changes', () => {
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 300), {
      initialProps: { v: 'a' },
    });

    rerender({ v: 'ab' });
    rerender({ v: 'abc' });
    expect(result.current).toBe('a');

    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(result.current).toBe('a');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe('abc');
  });

  it('resets the timer on each change (only the final value lands)', () => {
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 300), {
      initialProps: { v: 'x' },
    });

    rerender({ v: 'xy' });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    rerender({ v: 'xyz' });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    // 400ms total elapsed, but only 200ms since the last change → not yet.
    expect(result.current).toBe('x');

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe('xyz');
  });
});
