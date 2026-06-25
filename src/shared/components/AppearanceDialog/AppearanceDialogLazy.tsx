import { lazy, Suspense, useEffect } from 'react';

import { useUIStore } from '@/shared/store/useUIStore/index.ts';

const AppearanceDialogInner = lazy(() =>
  import('./AppearanceDialog.tsx').then((m) => ({ default: m.AppearanceDialog })),
);

/**
 * Lazy shell for the Appearance dialog — keeps the theme-studio chunk (every
 * picker + the colour maths) out of the entry preload graph. Mounts the dialog
 * only once opened; prefetched at idle so the first open is instant.
 */
export function AppearanceDialogLazy() {
  const open = useUIStore((s) => s.appearanceOpen);

  useEffect(() => {
    const prefetch = () => {
      import('./AppearanceDialog.tsx').catch(() => {
        /* best-effort; opening retries via Suspense */
      });
    };
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(prefetch, { timeout: 5000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(prefetch, 2000);
    return () => window.clearTimeout(id);
  }, []);

  if (!open) return null;

  return (
    <Suspense fallback={null}>
      <AppearanceDialogInner />
    </Suspense>
  );
}
