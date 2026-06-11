import { useEffect, useRef, useState } from 'react';

/** True when the user has requested reduced motion (or in a non-DOM env). */
function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return true;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Whether this environment can animate (has rAF and motion is allowed). */
function canAnimate(): boolean {
  return !prefersReducedMotion() && typeof requestAnimationFrame === 'function';
}

/**
 * Animate a number from 0 up to `target` with an ease-out curve.
 *
 * Returns the current (in-flight) value, which callers format for display.
 * Honours `prefers-reduced-motion` and environments without
 * `requestAnimationFrame` by rendering the final value with no animation.
 *
 * @param target - The value to count up to.
 * @param durationMs - Animation duration in milliseconds (default 900).
 */
export function useCountUp(target: number, durationMs = 900): number {
  // When motion is disabled we start (and stay) at the final value, so callers
  // never call setState synchronously inside the effect below.
  const [value, setValue] = useState(() => (canAnimate() && target !== 0 ? 0 : target));
  const frame = useRef<number | null>(null);

  useEffect(() => {
    if (!canAnimate() || target === 0) {
      // Re-sync to the latest target on a frame (handles target changes without
      // a synchronous setState in the effect body).
      frame.current = requestAnimationFrame?.(() => setValue(target)) ?? null;
      return () => {
        if (frame.current !== null) cancelAnimationFrame(frame.current);
      };
    }

    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - progress) ** 3;
      setValue(progress < 1 ? target * eased : target);
      if (progress < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);

    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [target, durationMs]);

  return value;
}
