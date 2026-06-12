import { useRouterState } from '@tanstack/react-router';
import { lazy, Suspense, useEffect } from 'react';

import { isSettingsHash } from './settings-hash.ts';

const SettingsModalInner = lazy(() =>
  import('./SettingsModal.tsx').then((m) => ({ default: m.SettingsModal })),
);

/**
 * Hash-listening shell for the global settings modal. The real modal (11
 * panels, forms, react-hook-form) is a separate chunk: mounting THIS on the
 * root route keeps the whole settings tree out of the entry preload graph.
 *
 * The chunk is prefetched at idle so the first `#settings/…` open is instant;
 * a deep link present at boot imports it immediately via Suspense.
 */
export function SettingsModalLazy() {
  const hash = useRouterState({ select: (s) => s.location.hash });

  useEffect(() => {
    const prefetch = () => {
      import('./SettingsModal.tsx').catch(() => {
        /* prefetch is best-effort; opening retries via Suspense */
      });
    };
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(prefetch, { timeout: 5000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(prefetch, 2000);
    return () => window.clearTimeout(id);
  }, []);

  if (!isSettingsHash(hash)) return null;

  return (
    <Suspense fallback={null}>
      <SettingsModalInner />
    </Suspense>
  );
}
