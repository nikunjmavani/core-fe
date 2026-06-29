import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useAnimeCountUp } from './useAnimeCountUp.ts';

describe('useAnimeCountUp', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the target immediately when reduced motion is preferred', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
      matches: query.includes('reduce'),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }));

    const { result } = renderHook(() => useAnimeCountUp(42));
    expect(result.current).toBe(42);
  });

  it('animates toward the target when motion is allowed', async () => {
    vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }));

    const { result } = renderHook(() => useAnimeCountUp(100, 200));

    await waitFor(() => {
      expect(result.current).toBe(100);
    });
  });
});
