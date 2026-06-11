import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useCountUp } from './useCountUp.ts';

function mockReducedMotion(matches: boolean) {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({
        matches,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useCountUp', () => {
  it('returns the target immediately when reduced motion is preferred', () => {
    mockReducedMotion(true);
    const { result } = renderHook(() => useCountUp(1234));
    expect(result.current).toBe(1234);
  });

  it('returns 0 when the target is 0', () => {
    mockReducedMotion(false);
    const { result } = renderHook(() => useCountUp(0));
    expect(result.current).toBe(0);
  });
});
