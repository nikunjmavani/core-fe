import { renderHook } from '@testing-library/react';

import { useAutoAnimate } from './useAutoAnimate.ts';

describe('useAutoAnimate', () => {
  it('returns a tuple with one ref', () => {
    const { result } = renderHook(() => useAutoAnimate());
    const [ref] = result.current;
    expect(result.current).toHaveLength(1);
    expect(ref).toHaveProperty('current', null);
  });

  it('returns a stable ref across re-renders', () => {
    const { result, rerender } = renderHook(() => useAutoAnimate());
    const [ref1] = result.current;
    rerender();
    const [ref2] = result.current;
    expect(ref1).toBe(ref2);
  });
});
