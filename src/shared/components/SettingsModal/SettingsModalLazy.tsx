import { useNavigate, useRouterState } from '@tanstack/react-router';
import { lazy, Suspense, useLayoutEffect } from 'react';

import { useAuthenticatedIdleChunkPrefetch } from '@/lib/chunk-prefetch.ts';
import { useAuthStore } from '@/shared/store/useAuthStore/index.ts';

import { isSettingsHash } from './settings-hash.ts';
import { isSettingsPathAllowed } from './settings-route-policy.ts';

const SettingsModalInner = lazy(() =>
  import('./SettingsModal.tsx').then((m) => ({ default: m.SettingsModal })),
);

/**
 * Hash-listening shell for the global settings modal. The real modal (11
 * panels, forms, react-hook-form) is a separate chunk: mounting THIS on the
 * root route keeps the whole settings tree out of the entry preload graph.
 *
 * Prefetch runs only on authenticated app surfaces (not `/login` etc.) so auth
 * funnels keep first-paint lean. A `#settings/…` deep link imports via Suspense.
 */
export function SettingsModalLazy() {
  const hash = useRouterState({ select: (s) => s.location.hash });
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isAuthLoading = useAuthStore((s) => s.isLoading);
  const hasSettingsHash = isSettingsHash(hash);
  const pathAllowed = isSettingsPathAllowed(pathname);

  useLayoutEffect(() => {
    if (!hasSettingsHash) return;
    if (!pathAllowed) {
      void navigate({ to: '.', hash: '', search: (prev) => prev, replace: true });
      return;
    }
    if (!(isAuthLoading || isAuthenticated)) {
      void navigate({ to: '.', hash: '', search: (prev) => prev, replace: true });
    }
  }, [hasSettingsHash, pathAllowed, isAuthLoading, isAuthenticated, navigate]);

  const prefetchEnabled =
    isAuthenticated && !isAuthLoading && pathAllowed && !hasSettingsHash;
  useAuthenticatedIdleChunkPrefetch(() => import('./SettingsModal.tsx'), prefetchEnabled);

  if (!(hasSettingsHash && pathAllowed) || isAuthLoading || !isAuthenticated) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <SettingsModalInner />
    </Suspense>
  );
}
