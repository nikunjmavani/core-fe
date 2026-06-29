import { animate } from 'animejs';
import { useEffect, useState } from 'react';

import { prefersReducedMotion } from '@/lib/animations/prefers-reduced-motion.ts';

/**
 * Count-up via Anime.js — the only motion on the dashboard (object tween + outExpo).
 * Renders the final value immediately when reduced motion is preferred.
 */
export function useAnimeCountUp(target: number, durationMs = 720): number {
  const [value, setValue] = useState(() =>
    prefersReducedMotion() || target === 0 ? target : 0,
  );

  useEffect(() => {
    if (prefersReducedMotion() || target === 0) {
      const frame = requestAnimationFrame(() => {
        setValue(target);
      });
      return () => {
        cancelAnimationFrame(frame);
      };
    }

    const state = { val: 0 };
    const animation = animate(state, {
      val: target,
      duration: durationMs,
      ease: 'outExpo',
      onUpdate: () => {
        setValue(state.val);
      },
    });

    return () => {
      animation.pause();
    };
  }, [target, durationMs]);

  return value;
}
