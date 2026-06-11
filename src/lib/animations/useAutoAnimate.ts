import type { RefObject } from 'react';
import { useRef } from 'react';

/**
 * Returns a stable ref you can attach to a list container.
 *
 * This is a no-op placeholder kept for API stability — list entrance/reorder
 * animations were intentionally removed in favour of a calmer, static UI.
 *
 * Usage:
 *   const [ref] = useAutoAnimate();
 *   <ul ref={ref}>{items.map((item) => <li key={item.id}>{item.name}</li>)}</ul>
 */
export function useAutoAnimate<T extends HTMLElement = HTMLElement>(): [
  RefObject<T | null>,
] {
  const ref = useRef<T | null>(null);
  return [ref];
}
