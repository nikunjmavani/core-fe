import { useEffect, useState } from 'react';

/**
 * Returns a debounced copy of `value` that only updates after `delayMs` have
 * elapsed without a further change. Used to throttle server-side list search so
 * a keystroke doesn't fire a request per character.
 *
 * @param value   The rapidly-changing source value (e.g. a search input).
 * @param delayMs Quiet period before the debounced value catches up (default 300ms).
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
